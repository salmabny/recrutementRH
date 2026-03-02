import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CandidatService } from '../../services/candidat.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-mes-candidatures',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mes-candidatures.component.html',
  styleUrls: ['./mes-candidatures.component.css']
})
export class MesCandidaturesComponent implements OnInit {

  private candidatService = inject(CandidatService);
  private authService = inject(AuthService);
  private router = inject(Router);

  candidatures = signal<any[]>([]);
  candidat = signal<any | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);

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

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}