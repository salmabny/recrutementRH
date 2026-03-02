import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RecruiterStats } from './recruiter.service';

export interface Recruteur {
    id: number;
    nom: string;
    prenom: string;
    email: string;
    telephone?: string;
    ville?: string;
    entreprise?: string;
    companyDomain?: string;
    photoUrl?: string;
    role?: string;
    dateInscription?: string;
}

@Injectable({ providedIn: 'root' })
export class RecruteurService {
    private apiUrl = 'http://localhost:8081/api';

    constructor(private http: HttpClient) { }

    getProfil(id: number): Observable<Recruteur> {
        return this.http.get<Recruteur>(`${this.apiUrl}/users/${id}`);
    }

    updateProfil(id: number, data: Partial<Recruteur>): Observable<void> {
        return this.http.put<void>(`${this.apiUrl}/users/${id}/recruteur`, data);
    }

    uploadPhoto(id: number, file: File): Observable<Recruteur> {
        const formData = new FormData();
        formData.append('photo', file);
        return this.http.post<Recruteur>(`${this.apiUrl}/users/${id}/upload-photo`, formData);
    }
}
