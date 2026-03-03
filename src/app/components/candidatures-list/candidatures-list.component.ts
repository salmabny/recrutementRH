import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CandidatureService } from '../../services/candidature.service';
import { AuthService } from '../../services/auth.service';
import { Candidature, CandidatureStatus } from '../../models/candidature.model';

@Component({
    selector: 'app-candidatures-list',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './candidatures-list.component.html',
    styleUrls: ['./candidatures-list.component.css']
})
export class CandidaturesListComponent implements OnInit {
    private candidatureService = inject(CandidatureService);
    private authService = inject(AuthService);
    private router = inject(Router);

    // ── Signals
    candidatures = signal<Candidature[]>([]);
    isLoading = signal<boolean>(false);
    errorMessage = signal<string | null>(null);

    // Filtres
    searchQuery = signal<string>('');
    filterStatus = signal<string>('ALL');

    // Recruteur info (sidebar)
    recruteur = computed(() => {
        const user = this.authService.currentUser();
        return {
            prenom: user?.prenom || '',
            nom: user?.nom || '',
            entreprise: user?.entreprise || 'Ma Société',
            photoUrl: user?.photoUrl,
            initiales: (user?.prenom?.[0] || 'U') + (user?.nom?.[0] || '')
        };
    });

    // ── Computed
    filteredCandidatures = computed(() => {
        let list = this.candidatures();
        const query = this.searchQuery().toLowerCase();
        const status = this.filterStatus();

        if (query) {
            list = list.filter(c => {
                const firstName = c.candidat?.prenom?.toLowerCase() || '';
                const lastName = c.candidat?.nom?.toLowerCase() || '';
                const fullName = `${firstName} ${lastName}`.trim();
                const jobTitle = c.jobOffer?.title?.toLowerCase() || '';

                return firstName.includes(query) ||
                    lastName.includes(query) ||
                    fullName.includes(query) ||
                    jobTitle.includes(query);
            });
        }

        if (status !== 'ALL') {
            list = list.filter(c => c.status === status);
        }

        return list.sort((a, b) => new Date(b.dateCandidature).getTime() - new Date(a.dateCandidature).getTime());
    });

    ngOnInit(): void {
        const user = this.authService.currentUser();
        if (user) {
            this.loadCandidatures(user.id);
        }
    }

    loadCandidatures(recruiterId: number): void {
        this.isLoading.set(true);
        this.candidatureService.getCandidaturesByRecruteur(recruiterId).subscribe({
            next: (data) => {
                this.candidatures.set(data);
                this.isLoading.set(false);
            },
            error: (err) => {
                this.errorMessage.set("Erreur lors de la récupération des candidatures");
                this.isLoading.set(false);
            }
        });
    }

    updateStatus(candidature: Candidature, newStatus: CandidatureStatus): void {
        if (!confirm(`Voulez-vous marquer cette candidature comme ${this.getStatusLabel(newStatus)} ?`)) return;

        this.candidatureService.updateStatut(candidature.id, newStatus).subscribe({
            next: (updated) => {
                this.candidatures.update(list => list.map(c => c.id === updated.id ? updated : c));
            },
            error: () => alert("Erreur lors de la mise à jour du statut")
        });
    }

    getPhotoUrlHelper(photo?: string): string {
        if (!photo) return '';
        if (photo.startsWith('http')) return photo;
        return `http://localhost:8081/uploads/images/${photo}`;
    }

    getPhotoUrl(candidat: any): string {
        const url = candidat?.photoUrl;
        if (!url) return '';
        if (url.startsWith('http')) return url;
        return `http://localhost:8081/uploads/images/${url}`;
    }

    viewCV(candidature: Candidature): void {
        // Priorité au CV de la candidature spécifique
        const candidatureCV = candidature.cv?.fileUrl;
        const profileCV = (candidature.candidat as any)?.cvFileName;

        if (candidatureCV) {
            // fileUrl contient déjà le chemin relatif ou absolu depuis l'API
            const url = candidatureCV.startsWith('http') ? candidatureCV : `http://localhost:8081/uploads/cvs/${candidatureCV}`;
            window.open(url, '_blank');
        } else if (profileCV) {
            const url = `http://localhost:8081/uploads/cvs/${profileCV}`;
            window.open(url, '_blank');
        } else {
            alert("Aucun CV n'est disponible pour cette candidature.");
        }
    }

    getStatusConfig(status: string) {
        const configs: any = {
            'SOUMISE': { label: 'Soumise', css: 'tag-blue' },
            'EN_COURS': { label: 'En cours', css: 'tag-orange' },
            'ACCEPTEE': { label: 'Acceptée', css: 'tag-green' },
            'REFUSEE': { label: 'Refusée', css: 'tag-red' }
        };
        return configs[status] || { label: status, css: 'tag-gray' };
    }

    getStatusLabel(status: string): string {
        return this.getStatusConfig(status).label;
    }

    getScoreClass(score: number | undefined): string {
        if (score === undefined) return 'score-na';
        if (score >= 75) return 'score-high';
        if (score >= 50) return 'score-mid';
        return 'score-low';
    }

    logout(): void {
        if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
            this.authService.logout();
        }
    }

    navigateTo(path: string): void {
        this.router.navigate([path]);
    }
}
