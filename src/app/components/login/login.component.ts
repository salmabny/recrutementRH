import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {

  form: FormGroup;
  showPassword = signal(false);
  errorMessage = signal('');
  isPendingAdmin = signal(false);
  needsVerification = signal(false);
  isSuspended = signal(false);
  isRejected = signal(false);
  showContactModal = signal(false);
  contactMessage = signal('');
  contactSuccess = signal(false);
  verificationCode = signal('');
  resendSuccess = signal(false);

  private authService = inject(AuthService);
  isLoading = this.authService.isLoading;

  constructor(
    private fb: FormBuilder,
    private router: Router
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });
  }

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set('');
    this.isPendingAdmin.set(false);
    this.needsVerification.set(false);
    this.isSuspended.set(false);
    this.isRejected.set(false);

    this.authService.login(this.form.value).subscribe({
      next: (user) => {
        if (user.mustChangePassword) {
          this.router.navigate(['/update-password']);
          return;
        }
        if (user.role === 'ADMIN') {
          this.router.navigate(['/admin']);
        } else if (user.role === 'RECRUTEUR') {
          this.router.navigate(['/recruteur']);
        } else if (user.role === 'CANDIDAT') {
          this.router.navigate(['/candidat']);
        } else {
          this.router.navigate(['/login']);
        }
      },
      error: (err) => {
        const msg: string = (err?.message || '').toLowerCase();
        if (msg.includes('validation par l\'admin')) {
          this.isPendingAdmin.set(true);
        } else if (msg.includes('vérifier votre email')) {
          this.needsVerification.set(true);
        } else if (msg.includes('suspendu')) {
          this.isSuspended.set(true);
        } else if (msg.includes('refusé') || msg.includes('supprimé')) {
          this.isRejected.set(true);
        } else {
          this.errorMessage.set(err?.message || 'Erreur de connexion');
        }
      }
    });
  }

  onVerify(): void {
    if (this.verificationCode().length < 6) return;
    this.errorMessage.set('');
    this.authService.verify(this.form.get('email')!.value, this.verificationCode()).subscribe({
      next: () => {
        const user = this.authService.currentUser();
        if (user?.role === 'ADMIN') {
          this.router.navigate(['/admin']);
        } else if (user?.role === 'RECRUTEUR') {
          this.router.navigate(['/recruteur']);
        } else if (user?.role === 'CANDIDAT') {
          this.router.navigate(['/candidat']);
        } else {
          this.router.navigate(['/login']);
        }
      },
      error: (err: any) => this.errorMessage.set(err?.message || 'Code invalide')
    });
  }

  resendCode(): void {
    this.errorMessage.set('');
    this.resendSuccess.set(false);
    this.authService.resendVerificationCode(this.form.get('email')!.value).subscribe({
      next: (res: any) => {
        this.resendSuccess.set(true);
        if (res?.devCode) {
          this.verificationCode.set(res.devCode);
          console.warn('[DEV] Code de vérification :', res.devCode);
        }
      },
      error: (err: any) => this.errorMessage.set(err?.message || 'Erreur lors du renvoi')
    });
  }

  goToSignup(): void {
    this.router.navigate(['/signup/candidat']);
  }

  isInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl && ctrl.invalid && ctrl.touched);
  }

  toggleContactModal(): void {
    this.showContactModal.update(v => !v);
    this.contactSuccess.set(false);
    this.contactMessage.set('');
  }

  sendContactRequest(): void {
    const email = this.form.get('email')?.value;
    const message = this.contactMessage().trim();
    if (!email || !message) return;

    this.authService.contactAdmin(email, message).subscribe({
      next: () => {
        this.contactSuccess.set(true);
        setTimeout(() => this.toggleContactModal(), 3000);
      },
      error: (err) => {
        this.errorMessage.set(err?.message || 'Erreur lors de l\'envoi du message');
      }
    });
  }
}