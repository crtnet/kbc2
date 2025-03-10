// src/tests/imageProcessor.test.ts
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

describe('ImageProcessor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('describeImage', () => {
    it('should handle external URLs correctly', async () => {
      const externalUrl = 'https://example.com/image.jpg';
      const result = await imageProcessor.describeImage(externalUrl);
      
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      expect(logger.info).toHaveBeenCalledWith(
        'Imagem é uma URL externa, usando descrição genérica',
        { imagePath: externalUrl }
      );
    });

    it('should handle Flaticon URLs correctly', async () => {
      const flaticonUrl = 'https://cdn-icons-png.flaticon.com/512/1234/1234567.png';
      const result = await imageProcessor.describeImage(flaticonUrl);
      
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      expect(result).toContain('estilo flat design');
      expect(logger.info).toHaveBeenCalledWith(
        'Imagem identificada como ícone do Flaticon',
        { iconId: '1234567' }
      );
    });
  });

  describe('prepareCharacterDescription', () => {
    it('should handle external URLs correctly', async () => {
      const character = {
        name: 'Test Character',
        avatarPath: 'https://example.com/avatar.jpg',
        type: 'main' as const
      };
      
      const result = await imageProcessor.prepareCharacterDescription(character);
      
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      expect(result).toContain('PERSONAGEM PRINCIPAL');
      expect(result).toContain(character.name);
    });

    it('should handle Flaticon URLs correctly', async () => {
      const character = {
        name: 'Flaticon Character',
        avatarPath: 'https://cdn-icons-png.flaticon.com/512/1234/1234567.png',
        type: 'secondary' as const
      };
      
      const result = await imageProcessor.prepareCharacterDescription(character);
      
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      expect(result).toContain('PERSONAGEM SECUNDÁRIO');
      expect(result).toContain(character.name);
    });
  });
});