import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CandidatService } from '../../services/candidat.service';
import { AuthService } from '../../services/auth.service';

import { SidebarCandidatComponent } from '../sidebar-candidat/sidebar-candidat.component';

@Component({
  selector: 'app-postuler',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SidebarCandidatComponent],
  templateUrl: './postuler.component.html',
  styleUrls: ['./postuler.component.css']
})
export class PostulerComponent implements OnInit {

  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private candidatService = inject(CandidatService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  form!: FormGroup;
  offre = signal<any>(null);
  isLoading = signal(false);
  isLoadingOffre = signal(true);
  errorMessage = signal('');
  successMsg = signal('');
  cvFile = signal<File | null>(null);
  cvFileName = signal('');
  isDragging = signal(false);
  alreadyApplied = signal(false);
  matchScore = signal<number>(0);
  fullProfil = signal<any>(null);

  candidat = computed(() => this.authService.currentUser());

  ngOnInit(): void {
    this.buildForm();
    this.loadOffre();
    this.loadFullProfil();
  }

  loadFullProfil(): void {
    const user = this.candidat();
    if (user) {
      this.candidatService.getProfil(user.id).subscribe({
        next: (data) => this.fullProfil.set(data),
        error: (err) => console.error('Erreur chargement profil complet:', err)
      });
    }
  }

  buildForm(): void {
    const user = this.candidat();
    this.form = this.fb.group({
      prenom: [user?.prenom || '', Validators.required],
      nom: [user?.nom || '', Validators.required],
      email: [user?.email || '', [Validators.required, Validators.email]],
      telephone: [user?.telephone || '', []],
      lettre: ['', []]
    });
  }

  loadOffre(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.isLoadingOffre.set(true);

    this.candidatService.getOffreById(id).subscribe({
      next: (data) => {
        this.offre.set(data);
        this.isLoadingOffre.set(false);
        this.checkIfAlreadyApplied(id);
        this.loadMatchScore(id);
      },
      error: (err) => {
        console.error('Erreur chargement offre:', err);
        this.errorMessage.set('Impossible de charger les détails de l\'offre.');
        this.isLoadingOffre.set(false);
      }
    });
  }

  checkIfAlreadyApplied(offreId: number): void {
    const user = this.candidat();
    if (!user) return;

    this.candidatService.getMesCandidatures(user.id).subscribe({
      next: (list) => {
        const found = list.find((c: any) => c.jobOffer?.id === offreId);
        if (found) {
          this.alreadyApplied.set(true);
          this.errorMessage.set('Tu as déjà postulé pour cette offre');
        }
      },
      error: (err) => console.error('Erreur check already applied:', err)
    });
  }

  loadMatchScore(offreId: number): void {
    const user = this.candidat();
    if (!user) return;

    this.candidatService.getScoreCV(user.id, offreId).subscribe({
      next: (res) => {
        if (res && res.score !== undefined) {
          this.matchScore.set(res.score);
        }
      },
      error: (err) => console.error('Erreur chargement score match:', err)
    });
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(): void {
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    const file = event.dataTransfer?.files[0];
    if (file) this.handleFile(file);
  }

  onFileChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.handleFile(file);
  }

  handleFile(file: File): void {
    if (file.type !== 'application/pdf') {
      this.errorMessage.set('Seuls les fichiers PDF sont acceptés.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.errorMessage.set('Le fichier ne doit pas dépasser 5 Mo.');
      return;
    }
    this.cvFile.set(file);
    this.cvFileName.set(file.name);
    this.errorMessage.set('');
  }

  removeCV(): void {
    this.cvFile.set(null);
    this.cvFileName.set('');
  }

  get checkInfos(): boolean {
    const user = this.candidat();
    return !!(this.form.get('prenom')?.valid && this.form.get('email')?.valid);
  }
  get checkCV(): boolean {
    return !!this.cvFile() || !!this.fullProfil()?.cv;
  }
  get checkLettre(): boolean { return !!this.form.get('lettre')?.value?.trim(); }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    // Check if either a new file is uploaded OR a profile CV exists
    if (!this.cvFile() && !this.fullProfil()?.cv) {
      this.errorMessage.set('Veuillez déposer votre CV.');
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const currentOffre = this.offre();
    const currentUser = this.candidat();
    const lettre = this.form.get('lettre')?.value;

    if (!currentOffre || !currentUser) {
      this.errorMessage.set('Erreur: Offre ou utilisateur non trouvé.');
      this.isLoading.set(false);
      return;
    }

    // Determine the CV to send: the new one if present, otherwise null (handled by backend)
    const fileToUpload = this.cvFile();

    this.candidatService.postuler(currentUser.id, currentOffre.id, fileToUpload, lettre).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.successMsg.set('Candidature envoyée avec succès ! 🎉');
        setTimeout(() => this.router.navigate(['/candidat/candidatures']), 2000);
      },
      error: (err) => {
        console.error('Erreur postulation:', err);
        this.isLoading.set(false);

        if (err.status === 409) {
          this.alreadyApplied.set(true);
          this.errorMessage.set(err.error?.message || 'Tu as déjà postulé pour cette offre');
        } else {
          this.errorMessage.set('Une erreur est survenue lors de l\'envoi de votre candidature.');
        }
      }
    });
  }

  isInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl && ctrl.invalid && ctrl.touched);
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  getInitiales(): string {
    const user = this.candidat();
    if (!user) return 'C';
    return `${user.prenom?.charAt(0) || ''}${user.nom?.charAt(0) || ''}`.toUpperCase();
  }
}