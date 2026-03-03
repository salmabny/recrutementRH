import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CandidatService } from '../../services/candidat.service';
import { AuthService } from '../../services/auth.service';
import { OffreService } from '../../services/offre.service';

@Component({
  selector: 'app-offres-disponibles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './offres-disponibles.component.html',
  styleUrls: ['./offres-disponibles.component.css']
})
export class OffresDisponiblesComponent implements OnInit {

  private candidatService = inject(CandidatService);
  private authService = inject(AuthService);
  private offreService = inject(OffreService);
  private router = inject(Router);

  offres = signal<any[]>([]);
  candidat = signal<any | null>(null);
  isLoading = signal(true);
  searchTerm = signal('');
  appliedOffreIds = signal<number[]>([]);
  showAlreadyAppliedToast = signal(false);

  // Computed property for filtered offers
  offresFiltrees = computed(() => {
    const list = this.offres();
    const term = this.searchTerm().toLowerCase();

    if (!term) return list;

    return list.filter((o: any) =>
      o.title?.toLowerCase().includes(term) ||
      o.recruteur?.entreprise?.toLowerCase().includes(term) ||
      o.location?.toLowerCase().includes(term)
    );
  });

  ngOnInit(): void {
    const user = this.authService.currentUser();
    if (user && user.id) {
      this.loadOffres();
      this.loadProfil(user.id);
      this.loadAppliedOffreIds(user.id);
    }
  }

  loadAppliedOffreIds(userId: number): void {
    this.candidatService.getMesCandidatures(userId).subscribe({
      next: (list) => {
        const ids = list.map((c: any) => c.jobOffer?.id).filter((id: any) => !!id);
        this.appliedOffreIds.set(ids);
      },
      error: (err) => console.error('Erreur chargement IDs postulations:', err)
    });
  }

  loadOffres(): void {
    this.isLoading.set(true);
    this.candidatService.getOffresDisponibles().subscribe({
      next: (data) => {
        this.offres.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Erreur chargement offres:', err);
        this.offres.set([]);
        this.isLoading.set(false);
      }
    });
  }

  postuler(offre: any, event: Event): void {
    event.stopPropagation();

    if (this.appliedOffreIds().includes(offre.id)) {
      this.showAlreadyAppliedToast.set(true);
      setTimeout(() => this.showAlreadyAppliedToast.set(false), 4000);
      return;
    }

    this.router.navigate(['/candidat/offres', offre.id, 'postuler']);
  }

  goToRecruteur(offre: any): void {
    if (offre.recruteur?.id) {
      this.router.navigate(['/candidat/recruteur', offre.recruteur.id]);
    }
  }

  getPhotoUrl(photo?: string): string {
    if (!photo) return '';
    if (photo.startsWith('http')) return photo;
    return `http://localhost:8081/uploads/images/${photo}`;
  }

  getRecruteurPhotoUrl(photo?: string): string {
    return this.getPhotoUrl(photo);
  }

  goToDetail(offre: any): void {
    this.router.navigate(['/candidat/offres', offre.id]);
  }

  loadProfil(userId: number): void {
    this.candidatService.getProfil(userId).subscribe({
      next: (data) => this.candidat.set(data),
      error: (err) => console.error('Erreur profil sidebar:', err)
    });
  }

  getInitiales(): string {
    const c = this.candidat();
    if (!c) return 'C';
    return `${c.prenom?.charAt(0) || ''}${c.nom?.charAt(0) || ''}`.toUpperCase();
  }

  getUserName(): string {
    const user = this.authService.currentUser();
    return user ? `${user.prenom} ${user.nom}` : 'Utilisateur';
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
