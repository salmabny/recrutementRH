import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import { AuthService } from '../../services/auth.service';
import { User, UserRole } from '../../models/user.model';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.css']
})
export class AdminUsersComponent implements OnInit {

  private authService = inject(AuthService);

  users = signal<User[]>([]);
  isLoading = signal(true);
  errorMessage = signal('');
  searchTerm = signal('');
  filterRole = signal('tous');
  filterStatut = signal('tous');
  selectedIds = signal<number[]>([]);

  // Admin connecté (Signal)
  adminUser = this.authService.currentUser;

  // Utilisateurs filtrés
  usersFiltres = computed(() => {
    let list = this.users();

    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      list = list.filter(u =>
        u.nom.toLowerCase().includes(term) ||
        u.prenom.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term)
      );
    }

    if (this.filterRole() !== 'tous') {
      list = list.filter(u =>
        u.role === this.filterRole().toUpperCase()
      );
    }

    if (this.filterStatut() !== 'tous') {
      list = list.filter(u =>
        u.status === this.filterStatut()
      );
    }

    return list;
  });

  // Compteurs
  totalRecruteurs = computed(() =>
    this.users().filter(u => u.role === 'RECRUTEUR').length
  );
  totalCandidats = computed(() =>
    this.users().filter(u => u.role === 'CANDIDAT').length
  );
  hasSelection = computed(() => this.selectedIds().length > 0);

  constructor(
    public adminService: AdminService,
    private router: Router
  ) { }

  logout(): void {
    this.authService.logout();
  }

  ngOnInit(): void {
    this.loadUsers();
    this.adminService.refreshStats();
  }

  loadUsers(): void {
    this.isLoading.set(true);

    this.adminService.getAllUsers().subscribe({
      next: (data) => {
        this.users.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        // Mock si API pas prête
        this.users.set([
          {
            id: 1, nom: 'Dupont', prenom: 'Marie',
            email: 'marie@techcorp.fr',
            role: 'RECRUTEUR', status: 'ACTIVE',
            entreprise: 'Tech Corp SAS', ville: 'Paris',
            dateInscription: '2026-01-12', nombreOffres: 8
          },
          {
            id: 2, nom: 'Bernard', prenom: 'Lucas',
            email: 'lucas.bernard@gmail.com',
            role: 'CANDIDAT', status: 'ACTIVE',
            ville: 'Paris', dateInscription: '2026-01-18'
          },
          {
            id: 3, nom: 'Durand', prenom: 'Jean',
            email: 'jean.durand@innovate.fr',
            role: 'RECRUTEUR', status: 'PENDING_ADMIN_VALIDATION',
            entreprise: 'InnovateTech SARL', ville: 'Paris',
            dateInscription: '2026-02-20', nombreOffres: 0
          },
          {
            id: 4, nom: 'Ait Bella', prenom: 'Sara',
            email: 'sara.ait@outlook.com',
            role: 'CANDIDAT', status: 'ACTIVE',
            ville: 'Lyon', dateInscription: '2026-02-02'
          },
          {
            id: 5, nom: 'Renaud', prenom: 'Claire',
            email: 'c.renaud@creative.studio',
            role: 'RECRUTEUR', status: 'SUSPENDU',
            entreprise: 'Creative Studio', ville: 'Remote',
            dateInscription: '2025-11-15', nombreOffres: 3
          },
          {
            id: 6, nom: 'Moreau', prenom: 'Thomas',
            email: 'thomas.moreau@gmail.com',
            role: 'CANDIDAT', status: 'ACTIVE',
            ville: 'Bordeaux', dateInscription: '2026-01-28'
          },
          {
            id: 7, nom: 'Martin', prenom: 'Sophie',
            email: 's.martin@startuprh.com',
            role: 'RECRUTEUR', status: 'PENDING_ADMIN_VALIDATION',
            entreprise: 'StartupRH', ville: 'Lyon',
            dateInscription: '2026-02-20', nombreOffres: 0
          }
        ]);
        this.isLoading.set(false);
      }
    });
  }

  // ── Sélection
  toggleSelect(id: number): void {
    this.selectedIds.update(ids =>
      ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]
    );
  }

  isSelected(id: number): boolean {
    return this.selectedIds().includes(id);
  }

  toggleSelectAll(): void {
    const allIds = this.usersFiltres().map(u => u.id);
    const allSelected = allIds.every(id => this.selectedIds().includes(id));
    this.selectedIds.set(allSelected ? [] : allIds);
  }

  isAllSelected(): boolean {
    const allIds = this.usersFiltres().map(u => u.id);
    return allIds.length > 0 && allIds.every(id => this.selectedIds().includes(id));
  }

  // ── Actions individuelles
  supprimer(user: User): void {
    if (!confirm(`Supprimer ${user.prenom} ${user.nom} ?`)) return;

    this.adminService.supprimerUser(user.id).subscribe({
      next: () => {
        this.users.update(list => list.filter(u => u.id !== user.id));
        this.selectedIds.update(ids => ids.filter(i => i !== user.id));
      },
      error: () => this.errorMessage.set('Erreur lors de la suppression')
    });
  }

  toggleSuspension(user: User): void {
    const isSuspended = user.status === 'SUSPENDU';
    const action = isSuspended ? this.adminService.activerUser(user.id) : this.adminService.suspendreUser(user.id);
    const actionName = isSuspended ? 'activer' : 'suspendre';

    if (!confirm(`Voulez-vous ${actionName} le compte de ${user.prenom} ${user.nom} ?`)) return;

    action.subscribe({
      next: (updatedUser) => {
        this.users.update(list => list.map(u => u.id === user.id ? updatedUser : u));
      },
      error: () => this.errorMessage.set(`Erreur lors de l'action ${actionName}`)
    });
  }

  // ── Suppression en masse
  supprimerSelection(): void {
    const ids = this.selectedIds();
    if (!ids.length) return;
    if (!confirm(`Supprimer ${ids.length} utilisateur(s) ?`)) return;

    ids.forEach(id => {
      this.adminService.supprimerUser(id).subscribe({
        next: () => {
          this.users.update(list => list.filter(u => u.id !== id));
        }
      });
    });
    this.selectedIds.set([]);
  }

  // ── Filtres
  onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  onRoleChange(event: Event): void {
    this.filterRole.set((event.target as HTMLSelectElement).value);
  }

  onStatutChange(event: Event): void {
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

  getAvatarColor(role: UserRole): string {
    return role === 'RECRUTEUR'
      ? 'linear-gradient(135deg,#7b61ff,#4361ee)'
      : 'linear-gradient(135deg,#38a169,#2d9250)';
  }



  navigateTo(path: string): void {
    this.router.navigate([path]);
  }
}