import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import {
  AuthUser,
  LoginPayload,
  SignupRecruteurPayload,
  SignupCandidatPayload,
  UserRole,
  PasswordStrengthResult
} from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly API_URL = 'http://localhost:8081/api/auth';
  private readonly ADMIN_API_URL = 'http://localhost:8081/api/admin';
  public readonly GOOGLE_CLIENT_ID = '455050973895-mc68hr26f7e7vcn1b40s49dh5lut970a.apps.googleusercontent.com';
  private http = inject(HttpClient);
  private router = inject(Router);

  // ── Signals
  private _currentUser = signal<AuthUser | null>(null);
  private _isLoading = signal<boolean>(false);
  private _selectedRole = signal<UserRole | null>(null);

  // ── Public
  readonly currentUser = computed(() => this._currentUser());
  readonly isLoading = computed(() => this._isLoading());
  readonly isLoggedIn = computed(() => this._currentUser() !== null);
  readonly selectedRole = computed(() => this._selectedRole());

  constructor() {
    // Restaurer session
    const stored = localStorage.getItem('sh_user');
    if (stored) {
      console.log('AuthService: Restoring session from localStorage');
      try {
        const user = JSON.parse(stored);
        this._currentUser.set(user);
        console.log('AuthService: Session restored for:', user.email);
      } catch (e) {
        console.error('AuthService: Failed to parse session', e);
        localStorage.removeItem('sh_user');
      }
    } else {
      console.log('AuthService: No session found in localStorage');
    }
  }

  // ── Sélection du rôle
  setRole(role: UserRole): void {
    console.log('AuthService: Setting role to:', role);
    this._selectedRole.set(role);
  }

  clearRole(): void {
    console.log('AuthService: Clearing role');
    this._selectedRole.set(null);
  }

  // ── Connexion
  login(payload: LoginPayload): Observable<AuthUser> {
    this._isLoading.set(true);

    const body = {
      email: payload.email,
      password: payload.password
    };

    return this.http.post<AuthUser>(`${this.API_URL}/login`, body).pipe(
      tap(user => {
        this._isLoading.set(false);
        this._currentUser.set(user);

        // On stocke toujours le token pour l'intercepteur
        if (user.token) {
          localStorage.setItem('sh_token', user.token);
        }

        if (payload.rememberMe) {
          localStorage.setItem('sh_user', JSON.stringify(user));
        }
      }),
      catchError(err => {
        this._isLoading.set(false);
        return throwError(() => ({ message: this.parseError(err, 'Erreur de connexion') }));
      })
    );
  }

  // ── Vérification (Candidat)
  verify(email: string, code: string): Observable<string> {
    this._isLoading.set(true);
    return this.http.post(`${this.API_URL}/verify`, { email, code }, { responseType: 'text' }).pipe(
      tap(() => {
        this._isLoading.set(false);
      }),
      catchError(err => {
        this._isLoading.set(false);
        return throwError(() => ({ message: this.parseError(err, 'Code invalide') }));
      })
    );
  }

  // ── Renvoyer le code de vérification
  resendVerificationCode(email: string): Observable<string> {
    this._isLoading.set(true);
    return this.http.post(`${this.API_URL}/resend-code`, { email }, { responseType: 'text' }).pipe(
      tap(() => this._isLoading.set(false)),
      catchError(err => {
        this._isLoading.set(false);
        return throwError(() => ({ message: this.parseError(err, 'Erreur lors du renvoi du code') }));
      })
    );
  }

  // ── Inscription Recruteur
  signupRecruteur(payload: SignupRecruteurPayload): Observable<AuthUser> {
    this._isLoading.set(true);

    const formData = new FormData();
    formData.append('nom', payload.nom);
    formData.append('prenom', payload.prenom);
    formData.append('email', payload.email);
    formData.append('password', payload.password);
    formData.append('entreprise', payload.entreprise);
    formData.append('ville', payload.ville);
    if (payload.document) {
      formData.append('document', payload.document);
    }

    console.log('[AuthService] signupRecruteur with FormData');

    return this.http.post<AuthUser>(`${this.API_URL}/register-recruiter`, formData).pipe(
      tap(() => {
        this._isLoading.set(false);
        // On ne définit PAS l'utilisateur ici car il doit être validé par l'admin d'abord
      }),
      catchError(err => {
        this._isLoading.set(false);
        return throwError(() => ({ message: this.parseError(err, 'Erreur lors de l\'inscription') }));
      })
    );
  }

  // ── Inscription Candidat
  signupCandidat(payload: SignupCandidatPayload): Observable<any> {
    this._isLoading.set(true);

    const body = {
      prenom: payload.prenom,
      nom: payload.nom,
      email: payload.email,
      password: payload.password,
      role: 'CANDIDAT'
    };
    console.log('[AuthService] signupCandidat body:', body);
    console.log('[AuthService] signupCandidat JSON:', JSON.stringify(body));

    return this.http.post<any>(`${this.API_URL}/register`, body).pipe(
      tap(response => {
        this._isLoading.set(false);
        // Le candidat aura le statut PENDING_VERIFICATION
        // response contient { email, role, status, emailSent, devCode? }
      }),
      catchError(err => {
        this._isLoading.set(false);
        return throwError(() => ({ message: this.parseError(err, 'Erreur lors de l\'inscription') }));
      })
    );
  }

  // ── Connexion avec Google
  loginWithGoogle(data: { email: string; prenom: string; nom: string; role: UserRole }): Observable<AuthUser> {
    this._isLoading.set(true);
    return this.http.post<AuthUser>(`${this.API_URL}/google`, data).pipe(
      tap(user => {
        this._isLoading.set(false);
        this._currentUser.set(user);
        localStorage.setItem('sh_user', JSON.stringify(user));
      }),
      catchError(err => {
        this._isLoading.set(false);
        return throwError(() => ({ message: this.parseError(err, 'Erreur de connexion Google') }));
      })
    );
  }

  // ── Mot de passe oublié
  forgotPassword(email: string): Observable<any> {
    this._isLoading.set(true);
    return this.http.post(`${this.API_URL}/forgot-password`, { email }).pipe(
      tap(() => this._isLoading.set(false)),
      catchError(err => {
        this._isLoading.set(false);
        return throwError(() => ({ message: this.parseError(err, 'Erreur lors de la demande') }));
      })
    );
  }

  // ── Réinitialiser le mot de passe
  resetPassword(payload: any): Observable<any> {
    this._isLoading.set(true);
    return this.http.post(`${this.API_URL}/reset-password`, payload, { responseType: 'text' }).pipe(
      tap(() => this._isLoading.set(false)),
      catchError(err => {
        this._isLoading.set(false);
        return throwError(() => ({ message: this.parseError(err, 'Erreur lors de la réinitialisation') }));
      })
    );
  }

  // ── Admin : Gestion des recruteurs
  getPendingRecruiters(): Observable<AuthUser[]> {
    this._isLoading.set(true);
    return this.http.get<AuthUser[]>(`${this.ADMIN_API_URL}/pending-recruiters`).pipe(
      tap(() => this._isLoading.set(false)),
      catchError(err => {
        this._isLoading.set(false);
        return throwError(() => ({ message: this.parseError(err, 'Erreur lors de la récupération des recruteurs') }));
      })
    );
  }

  validateRecruiter(id: string, approve: boolean): Observable<string> {
    this._isLoading.set(true);
    return this.http.post(`${this.ADMIN_API_URL}/validate-recruiter/${id}?approve=${approve}`, {}, { responseType: 'text' }).pipe(
      tap(() => this._isLoading.set(false)),
      catchError(err => {
        this._isLoading.set(false);
        return throwError(() => ({ message: this.parseError(err, 'Erreur lors de la validation') }));
      })
    );
  }

  // ── Utilitaire erreur backend (retourne du texte brut)
  private parseError(err: any, fallback: string): string {
    if (typeof err.error === 'string' && err.error.trim()) {
      return err.error.trim();
    }
    if (err.error?.message) return err.error.message;
    if (err.message) return err.message;
    return fallback;
  }

  // ── Déconnexion
  logout(): void {
    console.log('AuthService: Performing logout');
    this._currentUser.set(null);
    localStorage.removeItem('sh_user');
    localStorage.removeItem('sh_token');
    this.router.navigate(['/login']);
  }

  // ── Update local session data
  updateUser(user: AuthUser): void {
    const current = this._currentUser();
    if (current && current.id === user.id) {
      const updated = { ...current, ...user };
      this._currentUser.set(updated);
      localStorage.setItem('sh_user', JSON.stringify(updated));
    }
  }

  // ── Force du mot de passe
  checkPasswordStrength(password: string): PasswordStrengthResult {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    const levels: PasswordStrengthResult[] = [
      { level: 1, label: 'faible', color: '#e53e3e' },
      { level: 2, label: 'moyen', color: '#ed8936' },
      { level: 3, label: 'fort', color: '#4361ee' },
      { level: 4, label: 'très fort', color: '#38a169' },
    ];
    return levels[Math.max(0, score - 1)] ?? levels[0];
  }
}