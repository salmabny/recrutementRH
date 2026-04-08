import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { AdminService } from '../../services/admin.service';

import { FormsModule } from '@angular/forms';
import { SidebarCandidatComponent } from '../sidebar-candidat/sidebar-candidat.component';

@Component({
    selector: 'app-recruteur-public-profile',
    standalone: true,
    imports: [CommonModule, FormsModule, SidebarCandidatComponent],
    templateUrl: './recruteur-public-profile.component.html',
    styleUrls: ['./recruteur-public-profile.component.css']
})
export class RecruteurPublicProfileComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private http = inject(HttpClient);
    private authService = inject(AuthService);
    public adminService = inject(AdminService);

    recruteur = signal<any>(null);
    offres = signal<any[]>([]);
    isLoading = signal(true);

    currentUser = computed(() => this.authService.currentUser());
    adminUser = computed(() => this.authService.currentUser());
    isAdmin = computed(() => this.currentUser()?.role === 'ADMIN');
    isCandidat = computed(() => this.currentUser()?.role === 'CANDIDAT');

    // Tabs & Pagination
    activeTab = signal<'info' | 'offres'>('info');
    currentPage = signal(0);
    pageSize = 3;

    // Email state
    emailMessage = signal('');
    sendingEmail = signal(false);
    emailSuccess = signal('');
    emailError = signal('');
    showEmailModal = signal(false);

    paginatedOffres = computed(() => {
        const start = this.currentPage() * this.pageSize;
        return this.offres().slice(start, start + this.pageSize);
    });

    totalPages = computed(() => Math.ceil(this.offres().length / this.pageSize));




    ngOnInit(): void {

        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.loadRecruteur(+id);
            this.loadOffres(+id);
        }
    }

    loadRecruteur(id: number): void {
        this.http.get<any>(`http://localhost:8081/api/users/${id}`).subscribe({
            next: (data) => {
                this.recruteur.set(data);
                this.isLoading.set(false);
            },
            error: () => this.isLoading.set(false)
        });
    }

    loadOffres(recruiterId: number): void {
        this.http.get<any[]>(`http://localhost:8081/api/job-offers/list/${recruiterId}`).subscribe({
            next: (data) => this.offres.set(data),
            error: () => this.offres.set([])
        });
    }

    getPhotoUrl(photoUrl?: string): string {
        const url = photoUrl || this.recruteur()?.photoUrl;
        if (!url) return '';
        if (url.startsWith('http')) return url;
        return `http://localhost:8081/uploads/images/${url}`;
    }

    getInitiales(prenom?: string, nom?: string): string {
        if (!prenom && !nom) {
            const r = this.recruteur();
            if (!r) return '?';
            prenom = r.prenom;
            nom = r.nom;
        }
        return ((prenom?.[0] || '') + (nom?.[0] || '')).toUpperCase() || '?';
    }

    getUserColor(user: any): string {
        if (!user) return '#4361ee';
        const colors = [
            '#4361ee', '#3f37c9', '#4895ef', '#4cc9f0',
            '#7209b7', '#b5179e', '#f72585', '#059669'
        ];
        const text = user.email || (user.prenom + user.nom);
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            hash = text.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    }

    getSidebarInitiales(): string {
        const c = this.currentUser();
        if (!c) return 'U';
        return ((c.prenom?.[0] || '') + (c.nom?.[0] || '')).toUpperCase();
    }

    getPhotoUrlHelper(photo: string): string {
        if (!photo) return '';
        if (photo.startsWith('http')) return photo;
        return `http://localhost:8081/uploads/images/${photo}`;
    }

    goToOffreDetail(offre: any): void {
        const path = this.isAdmin() ? '/admin/offres' : '/candidat/offres';
        // Rediriger vers le détail de l'offre
        this.router.navigate([path, offre.id]);
    }

    goBack(): void {
        const isA = this.isAdmin();
        const path = isA ? '/admin/recruteurs' : '/candidat/offres';

        console.log(`[Profile] Navigation vers: ${path} (isAdmin: ${isA})`);
        this.router.navigate([path]).catch(err => {
            console.error('[Profile] Erreur de navigation:', err);
            // Fallback en cas d'erreur de route spécifique
            this.router.navigate(['/']);
        });
    }

    navigateTo(path: string): void {
        this.router.navigate([path]);
    }

    logout(): void {
        this.authService.logout();
        this.router.navigate(['/login']);
    }

    openEmailModal(): void {
        this.showEmailModal.set(true);
        this.emailError.set('');
        this.emailSuccess.set('');
    }

    closeEmailModal(): void {
        this.showEmailModal.set(false);
    }

    suspendAccount(): void {
        const r = this.recruteur();
        if (r && r.id) {
            this.adminService.suspendreUser(r.id).subscribe({
                next: (updated) => {
                    this.recruteur.set(updated);
                }
            });
        }
    }

    activateAccount(): void {
        const r = this.recruteur();
        if (r && r.id) {
            this.adminService.activerUser(r.id).subscribe({
                next: (updated) => {
                    this.recruteur.set(updated);
                }
            });
        }
    }

    setTab(tab: 'info' | 'offres'): void {
        this.activeTab.set(tab);
        this.currentPage.set(0);
    }

    nextPage(): void {
        if (this.currentPage() < this.totalPages() - 1) {
            this.currentPage.update(p => p + 1);
        }
    }

    prevPage(): void {
        if (this.currentPage() > 0) {
            this.currentPage.update(p => p - 1);
        }
    }

    goToPage(p: number): void {
        this.currentPage.set(p);
    }

    getPageArray(): number[] {
        return Array.from({ length: this.totalPages() }, (_, i) => i);
    }

    sendEmail(): void {
        const r = this.recruteur();
        const content = this.emailMessage().trim();

        if (!r?.email || !content) {
            this.emailError.set('Veuillez saisir un message.');
            setTimeout(() => this.emailError.set(''), 3000);
            return;
        }

        this.sendingEmail.set(true);
        this.emailError.set('');
        this.emailSuccess.set('');

        const subject = `Message de l'administration SmartHiring`;

        this.adminService.envoyerEmail(r.email, subject, content).subscribe({
            next: () => {
                this.emailSuccess.set('Votre message a été envoyé avec succès.');
                this.emailMessage.set('');
                this.sendingEmail.set(false);
                setTimeout(() => {
                    this.emailSuccess.set('');
                    this.closeEmailModal();
                }, 2000);
            },
            error: (err) => {
                console.error('Erreur lors de l\'envoi de l\'email:', err);
                const serverMsg = err.error?.message || 'Une erreur est survenue lors de l\'envoi. Veuillez réessayer.';
                this.emailError.set(serverMsg);
                this.sendingEmail.set(false);
                setTimeout(() => this.emailError.set(''), 6000);
            }
        });
    }
}
