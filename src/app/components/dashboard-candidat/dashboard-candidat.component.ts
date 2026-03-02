import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CandidatService } from '../../services/candidat.service';
import { AuthService } from '../../services/auth.service';
import { Candidat } from '../../models/candidat.model';

@Component({
  selector: 'app-dashboard-candidat',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-candidat.component.html',
  styleUrls: ['./dashboard-candidat.component.css']
})
export class DashboardCandidatComponent implements OnInit {

  private candidatService = inject(CandidatService);
  private authService = inject(AuthService);
  private router = inject(Router);

  candidat = signal<Candidat | null>(null);
  candidatures = signal<any[]>([]);
  offres = signal<any[]>([]);
  isLoading = signal(true);

  // Activité & Suggestions
  activiteRecente: any[] = [];
  offresSuggeresMock: any[] = [];

  // Stats calculées
  get totalOffres() { return this.offres().length; }
  get totalCandidatures() { return this.candidatures().length; }
  get enCours() { return this.candidatures().filter(c => c.status === 'EN_COURS' || c.status === 'SOUMISE').length; }
  get meilleurScore() { return this.candidatures().length ? Math.max(...this.candidatures().map(c => c.score ?? 0)) : 0; }

  ngOnInit(): void {
    const user = this.authService.currentUser();
    if (user && user.id) {
      this.loadData(user.id);
    } else {
      this.isLoading.set(false);
    }
  }

  loadData(userId: number): void {
    this.isLoading.set(true);

    // 1. Profil
    this.candidatService.getProfil(userId).subscribe({
      next: (data) => {
        this.candidat.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });

    // 2. Candidatures
    this.candidatService.getMesCandidatures(userId).subscribe({
      next: (data) => {
        this.candidatures.set(data);
        this.generateRecentActivity(data);
      },
      error: () => this.candidatures.set([])
    });

    // 3. Offres
    this.candidatService.getOffresDisponibles().subscribe({
      next: (data) => {
        this.offres.set(data);
        this.generateSuggestedOffres(data);
      },
      error: () => this.offres.set([])
    });
  }

  generateRecentActivity(candidatures: any[]): void {
    const activity = candidatures.slice(0, 3).map(c => {
      let color = 'd-blue';
      let text = `Candidature envoyée pour <strong>${c.jobOffer?.title}</strong>`;

      if (c.status === 'REFUSEE') {
        color = 'd-orange';
        text = `Votre candidature pour <strong>${c.jobOffer?.title}</strong> a été refusée`;
      } else if (c.status === 'VALIDEE' || c.status === 'ACCEPTEE') {
        color = 'd-green';
        text = `Bravo ! Votre candidature pour <strong>${c.jobOffer?.title}</strong> a été acceptée`;
      }

      const dateToDisplay = c.lastStatusUpdate || c.dateCandidature || 'Récemment';
      let formattedDate = dateToDisplay;
      if (dateToDisplay !== 'Récemment') {
        try {
          formattedDate = new Date(dateToDisplay).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          });
        } catch (e) {
          formattedDate = 'Récemment';
        }
      }

      return { color, texte: text, temps: formattedDate };
    });

    if (activity.length === 0) {
      activity.push({ color: 'd-blue', texte: 'Bienvenue ! Postulez à votre première offre pour voir votre activité.', temps: 'Maintenant' });
    }

    this.activiteRecente = activity;
  }

  generateSuggestedOffres(allOffres: any[]): void {
    const colors = [
      'linear-gradient(135deg,#4361ee,#7b61ff)',
      'linear-gradient(135deg,#38a169,#2d9250)',
      'linear-gradient(135deg,#ed8936,#dd6b20)',
      'linear-gradient(135deg,#7b61ff,#6b51ef)'
    ];

    this.offresSuggeresMock = allOffres.slice(0, 4).map((o, idx) => ({
      id: o.id,
      initiales: o.title?.substring(0, 2).toUpperCase() || 'JB',
      color: colors[idx % colors.length],
      title: o.title,
      company: o.recruteur?.entreprise || 'SmartHiring Partner',
      recruiterName: o.recruteur ? `${o.recruteur.prenom} ${o.recruteur.nom}` : 'Recruteur',
      photoUrl: o.recruteur?.photoUrl,
      location: o.location || 'À distance',
      contrat: o.typeContrat || 'CDI',
      match: Math.floor(Math.random() * 25) + 75
    }));
  }

  getInitiales(): string {
    const c = this.candidat();
    if (!c) return 'XX';
    return `${c.prenom?.charAt(0) || ''}${c.nom?.charAt(0) || ''}`.toUpperCase();
  }

  getPhotoUrl(photo?: string): string {
    if (!photo) return '';
    if (photo.startsWith('http')) return photo;
    return `http://localhost:8081/uploads/images/${photo}`;
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
