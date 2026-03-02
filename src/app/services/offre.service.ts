import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Offre, OffreFormData } from '../models/offre.model';

@Injectable({ providedIn: 'root' })
export class OffreService {

  private apiUrl = 'http://localhost:8081/api';

  constructor(private http: HttpClient) { }

  // ── Offres
  getAllOffres(): Observable<Offre[]> {
    return this.http.get<Offre[]>(`${this.apiUrl}/job-offers`);
  }

  getOffresByRecruteur(recruiterId: number): Observable<Offre[]> {
    return this.http.get<Offre[]>(`${this.apiUrl}/job-offers/list/${recruiterId}`);
  }

  getOffreById(id: number): Observable<Offre> {
    return this.http.get<Offre>(`${this.apiUrl}/job-offers/${id}`);
  }

  createOffre(data: any): Observable<Offre> {
    console.log('OffreService: Creating offer with data:', data);
    return this.http.post<Offre>(`${this.apiUrl}/job-offers`, data);
  }

  updateOffre(id: number, data: OffreFormData): Observable<Offre> {
    return this.http.put<Offre>(`${this.apiUrl}/job-offers/${id}`, data);
  }

  deleteOffre(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/job-offers/${id}`);
  }


  uploadImage(file: File): Observable<{ imageUrl: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ imageUrl: string }>(`${this.apiUrl}/job-offers/upload-image`, formData);
  }
}