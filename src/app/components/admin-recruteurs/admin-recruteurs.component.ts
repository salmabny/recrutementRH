import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import { AuthService } from '../../services/auth.service';
import { User, UserStatus } from '../../models/user.model';

@Component({
  selector: 'app-admin-recruteurs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-recruteurs.component.html',
  styleUrls: ['./admin-recruteurs.component.css']
})
export class AdminRecruteursComponent implements OnInit {

  private authService = inject(AuthService);

  recruteurs = signal<User[]>([]);
  isLoading = signal(true);
  errorMessage = signal('');
  searchTerm = signal('');
  filterStatut = signal('tous');

  // Admin connecté (Signal)
  adminUser = this.authService.currentUser;

  // Recruteurs filtrés
  recruteursFiltres = computed(() => {
    let list = this.recruteurs();

    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      list = list.filter(u =>
        u.nom.toLowerCase().includes(term) ||
        u.prenom.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        (u.entreprise?.toLowerCase().includes(term) ?? false)
      );
    }

    if (this.filterStatut() !== 'tous') {
      list = list.filter(u => u.status === this.filterStatut());
    }

    return list;
  });

  // Compteurs
  totalRecruteurs = computed(() => this.recruteurs().length);
  totalValides = computed(() => this.recruteurs().filter(u => u.status === 'ACTIVE').length);
  totalEnAttente = computed(() => this.recruteurs().filter(u => u.status === 'PENDING_ADMIN_VALIDATION').length);
  totalSuspendus = computed(() => this.recruteurs().filter(u => u.status === 'SUSPENDU').length);

  constructor(
    public adminService: AdminService,
    private router: Router
  ) { }

  logout(): void {
    this.authService.logout();
  }

  ngOnInit(): void {
    this.loadRecruteurs();
    this.adminService.refreshStats();
  }

  loadRecruteurs(): void {
    this.isLoading.set(true);

    this.adminService.getAllRecruteurs().subscribe({
      next: (data) => {
        this.recruteurs.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set('Erreur chargement liste des recruteurs');
        this.isLoading.set(false);
      }
    });
  }

  viewDocument(userId: number): void {
    const url = `http://localhost:8081/api/admin/document/${userId}`;
    window.open(url, '_blank');
  }

  valider(user: User): void {
    this.adminService.validerRecruteur(user.id).subscribe({
      next: () => {
        this.recruteurs.update(list =>
          list.map(u => u.id === user.id ? { ...u, status: 'ACTIVE' as UserStatus } : u)
        );
        this.adminService.refreshStats();
      },
      error: () => this.errorMessage.set('Erreur lors de la validation')
    });
  }

  suspendre(user: User): void {
    this.adminService.suspendreUser(user.id).subscribe({
      next: () => {
        this.recruteurs.update(list =>
          list.map(u => u.id === user.id ? { ...u, status: 'SUSPENDU' as UserStatus } : u)
        );
        this.adminService.refreshStats();
      },
      error: () => this.errorMessage.set('Erreur lors de la suspension')
    });
  }

  activer(user: User): void {
    this.adminService.activerUser(user.id).subscribe({
      next: () => {
        this.recruteurs.update(list =>
          list.map(u => u.id === user.id ? { ...u, status: 'ACTIVE' as UserStatus } : u)
        );
        this.adminService.refreshStats();
      },
      error: () => this.errorMessage.set('Erreur lors de l\'activation')
    });
  }

  supprimer(user: User): void {
    if (!confirm(`Supprimer ${user.prenom} ${user.nom} ?`)) return;

    this.adminService.supprimerUser(user.id).subscribe({
      next: () => {
        this.recruteurs.update(list => list.filter(u => u.id !== user.id));
        this.adminService.refreshStats();
      },
      error: () => this.errorMessage.set('Erreur lors de la suppression')
    });
  }

  onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  onFilterChange(event: Event): void {
    this.filterStatut.set((event.target as HTMLSelectElement).value);
  }

  getInitiales(prenom: string, nom: string): string {
    return ((prenom?.[0] || '') + (nom?.[0] || '')).toUpperCase();
  }

  getPhotoUrl(photo?: string): string {
    if (!photo) return '';
    if (photo.startsWith('http')) return photo;
    return `http://localhost:8081/uploads/images/${photo}`;
  }



  navigateTo(path: string): void {
    this.router.navigate([path]);
  }
}