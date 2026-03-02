import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Candidat, AlerteEmploi } from '../models/candidat.model';

@Injectable({ providedIn: 'root' })
export class CandidatService {

  private apiUrl = 'http://localhost:8081/api';

  constructor(private http: HttpClient) { }

  // ── Profil candidat (using generic users endpoint)
  getProfil(id: number): Observable<Candidat> {
    return this.http.get<Candidat>(`${this.apiUrl}/users/${id}`);
  }

  updateProfil(id: number, data: Partial<Candidat>): Observable<Candidat> {
    return this.http.put<Candidat>(`${this.apiUrl}/users/${id}`, data);
  }

  uploadPhoto(id: number, file: File): Observable<Candidat> {
    const formData = new FormData();
    formData.append('photo', file);
    return this.http.post<Candidat>(`${this.apiUrl}/users/${id}/upload-photo`, formData);
  }

  // ── CV Profile
  uploadProfileCV(id: number, file: File): Observable<Candidat> {
    const formData = new FormData();
    formData.append('cvFile', file);
    return this.http.post<Candidat>(
      `${this.apiUrl}/candidatures/analyze-profile/${id}`, formData
    );
  }

  reanalyzeProfile(id: number): Observable<Candidat> {
    return this.http.get<Candidat>(
      `${this.apiUrl}/candidatures/reanalyze-profile/${id}`
    );
  }

  // ── Score CV
  getScoreCV(candidatId: number, offreId: number): Observable<{ score: number; details: any }> {
    return this.http.get<{ score: number; details: any }>(
      `${this.apiUrl}/candidats/${candidatId}/score/${offreId}`
    );
  }

  // ── Alertes emploi
  getAlertes(candidatId: number): Observable<AlerteEmploi[]> {
    return this.http.get<AlerteEmploi[]>(
      `${this.apiUrl}/candidats/${candidatId}/alertes`
    );
  }

  createAlerte(candidatId: number, alerte: Partial<AlerteEmploi>): Observable<AlerteEmploi> {
    return this.http.post<AlerteEmploi>(
      `${this.apiUrl}/candidats/${candidatId}/alertes`, alerte
    );
  }

  deleteAlerte(candidatId: number, alerteId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/candidats/${candidatId}/alertes/${alerteId}`
    );
  }

  // ── Offres disponibles
  getOffresDisponibles(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/job-offers`);
  }

  getJobAlerts(candidatId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/alertes/candidat/${candidatId}`);
  }

  getLatestCandidatureAnalysis(candidatId: number): Observable<any> {
    return this.http.get<any>(`http://localhost:8081/api/candidatures/latest/${candidatId}`);
  }

  getOffreById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/job-offers/${id}`);
  }

  // ── Postuler
  postuler(candidatId: number, offreId: number, cvFile: File, lettre?: string): Observable<any> {
    const formData = new FormData();
    formData.append('cvFile', cvFile);
    formData.append('jobOfferId', offreId.toString());
    formData.append('candidatId', candidatId.toString());
    if (lettre) formData.append('lettre', lettre);
    return this.http.post<any>(`${this.apiUrl}/candidatures/postuler`, formData);
  }

  // ── Mes candidatures
  getMesCandidatures(candidatId: number): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.apiUrl}/candidatures/candidat/${candidatId}`
    );
  }
}