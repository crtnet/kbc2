export interface DalleConfig {
  model: string;
  size: string;
  quality: 'standard' | 'hd';
  style: 'natural' | 'vivid';
  n: number;
}

export const dalleConfigs: Record<string, DalleConfig> = {
  cover: {
    model: 'dall-e-3',
    size: '1024x1024',
    quality: 'hd',
    style: 'vivid',
    n: 1
  },
  fullPage: {
    model: 'dall-e-3',
    size: '1024x1024',
    quality: 'hd',
    style: 'vivid',
    n: 1
  },
  spreadPage: {
    model: 'dall-e-3',
    size: '1792x1024',
    quality: 'hd',
    style: 'vivid',
    n: 1
  },
  inlineImage: {
    model: 'dall-e-3',
    size: '1024x1024',
    quality: 'standard',
    style: 'natural',
    n: 1
  }
}; 