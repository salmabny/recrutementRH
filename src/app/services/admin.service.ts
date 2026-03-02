import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { User, AdminStats, MonthlyChartData } from '../models/user.model';
import { Offre } from '../models/offre.model';

@Injectable({ providedIn: 'root' })
export class AdminService {

  private apiUrl = 'http://localhost:8081/api';

  // State global pour les compteurs de la sidebar
  stats = signal<AdminStats | null>(null);

  constructor(private http: HttpClient) { }

  refreshStats(): void {
    this.getStats().subscribe({
      next: (data) => this.stats.set(data)
    });
  }

  // ── Stats globales
  getStats(): Observable<AdminStats> {
    return this.http.get<AdminStats>(`${this.apiUrl}/admin/stats`);
  }

  // ── Recruteurs
  getAllRecruteurs(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/admin/recruteurs`);
  }

  getRecruteursEnAttente(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/admin/recruteurs/en-attente`);
  }

  validerRecruteur(id: number): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/admin/recruteurs/${id}/valider`, {});
  }

  refuserRecruteur(id: number): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/admin/recruteurs/${id}/refuser`, {});
  }

  // ── Tous les utilisateurs
  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/admin/users`);
  }

  supprimerUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/admin/users/${id}`);
  }

  suspendreUser(id: number): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/admin/users/${id}/suspendre`, {});
  }

  activerUser(id: number): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/admin/users/${id}/activer`, {});
  }

  // ── Stats mensuelles pour le graphique
  getMonthlyStats(): Observable<MonthlyChartData[]> {
    return this.http.get<MonthlyChartData[]>(`${this.apiUrl}/admin/stats/monthly`);
  }

  // ── Gestion des offres
  getAllJobOffers(): Observable<Offre[]> {
    return this.http.get<Offre[]>(`${this.apiUrl}/admin/job-offers`);
  }

  deleteJobOffer(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/admin/job-offers/${id}`);
  }
}