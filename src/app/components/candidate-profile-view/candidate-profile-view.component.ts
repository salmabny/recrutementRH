import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CandidatService } from '../../services/candidat.service';
import { AuthService } from '../../services/auth.service';
import { AdminService } from '../../services/admin.service';
import { Candidat } from '../../models/candidat.model';
import { Candidature } from '../../models/candidature.model';
import { SidebarRecruteurComponent } from '../sidebar-recruteur/sidebar-recruteur.component';

@Component({
    selector: 'app-candidate-profile-view',
    standalone: true,
    imports: [CommonModule, SidebarRecruteurComponent],
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
    candidatures = signal<Candidature[]>([]);
    candidatureCount = signal(0);
    isLoading = signal(true);
    error = signal<string | null>(null);
    isDragging = signal(false);
    photoTimestamp = signal<number>(Date.now());
    isAdmin = computed(() => this.authService.currentUser()?.role === 'ADMIN');
    isRecruteur = computed(() => this.authService.currentUser()?.role === 'RECRUTEUR');
    activeTab = signal('info');

    currentUser = computed(() => this.authService.currentUser());
    adminUser = computed(() => this.authService.currentUser());
    recruteur = computed(() => {
        const user = this.authService.currentUser();
        return {
            prenom: user?.prenom || 'Marie',
            nom: user?.nom || 'Dupont',
            entreprise: user?.entreprise || 'Ma Société'
        };
    });



    // Email state
    emailMessage = signal('');
    sendingEmail = signal(false);
    emailSuccess = signal('');
    emailError = signal('');
    showEmailModal = signal(false);

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
                    next: (cands) => {
                        this.candidatures.set(cands);
                        this.candidatureCount.set(cands.length);
                    },
                    error: () => {
                        this.candidatures.set([]);
                        this.candidatureCount.set(0);
                    }
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


    // Helpers to ensure scores are always 0-100 for progress bars
    getSkillProgress = computed(() => {
        const points = this.candidat()?.profileSkillsScore || 0;
        return Math.min(100, Math.round((points / 50) * 100));
    });
    getEducationProgress = computed(() => {
        const points = this.candidat()?.profileEducationScore || 0;
        return Math.min(100, Math.round((points / 25) * 100));
    });
    getExperienceProgress = computed(() => {
        const points = this.candidat()?.profileExperienceScore || 0;
        return Math.min(100, Math.round((points / 25) * 100));
    });

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

    getPhotoUrl(photoUrl?: string): string {
        const url = photoUrl || this.candidat()?.photoUrl;
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
        const isA = this.isAdmin();
        const path = isA ? '/admin/candidats' : '/recruteur/candidatures';
        this.router.navigate([path]);
    }

    openEmailModal(): void {
        this.emailMessage.set('');
        this.emailSuccess.set('');
        this.emailError.set('');
        this.showEmailModal.set(true);
    }

    closeEmailModal(): void {
        this.showEmailModal.set(false);
    }

    sendEmail(): void {
        const user = this.candidat();
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

    scheduleInterview(): void {
        alert("Fonctionnalité de planification d'entretien bientôt disponible !");
    }

    setTab(tab: string): void {
        this.activeTab.set(tab);
    }

    suspendAccount(): void {
        const c = this.candidat();
        if (!c) return;
        if (!confirm('Voulez-vous vraiment suspendre le compte de ce candidat ?')) return;

        this.adminService.suspendreUser(c.id).subscribe({
            next: (updated) => {
                this.candidat.set({ ...c, status: updated.status });
            },
            error: (err) => console.error('Erreur suspension:', err)
        });
    }

    activateAccount(): void {
        const c = this.candidat();
        if (!c) return;

        this.adminService.activerUser(c.id).subscribe({
            next: (updated) => {
                this.candidat.set({ ...c, status: updated.status });
            },
            error: (err) => console.error('Erreur activation:', err)
        });
    }

    copyToClipboard(text: string): void {
        navigator.clipboard.writeText(text);
    }

    // ── Pagination Logic
    readonly EXP_PER_PAGE = 3;
    readonly CAND_PER_PAGE = 6;

    currentPageExp = signal(1);
    currentPageCand = signal(1);

    paginatedExperiences = computed(() => {
        const exps = this.candidat()?.experiences || [];
        const start = (this.currentPageExp() - 1) * this.EXP_PER_PAGE;
        return exps.slice(start, start + this.EXP_PER_PAGE);
    });

    totalExpPages = computed(() => {
        const exps = this.candidat()?.experiences || [];
        return Math.ceil(exps.length / this.EXP_PER_PAGE) || 1;
    });

    paginatedCandidatures = computed(() => {
        const cands = this.candidatures();
        const start = (this.currentPageCand() - 1) * this.CAND_PER_PAGE;
        return cands.slice(start, start + this.CAND_PER_PAGE);
    });

    totalCandPages = computed(() => {
        const cands = this.candidatures();
        return Math.ceil(cands.length / this.CAND_PER_PAGE) || 1;
    });

    // Experience Nav
    nextPageExp() { if (this.currentPageExp() < this.totalExpPages()) this.currentPageExp.update(p => p + 1); }
    prevPageExp() { if (this.currentPageExp() > 1) this.currentPageExp.update(p => p - 1); }
    goToPageExp(p: number) { this.currentPageExp.set(p); }

    // Candidature Nav
    nextPageCand() { if (this.currentPageCand() < this.totalCandPages()) this.currentPageCand.update(p => p + 1); }
    prevPageCand() { if (this.currentPageCand() > 1) this.currentPageCand.update(p => p - 1); }
    goToPageCand(p: number) { this.currentPageCand.set(p); }

    // Helper for page numbers array
    getPageArray(total: number): number[] {
        return Array.from({ length: total }, (_, i) => i + 1);
    }
}
