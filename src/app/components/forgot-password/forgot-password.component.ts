import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-forgot-password',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink],
    templateUrl: './forgot-password.component.html',
    styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent implements OnInit {
    ngOnInit() {
        console.log('ForgotPasswordComponent: Initialized');
    }
    private fb = inject(FormBuilder);
    private authService = inject(AuthService);
    private router = inject(Router);

    step = signal<1 | 2>(1);
    emailForm: FormGroup;
    resetForm: FormGroup;

    errorMessage = signal('');
    successMessage = signal('');
    isLoading = this.authService.isLoading;

    constructor() {
        this.emailForm = this.fb.group({
            email: ['', [Validators.required, Validators.email]]
        });

        this.resetForm = this.fb.group({
            code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
            password: ['', [Validators.required, Validators.minLength(8)]],
            confirmPassword: ['', [Validators.required]]
        }, { validators: this.passwordMatchValidator });
    }

    private passwordMatchValidator(g: FormGroup) {
        return g.get('password')?.value === g.get('confirmPassword')?.value
            ? null : { mismatch: true };
    }

    requestReset(): void {
        console.log('--- ForgotPasswordComponent: requestReset() ---');
        if (this.emailForm.invalid) {
            console.warn('emailForm is invalid:', this.emailForm.value);
            return;
        }

        this.errorMessage.set('');
        const email = this.emailForm.get('email')?.value;

        this.authService.forgotPassword(email).subscribe({
            next: (res) => {
                this.step.set(2);
                if (res?.devCode) {
                    console.warn('[DEV] Code de réinitialisation :', res.devCode);
                }
            },
            error: (err) => this.errorMessage.set(err?.message || 'Une erreur est survenue')
        });
    }

    confirmReset(): void {
        if (this.resetForm.invalid) return;

        this.errorMessage.set('');
        const email = this.emailForm.get('email')?.value;
        const { code, password } = this.resetForm.value;

        this.authService.resetPassword({ email, code, password }).subscribe({
            next: () => {
                this.successMessage.set('Votre mot de passe a été réinitialisé !');
                setTimeout(() => this.router.navigate(['/login']), 3000);
            },
            error: (err) => this.errorMessage.set(err?.message || 'Code invalide ou erreur serveur')
        });
    }

    isInvalid(form: FormGroup, field: string): boolean {
        const ctrl = form.get(field);
        return !!(ctrl && ctrl.invalid && ctrl.touched);
    }
}
