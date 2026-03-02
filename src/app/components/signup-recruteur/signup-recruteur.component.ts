import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PasswordStrengthResult } from '../../models/auth.model';

@Component({
  selector: 'app-signup-recruteur',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './signup-recruteur.component.html',
  styleUrls: ['./signup-recruteur.component.css']
})
export class SignupRecruteurComponent {

  form: FormGroup;
  showPassword = signal(false);
  passwordStrength = signal<PasswordStrengthResult | null>(null);
  selectedFile = signal<File | null>(null);
  isDragOver = signal(false);
  errorMessage = signal('');
  private authService = inject(AuthService);
  isLoading = this.authService.isLoading;
  isRegistered = signal(false);

  constructor(
    private fb: FormBuilder,
    private router: Router
  ) {
    this.form = this.fb.group({
      prenom: ['', [Validators.required, Validators.minLength(2)]],
      nom: ['', [Validators.required, Validators.minLength(2)]],
      entreprise: ['', [Validators.required, Validators.minLength(2)]],
      ville: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]]
    });

    this.form.get('password')!.valueChanges.subscribe(val => {
      this.passwordStrength.set(
        val ? this.authService.checkPasswordStrength(val) : null
      );
    });
  }

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.selectedFile.set(input.files[0]);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(true);
  }

  onDragLeave(): void {
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);
    const file = event.dataTransfer?.files[0];
    if (file) this.selectedFile.set(file);
  }

  removeFile(): void {
    this.selectedFile.set(null);
  }

  formatFileSize(bytes: number): string {
    return bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(0)} Ko`
      : `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set('');
    const { prenom, nom, entreprise, ville, email, password } = this.form.value;

    this.authService.signupRecruteur({
      prenom, nom, entreprise, ville, email, password,
      document: this.selectedFile()
    }).subscribe({
      next: () => this.isRegistered.set(true),
      error: (err) => {
        const msg = err?.message || 'Erreur lors de l\'inscription';
        this.errorMessage.set(msg);
      }
    });
  }

  goBack(): void {
    // Si on a fini l'inscription, on retourne au login
    if (this.isRegistered()) {
      this.router.navigate(['/login']);
    } else {
      // Sinon on retourne au choix de rôle
      this.router.navigate(['/signup']);
    }
  }

  switchToCandidat(): void {
    this.authService.setRole('CANDIDAT');
    this.router.navigate(['/signup/candidat']);
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
