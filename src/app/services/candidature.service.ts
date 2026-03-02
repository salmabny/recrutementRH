import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Candidature } from '../models/candidature.model';

@Injectable({ providedIn: 'root' })
export class CandidatureService {

  private apiUrl = 'http://localhost:8081/api';

  constructor(private http: HttpClient) { }

  // ── Candidatures par offre
  getCandidaturesByOffre(offreId: number): Observable<Candidature[]> {
    return this.http.get<Candidature[]>(
      `${this.apiUrl}/candidatures/job-offer/${offreId}`
    );
  }

  // ── Candidatures par recruteur
  getCandidaturesByRecruteur(recruiterId: number): Observable<Candidature[]> {
    return this.http.get<Candidature[]>(
      `${this.apiUrl}/candidatures/recruteur/${recruiterId}`
    );
  }

  // ── Changer statut
  updateStatut(id: number, status: string): Observable<Candidature> {
    return this.http.put<Candidature>(
      `${this.apiUrl}/candidatures/${id}/status`, { status }
    );
  }

  // ── Candidature par ID
  getCandidatureById(id: number): Observable<Candidature> {
    return this.http.get<Candidature>(`${this.apiUrl}/candidatures/${id}`);
  }

  // ── Score / analyse
  getScore(id: number): Observable<{ score: number; analysisResult: string }> {
    return this.http.get<{ score: number; analysisResult: string }>(
      `${this.apiUrl}/candidatures/${id}/score`
    );
  }
}