import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../services/admin.service';
import { AuthService } from '../../services/auth.service';
import { User, AdminStats, MonthlyChartData } from '../../models/user.model';
import { Offre } from '../../models/offre.model';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {

  private authService = inject(AuthService);
  public adminService = inject(AdminService);

  chartData = signal<MonthlyChartData[]>([]);
  recentOffers = signal<Offre[]>([]);
  recentActivities = signal<{ title: string; detail: string; time: string; color: string; dateMs: number }[]>([]);
  isLoading = signal(true);
  errorMessage = signal('');
  today = new Date();

  // Modal ajout recruteur
  showAddModal = signal(false);
  isSubmitting = signal(false);
  newRecruiter = {
    nom: '',
    prenom: '',
    email: '',
    entreprise: '',
    ville: ''
  };

  // Admin connecté (Signal)
  adminUser = this.authService.currentUser;

  // Donut : répartition candidatures (calculé à partir du total)
  get candidaturesAcceptees(): number {
    const total = this.adminService.stats()?.candidaturesTraitees ?? 0;
    return Math.round(total * 0.35);
  }
  get candidaturesEnCours(): number {
    const total = this.adminService.stats()?.candidaturesTraitees ?? 0;
    return Math.round(total * 0.28);
  }
  get candidaturesEnAttente(): number {
    const total = this.adminService.stats()?.candidaturesTraitees ?? 0;
    return total - this.candidaturesAcceptees - this.candidaturesEnCours;
  }

  // Hauteur max calculée dynamiquement depuis les données réelles
  get maxValue(): number {
    const data = this.chartData();
    if (!data.length) return 1;
    return Math.max(...data.map(d => Math.max(d.inscriptions, d.recruteurs, d.candidatures)), 1);
  }

  constructor(private router: Router) { }

  logout(): void {
    this.authService.logout();
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);

    // Stats globales
    this.adminService.getStats().subscribe({
      next: (data) => this.adminService.stats.set(data),
      error: () => this.errorMessage.set('Erreur chargement statistiques')
    });

    // Stats mensuelles pour le graphique
    this.adminService.getMonthlyStats().subscribe({
      next: (data) => this.chartData.set(data),
      error: () => this.chartData.set([])
    });

    // Offres récentes (5 dernières)
    this.adminService.getAllJobOffers().subscribe({
      next: (offres) => {
        this.recentOffers.set(offres.slice(0, 5));
        this.buildActivityFeed(offres);
      },
      error: () => this.recentOffers.set([])
    });

    // Candidats récents pour le feed
    this.adminService.getAllCandidats().subscribe({
      next: (candidats) => this.mergeUsersIntoFeed(candidats, 'CANDIDAT'),
      error: () => { }
    });

    // Recruteurs récents pour le feed
    this.adminService.getAllRecruteurs().subscribe({
      next: (recruteurs) => this.mergeUsersIntoFeed(recruteurs, 'RECRUTEUR'),
      error: () => { }
    });

    this.isLoading.set(false);
  }

  /** Build activity feed from offers */
  private buildActivityFeed(offres: Offre[]): void {
    const items: { title: string; detail: string; time: string; color: string; dateMs: number }[] = [];

    for (const o of offres.slice(0, 6)) {
      const d = new Date(o.publicationDate);
      const ms = d.getTime();
      if (o.status === 'PUBLIEE') {
        items.push({ title: 'Offre publiée', detail: o.title, time: this.timeAgo(d), color: 'dot-green', dateMs: ms });
      } else if (o.status === 'FERMEE') {
        items.push({ title: 'Offre fermée', detail: o.title, time: this.timeAgo(d), color: 'dot-red', dateMs: ms });
      } else {
        items.push({ title: 'Brouillon créé', detail: o.title, time: this.timeAgo(d), color: 'dot-orange', dateMs: ms });
      }
      if (o.nombreCandidatures > 0) {
        items.push({ title: 'Nouvelle candidature', detail: o.title, time: this.timeAgo(d), color: 'dot-blue', dateMs: ms });
      }
    }

    items.sort((a, b) => b.dateMs - a.dateMs);
    this.recentActivities.set(items.slice(0, 6));
  }

  /** Merge user inscriptions into the activity feed */
  private mergeUsersIntoFeed(users: any[], type: 'CANDIDAT' | 'RECRUTEUR'): void {
    const items = [...this.recentActivities()];

    const sorted = [...users].sort((a, b) =>
      new Date(b.dateInscription).getTime() - new Date(a.dateInscription).getTime()
    ).slice(0, 3);

    for (const u of sorted) {
      const d = new Date(u.dateInscription);
      const ms = d.getTime();
      if (type === 'CANDIDAT') {
        items.push({ title: 'Inscription', detail: `${u.prenom} ${u.nom?.[0]}. (candidat)`, time: this.timeAgo(d), color: 'dot-purple', dateMs: ms });
      } else {
        items.push({ title: 'Recruteur validé', detail: u.entreprise || `${u.prenom} ${u.nom}`, time: this.timeAgo(d), color: 'dot-green', dateMs: ms });
      }
    }

    items.sort((a, b) => b.dateMs - a.dateMs);
    this.recentActivities.set(items.slice(0, 6));
  }

  /** Human-readable relative time */
  private timeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'à l\'instant';
    if (mins < 60) return `il y a ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `il y a ${hrs} h`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return 'hier';
    if (days < 7) return `il y a ${days} j`;
    return `il y a ${Math.floor(days / 7)} sem`;
  }

  getBarHeight(value: number): string {
    const max = this.maxValue;
    return `${(value / max) * 130}px`;
  }

  getInitiales(prenom: string, nom: string): string {
    return ((prenom?.[0] || '') + (nom?.[0] || '')).toUpperCase();
  }

  getPhotoUrl(photo?: string): string {
    if (!photo) return '';
    if (photo.startsWith('http')) return photo;
    return `http://localhost:8081/uploads/images/${photo}`;
  }

  viewProfile(user: User): void {
    this.router.navigate(['/admin/recruteur', user.id]);
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }

  getOfferStatusLabel(status: string): string {
    switch (status) {
      case 'PUBLIEE': return 'Actif';
      case 'FERMEE': return 'Expiré';
      case 'BROUILLON': return 'Brouillon';
      default: return status;
    }
  }

  getOfferStatusClass(status: string): string {
    switch (status) {
      case 'PUBLIEE': return 'status-green';
      case 'FERMEE': return 'status-red';
      case 'BROUILLON': return 'status-orange';
      default: return 'status-orange';
    }
  }

  // Donut segments as strokeDasharray strings
  get donutTotal(): number {
    return this.adminService.stats()?.candidaturesTraitees || 0;
  }

  getDonutDasharray(count: number): string {
    if (!this.donutTotal) return '0 100';
    const pct = (count / this.donutTotal) * 100;
    return `${pct.toFixed(1)} ${(100 - pct).toFixed(1)}`;
  }

  formatDate(date: Date): string {
    const jours = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const mois = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    return `${jours[date.getDay()]} ${date.getDate()} ${mois[date.getMonth()]} ${date.getFullYear()}`;
  }

  // Recruiter Modal Methods
  openAddModal(): void {
    this.newRecruiter = { nom: '', prenom: '', email: '', entreprise: '', ville: '' };
    this.showAddModal.set(true);
    this.errorMessage.set('');
  }

  closeAddModal(): void {
    this.showAddModal.set(false);
  }

  submitAddRecruiter(): void {
    if (!this.newRecruiter.email || !this.newRecruiter.nom || !this.newRecruiter.entreprise) {
      this.errorMessage.set('Veuillez remplir les champs obligatoires (Nom, Email, Entreprise)');
      return;
    }

    this.isSubmitting.set(true);
    this.adminService.createRecruiter(this.newRecruiter).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeAddModal();
        this.adminService.refreshStats();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.message || 'Erreur lors de la création du recruteur');
      }
    });
  }
}