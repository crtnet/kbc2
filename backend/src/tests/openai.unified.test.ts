// src/tests/openai.unified.test.ts
import { openaiUnifiedService } from '../services/openai.unified';
import { imageProcessor } from '../services/imageProcessor';
import { logger } from '../utils/logger';

// Mock do logger para evitar logs durante os testes
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }
}));

// Mock do imageProcessor
jest.mock('../services/imageProcessor', () => ({
  imageProcessor: {
    prepareCharacterDescription: jest.fn().mockResolvedValue('Mocked character description'),
    describeImage: jest.fn().mockResolvedValue('Mocked image description'),
  }
}));

// Mock do OpenAI
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'Mocked story content' } }]
        })
      }
    },
    images: {
      generate: jest.fn().mockResolvedValue({
        data: [{ url: 'https://example.com/generated-image.jpg' }]
      })
    }
  }));
});

describe('OpenAIUnifiedService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateImagesForStory', () => {
    it('should handle external avatar URLs correctly', async () => {
      const pages = ['Page 1 content', 'Page 2 content'];
      const characters = {
        main: {
          name: 'Main Character',
          avatarPath: 'https://cdn-icons-png.flaticon.com/512/1234/1234567.png'
        },
        secondary: {
          name: 'Secondary Character',
          avatarPath: 'https://example.com/avatar.jpg'
        }
      };
      
      const result = await openaiUnifiedService.generateImagesForStory(pages, characters);
      
      expect(result).toBeTruthy();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(pages.length);
      
      // Verifica se o imageProcessor foi chamado corretamente
      expect(imageProcessor.prepareCharacterDescription).toHaveBeenCalledTimes(2);
    });
  });
});