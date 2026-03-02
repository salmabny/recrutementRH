import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { OffreService } from '../../services/offre.service';
import { AuthService } from '../../services/auth.service';
import { Offre } from '../../models/offre.model';

@Component({
    selector: 'app-offre-detail',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './offre-detail.component.html',
    styleUrls: ['./offre-detail.component.css']
})
export class OffreDetailComponent implements OnInit {

    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private offreService = inject(OffreService);
    private authService = inject(AuthService);

    offre = signal<Offre | null>(null);
    isLoading = signal(true);
    errorMessage = signal('');

    user = computed(() => this.authService.currentUser());
    isRecruteur = computed(() => this.user()?.role === 'RECRUTEUR');
    isCandidat = computed(() => this.user()?.role === 'CANDIDAT');

    get recruiterInfo() {
        const u = this.user();
        return {
            id: u?.id || 0,
            prenom: u?.prenom || '',
            nom: u?.nom || '',
            entreprise: u?.entreprise || '',
            initiales: ((u?.prenom?.[0] || '') + (u?.nom?.[0] || '')).toUpperCase()
        };
    }

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.loadOffre(+id);
        }
    }

    loadOffre(id: number): void {
        this.isLoading.set(true);
        this.offreService.getOffreById(id).subscribe({
            next: (data) => {
                this.offre.set(data);
                this.isLoading.set(false);
            },
            error: () => {
                this.errorMessage.set('Erreur lors du chargement de l\'offre');
                this.isLoading.set(false);
            }
        });
    }


    goBack(): void {
        if (this.isCandidat()) {
            this.router.navigate(['/candidat/offres']);
        } else {
            this.router.navigate(['/recruteur/offres']);
        }
    }

    postuler(): void {
        if (this.offre()) {
            this.router.navigate(['/candidat/offres', this.offre()?.id, 'postuler']);
        }
    }

    editOffre(): void {
        if (this.offre() && this.isRecruteur()) {
            this.router.navigate(['/recruteur/offres/edit', this.offre()?.id]);
        }
    }

    logout(): void {
        if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
            this.authService.logout();
        }
    }

    navigateTo(path: string): void {
        this.router.navigate([path]);
    }

    getStatutConfig(statut?: string): { label: string; css: string } {
        switch (statut) {
            case 'PUBLIEE': return { label: 'Publiée', css: 'tag-green' };
            case 'FERMEE': return { label: 'Fermée', css: 'tag-gray' };
            case 'BROUILLON': return { label: 'Brouillon', css: 'tag-orange' };
            default: return { label: 'Brouillon', css: 'tag-orange' };
        }
    }
}
