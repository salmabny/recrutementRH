import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CandidatService } from '../../services/candidat.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { Candidat } from '../../models/candidat.model';

import { SidebarCandidatComponent } from '../sidebar-candidat/sidebar-candidat.component';

@Component({
  selector: 'app-dashboard-candidat',
  standalone: true,
  imports: [CommonModule, SidebarCandidatComponent],
  templateUrl: './dashboard-candidat.component.html',
  styleUrls: ['./dashboard-candidat.component.css']
})
export class DashboardCandidatComponent implements OnInit {

  private candidatService = inject(CandidatService);
  private authService = inject(AuthService);
  private router = inject(Router);
  public notificationService = inject(NotificationService);

  candidat = signal<Candidat | null>(null);
  candidatures = signal<any[]>([]);
  offres = signal<any[]>([]);
  isLoading = signal(true);
  showNotifications = signal(false);

  // Activité & Suggestions
  offresSuggeresMock: any[] = [];

  // Graphique d'activité (calculé depuis les vraies candidatures)
  graphiqueActivite = signal<any[]>([]);

  // Complétion du profil
  completionProfil = signal<{ pourcentage: number, items: any[] }>({
    pourcentage: 0,
    items: []
  });

  // Stats calculées
  get totalOffres() { return this.offres().length; }
  get totalCandidatures() { return this.candidatures().length; }
  get enCours() { return this.candidatures().filter(c => c.status === 'EN_COURS' || c.status === 'SOUMISE').length; }
  get meilleurScore() { return this.candidatures().length ? Math.max(...this.candidatures().map(c => c.score ?? 0)) : 0; }

  // Adapt notifications for the dashboard view
  get activiteRecente() {
    return this.notificationService.notifications().slice(0, 3).map(n => {
      let couleur = 'lavender';
      if (n.message.includes('acceptée')) couleur = 'mint';
      if (n.message.includes('refusée')) couleur = 'coral';

      return {
        id: n.id,
        texte: n.message,
        temps: this.notificationService.formatTime(n.time),
        read: n.read,
        couleur: couleur
      };
    });
  }

  ngOnInit(): void {
    const user = this.authService.currentUser();
    if (user && user.id) {
      this.loadData(user.id);
    } else {
      this.isLoading.set(false);
    }
  }

  loadData(userId: number): void {
    this.isLoading.set(true);

    // 1. Profil
    this.candidatService.getProfil(userId).subscribe({
      next: (data) => {
        this.candidat.set(data);
        this.calculerCompletionProfil(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });

    // 2. Candidatures
    this.candidatService.getMesCandidatures(userId).subscribe({
      next: (data) => {
        this.candidatures.set(data);
        this.notificationService.seedFromCandidaturesForCandidat(data);
        this.calculerGraphiqueActivite(data);
      },
      error: () => this.candidatures.set([])
    });

    // 3. Offres
    this.candidatService.getOffresDisponibles().subscribe({
      next: (data) => {
        this.offres.set(data);
        this.generateSuggestedOffres(data);
      },
      error: () => this.offres.set([])
    });
  }


  toggleNotifications(): void {
    this.showNotifications.update(v => !v);
  }

  get unreadCount(): number {
    return this.notificationService.unreadCount();
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead();
  }

  markAsRead(id: number): void {
    this.notificationService.markAsRead(id);
  }

  generateSuggestedOffres(allOffres: any[]): void {
    const colors = ['#4361ee20', '#38a16920', '#ed893620', '#7b61ff20'];
    const textColors = ['#4361ee', '#38a169', '#ed8936', '#7b61ff'];

    this.offresSuggeresMock = allOffres.slice(0, 3).map((o, idx) => {
      // Utilise le score réel de l'offre si disponible, sinon calcule
      const realScore = o.scoreMatch ?? o.matchScore ?? o.score ?? null;
      const matchPct = realScore !== null
        ? Math.min(100, Math.round(realScore))
        : Math.floor(Math.random() * 20) + 70;

      return {
        id: o.id,
        initiales: o.title?.substring(0, 1).toUpperCase() || 'J',
        color: colors[idx % colors.length],
        textColor: textColors[idx % textColors.length],
        title: o.title,
        company: o.recruteur?.entreprise || 'SmartHiring Partner',
        recruiterName: o.recruteur ? `${o.recruteur.prenom} ${o.recruteur.nom}` : 'Recruteur',
        photoUrl: o.recruteur?.photoUrl,
        location: o.location || 'À distance',
        contrat: o.typeContrat || 'CDI',
        match: matchPct
      };
    });
  }

  calculerGraphiqueActivite(candidatures: any[]): void {
    const moisLabels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const now = new Date();

    // Créer les 6 derniers mois
    const derniers6Mois: { mois: string, annee: number, moisNum: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      derniers6Mois.push({
        mois: moisLabels[d.getMonth()],
        annee: d.getFullYear(),
        moisNum: d.getMonth()
      });
    }

    const data = derniers6Mois.map(({ mois, annee, moisNum }) => {
      const ofCeMois = candidatures.filter(c => {
        const dateStr = c.dateCandidature || c.lastStatusUpdate;
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return d.getFullYear() === annee && d.getMonth() === moisNum;
      });

      return {
        mois,
        soumise: ofCeMois.filter(c => c.status === 'SOUMISE' || c.status === 'EN_COURS').length,
        acceptee: ofCeMois.filter(c => c.status === 'VALIDEE' || c.status === 'ACCEPTEE').length,
        refusee: ofCeMois.filter(c => c.status === 'REFUSEE').length,
        total: ofCeMois.length
      };
    });

    this.graphiqueActivite.set(data);
  }

  calculerCompletionProfil(c: Candidat | null): void {
    if (!c) return;

    const items = [
      { id: 'perso', label: 'Informations personnelles', completed: !!(c.nom && c.prenom && c.email && c.telephone) },
      { id: 'cv', label: 'CV téléchargé', completed: !!(c.cvFileName || c.cvUrl || c.cv?.fileName) },
      { id: 'exp', label: 'Expériences professionnelles', completed: !!(c.experiences && c.experiences.length > 0) },
      { id: 'photo', label: 'Photo de profil', completed: !!c.photoUrl }
    ];

    const completedCount = items.filter(i => i.completed).length;
    const pourcentage = Math.round((completedCount / items.length) * 100);

    this.completionProfil.set({ pourcentage, items });
  }

  getInitiales(): string {
    const c = this.candidat();
    if (!c) return 'XX';
    return `${c.prenom?.charAt(0) || ''}${c.nom?.charAt(0) || ''}`.toUpperCase();
  }

  getPhotoUrl(photo?: string): string {
    if (!photo) return '';
    if (photo.startsWith('http')) return photo;
    return `http://localhost:8081/uploads/images/${photo}`;
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }

  viewAllRecommended(): void {
    this.router.navigate(['/candidat/offres'], { queryParams: { tab: 'recommended' } });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
