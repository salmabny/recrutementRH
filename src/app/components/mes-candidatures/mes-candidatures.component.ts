import { Component, OnInit, signal, inject, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CandidatService } from '../../services/candidat.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

import { SidebarCandidatComponent } from '../sidebar-candidat/sidebar-candidat.component';

@Component({
  selector: 'app-mes-candidatures',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarCandidatComponent],
  templateUrl: './mes-candidatures.component.html',
  styleUrls: ['./mes-candidatures.component.css']
})
export class MesCandidaturesComponent implements OnInit {

  private candidatService = inject(CandidatService);
  private authService = inject(AuthService);
  private router = inject(Router);
  public notificationService = inject(NotificationService);

  showNotifications = signal(false);

  searchTerm = signal<string>('');

  constructor() {
    // Reset pagination when searching
    effect(() => {
      this.searchTerm();
      this.currentPage.set(1);
    }, { allowSignalWrites: true });
  }

  candidatures = signal<any[]>([]);
  candidat = signal<any | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);

  // Filtering signals
  selectedStatusFilter = signal<string>('Toutes');

  // Pagination for Applied history
  currentPage = signal(1);
  pageSize = 3;

  candidaturesFiltrees = computed(() => {
    let list = this.candidatures();
    const filter = this.selectedStatusFilter();
    const term = this.searchTerm().toLowerCase();

    // 1. Filter by status
    if (filter !== 'Toutes') {
      list = list.filter(c => {
        const status = c.status?.toUpperCase();
        if (filter === 'Soumises') return status === 'SOUMISE' || status === 'EN_COURS';
        if (filter === 'Acceptées') return status === 'ACCEPTEE' || status === 'VALIDEE';
        if (filter === 'Refusées') return status === 'REFUSEE';
        return true;
      });
    }

    // 2. Filter by search term
    if (term) {
      list = list.filter(c =>
        c.jobOffer?.title?.toLowerCase().includes(term) ||
        c.jobOffer?.recruteur?.entreprise?.toLowerCase().includes(term) ||
        c.jobOffer?.location?.toLowerCase().includes(term)
      );
    }

    return list;
  });

  // Filter change handler
  setFilter(filter: string): void {
    this.selectedStatusFilter.set(filter);
    this.resetPagination();
  }

  paginatedCandidatures = computed(() => {
    const list = this.candidaturesFiltrees();
    const startIndex = (this.currentPage() - 1) * this.pageSize;
    return list.slice(startIndex, startIndex + this.pageSize);
  });

  totalPages = computed(() => Math.ceil(this.candidaturesFiltrees().length / this.pageSize));

  statsBestScore = computed(() => {
    const list = this.candidatures();
    if (list.length === 0) return 0;
    return Math.max(...list.map(c => c.score || 0));
  });

  getPhotoUrl(photo?: string): string {
    if (!photo) return '';
    if (photo.startsWith('http')) return photo;
    return `http://localhost:8081/uploads/images/${photo}`;
  }

  // Statistics signals
  pendingCount = signal(0);
  acceptedCount = signal(0);
  refusedCount = signal(0);

  ngOnInit(): void {
    const user = this.authService.currentUser();
    if (user && user.id) {
      this.loadCandidatures(user.id);
      this.loadProfil(user.id);
    } else {
      this.error.set("Session expirée. Veuillez vous reconnecter.");
      this.isLoading.set(false);
    }
  }

  total = computed(() => this.candidatures().length);

  loadCandidatures(userId: number): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.candidatService.getMesCandidatures(userId).subscribe({
      next: (data) => {
        this.candidatures.set(data);
        this.calculateStats(data);
        this.notificationService.seedFromCandidaturesForCandidat(data);
        this.error.set(null);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Erreur candidatures:', err);
        this.error.set("Impossible de récupérer vos candidatures. Veuillez vérifier votre connexion.");
        this.isLoading.set(false);
      }
    });
  }

  calculateStats(list: any[]): void {
    const pending = list.filter(c => c.status === 'SOUMISE' || c.status === 'EN_COURS').length;
    const accepted = list.filter(c => c.status === 'ACCEPTEE' || c.status === 'VALIDEE').length;
    const refused = list.filter(c => c.status === 'REFUSEE').length;

    this.pendingCount.set(pending);
    this.acceptedCount.set(accepted);
    this.refusedCount.set(refused);
  }

  getStatusConfig(status: string) {
    const configs: { [key: string]: { label: string, css: string } } = {
      'SOUMISE': { label: 'Soumise', css: 'tag-blue' },
      'EN_COURS': { label: 'En cours', css: 'tag-orange' },
      'REFUSEE': { label: 'Refusée', css: 'tag-red' },
      'ACCEPTEE': { label: 'Acceptée', css: 'tag-green' },
      'VALIDEE': { label: 'Validée', css: 'tag-green' }
    };
    return configs[status] || { label: status, css: 'tag-blue' };
  }

  getScoreClass(score: number): string {
    if (score >= 70) return 'score-high';
    if (score >= 40) return 'score-mid';
    return 'score-low';
  }

  loadProfil(userId: number): void {
    this.candidatService.getProfil(userId).subscribe({
      next: (data) => {
        this.candidat.set(data);
        this.authService.updateUser(data as any);
      },
      error: (err) => console.error('Erreur profil sidebar:', err)
    });
  }

  getInitiales(): string {
    const c = this.candidat();
    if (!c) return 'C';
    return `${c.prenom?.charAt(0) || ''}${c.nom?.charAt(0) || ''}`.toUpperCase();
  }

  onRetry(): void {
    const user = this.authService.currentUser();
    if (user && user.id) {
      this.loadCandidatures(user.id);
      this.loadProfil(user.id);
    } else {
      this.logout();
    }
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }

  // --- Pagination Methods ---
  setPage(p: number): void {
    if (p >= 1 && p <= this.totalPages()) {
      this.currentPage.set(p);
    }
  }

  resetPagination(): void {
    this.currentPage.set(1);
  }

  viewCV(c: any) {
    const token = localStorage.getItem('auth-token');
    const cvUrl = c.cv?.fileUrl;
    if (cvUrl) {
      let url = cvUrl.startsWith('http') ? cvUrl : `http://localhost:8081/uploads/cv/${cvUrl}`;
      if (token) {
        url += (url.includes('?') ? '&' : '?') + `token=${token}`;
      }
      window.open(url, '_blank');
    } else {
      alert("Aucun CV n'est disponible pour cette candidature.");
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}