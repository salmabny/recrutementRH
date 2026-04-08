import { Component, signal, inject, NgZone, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PasswordStrengthResult } from '../../models/auth.model';

declare const google: any;

@Component({
  selector: 'app-signup-candidat',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './signup-candidat.component.html',
  styleUrls: ['./signup-candidat.component.css']
})
export class SignupCandidatComponent implements AfterViewInit {

  // ── Remplacez par votre Google Client ID
  // Suppression ID local

  form: FormGroup;
  showPassword = signal(false);
  passwordStrength = signal<PasswordStrengthResult | null>(null);
  errorMessage = signal('');
  isRegistered = signal(false);
  verificationCode = signal('');
  emailSent = signal(true);  // false = code affiché directement (mode dev)
  resendCountdown = signal(0);   // secondes restantes avant de pouvoir renvoyer
  resendSuccess = signal(false); // message de succès après renvoi
  isVerified = signal(false);    // succès final de vérification

  private authService = inject(AuthService);
  private ngZone = inject(NgZone);
  isLoading = this.authService.isLoading;

  constructor(
    private fb: FormBuilder,
    private router: Router
  ) {
    this.form = this.fb.group({
      prenom: ['', [Validators.required, Validators.minLength(2)]],
      nom: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });

    this.form.get('password')!.valueChanges.subscribe(val => {
      this.passwordStrength.set(
        val ? this.authService.checkPasswordStrength(val) : null
      );
    });
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('password')?.value === g.get('confirmPassword')?.value
      ? null : { mismatch: true };
  }

  ngAfterViewInit(): void {
    this.renderGoogleButton();
  }

  private renderGoogleButton(): void {
    if (typeof google !== 'undefined') {
      google.accounts.id.initialize({
        client_id: this.authService.GOOGLE_CLIENT_ID,
        callback: (response: { credential: string }) => {
          this.ngZone.run(() => {
            this.handleGoogleCredential(response.credential);
          });
        }
      });
      google.accounts.id.renderButton(
        document.getElementById('google-btn-container'),
        { theme: 'outline', size: 'large', width: '100%', text: 'signup_with' }
      );
    } else {
      setTimeout(() => this.renderGoogleButton(), 500);
    }
  }


  togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  onSubmit(): void {
    console.log('--- SignupCandidatComponent: onSubmit() ---');
    console.log('Form value:', this.form.value);
    if (this.form.invalid) {
      console.warn('Form is invalid:', this.form.value);
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set('');
    const { prenom, nom, email, password } = this.form.value;

    this.authService.signupCandidat({ prenom, nom, email, password }).subscribe({
      next: (res: any) => {
        this.isRegistered.set(true);
        this.emailSent.set(res?.emailSent ?? true);
      },
      error: (err: any) => {
        const msg = err?.message || err?.error || JSON.stringify(err) || 'Erreur lors de l\'inscription';
        this.errorMessage.set(msg);
      }
    });
  }

  onVerify(): void {
    if (this.verificationCode().length < 6) return;

    this.errorMessage.set('');
    this.authService.verify(this.form.get('email')!.value, this.verificationCode()).subscribe({
      next: () => {
        this.isVerified.set(true);
        // Attendre 2 secondes pour laisser l'utilisateur voir le message de bienvenue
        setTimeout(() => {
          this.ngZone.run(() => {
            this.router.navigate(['/dashboard']);
          });
        }, 2000);
      },
      error: (err: any) => this.errorMessage.set(typeof err === 'string' ? err : err.message || 'Code invalide')
    });
  }

  resendCode(): void {
    if (this.resendCountdown() > 0) return;

    this.resendSuccess.set(false);
    this.errorMessage.set('');
    const email = this.form.get('email')!.value;

    this.authService.resendVerificationCode(email).subscribe({
      next: () => {
        this.resendSuccess.set(true);
        // Lancer le compte à rebours de 60 secondes
        this.resendCountdown.set(60);
        const interval = setInterval(() => {
          this.resendCountdown.update(v => {
            if (v <= 1) { clearInterval(interval); return 0; }
            return v - 1;
          });
        }, 1000);
      },
      error: (err: any) => {
        this.errorMessage.set(typeof err === 'string' ? err : err.message || 'Erreur lors du renvoi du code');
      }
    });
  }



  private handleGoogleCredential(credential: string): void {
    try {
      const base64Url = credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      const payload = JSON.parse(jsonPayload);
      const googleData = {
        email: payload.email,
        prenom: payload.given_name || '',
        nom: payload.family_name || '',
        role: 'CANDIDAT' as const
      };

      this.authService.loginWithGoogle(googleData).subscribe({
        next: () => this.router.navigate(['/dashboard']),
        error: (err) => this.errorMessage.set(err?.message || 'Erreur lors de la connexion Google')
      });
    } catch {
      this.errorMessage.set('Erreur lors du décodage des données Google.');
    }
  }

  goBack(): void {
    this.router.navigate(['/login']);
  }

  switchToRecruteur(): void {
    this.authService.setRole('RECRUTEUR');
    this.router.navigate(['/signup/recruteur']);
  }

  isInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl && ctrl.invalid && ctrl.touched);
  }

  get strengthSegments(): boolean[] {
    const level = this.passwordStrength()?.level ?? 0;
    return [1, 2, 3, 4].map(i => i <= level);
  }
}