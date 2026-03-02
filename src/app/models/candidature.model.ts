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
  };
  cv?: CV;
  score?: number;
  analysisResult?: string;
}