import { Component, Input, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-sidebar-candidat',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './sidebar-candidat.component.html',
    styleUrls: ['./sidebar-candidat.component.css']
})
export class SidebarCandidatComponent {
    @Input() activeItem: string = '';

    private authService = inject(AuthService);
    private router = inject(Router);

    candidat = this.authService.currentUser;
    showLogoutConfirm = signal(false);

    navigateTo(path: string): void {
        this.router.navigate([path]);
    }

    logout(): void {
        this.showLogoutConfirm.set(true);
    }

    confirmLogout(): void {
        this.authService.logout();
        this.router.navigate(['/login']);
    }

    cancelLogout(): void {
        this.showLogoutConfirm.set(false);
    }
}
