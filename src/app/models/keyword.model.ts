export type KeywordType = 'COMPETENCE' | 'DIPLOME' | 'EXPERIENCE';

export interface Keyword {
  id: number;
  value: string;
  type: KeywordType;
  points: number;
}