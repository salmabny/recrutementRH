import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CandidatureService } from '../../services/candidature.service';
import { AuthService } from '../../services/auth.service';
import { Candidature, CandidatureStatus } from '../../models/candidature.model';

@Component({
    selector: 'app-candidature-detail',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './candidature-detail.component.html',
    styleUrls: ['./candidature-detail.component.css']
})
export class CandidatureDetailComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private candidatureService = inject(CandidatureService);
    private authService = inject(AuthService);
    private sanitizer = inject(DomSanitizer);

    candidature = signal<Candidature | null>(null);
    safeCvUrl = signal<SafeResourceUrl | null>(null);
    isLoading = signal(true);
    error = signal<string | null>(null);

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

    getPhotoUrl(user: any): string {
        if (!user?.photoUrl) return '';
        if (user.photoUrl.startsWith('http')) return user.photoUrl;
        return `http://localhost:8081/uploads/images/${user.photoUrl}`;
    }

    ngOnInit(): void {
        const id = Number(this.route.snapshot.paramMap.get('id'));
        if (!id) {
            this.error.set('Identifiant de candidature invalide.');
            this.isLoading.set(false);
            return;
        }

        this.candidatureService.getCandidatureById(id).subscribe({
            next: (data) => {
                this.candidature.set(data);
                if (data.cv?.fileUrl) {
                    this.safeCvUrl.set(
                        this.sanitizer.bypassSecurityTrustResourceUrl(data.cv.fileUrl)
                    );
                }
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Erreur chargement candidature:', err);
                this.error.set('Impossible de charger cette candidature.');
                this.isLoading.set(false);
            }
        });
    }

    updateStatus(newStatus: CandidatureStatus): void {
        const c = this.candidature();
        if (!c) return;
        if (!confirm(`Voulez-vous marquer cette candidature comme ${newStatus} ?`)) return;

        this.candidatureService.updateStatut(c.id, newStatus).subscribe({
            next: (updated) => this.candidature.set(updated),
            error: () => alert('Erreur lors de la mise à jour du statut')
        });
    }

    getInitiales(c: Candidature | null): string {
        if (!c?.candidat) return '?';
        return ((c.candidat.prenom?.[0] || '') + (c.candidat.nom?.[0] || '')).toUpperCase();
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

    getScoreClass(score: number | undefined): string {
        if (score === undefined || score === null) return 'score-na';
        if (score >= 75) return 'score-high';
        if (score >= 50) return 'score-mid';
        return 'score-low';
    }

    openCV(): void {
        const url = this.candidature()?.cv?.fileUrl;
        if (url) window.open(url, '_blank');
    }

    navigateTo(path: string): void {
        this.router.navigate([path]);
    }

    logout(): void {
        this.authService.logout();
        this.router.navigate(['/login']);
    }
}
