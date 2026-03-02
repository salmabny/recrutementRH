import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CandidatService } from '../../services/candidat.service';
import { AuthService } from '../../services/auth.service';
import { Candidat } from '../../models/candidat.model';

@Component({
  selector: 'app-mon-profil',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './mon-profil.component.html',
  styleUrls: ['./mon-profil.component.css']
})
export class MonProfilComponent implements OnInit {

  candidat = signal<Candidat | null>(null);
  candidatureCount = signal(0);
  isLoading = signal(true);
  editMode = signal(false);
  successMsg = signal('');
  errorMsg = signal('');
  isDragging = signal(false);
  photoTimestamp = signal<number>(Date.now());

  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private candidatService: CandidatService,
    private authService: AuthService,
    private router: Router
  ) {
    this.buildForm();
  }

  ngOnInit(): void {
    this.loadProfil();
  }

  buildForm(c?: Candidat): void {
    this.form = this.fb.group({
      prenom: [c?.prenom || '', Validators.required],
      nom: [c?.nom || '', Validators.required],
      email: [c?.email || '', [Validators.required, Validators.email]],
      telephone: [c?.telephone || ''],
      ville: [c?.ville || ''],
      niveauEtudes: [c?.niveauEtudes || ''],
      anneesExperience: [c?.anneesExperience || 0],
      ouvertAuxOffres: [c?.ouvertAuxOffres ?? true]
    });
  }

  loadProfil(): void {
    this.isLoading.set(true);
    const user = this.authService.currentUser();
    if (!user || !user.id) {
      this.isLoading.set(false);
      return;
    }

    this.candidatService.getProfil(user.id).subscribe({
      next: (data) => {
        this.candidat.set(data);
        this.buildForm(data);

        this.candidatService.getMesCandidatures(data.id).subscribe({
          next: (cands) => this.candidatureCount.set(cands.length),
          error: () => this.candidatureCount.set(0)
        });

        this.authService.updateUser(data as any);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  toggleEdit(): void {
    this.editMode.update(v => !v);
    this.errorMsg.set('');
    this.successMsg.set('');
    if (!this.editMode()) {
      if (this.candidat()) this.buildForm(this.candidat()!);
    }
  }

  onSubmit(): void {
    this.errorMsg.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMsg.set('Veuillez corriger les erreurs dans le formulaire.');
      return;
    }
    const current = this.candidat();
    if (!current) return;

    this.isLoading.set(true);
    this.candidatService.updateProfil(current.id, this.form.value).subscribe({
      next: (updated) => {
        this.candidat.set(updated);
        this.editMode.set(false);
        this.successMsg.set('Profil mis à jour avec succès !');
        this.isLoading.set(false);
        setTimeout(() => this.successMsg.set(''), 3000);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMsg.set('Une erreur est survenue lors de la mise à jour du profil.');
        console.error('Update error:', err);
      }
    });
  }

  // ── Drag & Drop
  onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(): void {
    this.isDragging.set(false);
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.isDragging.set(false);
    const f = e.dataTransfer?.files[0];
    if (f) this.handleFile(f);
  }

  onFileChange(e: any): void {
    const f = e.target.files?.[0];
    if (f) this.handleFile(f);
  }

  getPhotoUrl(): string {
    const url = this.candidat()?.photoUrl;
    if (!url) return '';
    return `http://localhost:8081/uploads/images/${url}?t=${this.photoTimestamp()}`;
  }

  onPhotoSelected(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        this.errorMsg.set('Veuillez sélectionner une image (JPG, PNG).');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        this.errorMsg.set('L\'image est trop volumineuse (max 2Mo).');
        return;
      }

      const current = this.candidat();
      if (!current) return;

      this.isLoading.set(true);
      this.candidatService.uploadPhoto(current.id, file).subscribe({
        next: (updated) => {
          this.candidat.set(updated);
          this.photoTimestamp.set(Date.now());
          this.successMsg.set('Photo de profil mise à jour !');
          this.isLoading.set(false);
          setTimeout(() => this.successMsg.set(''), 3000);
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorMsg.set('Erreur lors de l\'envoi de la photo.');
          console.error(err);
        }
      });
    }
  }

  handleFile(file: File): void {
    if (file.type !== 'application/pdf' || file.size > 5 * 1024 * 1024) return;
    const current = this.candidat();
    if (!current) return;

    this.isLoading.set(true);
    this.candidatService.uploadProfileCV(current.id, file).subscribe({
      next: (updatedCandidat) => {
        this.candidat.set(updatedCandidat);
        this.successMsg.set('CV mis à jour et analysé avec succès !');
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  triggerAnalysis(): void {
    const c = this.candidat();
    if (!c || !c.id) return;

    this.isLoading.set(true);
    this.candidatService.reanalyzeProfile(c.id).subscribe({
      next: (updated) => {
        this.candidat.set(updated);
        this.successMsg.set('Analyse du profil mise à jour !');
        this.isLoading.set(false);
        setTimeout(() => this.successMsg.set(''), 3000);
      },
      error: () => this.isLoading.set(false)
    });
  }

  get scoreDashOffset(): number {
    const r = 50;
    const score = this.candidat()?.profileScore || 0;
    return 2 * Math.PI * r - (score / 100) * 2 * Math.PI * r;
  }

  getInitiales(): string {
    const c = this.candidat();
    if (!c) return '??';
    const p = c.prenom ? c.prenom[0] : '';
    const n = c.nom ? c.nom[0] : '';
    return (p + n).toUpperCase() || '??';
  }

  isInvalid(field: string): boolean {
    const ctrl = this.form?.get(field);
    return !!(ctrl?.invalid && ctrl.touched);
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}