import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface RecruiterStats {
    totalOffres: number;
    candidaturesRecues: number;
    offresActives: number;
}

@Injectable({
    providedIn: 'root'
})
export class RecruiterService {
    private http = inject(HttpClient);
    private apiUrl = 'http://localhost:8081/api/recruiter';

    getStats(recruiterId: string): Observable<RecruiterStats> {
        return this.http.get<RecruiterStats>(`${this.apiUrl}/${recruiterId}/stats`);
    }

    getRecentCandidatures(recruiterId: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/${recruiterId}/candidatures`);
    }
}
