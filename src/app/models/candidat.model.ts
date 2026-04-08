export interface Experience {
  id?: number;
  poste: string;
  entreprise: string;
  dateDebut: string;
  dateFin?: string;
  enCours: boolean;
  description: string;
  logoInitiales?: string;
  logoColor?: string;
}

export interface Formation {
  id?: number;
  diplome: string;
  ecole: string;
  anneeDebut: number;
  anneeFin: number;
  logoInitiales?: string;
  logoColor?: string;
}

export interface Candidat {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  ville?: string;
  posteRecherche?: string;
  niveauEtudes?: string;
  anneesExperience?: number;
  competences?: string[];
  outils?: string[];
  softSkills?: string[];
  experiences?: Experience[];
  formations?: Formation[];
  cvFileName?: string;
  cvUrl?: string;
  cvUploadDate?: string;
  scoreCV?: number;
  ouvertAuxOffres?: boolean;
  cv?: {
    id: number;
    fileName: string;
    fileUrl: string;
    uploadDate: string;
  };

  // Profile-centric Analysis (Independent of Specific Job)
  profileScore?: number;
  profileSkillsScore?: number;
  profileEducationScore?: number;
  profileExperienceScore?: number;
  profileAnalysisResult?: string;
  experienceProf?: string;
  photoUrl?: string;
  status?: string;
}

export interface AlerteEmploi {
  id: number;
  intitule: string;
  localisation: string;
  typeContrat: string;
  active: boolean;
}