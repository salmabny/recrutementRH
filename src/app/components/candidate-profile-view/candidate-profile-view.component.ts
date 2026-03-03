import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CandidatService } from '../../services/candidat.service';
import { AuthService } from '../../services/auth.service';
import { AdminService } from '../../services/admin.service';
import { Candidat } from '../../models/candidat.model';

@Component({
    selector: 'app-candidate-profile-view',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './candidate-profile-view.component.html',
    styleUrls: ['./candidate-profile-view.component.css']
})
export class CandidateProfileViewComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private candidatService = inject(CandidatService);
    private authService = inject(AuthService);
    public adminService = inject(AdminService);

    candidat = signal<Candidat | null>(null);
    candidatureCount = signal(0);
    isLoading = signal(true);
    error = signal<string | null>(null);
    isDragging = signal(false);
    photoTimestamp = signal<number>(Date.now());
    isAdmin = computed(() => this.authService.currentUser()?.role === 'ADMIN');
    isRecruteur = computed(() => this.authService.currentUser()?.role === 'RECRUTEUR');

    currentUser = computed(() => this.authService.currentUser());



    ngOnInit(): void {
        const id = Number(this.route.snapshot.paramMap.get('id'));
        if (!id) {
            this.error.set('Identifiant de candidat invalide.');
            this.isLoading.set(false);
            return;
        }

        this.candidatService.getProfil(id).subscribe({
            next: (data) => {
                this.candidat.set(data);

                // Fetch candidature count
                this.candidatService.getMesCandidatures(id).subscribe({
                    next: (cands) => this.candidatureCount.set(cands.length),
                    error: () => this.candidatureCount.set(0)
                });

                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Erreur chargement profil:', err);
                this.error.set('Impossible de charger le profil de ce candidat.');
                this.isLoading.set(false);
            }
        });
    }

    triggerAnalysis(): void {
        const c = this.candidat();
        if (!c || !c.id) return;

        this.isLoading.set(true);
        this.candidatService.reanalyzeProfile(c.id).subscribe({
            next: (updated) => {
                this.candidat.set(updated);
                this.isLoading.set(false);
            },
            error: () => this.isLoading.set(false)
        });
    }

    // ── Drag & Drop fallback
    onDragOver(e: DragEvent): void { e.preventDefault(); this.isDragging.set(true); }
    onDragLeave(): void { this.isDragging.set(false); }
    onDrop(e: DragEvent): void {
        e.preventDefault();
        this.isDragging.set(false);
        const f = e.dataTransfer?.files[0];
        if (f) this.handleFile(f);
    }
    onFileChange(e: any): void {
        const f = e.target.files?.[0];
        if (f) this.handleFile(f);
    }

    handleFile(file: File): void {
        if (file.type !== 'application/pdf' || file.size > 5 * 1024 * 1024) return;
        const current = this.candidat();
        if (!current) return;

        this.isLoading.set(true);
        this.candidatService.uploadProfileCV(current.id, file).subscribe({
            next: (updated) => {
                this.candidat.set(updated);
                this.isLoading.set(false);
            },
            error: () => this.isLoading.set(false)
        });
    }

    getPhotoUrlHelper(photo?: string): string {
        if (!photo) return '';
        if (photo.startsWith('http')) return photo;
        return `http://localhost:8081/uploads/images/${photo}`;
    }

    getPhotoUrl(): string {
        const url = this.candidat()?.photoUrl;
        if (!url) return '';
        if (url.startsWith('http')) return url;
        return `http://localhost:8081/uploads/images/${url}`;
    }

    getInitiales(): string {
        const c = this.candidat();
        if (!c) return '?';
        return ((c.prenom?.[0] || '') + (c.nom?.[0] || '')).toUpperCase();
    }

    navigateTo(path: string): void {
        this.router.navigate([path]);
    }

    logout(): void {
        this.authService.logout();
        this.router.navigate(['/login']);
    }

    goBack(): void {
        if (this.isAdmin()) {
            this.router.navigate(['/admin/users']);
        } else {
            this.router.navigate(['/recruteur/candidatures']);
        }
    }

    sendEmail(): void {
        const email = this.candidat()?.email;
        if (email) {
            window.location.href = `mailto:${email}`;
        }
    }

    scheduleInterview(): void {
        alert("Fonctionnalité de planification d'entretien bientôt disponible !");
    }
}
