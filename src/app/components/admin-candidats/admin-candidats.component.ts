import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import { AuthService } from '../../services/auth.service';
import { User, UserRole } from '../../models/user.model';

@Component({
    selector: 'app-admin-candidats',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './admin-candidats.component.html',
    styleUrls: ['./admin-candidats.component.css']
})
export class AdminCandidatsComponent implements OnInit {

    private authService = inject(AuthService);

    candidats = signal<User[]>([]);
    isLoading = signal(true);
    errorMessage = signal('');
    searchTerm = signal('');
    filterStatut = signal('tous');

    // Pagination
    currentPage = signal(1);
    itemsPerPage = signal(4);

    // Modal Suppression
    showDeleteModal = signal(false);
    userToDelete = signal<User | null>(null);

    // Admin connecté (Signal)
    adminUser = this.authService.currentUser;

    // Candidats filtrés
    candidatsFiltres = computed(() => {
        let list = this.candidats();

        if (this.searchTerm()) {
            const term = this.searchTerm().toLowerCase();
            list = list.filter(u =>
                u.nom.toLowerCase().includes(term) ||
                u.prenom.toLowerCase().includes(term) ||
                u.email.toLowerCase().includes(term)
            );
        }

        if (this.filterStatut() !== 'tous') {
            list = list.filter(u =>
                u.status === this.filterStatut()
            );
        }

        return list;
    });

    paginatedCandidats = computed(() => {
        const start = (this.currentPage() - 1) * this.itemsPerPage();
        const end = start + this.itemsPerPage();
        return this.candidatsFiltres().slice(start, end);
    });

    totalPages = computed(() => Math.ceil(this.candidatsFiltres().length / this.itemsPerPage()));

    // Compteurs
    totalCandidats = computed(() => this.candidats().length);
    totalValides = computed(() => this.candidats().filter(u => u.status === 'ACTIVE').length);
    totalSuspendus = computed(() => this.candidats().filter(u => u.status === 'SUSPENDU').length);
    totalSupprimes = computed(() => this.candidats().filter(u => u.status === 'DELETED').length);

    constructor(
        public adminService: AdminService,
        private router: Router
    ) { }

    logout(): void {
        this.authService.logout();
    }

    ngOnInit(): void {
        this.loadCandidats();
        this.adminService.refreshStats();
    }

    loadCandidats(): void {
        this.isLoading.set(true);

        this.adminService.getAllCandidats().subscribe({
            next: (data) => {
                this.candidats.set(data);
                this.isLoading.set(false);
            },
            error: () => {
                this.errorMessage.set('Erreur lors du chargement des candidats');
                this.isLoading.set(false);
            }
        });
    }


    // ── Actions individuelles
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
                this.candidats.update(list =>
                    list.map(u => u.id === user.id ? { ...u, status: 'DELETED' } : u)
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
                this.candidats.update(list =>
                    list.map(u => u.id === user.id ? { ...u, status: 'ACTIVE' } : u)
                );
                this.adminService.refreshStats();
            },
            error: () => this.errorMessage.set('Erreur lors de la restauration')
        });
    }

    toggleSuspension(user: User): void {
        const isSuspended = user.status === 'SUSPENDU';
        const action = isSuspended ? this.adminService.activerUser(user.id) : this.adminService.suspendreUser(user.id);
        const actionName = isSuspended ? 'activer' : 'suspendre';

        if (!confirm(`Voulez-vous ${actionName} le compte de ${user.prenom} ${user.nom} ?`)) return;

        action.subscribe({
            next: (updatedUser) => {
                this.candidats.update(list => list.map(u => u.id === user.id ? updatedUser : u));
            },
            error: () => this.errorMessage.set(`Erreur lors de l'action ${actionName}`)
        });
    }


    // ── Filtres
    onSearch(event: Event): void {
        this.searchTerm.set((event.target as HTMLInputElement).value);
        this.currentPage.set(1);
    }

    onStatutChange(event: Event): void {
        this.filterStatut.set((event.target as HTMLSelectElement).value);
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
        // Green/Emerald gradient for candidates
        return 'linear-gradient(135deg, #38a169 0%, #2d9250 100%)';
    }

    getStatusClass(status: string): string {
        switch (status) {
            case 'ACTIVE': return 'status-active';
            case 'SUSPENDU': return 'status-suspended';
            case 'DELETED': return 'status-deleted';
            default: return '';
        }
    }

    getStatusLabel(status: string): string {
        switch (status) {
            case 'ACTIVE': return 'Actif';
            case 'SUSPENDU': return 'Suspendu';
            case 'DELETED': return 'Supprimé';
            default: return status;
        }
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
}
