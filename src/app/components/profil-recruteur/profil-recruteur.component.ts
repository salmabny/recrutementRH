import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { RecruteurService, Recruteur } from '../../services/recruteur.service';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-profil-recruteur',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './profil-recruteur.component.html',
    styleUrls: ['./profil-recruteur.component.css']
})
export class ProfilRecruteurComponent implements OnInit {
    private recruteurService = inject(RecruteurService);
    private authService = inject(AuthService);
    private router = inject(Router);
    private fb = inject(FormBuilder);

    recruteur = signal<Recruteur | null>(null);
    isLoading = signal(true);
    editMode = signal(false);
    successMsg = signal('');
    errorMsg = signal('');
    photoTimestamp = signal<number>(Date.now());

    form!: FormGroup;

    sidebarUser = computed(() => {
        const user = this.authService.currentUser();
        return {
            prenom: user?.prenom || '',
            nom: user?.nom || '',
            entreprise: user?.entreprise || '',
            photoUrl: user?.photoUrl,
            initiales: (user?.prenom?.[0] || 'U') + (user?.nom?.[0] || '')
        };
    });

    getPhotoUrlForSidebar(): string {
        const url = this.sidebarUser().photoUrl;
        if (!url) return '';
        if (url.startsWith('http')) return url;
        return `http://localhost:8081/uploads/images/${url}`;
    }

    ngOnInit(): void {
        const user = this.authService.currentUser();
        if (user) {
            this.loadProfil(user.id);
        } else {
            this.isLoading.set(false);
        }
    }

    buildForm(r?: Recruteur): void {
        this.form = this.fb.group({
            prenom: [r?.prenom || '', Validators.required],
            nom: [r?.nom || '', Validators.required],
            email: [r?.email || '', [Validators.required, Validators.email]],
            telephone: [r?.telephone || ''],
            ville: [r?.ville || ''],
            entreprise: [r?.entreprise || ''],
            companyDomain: [r?.companyDomain || '']
        });
    }

    loadProfil(id: number): void {
        this.isLoading.set(true);
        this.recruteurService.getProfil(id).subscribe({
            next: (data) => {
                this.recruteur.set(data);
                this.buildForm(data);

                this.authService.updateUser(data as any);
                this.isLoading.set(false);
            },
            error: () => {
                this.errorMsg.set('Impossible de charger le profil.');
                this.isLoading.set(false);
            }
        });
    }

    toggleEdit(): void {
        this.editMode.update(v => !v);
        this.errorMsg.set('');
        this.successMsg.set('');
        if (!this.editMode() && this.recruteur()) {
            this.buildForm(this.recruteur()!);
        }
    }

    onSubmit(): void {
        if (this.form.invalid) { this.form.markAllAsTouched(); return; }
        const current = this.recruteur();
        if (!current) return;

        this.isLoading.set(true);
        this.recruteurService.updateProfil(current.id, this.form.value).subscribe({
            next: () => {
                // Backend returns 204, reload the profile from server
                this.editMode.set(false);
                this.successMsg.set('Profil mis à jour avec succès !');
                this.isLoading.set(false);
                this.loadProfil(current.id);
                setTimeout(() => this.successMsg.set(''), 3000);
            },
            error: (err) => {
                console.error('Update error:', err);
                this.errorMsg.set('Erreur lors de la mise à jour. Vérifiez la console.');
                this.isLoading.set(false);
            }
        });
    }

    onPhotoSelected(event: any): void {
        const file = event.target.files?.[0];
        if (!file || !file.type.startsWith('image/')) return;
        const current = this.recruteur();
        if (!current) return;

        this.recruteurService.uploadPhoto(current.id, file).subscribe({
            next: (updated) => {
                this.recruteur.set(updated);
                this.photoTimestamp.set(Date.now());
            },
            error: () => this.errorMsg.set('Erreur lors du téléchargement de la photo.')
        });
    }

    getPhotoUrl(): string {
        const url = this.recruteur()?.photoUrl;
        if (!url) return '';
        if (url.startsWith('http')) return url;
        return `http://localhost:8081/uploads/images/${url}?t=${this.photoTimestamp()}`;
    }

    getInitiales(): string {
        const r = this.recruteur();
        if (!r) return '?';
        return ((r.prenom?.[0] || '') + (r.nom?.[0] || '')).toUpperCase();
    }

    navigateTo(path: string): void {
        this.router.navigate([path]);
    }

    logout(): void {
        this.authService.logout();
        this.router.navigate(['/login']);
    }
}
