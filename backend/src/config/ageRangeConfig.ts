export interface AgeRangeConfig {
  minPages: number;
  maxPages: number;
  imagesPerPage: number;
  maxWordsPerPage: number;
  minWordsPerBook: number;
  maxWordsPerBook: number;
  complexity: 'very_simple' | 'simple' | 'moderate' | 'complex';
  illustrationStyle: string;
  imageDistribution: {
    cover: number;
    fullPage: number;
    spreadPage: number;
    inlineImage: number;
  };
}

export const ageRangeConfigs: Record<string, AgeRangeConfig> = {
  '1-2': {
    minPages: 1,
    maxPages: 2,
    imagesPerPage: 1,
    maxWordsPerPage: 10,
    minWordsPerBook:15,
    maxWordsPerBook:20,
    complexity: 'very_simple',
    illustrationStyle: 'Estilo infantil simples, cores vibrantes, formas básicas, sem detalhes complexos',
    imageDistribution: {
      cover: 1,
      fullPage: 2,
      spreadPage: 1,
      inlineImage: 4
    }
  },
  '3-4': {
    minPages: 6,
    maxPages: 12,
    imagesPerPage: 1,
    maxWordsPerPage: 25,
    minWordsPerBook: 100,
    maxWordsPerBook: 300,
    complexity: 'simple',
    illustrationStyle: 'Estilo infantil colorido, personagens expressivos, cenários simples',
    imageDistribution: {
      cover: 1,
      fullPage: 3,
      spreadPage: 2,
      inlineImage: 6
    }
  },
  '5-6': {
    minPages: 8,
    maxPages: 16,
    imagesPerPage: 1,
    maxWordsPerPage: 40,
    minWordsPerBook: 200,
    maxWordsPerBook: 640,
    complexity: 'moderate',
    illustrationStyle: 'Estilo infantil detalhado, personagens expressivos, cenários mais elaborados',
    imageDistribution: {
      cover: 1,
      fullPage: 4,
      spreadPage: 3,
      inlineImage: 8
    }
  },
  '7-8': {
    minPages: 12,
    maxPages: 20,
    imagesPerPage: 1,
    maxWordsPerPage: 60,
    minWordsPerBook: 400,
    maxWordsPerBook: 1200,
    complexity: 'moderate',
    illustrationStyle: 'Estilo infantil detalhado, personagens expressivos, cenários elaborados, elementos de fantasia',
    imageDistribution: {
      cover: 1,
      fullPage: 5,
      spreadPage: 4,
      inlineImage: 10
    }
  },
  '9-10': {
    minPages: 16,
    maxPages: 24,
    imagesPerPage: 1,
    maxWordsPerPage: 80,
    minWordsPerBook: 800,
    maxWordsPerBook: 1920,
    complexity: 'complex',
    illustrationStyle: 'Estilo infantil sofisticado, personagens detalhados, cenários ricos, elementos de fantasia e aventura',
    imageDistribution: {
      cover: 1,
      fullPage: 6,
      spreadPage: 5,
      inlineImage: 12
    }
  },
  '11-12': {
    minPages: 20,
    maxPages: 32,
    imagesPerPage: 1,
    maxWordsPerPage: 100,
    minWordsPerBook: 1200,
    maxWordsPerBook: 3200,
    complexity: 'complex',
    illustrationStyle: 'Estilo infantil sofisticado, personagens detalhados, cenários ricos, elementos de fantasia, aventura e mistério',
    imageDistribution: {
      cover: 1,
      fullPage: 8,
      spreadPage: 6,
      inlineImage: 17
    }
  }
}; 