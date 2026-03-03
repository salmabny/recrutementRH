import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const authService = inject(AuthService);
    const token = localStorage.getItem('sh_token');

    let cloned = req;
    if (token) {
        cloned = req.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`
            }
        });
    }

    return next(cloned).pipe(
        catchError((error) => {
            // Si le token est expiré ou invalide (401) ou accès refusé (403)
            if (error.status === 401 || error.status === 403) {
                console.warn('AuthInterceptor: Session expirée ou non autorisée. Déconnexion automatique.');
                authService.logout();
            }
            return throwError(() => error);
        })
    );
};
