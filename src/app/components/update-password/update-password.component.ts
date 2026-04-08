import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PasswordStrengthResult } from '../../models/auth.model';

@Component({
    selector: 'app-update-password',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './update-password.component.html',
    styleUrls: ['./update-password.component.css']
})
export class UpdatePasswordComponent {
    form: FormGroup;
    showOldPassword = signal(false);
    showNewPassword = signal(false);
    passwordStrength = signal<PasswordStrengthResult | null>(null);
    errorMessage = signal('');
    isSubmitting = signal(false);

    private fb = inject(FormBuilder);
    private authService = inject(AuthService);
    private router = inject(Router);

    constructor() {
        this.form = this.fb.group({
            oldPassword: ['', [Validators.required]],
            newPassword: ['', [Validators.required, Validators.minLength(6)]],
            confirmPassword: ['', [Validators.required]]
        }, { validators: this.passwordMatchValidator });

        this.form.get('newPassword')?.valueChanges.subscribe(val => {
            this.passwordStrength.set(val ? this.authService.checkPasswordStrength(val) : null);
        });
    }

    get strengthSegments(): boolean[] {
        const level = this.passwordStrength()?.level ?? 0;
        return [1, 2, 3, 4].map(i => i <= level);
    }

    passwordMatchValidator(g: FormGroup) {
        return g.get('newPassword')?.value === g.get('confirmPassword')?.value
            ? null : { mismatch: true };
    }

    onSubmit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.isSubmitting.set(true);
        this.errorMessage.set('');

        const { oldPassword, newPassword } = this.form.value;

        this.authService.changePassword(oldPassword, newPassword).subscribe({
            next: () => {
                this.isSubmitting.set(false);
                // After change, redirect to appropriate dashboard
                const user = this.authService.currentUser();
                if (user?.role === 'RECRUTEUR') {
                    this.router.navigate(['/recruteur']);
                } else if (user?.role === 'ADMIN') {
                    this.router.navigate(['/admin']);
                } else {
                    this.router.navigate(['/login']);
                }
            },
            error: (err) => {
                this.isSubmitting.set(false);
                this.errorMessage.set(err.message || 'Erreur lors du changement de mot de passe');
            }
        });
    }

    logout(): void {
        this.authService.logout();
    }
}
