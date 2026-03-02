import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleSelectedGuard, adminGuard, recruteurGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./components/login/login.component').then(m => m.LoginComponent),
    title: 'SmartHiring — Connexion'
  },
  {
    path: 'signup',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./components/role-select/role-select.component').then(m => m.RoleSelectComponent),
    title: 'SmartHiring — Inscription'
  },
  {
    path: 'signup/candidat',
    canActivate: [guestGuard, roleSelectedGuard],
    loadComponent: () =>
      import('./components/signup-candidat/signup-candidat.component').then(m => m.SignupCandidatComponent),
    title: 'SmartHiring — Inscription Candidat'
  },
  {
    path: 'signup/recruteur',
    canActivate: [guestGuard, roleSelectedGuard],
    loadComponent: () =>
      import('./components/signup-recruteur/signup-recruteur.component').then(m => m.SignupRecruteurComponent),
    title: 'SmartHiring — Inscription Recruteur'
  },
  {
    path: 'recruteur',
    canActivate: [authGuard, recruteurGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./components/dashboard-recruteur/dashboard-recruteur.component').then(m => m.DashboardRecruteurComponent),
        title: 'SmartHiring — Espace Recruteur'
      },
      {
        path: 'offres',
        loadComponent: () =>
          import('./components/offres-list/offres-list.component').then(m => m.OffresListComponent),
        title: 'SmartHiring — Mes Offres'
      },
      {
        path: 'offres/create',
        loadComponent: () =>
          import('./components/offre-create/offre-create.component').then(m => m.OffreCreateComponent),
        title: 'SmartHiring — Nouvelle Offre'
      },
      {
        path: 'offres/edit/:id',
        loadComponent: () =>
          import('./components/offre-create/offre-create.component').then(m => m.OffreCreateComponent),
        title: 'SmartHiring — Modifier Offre'
      },
      {
        path: 'offres/:id',
        loadComponent: () =>
          import('./components/offre-detail/offre-detail.component').then(m => m.OffreDetailComponent),
        title: 'SmartHiring — Détails de l\'offre'
      },
      {
        path: 'candidatures',
        loadComponent: () =>
          import('./components/candidatures-list/candidatures-list.component').then(m => m.CandidaturesListComponent),
        title: 'SmartHiring — Candidatures'
      },
      {
        path: 'candidatures/:id',
        loadComponent: () =>
          import('./components/candidature-detail/candidature-detail.component').then(m => m.CandidatureDetailComponent),
        title: 'SmartHiring — Dossier Candidat'
      },
      {
        path: 'candidat/:id',
        loadComponent: () =>
          import('./components/candidate-profile-view/candidate-profile-view.component').then(m => m.CandidateProfileViewComponent),
        title: 'SmartHiring — Profil Candidat'
      },
      {
        path: 'profil',
        loadComponent: () =>
          import('./components/profil-recruteur/profil-recruteur.component').then(m => m.ProfilRecruteurComponent),
        title: 'SmartHiring — Mon Profil'
      }
    ]
  },
  {
    path: 'forgot-password',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./components/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent),
    title: 'SmartHiring — Mot de passe oublié'
  },

  // ── Dashboard Admin
  {
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./components/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
    title: 'SmartHiring — Admin'
  },
  {
    path: 'admin/recruteurs',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./components/admin-recruteurs/admin-recruteurs.component').then(m => m.AdminRecruteursComponent),
    title: 'SmartHiring — Gestion Recruteurs'
  },
  {
    path: 'admin/users',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./components/admin-users/admin-users.component').then(m => m.AdminUsersComponent),
    title: 'SmartHiring — Gestion Utilisateurs'
  },
  {
    path: 'admin/offres',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./components/admin-offres/admin-offres.component').then(m => m.AdminOffresComponent),
    title: 'SmartHiring — Gestion Offres'
  },
  /*
  {
    path: 'admin/candidat/:id',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./components/candidate-profile-view/candidate-profile-view.component').then(m => m.CandidateProfileViewComponent),
    title: 'SmartHiring — Profil Candidat'
  },
  {
    path: 'admin/recruteur/:id',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./components/recruteur-public-profile/recruteur-public-profile.component').then(m => m.RecruteurPublicProfileComponent),
    title: 'SmartHiring — Profil Recruteur'
  },
  */
  // ── Dashboard Candidat
  {
    path: 'candidat',
    loadComponent: () =>
      import('./components/dashboard-candidat/dashboard-candidat.component')
        .then(m => m.DashboardCandidatComponent),
    title: 'SmartHiring — Espace Candidat'
  },
  {
    path: 'candidat/offres',
    loadComponent: () =>
      import('./components/offres-disponibles/offres-disponibles.component')
        .then(m => m.OffresDisponiblesComponent),
    title: 'SmartHiring — Offres disponibles'
  },
  {
    path: 'candidat/offres/:id/postuler',
    loadComponent: () =>
      import('./components/postuler/postuler.component')
        .then(m => m.PostulerComponent),
    title: 'SmartHiring — Postuler'
  },
  {
    path: 'candidat/candidatures',
    loadComponent: () =>
      import('./components/mes-candidatures/mes-candidatures.component')
        .then(m => m.MesCandidaturesComponent),
    title: 'SmartHiring — Mes candidatures'
  },
  {
    path: 'candidat/offres/:id',
    loadComponent: () =>
      import('./components/offre-detail/offre-detail.component')
        .then(m => m.OffreDetailComponent),
    title: 'SmartHiring — Détails de l\'offre'
  },
  {
    path: 'candidat/profil',
    loadComponent: () =>
      import('./components/mon-profil/mon-profil.component')
        .then(m => m.MonProfilComponent),
    title: 'SmartHiring — Mon profil'
  },
  {
    path: 'candidat/recruteur/:id',
    loadComponent: () =>
      import('./components/recruteur-public-profile/recruteur-public-profile.component')
        .then(m => m.RecruteurPublicProfileComponent),
    title: 'SmartHiring — Profil Recruteur'
  },
  // Wildcard
  {
    path: '**',
    redirectTo: 'login'
  }
];