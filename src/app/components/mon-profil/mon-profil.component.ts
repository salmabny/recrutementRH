import { Component, OnInit, signal, computed, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CandidatService } from '../../services/candidat.service';
import { AuthService } from '../../services/auth.service';
import { Candidat, Experience } from '../../models/candidat.model';
import { Candidature } from '../../models/candidature.model';

import { SidebarCandidatComponent } from '../sidebar-candidat/sidebar-candidat.component';

import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-mon-profil',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, SidebarCandidatComponent],
  templateUrl: './mon-profil.component.html',
  styleUrls: ['./mon-profil.component.css'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-out', style({ opacity: 1 }))
      ])
    ]),
    trigger('slideUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px) scale(0.95)' }),
        animate('300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          style({ opacity: 1, transform: 'translateY(0) scale(1)' }))
      ])
    ])
  ]
})
export class MonProfilComponent implements OnInit {

  candidat = signal<Candidat | null>(null);
  candidatures = signal<Candidature[]>([]);
  candidatureCount = signal(0);
  isLoading = signal(true);
  editMode = signal(false);
  successMsg = signal('');
  errorMsg = signal('');
  isDragging = signal(false);
  photoTimestamp = signal<number>(Date.now());
  showPwdModal = signal(false);
  pwdSuccessMsg = signal('');
  pwdErrorMsg = signal('');
  passwordStrength = signal<any | null>(null);

  skills = signal<string[]>([]);
  skillInput = signal('');
  experiences = signal<Experience[]>([]);

  // TABS & ACTIONS
  activeTab = signal<'info' | 'skills' | 'experience' | 'cv'>('info');
  showActionsMenu = signal(false);
  showPhotoMenu = signal(false);
  showDeletePhotoConfirm = signal(false);

  // PAGINATION Exp
  readonly EXP_PER_PAGE = 3;
  currentPageExp = signal(1);

  paginatedExperiences = computed(() => {
    const exps = this.experiences();
    const start = (this.currentPageExp() - 1) * this.EXP_PER_PAGE;
    return exps.slice(start, start + this.EXP_PER_PAGE);
  });

  totalExpPages = computed(() => {
    const exps = this.experiences();
    return Math.ceil(exps.length / this.EXP_PER_PAGE) || 1;
  });

  // PAGINATION Cand
  readonly CAND_PER_PAGE = 5;
  currentPageCand = signal(1);

  paginatedCandidatures = computed(() => {
    const cands = this.candidatures();
    const start = (this.currentPageCand() - 1) * this.CAND_PER_PAGE;
    return cands.slice(start, start + this.CAND_PER_PAGE);
  });

  totalCandPages = computed(() => {
    const cands = this.candidatures();
    return Math.ceil(cands.length / this.CAND_PER_PAGE) || 1;
  });

  // New experience form fields (plain object — mutated directly by ngModel)
  newExp: { poste: string; entreprise: string; dateDebut: string; dateFin: string; enCours: boolean; description: string } = {
    poste: '',
    entreprise: '',
    dateDebut: '',
    dateFin: '',
    enCours: false,
    description: ''
  };

