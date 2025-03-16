// Arquivo de teste para o serviço OpenAI Unificado corrigido
const { openaiUnifiedFixService } = require('./openai.unified.fix');
const { logger } = require('../utils/logger');

// Mock para o logger
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Mock para o OpenAI
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => {
    return {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: 'História de teste gerada com sucesso.' } }]
          })
        }
      },
      images: {
        generate: jest.fn().mockResolvedValue({
          data: [{ url: 'https://example.com/image.jpg' }]
        })
      }
    };
  });
});

describe('OpenAI Unified Fix Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('extractMainScene deve extrair a cena principal do texto da página', () => {
    const pageText = 'João está brincando no parque. Ele corre e pula. O céu está azul.';
    const scene = openaiUnifiedFixService.extractMainScene(pageText);
    
    expect(scene).toContain('João está brincando');
    expect(scene).toContain('Ele corre e pula');
  });

  test('removeUrlsFromPrompt deve remover URLs e referências a imagens', () => {
    const prompt = 'Desenhe um personagem baseado na imagem https://example.com/image.jpg e use esta referência como guia.';
    const cleanPrompt = openaiUnifiedFixService.removeUrlsFromPrompt(prompt);
    
    expect(cleanPrompt).not.toContain('https://');
    expect(cleanPrompt).not.toContain('baseado na imagem');
    expect(cleanPrompt).not.toContain('use esta referência');
  });

  test('buildImagePrompt deve criar um prompt adequado para geração de imagens', () => {
    const pageText = 'Maria está explorando a floresta encantada. Ela encontra uma fada brilhante.';
    const characters = {
      main: {
        name: 'Maria',
        description: 'Menina de 8 anos com cabelo castanho',
        type: 'main'
      }
    };
    const styleGuide = {
      character: 'Menina de 8 anos com cabelo castanho',
      environment: 'Floresta mágica com árvores coloridas',
      artisticStyle: 'Estilo aquarela'
    };
    
    const prompt = openaiUnifiedFixService.buildImagePrompt(
      pageText,
      characters,
      styleGuide,
      1,
      5
    );
    
    expect(prompt).toContain('Crie uma ilustração para livro infantil');
    expect(prompt).toContain('Menina de 8 anos');
    expect(prompt).toContain('Floresta mágica');
    expect(prompt).toContain('Maria está explorando');
  });

  test('getFallbackImagePath deve retornar um caminho válido', () => {
    const fallbackPath = openaiUnifiedFixService.getFallbackImagePath();
    expect(fallbackPath).toContain('/assets/images/fallback-page.jpg');
  });
});