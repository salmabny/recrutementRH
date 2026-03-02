import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { OffreService } from '../../services/offre.service';
import { AuthService } from '../../services/auth.service';
import { Offre, StatutOffre } from '../../models/offre.model';

@Component({
  selector: 'app-offres-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './offres-list.component.html',
  styleUrls: ['./offres-list.component.css']
})
export class OffresListComponent implements OnInit {

  offres = signal<Offre[]>([]);
  isLoading = signal(true);
  errorMessage = signal('');
  searchTerm = signal('');
  filterStatut = signal('tous');
  filterContrat = signal('tous');

  // Offres filtrées
  offresFiltrees = computed(() => {
    let list = this.offres();

    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      list = list.filter(o =>
        o.title.toLowerCase().includes(term) ||
        o.location.toLowerCase().includes(term)
      );
    }

    if (this.filterStatut() !== 'tous') {
      list = list.filter(o => o.status === this.filterStatut());
    }

    return list;
  });

  // Compteurs
  totalPubliees = computed(() => this.offres().filter(o => o.status === 'PUBLIEE').length);
  totalBrouillon = computed(() => this.offres().filter(o => o.status === 'BROUILLON').length);
  totalFermees = computed(() => this.offres().filter(o => o.status === 'FERMEE').length);

  constructor(
    private offreService: OffreService,
    private authService: AuthService,
    private router: Router
  ) { }

  recruteur = computed(() => {
    const user = this.authService.currentUser();
    return {
      id: user?.id || 1,
      prenom: user?.prenom || 'Marie',
      nom: user?.nom || 'Dupont',
      entreprise: user?.entreprise || 'Ma Société',
      photoUrl: user?.photoUrl,
      initiales: (user?.prenom?.[0] || 'M') + (user?.nom?.[0] || 'D')
    };
  });

  getPhotoUrl(user: any): string {
    if (!user?.photoUrl) return '';
    if (user.photoUrl.startsWith('http')) return user.photoUrl;
    return `http://localhost:8081/uploads/images/${user.photoUrl}`;
  }

  ngOnInit(): void {
    this.loadOffres();
  }

  loadOffres(): void {
    this.isLoading.set(true);

    this.offreService.getOffresByRecruteur(this.recruteur().id).subscribe({
      next: (data) => {
        this.offres.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Erreur lors du chargement des offres');
        this.isLoading.set(false);
      }
    });
  }

  deleteOffre(offre: Offre, event: Event): void {
    event.stopPropagation();
    if (!confirm(`Supprimer "${offre.title}" ?`)) return;

    this.offreService.deleteOffre(offre.id).subscribe({
      next: () => this.offres.update(list => list.filter(o => o.id !== offre.id)),
      error: () => this.errorMessage.set('Erreur lors de la suppression')
    });
  }

  editOffre(offre: Offre, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/recruteur/offres/edit', offre.id]);
  }

  viewOffre(offre: Offre): void {
    this.router.navigate(['/recruteur/offres', offre.id]);
  }

  onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  onFilterStatut(event: Event): void {
    this.filterStatut.set((event.target as HTMLSelectElement).value);
  }

  isExpiringSoon(expirationDate?: string): boolean {
    if (!expirationDate) return false;
    const now = new Date();
    const exp = new Date(expirationDate);
    const diffTime = exp.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  }

  getStatutConfig(statut?: string): { label: string; css: string } {
    switch (statut) {
      case 'PUBLIEE': return { label: 'Publiée', css: 'tag-green' };
      case 'FERMEE': return { label: 'Fermée', css: 'tag-gray' };
      case 'BROUILLON': return { label: 'Brouillon', css: 'tag-orange' };
      default: return { label: 'Brouillon', css: 'tag-orange' };
    }
  }

  logout(): void {
    if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
      this.authService.logout();
    }
  }

  formatDate(date?: string): string {
    if (!date) return 'Récemment';
    try {
      return new Date(date).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return 'Récemment';
    }
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }
}