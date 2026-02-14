
export interface PlantProfile {
  id: string;
  name: string;
  scientificName: string;
  isInvasive: boolean;
  images: string[]; // Array of base64 images
  description: string;
  dateCreated: number;
}

export interface PlantAnalysis {
  id: string;
  name: string;
  scientificName: string;
  isInvasive: boolean;
  confidence: number;
  timestamp: number;
  analysisTime: number; // in seconds
  coordinates?: {
    lat: number;
    lng: number;
  };
  imageUrl: string;
  matchedProfileId?: string;
  isFavorite?: boolean;
  isIncorrect?: boolean;
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  ANALYZE = 'ANALYZE',
  TRAINING = 'TRAINING',
  HISTORY = 'HISTORY'
}

export interface AnalysisResult {
  name: string;
  scientificName: string;
  isInvasive: boolean;
  confidence: number;
  description: string;
  matchedProfileId?: string;
}
