import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-logout-modal',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './logout-modal.component.html',
    styleUrls: []
})
export class LogoutModalComponent {
    public authService = inject(AuthService);

    cancel(): void {
        this.authService.cancelLogout();
    }

    confirm(): void {
        this.authService.executeLogout();
    }
}
