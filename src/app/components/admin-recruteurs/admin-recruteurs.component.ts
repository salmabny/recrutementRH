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

  // Pagination
  currentPage = signal(1);
  itemsPerPage = signal(4);

  // Modal ajout
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

  // Modal Email
  showEmailModal = signal(false);
  emailMessage = signal('');
  sendingEmail = signal(false);
  emailSuccess = signal('');
  emailError = signal('');
  selectedRecruiter = signal<User | null>(null);

  // Modal Suppression
  showDeleteModal = signal(false);
  userToDelete = signal<User | null>(null);

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

  paginatedRecruteurs = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    const end = start + this.itemsPerPage();
    return this.recruteursFiltres().slice(start, end);
  });

  totalPages = computed(() => Math.ceil(this.recruteursFiltres().length / this.itemsPerPage()));

  // Compteurs
  totalRecruteurs = computed(() => this.recruteurs().length);
  totalValides = computed(() => this.recruteurs().filter(u => u.status === 'ACTIVE').length);
  totalSuspendus = computed(() => this.recruteurs().filter(u => u.status === 'SUSPENDU').length);
  totalSupprimes = computed(() => this.recruteurs().filter(u => u.status === 'DELETED').length);

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

  confirmDelete(user: User): void {
    this.userToDelete.set(user);
    this.showDeleteModal.set(true);
  }

  cancelDelete(): void {
    this.showDeleteModal.set(false);
    this.userToDelete.set(null);
  }

  executeDelete(): void {
    const user = this.userToDelete();
    if (!user) return;

    this.adminService.supprimerUser(user.id).subscribe({
      next: () => {
        this.recruteurs.update(list =>
          list.map(u => u.id === user.id ? { ...u, status: 'DELETED' as UserStatus } : u)
        );
        this.adminService.refreshStats();
        this.cancelDelete();
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Erreur lors de la suppression');
        this.cancelDelete();
      }
    });
  }

  restaurer(user: User): void {
    this.adminService.restaurerUser(user.id).subscribe({
      next: () => {
        this.recruteurs.update(list =>
          list.map(u => u.id === user.id ? { ...u, status: 'ACTIVE' as UserStatus } : u)
        );
        this.adminService.refreshStats();
      },
      error: () => this.errorMessage.set('Erreur lors de la restauration')
    });
  }

  onSearch(event: Event): void {
    const term = (event.target as HTMLInputElement).value;
    this.searchTerm.set(term);
    this.currentPage.set(1);
  }

  onFilterChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.filterStatut.set(val);
    this.currentPage.set(1);
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

  getUserColor(user: User): string {
    if (user.status === 'SUSPENDU') return 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)';
    if (user.status === 'DELETED') return 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)';
    // Default blue/purple gradient
    return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'ACTIVE': return 'status-active';
      case 'SUSPENDU': return 'status-suspended';
      case 'DELETED': return 'status-deleted';
      case 'PENDING_ADMIN_VALIDATION': return 'status-pending';
      default: return '';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'ACTIVE': return 'Validé';
      case 'SUSPENDU': return 'Suspendu';
      case 'DELETED': return 'Supprimé';
      case 'PENDING_ADMIN_VALIDATION': return 'En attente';
      default: return status;
    }
  }

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
        this.loadRecruteurs();
        this.adminService.refreshStats();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.message || 'Erreur lors de la création du recruteur');
      }
    });
  }

  // Navigation pagination
  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

  goToPage(p: number): void {
    this.currentPage.set(p);
  }

  getPages(): number[] {
    const total = this.totalPages();
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);

    const current = this.currentPage();
    if (current <= 3) return [1, 2, 3, 4, 5];
    if (current >= total - 2) return [total - 4, total - 3, total - 2, total - 1, total];
    return [current - 2, current - 1, current, current + 1, current + 2];
  }

  // ── Modal Email handlers
  envoyerEmailDirect(user: User): void {
    this.selectedRecruiter.set(user);
    this.emailMessage.set('');
    this.emailSuccess.set('');
    this.emailError.set('');
    this.showEmailModal.set(true);
  }

  closeEmailModal(): void {
    this.showEmailModal.set(false);
    this.selectedRecruiter.set(null);
  }

  sendEmail(): void {
    const user = this.selectedRecruiter();
    const message = this.emailMessage().trim();
    if (!user || !message) return;

    this.sendingEmail.set(true);
    this.emailError.set('');

    const subject = `Message de l'administration SmartHiring`;

    this.adminService.envoyerEmail(user.email, subject, message).subscribe({
      next: () => {
        this.sendingEmail.set(false);
        this.emailSuccess.set('Email envoyé avec succès !');
        setTimeout(() => this.closeEmailModal(), 1500);
      },
      error: (err) => {
        this.sendingEmail.set(false);
        const msg = err.error?.message || err.error || 'Erreur lors de l\'envoi de l\'email.';
        this.emailError.set(msg);
      }
    });
  }
}