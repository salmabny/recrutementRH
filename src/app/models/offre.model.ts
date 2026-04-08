import { Keyword } from './keyword.model';
import { AuthUser } from './auth.model';

export type StatutOffre = 'PUBLIEE' | 'BROUILLON' | 'FERMEE';

export interface Offre {
  id: number;
  title: string;
  description: string;
  location: string;
  category?: string;
  requiredSkills: string[];
  educationLevel: string;
  experienceYears: number;
  experienceFields: string[];
  publicationDate: string;
  expirationDate: string;
  recruiterId: number;
  status: StatutOffre; // Corresponds to 'status' in backend
  nombreCandidatures: number; // Corresponds to @JsonProperty in backend
  imageUrl?: string;
  recruteur?: AuthUser;
}

export interface OffreFormData {
  title: string;
  description: string;
  location: string;
  category: string;
  requiredSkills: string;
  educationLevel: string;
  experienceYears: number;
  experienceFields: string;
  imageUrl?: string;
}