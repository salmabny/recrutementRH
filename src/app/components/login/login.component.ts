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
  isPendingAdmin = signal(false);  // Recruteur en attente d'approbation
  needsVerification = signal(false); // Candidat non encore vérifié
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

    this.authService.login(this.form.value).subscribe({
      next: (user) => {
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
        const msg: string = err?.message || '';
        if (msg.includes('validation par l\'admin') || msg.includes('validation par l\'administration')) {
          this.isPendingAdmin.set(true);
        } else if (msg.includes('vérifier votre email') || msg.includes('v\u00e9rifier votre email')) {
          this.needsVerification.set(true);
        } else {
          this.errorMessage.set(msg || 'Erreur de connexion');
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
    this.router.navigate(['/signup']);
  }

  isInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl && ctrl.invalid && ctrl.touched);
  }
}