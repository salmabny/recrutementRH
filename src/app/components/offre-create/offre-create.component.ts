import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { OffreService } from '../../services/offre.service';
import { AuthService } from '../../services/auth.service';
import { Keyword, KeywordType } from '../../models/keyword.model';

@Component({
  selector: 'app-offre-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './offre-create.component.html',
  styleUrls: ['./offre-create.component.css']
})
export class OffreCreateComponent implements OnInit {

  form!: FormGroup;
  isLoading = signal(false);
  errorMessage = signal('');
  successMsg = signal('');

  // Image upload
  selectedFile = signal<File | null>(null);
  imagePreview = signal<string | null>(null);

  // Mode Edit
  isEditMode = signal(false);
  offreId = signal<number | null>(null);


  // Skill input
  skillInput = signal('');
  skills = signal<string[]>([]);

  // ExpField input
  expFieldInput = signal('');
  expFields = signal<string[]>([]);

  constructor(
    private fb: FormBuilder,
    private offreService: OffreService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  get recruteur() {
    const user = this.authService.currentUser();
    return {
      id: user?.id || 1,
      prenom: user?.prenom || 'Marie',
      nom: user?.nom || 'Dupont',
      entreprise: user?.entreprise || 'Ma Société',
      initiales: (user?.prenom?.[0] || 'M') + (user?.nom?.[0] || 'D')
    };
  }


  ngOnInit(): void {
    this.buildForm();

    // Vérifier si on est en mode édition
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const id = +idParam;
      this.isEditMode.set(true);
      this.offreId.set(id);
      this.loadOffreData(id);
    }
  }

  buildForm(): void {
    this.form = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(5)]],
      location: ['', Validators.required],
      educationLevel: ['', Validators.required],
      experienceYears: [1, [Validators.required, Validators.min(0)]],
      description: ['', [Validators.required, Validators.minLength(20)]],
      imageUrl: [''],
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile.set(file);
      const reader = new FileReader();
      reader.onload = () => this.imagePreview.set(reader.result as string);
      reader.readAsDataURL(file);
    }
  }


  loadOffreData(id: number): void {
    this.isLoading.set(true);
    this.offreService.getOffreById(id).subscribe({
      next: (offre) => {
        this.form.patchValue({
          title: offre.title,
          location: offre.location,
          educationLevel: offre.educationLevel,
          experienceYears: offre.experienceYears,
          description: offre.description,
          imageUrl: offre.imageUrl || ''
        });
        this.skills.set(offre.requiredSkills || []);
        this.expFields.set(offre.experienceFields || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Erreur lors du chargement de l\'offre');
        this.isLoading.set(false);
      }
    });
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

  // ── ExpFields
  addExpField(): void {
    const val = this.expFieldInput().trim();
    if (val && !this.expFields().includes(val)) {
      this.expFields.update(f => [...f, val]);
      this.expFieldInput.set('');
    }
  }

  removeExpField(field: string): void {
    this.expFields.update(f => f.filter(x => x !== field));
  }

  onExpFieldKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addExpField();
    }
  }

  onExpFieldInput(event: Event): void {
    this.expFieldInput.set((event.target as HTMLInputElement).value);
  }


  // ── Submit
  onSubmit(publier: boolean = false): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const proceedWithSubmit = (finalImageUrl?: string) => {
      const payload = {
        ...this.form.value,
        requiredSkills: this.skills(),
        experienceFields: this.expFields(),
        recruiterId: this.recruteur.id,
        status: publier ? 'PUBLIEE' : 'BROUILLON'
      };

      if (finalImageUrl) {
        payload.imageUrl = finalImageUrl;
      }

      if (this.isEditMode()) {
        this.offreService.updateOffre(this.offreId()!, payload).subscribe({
          next: () => {
            this.isLoading.set(false);
            this.successMsg.set('Offre mise à jour avec succès !');
            setTimeout(() => this.router.navigate(['/recruteur/offres']), 1500);
          },
          error: (err) => {
            this.isLoading.set(false);
            const detail = err.error?.error || 'Erreur lors de la mise à jour de l\'offre';
            this.errorMessage.set(detail);
          }
        });
      } else {
        this.offreService.createOffre(payload).subscribe({
          next: () => {
            this.isLoading.set(false);
            this.successMsg.set('Offre créée avec succès !');
            setTimeout(() => this.router.navigate(['/recruteur/offres']), 1500);
          },
          error: (err) => {
            this.isLoading.set(false);
            const detail = err.error?.error || 'Erreur lors de la création de l\'offre';
            this.errorMessage.set(detail);
            console.error('Creation error:', err);
          }
        });
      }
    };

    if (this.selectedFile()) {
      this.offreService.uploadImage(this.selectedFile()!).subscribe({
        next: (res) => proceedWithSubmit(res.imageUrl),
        error: (err) => {
          this.isLoading.set(false);
          this.errorMessage.set('Erreur lors de l\'upload de l\'image');
          console.error('Upload error:', err);
        }
      });
    } else {
      proceedWithSubmit();
    }
  }

  isInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl && ctrl.invalid && ctrl.touched);
  }

  logout(): void {
    if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
      this.authService.logout();
    }
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }
}
