import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CandidatureService } from '../../services/candidature.service';
import { AuthService } from '../../services/auth.service';
import { Candidature, CandidatureStatus } from '../../models/candidature.model';

import { SidebarCandidatComponent } from '../sidebar-candidat/sidebar-candidat.component';
import { SidebarRecruteurComponent } from '../sidebar-recruteur/sidebar-recruteur.component';

@Component({
    selector: 'app-candidature-detail',
    standalone: true,
    imports: [CommonModule, SidebarCandidatComponent, SidebarRecruteurComponent],
    templateUrl: './candidature-detail.component.html',
    styleUrls: ['./candidature-detail.component.css']
})
export class CandidatureDetailComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private candidatureService = inject(CandidatureService);
    private authService = inject(AuthService);
    private sanitizer = inject(DomSanitizer);

    candidature = signal<Candidature | null>(null);
    safeCvUrl = signal<SafeResourceUrl | null>(null);
    isLoading = signal(true);
    error = signal<string | null>(null);

    user = computed(() => this.authService.currentUser());
    isAdmin = computed(() => this.user()?.role === 'ADMIN');
    isRecruteur = computed(() => this.user()?.role === 'RECRUTEUR');
    isCandidat = computed(() => this.user()?.role === 'CANDIDAT');

    recruteur = computed(() => {
        const user = this.authService.currentUser();
        return {
            prenom: user?.prenom || '',
            nom: user?.nom || '',
            entreprise: user?.entreprise || 'Ma Société',
            photoUrl: user?.photoUrl,
            initiales: (user?.prenom?.[0] || 'U') + (user?.nom?.[0] || '')
        };
    });

    getPhotoUrl(user: any): string {
        if (!user?.photoUrl) return '';
        if (user.photoUrl.startsWith('http')) return user.photoUrl;
        return `http://localhost:8081/uploads/images/${user.photoUrl}`;
    }

    ngOnInit(): void {
        const id = Number(this.route.snapshot.paramMap.get('id'));
        if (!id) {
            this.error.set('Identifiant de candidature invalide.');
            this.isLoading.set(false);
            return;
        }

        const token = localStorage.getItem('auth-token');

        this.candidatureService.getCandidatureById(id).subscribe({
            next: (data) => {
                if (data.cv?.fileUrl) {
                    let url = data.cv.fileUrl.startsWith('http') ? data.cv.fileUrl : `http://localhost:8081/uploads/cv/${data.cv.fileUrl}`;
                    if (token) {
                        url += (url.includes('?') ? '&' : '?') + `token=${token}`;
                    }
                    this.safeCvUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
                }

                // Parse categorizedSkills from JSON string
                if (data.categorizedSkills && typeof data.categorizedSkills === 'string') {
                    try {
                        data.categorizedSkills = JSON.parse(data.categorizedSkills);
                    } catch (e) {
                        console.error('Error parsing categorizedSkills:', e);
                        data.categorizedSkills = {};
                    }
                }

                this.candidature.set(data);
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Erreur chargement candidature:', err);
                this.error.set('Impossible de charger cette candidature.');
                this.isLoading.set(false);
            }
        });
    }

    // Percentages (0-100) for progress bars - Based on points / max pts
    getSkillProgress = computed(() => {
        const points = this.candidature()?.skillsScore || 0;
        return Math.min(100, Math.round((points / 50) * 100));
    });
    getEducationProgress = computed(() => {
        const points = this.candidature()?.educationScore || 0;
        return Math.min(100, Math.round((points / 25) * 100));
    });
    getExperienceProgress = computed(() => {
        const points = this.candidature()?.experienceScore || 0;
        return Math.min(100, Math.round((points / 25) * 100));
    });

    // Points (Literal contributions) - Raw values from backend
    getSkillPoints = computed(() => this.candidature()?.skillsScore || 0);
    getEducationPoints = computed(() => this.candidature()?.educationScore || 0);
    getExperiencePoints = computed(() => this.candidature()?.experienceScore || 0);

    // Fallback for categorized skills on older records
    processedSkills = computed(() => {
        const c = this.candidature();
        if (!c) return { "Compétences": [], "Outils": [], "Formation": [] };

        const result: Record<string, string[]> = {
            "Compétences": [],
            "Outils": [],
            "Formation": []
        };

        if (c.categorizedSkills && typeof c.categorizedSkills === 'object') {
            Object.keys(c.categorizedSkills).forEach(key => {
                const skills = c.categorizedSkills[key];
                if (Array.isArray(skills)) {
                    let targetKey = key;
                    if (key.includes('Finance') || key.includes('Compétences')) targetKey = "Compétences";
                    if (key.includes('Outils')) targetKey = "Outils";
                    if (key.includes('Formation') || key.includes('Diplôme')) targetKey = "Formation";
                    if (result[targetKey]) result[targetKey] = [...new Set([...result[targetKey], ...skills])];
                }
            });
            if (Object.values(result).some(v => v.length > 0)) return result;
        }

        if (c.analysisResult) {
            const skillsMatch = c.analysisResult.match(/Compétences\s*:\s*([^]*?)(?=\n\n|Diplômes|Expériences|$)/i);
            if (skillsMatch && skillsMatch[1]) {
                const text = skillsMatch[1].trim();
                if (text && !text.includes('Pas de competences detectees')) {
                    const skills = text.split(/[\n,;•-]+/).map(s => s.trim()).filter(s => s.length > 1 && !s.toLowerCase().includes('score total'));
                    if (skills.length > 0) result["Compétences"] = skills;
                }
            }
        }
        return result;
    });

    updateStatus(newStatus: CandidatureStatus): void {
        const c = this.candidature();
        if (!c) return;
        if (!confirm(`Voulez-vous marquer cette candidature comme ${newStatus} ?`)) return;

        this.candidatureService.updateStatut(c.id, newStatus).subscribe({
            next: (updated) => this.candidature.set(updated),
            error: () => alert('Erreur lors de la mise à jour du statut')
        });
    }

    getInitiales(c: Candidature | null): string {
        if (!c?.candidat) return '?';
        return ((c.candidat.prenom?.[0] || '') + (c.candidat.nom?.[0] || '')).toUpperCase();
    }

    getStatusConfig(status: string) {
        const configs: any = {
            'SOUMISE': { label: 'Soumise', css: 'tag-blue' },
            'EN_COURS': { label: 'En cours', css: 'tag-orange' },
            'ACCEPTEE': { label: 'Acceptée', css: 'tag-green' },
            'REFUSEE': { label: 'Refusée', css: 'tag-red' }
        };
        return configs[status] || { label: status, css: 'tag-gray' };
    }

    getScoreClass(score: number | undefined): string {
        if (score === undefined || score === null) return 'score-na';
        if (score >= 75) return 'score-high';
        if (score >= 50) return 'score-mid';
        return 'score-low';
    }

    openCV(): void {
        const token = localStorage.getItem('auth-token');
        const fileUrl = this.candidature()?.cv?.fileUrl;
        if (fileUrl) {
            let url = fileUrl.startsWith('http') ? fileUrl : `http://localhost:8081/uploads/cv/${fileUrl}`;
            if (token) {
                url += (url.includes('?') ? '&' : '?') + `token=${token}`;
            }
            window.open(url, '_blank');
        }
    }

    navigateTo(path: string): void {
        this.router.navigate([path]);
    }

    onSkillClick(skill: string): void {
        console.log('Skill clicked:', skill);
    }

    logout(): void {
        this.authService.logout();
        this.router.navigate(['/login']);
    }
}
