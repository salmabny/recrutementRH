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

    // Admin connecté (Signal)
    adminUser = this.authService.currentUser;

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

    // Compteurs
    totalPubliees = computed(() => this.offres().filter(o => o.status === 'PUBLIEE').length);
    totalFermees = computed(() => this.offres().filter(o => o.status === 'FERMEE').length);
    totalBrouillons = computed(() => this.offres().filter(o => o.status === 'BROUILLON').length);

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

    supprimer(offre: Offre): void {
        if (!confirm(`Supprimer l'offre "${offre.title}" ? Cette action est irréversible.`)) return;

        this.adminService.deleteJobOffer(offre.id).subscribe({
            next: () => {
                this.offres.update(list => list.filter(o => o.id !== offre.id));
            },
            error: () => this.errorMessage.set('Erreur lors de la suppression de l\'offre')
        });
    }

    onSearch(event: Event): void {
        this.searchTerm.set((event.target as HTMLInputElement).value);
    }

    onFilterChange(event: Event): void {
        this.filterStatut.set((event.target as HTMLSelectElement).value);
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
}
