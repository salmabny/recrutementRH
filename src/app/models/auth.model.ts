import { UserStatus } from './user.model';
export type UserRole = 'RECRUTEUR' | 'CANDIDAT' | 'ADMIN';

export interface LoginPayload {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface SignupRecruteurPayload {
  prenom: string;
  nom: string;
  entreprise: string;
  ville: string;
  email: string;
  password: string;
  document: File | null;
  acceptTerms?: boolean;
}

export interface SignupCandidatPayload {
  prenom: string;
  nom: string;
  email: string;
  password: string;
  acceptTerms?: boolean;
}

export interface AuthUser {
  id: number;
  prenom: string;
  nom: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  token?: string; // JWT Token
  type?: string;  // Bearer
  entreprise?: string;
  ville?: string;
  dateInscription?: string;
  password?: string;
  adminDocPath?: string;
  telephone?: string;
  photoUrl?: string;
  companyDomain?: string;
  mustChangePassword?: boolean;
  cv?: {
    id: number;
    fileName: string;
    fileUrl: string;
    uploadDate: string;
  };
}

export type PasswordStrength = 'faible' | 'moyen' | 'fort' | 'très fort';

export interface PasswordStrengthResult {
  level: 1 | 2 | 3 | 4;
  label: PasswordStrength;
  color: string;
}