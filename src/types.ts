export type Category = 'juguetes' | 'bazar' | 'libreria' | 'regaleria' | 'electronica';

export interface ProductInput {
  id: string;
  sku?: string;
  title: string;
  characteristics: string;
  category: Category;
  image?: string; // Base64 image
}

export interface GenerationResult {
  titles: string[];
  descriptions: string[];
  keywords: string[];
}

export type GenerationType = 'PRO_STUDIO' | 'LIFESTYLE' | 'MEASURES' | 'INFOGRAPHIC' | 'COVER' | 'DETAIL';

export interface ImageTransformOptions {
  productName?: string;
  measures?: { w: string, h: string, d: string };
  measurementType?: 'BOX' | 'CYLINDER';
  weight?: string;
  features?: string;
  infographicTitle?: string;
  infographicType?: 'COLORED' | 'IN_USE' | 'MINIMALIST' | 'PREMIUM_STUDIO';
  environment?: string;
  detailReferenceImages?: string[]; // Additional base64 images for detail reference
}

export interface BatchResult {
  productId: string;
  result: GenerationResult;
}

export interface SelectedContent {
  title: string;
  description: string;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  tool: 'seo' | 'images';
  type: 'individual' | 'batch';
  data: any[];
  imageUrl?: string; // For single image transformations
  imageCount?: number; // For batch image transformations
}
