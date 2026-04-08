import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { OffreService } from '../../services/offre.service';
import { CandidatureService } from '../../services/candidature.service';
import { AuthService } from '../../services/auth.service';
import { RecruiterService } from '../../services/recruiter.service';
import { NotificationService } from '../../services/notification.service';
import { Offre } from '../../models/offre.model';
import { Candidature } from '../../models/candidature.model';
import { SidebarRecruteurComponent } from '../sidebar-recruteur/sidebar-recruteur.component';

@Component({
  selector: 'app-dashboard-recruteur',
  standalone: true,
  imports: [CommonModule, SidebarRecruteurComponent],
  templateUrl: './dashboard-recruteur.component.html',
  styleUrls: ['./dashboard-recruteur.component.css']
})
export class DashboardRecruteurComponent implements OnInit {

  offres = signal<Offre[]>([]);
  candidatures = signal<Candidature[]>([]);
  isLoading = signal(true);
  errorMessage = signal('');
  showNotifications = signal(false);

  // Stats
  totalOffresCount = signal(0);
  totalCandidaturesCount = signal(0);
  offresActivesCount = signal(0);
  offresExpirantCount = signal(0);

  // Activité récente (calculée à partir des candidatures)
  activiteRecente = computed(() => {
    return this.candidatures().slice(0, 5).map(c => ({
      type: 'candidature',
      texte: `${c.candidat?.prenom} ${c.candidat?.nom} a postulé à ${c.jobOffer?.title}`,
      temps: this.formatDate(c.dateCandidature),
      couleur: 'blue'
    }));
  });

  constructor(
    private offreService: OffreService,
    private candidatureService: CandidatureService,
    private authService: AuthService,
    private recruiterService: RecruiterService,
    public notifService: NotificationService,
    private router: Router
  ) { }

  recruteur = computed(() => {
    const user = this.authService.currentUser();
    return {
      id: user?.id || 1, // Keep id for now, will be removed if not needed
      prenom: user?.prenom || 'Marie',
      nom: user?.nom || 'Dupont',
      entreprise: user?.entreprise || 'Ma Société',
      photoUrl: user?.photoUrl,
      initiales: (user?.prenom?.[0] || 'M') + (user?.nom?.[0] || 'D')
    };
  });

  getPhotoUrl(photo?: string): string {
    if (!photo) return '';
    if (photo.startsWith('http')) return photo;
    return `http://localhost:8081/uploads/images/${photo}`;
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    const recruiterId = this.recruteur().id;
    this.isLoading.set(true);

    // 1. Charger les stats
    this.recruiterService.getStats(recruiterId.toString()).subscribe({
      next: (stats) => {
        this.totalOffresCount.set(stats.totalOffres);
        this.totalCandidaturesCount.set(stats.candidaturesRecues);
        this.offresActivesCount.set(stats.offresActives);
      }
    });

    // 2. Charger les offres
    this.offreService.getOffresByRecruteur(recruiterId).subscribe({
      next: (data) => {
        this.offres.set(data);

        // Calculer les offres expirant bientôt (ex: publiées il y a + de 25 jours)
        const now = new Date();
        const soon = data.filter(o => {
          const pubDate = new Date(o.publicationDate);
          const diffDays = (now.getTime() - pubDate.getTime()) / (1000 * 60 * 60 * 24);
          return diffDays > 25 && o.status === 'PUBLIEE';
        }).length;
        this.offresExpirantCount.set(soon);
      },
      error: () => this.errorMessage.set('Erreur lors du chargement des offres')
    });

    this.recruiterService.getRecentCandidatures(recruiterId.toString()).subscribe({
      next: (data) => {
        this.candidatures.set(data);
        this.notifService.seedFromCandidatures(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('Erreur lors du chargement des activités');
      }
    });
  }


  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMins = Math.floor(diffInMs / (1000 * 60));

    if (diffInMins < 1) return 'À l\'instant';
    if (diffInMins < 60) return `${diffInMins}min`;
    const diffInHours = Math.floor(diffInMins / 60);
    if (diffInHours < 24) return `${diffInHours}h`;
    return date.toLocaleDateString();
  }

  getStatutTag(statut?: string): { label: string; css: string } {
    switch (statut) {
      case 'PUBLIEE': return { label: 'Publiée', css: 'tag-green' };
      case 'FERMEE': return { label: 'Fermée', css: 'tag-gray' };
      case 'BROUILLON': return { label: 'Brouillon', css: 'tag-gray' };
      default: return { label: 'Brouillon', css: 'tag-gray' };
    }
  }


  toggleNotifications(): void {
    this.showNotifications.update(v => !v);
    if (this.showNotifications()) {
      // Mark all as read when panel opens
      setTimeout(() => this.notifService.markAllAsRead(), 1500);
    }
  }

  closeNotifications(): void {
    this.showNotifications.set(false);
  }

  logout(): void {
    this.authService.logout();
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }
}