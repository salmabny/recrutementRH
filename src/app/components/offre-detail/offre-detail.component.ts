import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { OffreService } from '../../services/offre.service';
import { AuthService } from '../../services/auth.service';
import { AdminService } from '../../services/admin.service';
import { CandidatService } from '../../services/candidat.service';
import { ToastService } from '../../services/toast.service';
import { Offre } from '../../models/offre.model';

import { SidebarCandidatComponent } from '../sidebar-candidat/sidebar-candidat.component';
import { SidebarRecruteurComponent } from '../sidebar-recruteur/sidebar-recruteur.component';

@Component({
    selector: 'app-offre-detail',
    standalone: true,
    imports: [CommonModule, SidebarCandidatComponent, SidebarRecruteurComponent],
    templateUrl: './offre-detail.component.html',
    styleUrls: ['./offre-detail.component.css']
})
export class OffreDetailComponent implements OnInit {

    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private offreService = inject(OffreService);
    private authService = inject(AuthService);
    public adminService = inject(AdminService);
    private candidatService = inject(CandidatService);
    private toastService = inject(ToastService);

    offre = signal<Offre | null>(null);
    isLoading = signal(true);
    errorMessage = signal('');
    alreadyApplied = signal(false);

    user = computed(() => this.authService.currentUser());
    isRecruteur = computed(() => this.user()?.role === 'RECRUTEUR');
    isCandidat = computed(() => this.user()?.role === 'CANDIDAT');
    isAdmin = computed(() => this.user()?.role === 'ADMIN');

    get recruiterInfo() {
        const u = this.user();
        const r = this.offre()?.recruteur;
        return {
            id: r?.id || u?.id || 0,
            prenom: r?.prenom || u?.prenom || '',
            nom: r?.nom || u?.nom || '',
            entreprise: r?.entreprise || u?.entreprise || '',
            initiales: ((r?.prenom?.[0] || u?.prenom?.[0] || '') + (r?.nom?.[0] || u?.nom?.[0] || '')).toUpperCase()
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
                if (this.isCandidat()) {
                    this.checkAlreadyApplied(id);
                }
            },
            error: () => {
                this.errorMessage.set('Erreur lors du chargement de l\'offre');
                this.isLoading.set(false);
            }
        });
    }

    checkAlreadyApplied(offreId: number): void {
        const user = this.user();
        if (!user) return;

        this.candidatService.getMesCandidatures(user.id).subscribe({
            next: (list) => {
                const found = list.find((c: any) => c.jobOffer?.id === offreId);
                if (found) {
                    this.alreadyApplied.set(true);
                }
            },
            error: (err) => console.error('Erreur check already applied:', err)
        });
    }


    goBack(): void {
        if (this.isAdmin()) {
            this.router.navigate(['/admin/offres']);
        } else if (this.isCandidat()) {
            this.router.navigate(['/candidat/offres']);
        } else {
            this.router.navigate(['/recruteur/offres']);
        }
    }

    goToRecruteurProfile(): void {
        if (this.offre()?.recruteur?.id) {
            this.router.navigate(['/admin/recruteur', this.offre()?.recruteur?.id]);
        }
    }

    postuler(): void {
        if (this.alreadyApplied()) {
            this.toastService.showToast('Tu as déjà postulé pour cette offre', 'info');
            return;
        }
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
        this.authService.logout();
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
