import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-sidebar-recruteur',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './sidebar-recruteur.component.html',
    styleUrls: ['./sidebar-recruteur.component.css']
})
export class SidebarRecruteurComponent {
    /** Pass the key of the active nav item: 'dashboard' | 'offres' | 'candidatures' | 'ranking' | 'profil' */
    @Input() activeItem: string = '';

    private authService = inject(AuthService);
    private router = inject(Router);

    /** Current logged-in recruiter info */
    recruteur = this.authService.currentUser;

    navigateTo(path: string): void {
        this.router.navigate([path]);
    }

    logout(): void {
        this.authService.logout();
        this.router.navigate(['/login']);
    }
}
