import { Component, OnInit, signal, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CandidatService } from '../../services/candidat.service';
import { AuthService } from '../../services/auth.service';
import { OffreService } from '../../services/offre.service';
import { NotificationService } from '../../services/notification.service';

import { SidebarCandidatComponent } from '../sidebar-candidat/sidebar-candidat.component';

@Component({
  selector: 'app-offres-disponibles',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarCandidatComponent],
  templateUrl: './offres-disponibles.component.html',
  styleUrls: ['./offres-disponibles.component.css']
})
export class OffresDisponiblesComponent implements OnInit {

  private candidatService = inject(CandidatService);
  private authService = inject(AuthService);
  private offreService = inject(OffreService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private notificationService = inject(NotificationService);

  offres = signal<any[]>([]);
  candidat = signal<any | null>(null);
  isLoading = signal(true);
  searchTerm = signal('');
  appliedOffreIds = signal<number[]>([]);
  showAlreadyAppliedToast = signal(false);
  scores = signal<{ [offreId: number]: number }>({});

  // Tabs & Categories
  selectedTab = signal<'available' | 'applied' | 'recommended'>('available');
  selectedCategory = signal<string>('Toutes');
  categories = [
    'Toutes', 'Informatique', 'Marketing', 'Finance', 'RH', 'Vente',
    'Santé', 'Éducation', 'Design', 'Ingénierie', 'Autre'
  ];

  candidatures = signal<any[]>([]);
  selectedStatusFilter = signal<string>('Toutes');

  constructor() {
    // Reset pagination when searching
    effect(() => {
      this.searchTerm();
      this.currentPageAvailable.set(1);
      this.currentPageApplied.set(1);
    }, { allowSignalWrites: true });
  }

  // Pagination for Available tab
  currentPageAvailable = signal(1);
  // Pagination for Applied tab
  currentPageApplied = signal(1);
  pageSize = 3;

  // Computed property for filtered offers (Available tab)
  offresFiltrees = computed(() => {
    let list = this.offres();
    const appliedIds = this.appliedOffreIds();
    const term = this.searchTerm().toLowerCase();
    const cat = this.selectedCategory();

    // 1. Exclude already applied offers
    list = list.filter((o: any) => !appliedIds.includes(o.id));

    // 2. Filter by Category
    if (cat !== 'Toutes') {
      list = list.filter((o: any) => o.category === cat);
    }

    // 3. Filter by Search Term
    if (term) {
      list = list.filter((o: any) =>
        o.title?.toLowerCase().includes(term) ||
        o.recruteur?.entreprise?.toLowerCase().includes(term) ||
        o.location?.toLowerCase().includes(term)
      );
    }

    return list;
  });

  paginatedOffres = computed(() => {
    const list = this.offresFiltrees();
    const startIndex = (this.currentPageAvailable() - 1) * this.pageSize;
    return list.slice(startIndex, startIndex + this.pageSize);
  });

  totalPagesAvailable = computed(() => Math.ceil(this.offresFiltrees().length / this.pageSize));

  // Recommended offers (Score >= 70)
  offresRecommandees = computed(() => {
    return this.offres().filter(o => {
      const score = this.getScore(o.id) || 0;
      const appliedIds = this.appliedOffreIds();
      return score >= 70 && !appliedIds.includes(o.id);
    }).sort((a, b) => (this.getScore(b.id) || 0) - (this.getScore(a.id) || 0));
  });

  paginatedOffresRecommandees = computed(() => {
    const list = this.offresRecommandees();
    const startIndex = (this.currentPageAvailable() - 1) * this.pageSize;
    return list.slice(startIndex, startIndex + this.pageSize);
  });

  totalPagesRecommended = computed(() => Math.ceil(this.offresRecommandees().length / this.pageSize));

  // Computed properties for Applied tab stats
  statsSoumises = computed(() => this.candidatures().filter(c => c.status === 'SOUMISE').length);
  statsAcceptees = computed(() => this.candidatures().filter(c => c.status === 'ACCEPTEE' || c.status === 'VALIDEE' || c.status === 'ACCEPTÉE').length);
  statsRefusees = computed(() => this.candidatures().filter(c => c.status === 'REFUSEE' || c.status === 'REFUSÉE').length);
  statsBestScore = computed(() => {
    const list = this.candidatures();
    if (list.length === 0) return 0;
    return Math.max(...list.map(c => c.score || 0));
  });

  // Computed property for filtered candidatures (Applied tab)
  candidaturesFiltrees = computed(() => {
    let list = this.candidatures();
    const status = this.selectedStatusFilter();
    const term = this.searchTerm().toLowerCase();

    // 1. Filter by status
    if (status === 'Soumises') {
      list = list.filter(c => c.status === 'SOUMISE' || c.status === 'EN_COURS');
    } else if (status === 'Acceptées') {
      list = list.filter(c => c.status === 'ACCEPTEE' || c.status === 'VALIDEE' || c.status === 'ACCEPTÉE');
    } else if (status === 'Refusées') {
      list = list.filter(c => c.status === 'REFUSEE' || c.status === 'REFUSÉE');
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

  paginatedCandidatures = computed(() => {
    const list = this.candidaturesFiltrees();
    const startIndex = (this.currentPageApplied() - 1) * this.pageSize;
    return list.slice(startIndex, startIndex + this.pageSize);
  });

  totalPagesApplied = computed(() => Math.ceil(this.candidaturesFiltrees().length / this.pageSize));

  ngOnInit(): void {
    const user = this.authService.currentUser();
    if (user && user.id) {
      this.loadOffres();
      this.loadProfil(user.id);
      this.loadAppliedOffreIds(user.id);
      this.loadScores(user.id);

      // Check for tab query param
      this.route.queryParams.subscribe(params => {
        if (params['tab'] === 'recommended') {
          this.selectedTab.set('recommended');
        }
      });
    }
  }

  loadAppliedOffreIds(userId: number): void {
    this.candidatService.getMesCandidatures(userId).subscribe({
      next: (list) => {
        this.candidatures.set(list);
        this.notificationService.seedFromCandidaturesForCandidat(list);
        const ids = list.map((c: any) => c.jobOffer?.id).filter((id: any) => !!id);
        this.appliedOffreIds.set(ids);
      },
      error: (err) => console.error('Erreur chargement IDs postulations:', err)
    });
  }

  loadScores(userId: number): void {
    this.candidatService.getAllScoresCV(userId).subscribe({
      next: (data) => {
        this.scores.set(data);
      },
      error: (err) => console.error('Erreur chargement scores CV:', err)
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

  getScore(offreId: number): number | undefined {
    return this.scores()[offreId];
  }

  getScoreDashOffset(score: number): number {
    const r = 20; // radius
    const circumference = 2 * Math.PI * r;
    return circumference - (score / 100) * circumference;
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

  // --- Additions for tabs ---
  setTab(tab: 'available' | 'applied' | 'recommended'): void {
    this.selectedTab.set(tab);
    this.resetPagination();
  }

  setCategory(cat: string): void {
    this.selectedCategory.set(cat);
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

  // --- Pagination Methods ---
  setPageAvailable(p: number): void {
    if (p >= 1 && p <= this.totalPagesAvailable()) {
      this.currentPageAvailable.set(p);
    }
  }

  setPageApplied(p: number): void {
    if (p >= 1 && p <= this.totalPagesApplied()) {
      this.currentPageApplied.set(p);
    }
  }

  // Reset pagination on filter change
  resetPagination(): void {
    this.currentPageAvailable.set(1);
    this.currentPageApplied.set(1);
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
}
