import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { AdminService } from '../../services/admin.service';

@Component({
    selector: 'app-recruteur-public-profile',
    standalone: true,
    imports: [CommonModule],
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
    isAdmin = computed(() => this.currentUser()?.role === 'ADMIN');
    isCandidat = computed(() => this.currentUser()?.role === 'CANDIDAT');



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

    getPhotoUrl(): string {
        const url = this.recruteur()?.photoUrl;
        if (!url) return '';
        if (url.startsWith('http')) return url;
        return `http://localhost:8081/uploads/images/${url}`;
    }

    getInitiales(): string {
        const r = this.recruteur();
        if (!r) return '?';
        return ((r.prenom?.[0] || '') + (r.nom?.[0] || '')).toUpperCase();
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
        const path = this.isAdmin() ? '/admin/users' : '/candidat/offres';
        this.router.navigate([path]);
    }

    navigateTo(path: string): void {
        this.router.navigate([path]);
    }

    logout(): void {
        this.authService.logout();
        this.router.navigate(['/login']);
    }
}
