
export interface PlantProfile {
  id: string;
  name: string;
  scientificName: string;
  isInvasive: boolean;
  images: string[]; // Array of base64 images
  description: string;
  dateCreated: number;
}

export interface BoundingBox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

export interface DetectedObject {
  label: string;
  confidence: number;
  box_2d: BoundingBox;
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
  correctedData?: {
    name: string;
    scientificName: string;
    isInvasive: boolean;
  };
  detectedObjects?: DetectedObject[];
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  ANALYZE = 'ANALYZE',
  TRAINING = 'TRAINING',
  HISTORY = 'HISTORY',
  MAP = 'MAP'
}

export interface AnalysisResult {
  name: string;
  scientificName: string;
  isInvasive: boolean;
  confidence: number;
  description: string;
  matchedProfileId?: string;
  detectedObjects?: DetectedObject[];
}
