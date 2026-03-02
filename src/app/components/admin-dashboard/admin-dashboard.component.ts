import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import { AuthService } from '../../services/auth.service';
import { User, AdminStats, MonthlyChartData } from '../../models/user.model';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {

  private authService = inject(AuthService);
  public adminService = inject(AdminService);

  enAttente = signal<User[]>([]);
  chartData = signal<MonthlyChartData[]>([]);
  isLoading = signal(true);
  errorMessage = signal('');

  // Admin connecté (Signal)
  adminUser = this.authService.currentUser;

  viewDocument(userId: number): void {
    const url = `http://localhost:8081/api/admin/document/${userId}`;
    window.open(url, '_blank');
  }

  // Hauteur max calculée dynamiquement depuis les données réelles
  get maxValue(): number {
    const data = this.chartData();
    if (!data.length) return 1;
    return Math.max(...data.map(d => Math.max(d.inscriptions, d.recruteurs, d.candidatures)), 1);
  }

  constructor(
    private router: Router
  ) { }

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
      error: () => {
        // Fallback : graphique vide en cas d'erreur (pas de données inventées)
        this.chartData.set([]);
      }
    });

    // Recruteurs en attente
    this.adminService.getRecruteursEnAttente().subscribe({
      next: (data) => {
        this.enAttente.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Erreur chargement recruteurs en attente');
        this.isLoading.set(false);
      }
    });
  }

  valider(user: User): void {
    this.adminService.validerRecruteur(user.id).subscribe({
      next: () => {
        this.enAttente.update(list => list.filter(u => u.id !== user.id));
        if (this.adminService.stats()) {
          this.adminService.stats.update(s => s ? {
            ...s,
            recruteursEnAttente: s.recruteursEnAttente - 1,
            totalRecruteurs: s.totalRecruteurs + 1
          } : s);
        }
      },
      error: () => this.errorMessage.set('Erreur lors de la validation')
    });
  }

  refuser(user: User): void {
    this.adminService.refuserRecruteur(user.id).subscribe({
      next: () => {
        this.enAttente.update(list => list.filter(u => u.id !== user.id));
        if (this.adminService.stats()) {
          this.adminService.stats.update(s => s ? {
            ...s,
            recruteursEnAttente: s.recruteursEnAttente - 1
          } : s);
        }
      },
      error: () => this.errorMessage.set('Erreur lors du refus')
    });
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
}