import { Component, OnInit, signal, computed, inject, effect, untracked } from '@angular/core';

import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CandidatureService } from '../../services/candidature.service';
import { AuthService } from '../../services/auth.service';
import { Candidature } from '../../models/candidature.model';
import { SidebarRecruteurComponent } from '../sidebar-recruteur/sidebar-recruteur.component';

@Component({
    selector: 'app-ranking',
    standalone: true,
    imports: [CommonModule, SidebarRecruteurComponent],
    templateUrl: './ranking.component.html',
    styleUrls: ['./ranking.component.css']
})
export class RankingComponent implements OnInit {
    private candidatureService = inject(CandidatureService);
    private authService = inject(AuthService);
    private router = inject(Router);

    currentPage = signal<number>(1);
    pageSize = signal<number>(6);
    candidatures = signal<Candidature[]>([]);
    isLoading = signal<boolean>(false);
    selectedJob = signal<string>('Tous');
    selectedMatch = signal<string>('Tous');
    searchQuery = signal<string>('');

    // Recruteur info (sidebar)
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

    // ── Computed Statistics (Dynamic based on filters)
    stats = computed(() => {
        const list = this.filteredAndRanked();
        if (list.length === 0) return { total: 0, topScore: '0', topName: '-', goodMatch: 0, toReview: 0 };

        const total = list.length;
        // The list is already ranked by score in filteredAndRanked()
        const top = list[0];
        const topScore = top.score || 0;
        const topName = top.candidat ? `${top.candidat.prenom} ${top.candidat.nom}` : '-';

        const goodMatch = list.filter(c => (c.score || 0) >= 40).length;
        const toReview = list.filter(c => (c.score || 0) < 40).length;

        return { total, topScore: topScore.toFixed(1), topName, goodMatch, toReview };
    });

    // ── Unique Jobs for Filter
    jobFilters = computed(() => {
        const jobs = this.candidatures()
            .map(c => c.jobOffer?.title)
            .filter(Boolean) as string[];
        return ['Tous les postes', ...new Set(jobs)];
    });

    // ── Filtered and Ranked List
    filteredAndRanked = computed(() => {
        let list = [...this.candidatures()];

        // Job Filter
        const jobFilter = this.selectedJob();
        if (jobFilter !== 'Tous' && jobFilter !== 'Tous les postes') {
            list = list.filter(c => c.jobOffer?.title === jobFilter);
        }

        // Match Filter (Adéquation)
        const matchFilter = this.selectedMatch();
        if (matchFilter !== 'Tous' && matchFilter !== 'Toutes adéquations') {
            if (matchFilter === 'Bonne') list = list.filter(c => (c.score || 0) >= 45);
            if (matchFilter === 'Moyenne') list = list.filter(c => (c.score || 0) >= 25 && (c.score || 0) < 45);
            if (matchFilter === 'Faible') list = list.filter(c => (c.score || 0) < 25);
        }

        // Search Query
        const query = this.searchQuery().toLowerCase().trim();
        if (query) {
            list = list.filter(c =>
                (c.candidat?.prenom + ' ' + c.candidat?.nom).toLowerCase().includes(query)
            );
        }

        // Sorting (Fixed: Default to score/ranking)
        list.sort((a, b) => (b.score || 0) - (a.score || 0));

        return list;
    });

    // ── Pagination
    paginatedCandidates = computed(() => {
        const start = (this.currentPage() - 1) * this.pageSize();
        const end = start + this.pageSize();
        return this.filteredAndRanked().slice(start, end);
    });

    totalPages = computed(() => {
        return Math.ceil(this.filteredAndRanked().length / this.pageSize());
    });

    // Reset page on filter/sort change
    private filterEffect = effect(() => {
        this.searchQuery();
        this.selectedMatch();
        this.selectedJob();
        untracked(() => this.currentPage.set(1));
    });

    setJobFilter(job: string): void {
        this.selectedJob.set(job);
    }

    setMatchFilter(match: string): void {
        this.selectedMatch.set(match);
    }

    onSearch(event: any): void {
        this.searchQuery.set(event.target.value);
    }

    setPage(p: number): void { this.currentPage.set(p); }
    nextPage(): void { if (this.currentPage() < this.totalPages()) this.currentPage.update(p => p + 1); }
    prevPage(): void { if (this.currentPage() > 1) this.currentPage.update(p => p - 1); }

    toggleFavorite(id: number): void {
        this.candidatures.update(list => {
            return list.map(c => {
                if (c.id === id) {
                    const newValue = !c.isFavorite;
                    this.saveFavorite(id, newValue);
                    return { ...c, isFavorite: newValue };
                }
                return c;
            });
        });
    }

    private saveFavorite(id: number, isFav: boolean): void {
        const favs = JSON.parse(localStorage.getItem('fav_candidatures') || '{}');
        if (isFav) favs[id] = true;
        else delete favs[id];
        localStorage.setItem('fav_candidatures', JSON.stringify(favs));
    }

    private restoreFavorites(list: Candidature[]): Candidature[] {
        const favs = JSON.parse(localStorage.getItem('fav_candidatures') || '{}');
        return list.map(c => ({ ...c, isFavorite: !!favs[c.id] }));
    }

    ngOnInit(): void {
        const user = this.authService.currentUser();
        if (user) {
            this.loadCandidatures(user.id);
        }
    }

    loadCandidatures(recruiterId: number): void {
        this.isLoading.set(true);
        this.candidatureService.getCandidaturesByRecruteur(recruiterId).subscribe({
            next: (data) => {
                this.candidatures.set(this.restoreFavorites(data));
                this.isLoading.set(false);
            },
            error: () => this.isLoading.set(false)
        });
    }

    onFilterChange(event: any): void {
        this.setJobFilter(event.target.value);
    }

    onMatchChange(event: any): void {
        this.setMatchFilter(event.target.value);
    }

    getMatchLabel(score: number | undefined): string {
        if (score === undefined || score === -1) return 'N/A';
        if (score >= 45) return 'Bonne adéquation';
        if (score >= 25) return 'Adéquation moyenne';
        return 'Faible adéquation';
    }

    getMatchClass(score: number | undefined): string {
        if (score === undefined || score === -1) return 'match-na';
        if (score >= 45) return 'match-good';
        if (score >= 25) return 'match-mid';
        return 'match-low';
    }

    getScoreClass(score: number | undefined): string {
        if (score === undefined || score === -1) return 'score-na';
        if (score >= 45) return 'score-high'; // Green
        if (score >= 25) return 'score-mid';  // Orange
        return 'score-low';                   // Red
    }

    getPhotoUrl(candidat: any): string {
        const url = candidat?.photoUrl;
        if (!url) return '';
        if (url.startsWith('http')) return url;
        return `http://localhost:8081/uploads/images/${url}`;
    }

    viewDetail(id: number): void {
        this.router.navigate(['/recruteur/candidatures', id]);
    }

    navigateTo(path: string): void {
        this.router.navigate([path]);
    }

    logout(): void {
        this.authService.logout();
    }
}
