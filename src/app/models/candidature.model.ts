export type CandidatureStatus =
  | 'SOUMISE'
  | 'EN_COURS'
  | 'ACCEPTEE'
  | 'REFUSEE';

export interface CV {
  id: number;
  fileName: string;
  fileUrl: string;
  uploadDate: string;
}

export interface Candidature {
  id: number;
  dateCandidature: string;
  lastStatusUpdate?: string;
  status: CandidatureStatus;
  jobOffer?: {
    id: number;
    title: string;
    location: string;
  };
  candidat?: {
    id: number;
    nom: string;
    prenom: string;
    email: string;
    photoUrl?: string;
    anneesExperience?: number;
    niveauEtudes?: string;
    competences?: string[];
  };
  cv?: CV;
  score?: number;
  skillsScore?: number;
  educationScore?: number;
  experienceScore?: number;
  analysisResult?: string;
  categorizedSkills?: any;
  isFavorite?: boolean;
}
