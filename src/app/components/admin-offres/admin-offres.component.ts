import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import { AuthService } from '../../services/auth.service';
import { User, AdminStats, MonthlyChartData } from '../../models/user.model';
import { Offre } from '../../models/offre.model';

@Component({
    selector: 'app-admin-offres',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './admin-offres.component.html',
    styleUrls: ['./admin-offres.component.css']
})
export class AdminOffresComponent implements OnInit {

    private authService = inject(AuthService);
    public adminService = inject(AdminService);
    private router = inject(Router);

    offres = signal<Offre[]>([]);
    isLoading = signal(true);
    errorMessage = signal('');
    searchTerm = signal('');
    filterStatut = signal('tous');

    // Pagination
    currentPage = signal(1);
    itemsPerPage = signal(4);

    // Modal Suppression
    showDeleteModal = signal(false);
    offreToDelete = signal<Offre | null>(null);

    // Admin connecté (Signal)
    adminUser = this.authService.currentUser;

    // Stats
    totalOffres = computed(() => this.offres().length);
    totalPubliees = computed(() => this.offres().filter(o => o.status === 'PUBLIEE').length);
    totalFermees = computed(() => this.offres().filter(o => o.status === 'FERMEE').length);

    // Offres filtrées
    offresFiltrees = computed(() => {
        let list = this.offres();

        if (this.searchTerm()) {
            const term = this.searchTerm().toLowerCase();
            list = list.filter(o =>
                o.title.toLowerCase().includes(term) ||
                o.description.toLowerCase().includes(term) ||
                (o.recruteur?.entreprise?.toLowerCase().includes(term) ?? false) ||
                (o.recruteur?.nom?.toLowerCase().includes(term) ?? false) ||
                (o.recruteur?.prenom?.toLowerCase().includes(term) ?? false)
            );
        }

        if (this.filterStatut() !== 'tous') {
            list = list.filter(o => o.status === this.filterStatut());
        }

        return list;
    });

    paginatedOffres = computed(() => {
        const start = (this.currentPage() - 1) * this.itemsPerPage();
        const end = start + this.itemsPerPage();
        return this.offresFiltrees().slice(start, end);
    });

    totalPages = computed(() => Math.ceil(this.offresFiltrees().length / this.itemsPerPage()));

    ngOnInit(): void {
        this.loadOffres();
        this.adminService.refreshStats();
    }

    loadOffres(): void {
        this.isLoading.set(true);
        this.adminService.getAllJobOffers().subscribe({
            next: (data) => {
                this.offres.set(data);
                this.isLoading.set(false);
            },
            error: (err) => {
                this.errorMessage.set('Erreur chargement des offres');
                this.isLoading.set(false);
            }
        });
    }

    confirmDelete(offre: Offre): void {
        this.offreToDelete.set(offre);
        this.showDeleteModal.set(true);
    }

    cancelDelete(): void {
        this.showDeleteModal.set(false);
        this.offreToDelete.set(null);
    }

    executeDelete(): void {
        const offre = this.offreToDelete();
        if (!offre) return;

        this.adminService.deleteJobOffer(offre.id).subscribe({
            next: () => {
                this.offres.update(list => list.filter(o => o.id !== offre.id));
                this.adminService.refreshStats();
                this.cancelDelete();
            },
            error: () => {
                this.errorMessage.set('Erreur lors de la suppression de l\'offre');
                this.cancelDelete();
            }
        });
    }

    onSearch(event: Event): void {
        this.searchTerm.set((event.target as HTMLInputElement).value);
        this.currentPage.set(1);
    }

    onStatutChange(event: Event): void {
        this.filterStatut.set((event.target as HTMLSelectElement).value);
        this.currentPage.set(1);
    }

    logout(): void {
        this.authService.logout();
    }

    getPhotoUrl(photo?: string): string {
        if (!photo) return '';
        if (photo.startsWith('http')) return photo;
        return `http://localhost:8081/uploads/images/${photo}`;
    }

    navigateTo(path: string): void {
        this.router.navigate([path]);
    }

    getStatusClass(status: string): string {
        switch (status) {
            case 'PUBLIEE': return 'status-active';
            case 'FERMEE': return 'status-suspended';
            case 'BROUILLON': return 'status-pending';
            default: return '';
        }
    }

    getStatusLabel(status: string): string {
        switch (status) {
            case 'PUBLIEE': return 'Publiée';
            case 'FERMEE': return 'Fermée';
            case 'BROUILLON': return 'Brouillon';
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
