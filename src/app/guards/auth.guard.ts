import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Protège les routes privées
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) {
    return true;
  }
  return router.createUrlTree(['/login']);
};

// Empêche un utilisateur connecté d'accéder aux pages auth
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    return true;
  }

  const user = auth.currentUser();
  if (user?.role === 'ADMIN') return router.createUrlTree(['/admin']);
  if (user?.role === 'RECRUTEUR') return router.createUrlTree(['/recruteur']);
  if (user?.role === 'CANDIDAT') return router.createUrlTree(['/candidat']);

  return router.createUrlTree(['/login']);
};

// Vérifie qu'un rôle a été sélectionné avant l'inscription
export const roleSelectedGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.selectedRole() !== null) {
    return true;
  }
  return router.createUrlTree(['/signup']);
};

// Protège les routes Recruteur
export const recruteurGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.currentUser();

  if (user && user.role === 'RECRUTEUR') {
    return true;
  }

  if (user?.role === 'ADMIN') return router.createUrlTree(['/admin']);
  if (user?.role === 'CANDIDAT') return router.createUrlTree(['/candidat']);
  return router.createUrlTree(['/login']);
};

// Protège les routes Admin
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.currentUser();

  if (user && user.role === 'ADMIN') {
    return true;
  }

  if (user?.role === 'RECRUTEUR') return router.createUrlTree(['/recruteur']);
  if (user?.role === 'CANDIDAT') return router.createUrlTree(['/candidat']);
  return router.createUrlTree(['/login']);
};