  form!: FormGroup;
  pwdForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private candidatService: CandidatService,
    private authService: AuthService,
    private router: Router
  ) {
    this.buildForm();
    this.buildPwdForm();
  }

  ngOnInit(): void {
    this.loadProfil();
  }

  buildForm(c?: Candidat, preserveState = false): void {
    this.form = this.fb.group({
      prenom: [c?.prenom || '', Validators.required],
      nom: [c?.nom || '', Validators.required],
      email: [c?.email || '', [Validators.required, Validators.email]],
      telephone: [c?.telephone || ''],
      ville: [c?.ville || ''],
      niveauEtudes: [c?.niveauEtudes || ''],
      anneesExperience: [c?.anneesExperience || 0]
    });
    if (!preserveState) {
      this.skills.set(c?.competences || []);
      this.experiences.set(c?.experiences || []);
    }
  }

  // ── Skills
  addSkill(): void {
    const val = this.skillInput().trim();
    if (val && !this.skills().includes(val)) {
      this.skills.update(s => [...s, val]);
      this.skillInput.set('');
    }
  }

  removeSkill(skill: string): void {
    this.skills.update(s => s.filter(x => x !== skill));
  }

  onSkillKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addSkill();
    }
  }

  onSkillInput(event: Event): void {
    this.skillInput.set((event.target as HTMLInputElement).value);
  }

  // ── Experiences
  addExperience(): void {
    const poste = this.newExp.poste?.trim();
    const entreprise = this.newExp.entreprise?.trim();
    if (!poste || !entreprise) {
      alert('Veuillez renseigner au moins le Poste et lEntreprise.');
      return;
    }

    const exp: Experience = {
      poste,
      entreprise,
      dateDebut: this.newExp.dateDebut || null as any,
      dateFin: this.newExp.enCours ? null as any : (this.newExp.dateFin || null as any),
      enCours: this.newExp.enCours,
      description: this.newExp.description?.trim() || ''
    };

    this.experiences.update(exps => [...exps, exp]);

    // Reset form fields individually so ngModel stays synced
    this.newExp.poste = '';
    this.newExp.entreprise = '';
    this.newExp.dateDebut = '';
    this.newExp.dateFin = '';
    this.newExp.enCours = false;
    this.newExp.description = '';
  }

  removeExperience(index: number): void {
    this.experiences.update(exps => exps.filter((_, i) => i !== index));
  }

  buildPwdForm(): void {
    this.pwdForm = this.fb.group({
      oldPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });

    this.pwdForm.get('newPassword')?.valueChanges.subscribe(val => {
      this.passwordStrength.set(this.authService.checkPasswordStrength(val));
    });
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('newPassword')?.value === g.get('confirmPassword')?.value
      ? null : { mismatch: true };
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
          next: (cands) => {
            this.candidatures.set(cands);
            this.candidatureCount.set(cands.length);
          },
          error: () => {
            this.candidatures.set([]);
            this.candidatureCount.set(0);
          }
        });

        this.authService.updateUser(data as any);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  setTab(tab: any): void {
    this.activeTab.set(tab);
    this.currentPageExp.set(1);
    this.currentPageCand.set(1);
  }

  toggleActionsMenu(): void {
    this.showActionsMenu.update(v => !v);
  }

  togglePhotoMenu(event: Event): void {
    event.stopPropagation();
    this.showPhotoMenu.update(v => !v);
  }

  viewPhoto(): void {
    const url = this.getPhotoUrl();
    if (url) window.open(url, '_blank');
    this.showPhotoMenu.set(false);
  }

  triggerPhotoEdit(): void {
    const input = document.getElementById('photoInput') as HTMLInputElement;
    if (input) input.click();
    this.showPhotoMenu.set(false);
  }

  @HostListener('document:click')
  clickout() {
    if (this.showPhotoMenu()) {
      this.showPhotoMenu.set(false);
    }
  }

  // Experience Nav
  nextPageExp() { if (this.currentPageExp() < this.totalExpPages()) this.currentPageExp.update(p => p + 1); }
  prevPageExp() { if (this.currentPageExp() > 1) this.currentPageExp.update(p => p - 1); }
  goToPageExp(p: number) { this.currentPageExp.set(p); }

  // Candidature Nav (Not used for tabs but good to have)
  nextPageCand() { if (this.currentPageCand() < this.totalCandPages()) this.currentPageCand.update(p => p + 1); }
  prevPageCand() { if (this.currentPageCand() > 1) this.currentPageCand.update(p => p - 1); }
  goToPageCand(p: number) { this.currentPageCand.set(p); }

  getPageArray(total: number): number[] {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text);
  }

  toggleEdit(): void {
    const entering = !this.editMode();
    this.editMode.set(entering);
    this.errorMsg.set('');
    this.successMsg.set('');
    if (!entering) {
      // Cancelled — reset form AND signals back to last saved candidat
      if (this.candidat()) this.buildForm(this.candidat()!);
    }
    // When entering edit mode, keep existing signal state (skills, experiences)
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

    // Keep current skills/experiences before the server call
    const currentSkills = this.skills();
    const currentExperiences = this.experiences();

    const payload = {
      ...this.form.value,
      competences: currentSkills,
      experiences: currentExperiences
    };

    this.isLoading.set(true);
    this.candidatService.updateProfil(current.id, payload).subscribe({
      next: (updated) => {
        // Merge server response with local state
        this.candidat.set({
          ...updated,
          competences: updated.competences?.length ? updated.competences : currentSkills,
          experiences: updated.experiences?.length ? updated.experiences : currentExperiences
        });
        // Rebuild reactive form only (preserve skills/experiences signals)
        this.buildForm(updated, true);
        // Restore signals with merged data
        this.skills.set(updated.competences?.length ? updated.competences : currentSkills);
        this.experiences.set(updated.experiences?.length ? updated.experiences : currentExperiences);
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

  deletePhoto(event: Event): void {
    event.stopPropagation();
    this.showPhotoMenu.set(false);
    this.showDeletePhotoConfirm.set(true);
  }

  cancelDeletePhoto(): void {
    this.showDeletePhotoConfirm.set(false);
  }

  confirmDeletePhoto(): void {
    const current = this.candidat();
    if (!current) return;

    this.isLoading.set(true);
    this.showDeletePhotoConfirm.set(false);

    this.candidatService.deletePhoto(current.id).subscribe({
      next: (updated) => {
        this.candidat.set({
          ...updated,
          competences: updated.competences?.length ? updated.competences : this.skills(),
          experiences: updated.experiences?.length ? updated.experiences : this.experiences()
        });
        this.successMsg.set('Photo supprimée avec succès !');
        this.isLoading.set(false);
        setTimeout(() => this.successMsg.set(''), 3000);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMsg.set('Erreur lors de la suppression de la photo.');
        console.error('Delete photo error:', err);
      }
    });
  }

  handleFile(file: File): void {
    if (file.type !== 'application/pdf' || file.size > 5 * 1024 * 1024) return;
    const current = this.candidat();
    if (!current) return;

    this.isLoading.set(true);
    this.candidatService.uploadProfileCV(current.id, file).subscribe({
      next: (updatedCandidat) => {
        this.candidat.set(updatedCandidat);
        this.authService.updateUser(updatedCandidat as any);
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
        this.authService.updateUser(updated as any);
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

  togglePwdModal(): void {
    this.showPwdModal.update(v => !v);
    this.pwdErrorMsg.set('');
    this.pwdSuccessMsg.set('');
    this.pwdForm.reset();
  }

  onChangePassword(): void {
    if (this.pwdForm.invalid) return;
    const { oldPassword, newPassword } = this.pwdForm.value;

    this.isLoading.set(true);
    this.authService.changePassword(oldPassword, newPassword).subscribe({
      next: () => {
        this.pwdSuccessMsg.set('Mot de passe mis à jour !');
        this.isLoading.set(false);
        setTimeout(() => this.togglePwdModal(), 2000);
      },
      error: (err) => {
        this.pwdErrorMsg.set(err.message || 'Erreur lors du changement.');
        this.isLoading.set(false);
      }
    });
  }

  viewCv() {
    const cvUrl = this.candidat()?.cv?.fileUrl;
    if (cvUrl) {
      // Accessing the backend file server URL directly
      const fullUrl = cvUrl.startsWith('http') ? cvUrl : `http://localhost:8081/uploads/cv/${cvUrl}`;
      window.open(fullUrl, '_blank');
    } else {
      this.errorMsg.set("Aucun CV disponible à consulter.");
    }
  }
}