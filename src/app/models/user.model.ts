export type UserRole = 'ADMIN' | 'RECRUTEUR' | 'CANDIDAT';
export type UserStatus = 'ACTIVE' | 'PENDING_ADMIN_VALIDATION' | 'PENDING_VERIFICATION' | 'REJECTED' | 'SUSPENDU' | 'DELETED';

export interface User {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  entreprise?: string;
  ville?: string;
  adminDocPath?: string;
  dateInscription: string;
  nombreOffres?: number;
  photoUrl?: string;
}

export interface AdminStats {
  totalUtilisateurs: number;
  totalRecruteurs: number;
  totalCandidats: number;
  offresActives: number;
  candidaturesTraitees: number;
}

export interface ChartData {
  mois: string;
  inscriptions: number;
  recruteurs: number;
  candidatures: number;
}

// Alias for monthly chart data returned by GET /api/admin/stats/monthly
export type MonthlyChartData = ChartData;