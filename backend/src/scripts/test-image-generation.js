// Script para testar a geração de imagens
import 'dotenv/config';
import { openaiUnifiedFixService } from '../services/openai.unified.fix';
import { logger } from '../utils/logger';
import { Character, StyleGuide } from '../types/book.types';

async function testImageGeneration() {
  try {
    console.log('Iniciando teste de geração de imagens...');
    
    // Páginas de teste
    const pages = [
      "João estava brincando no parque quando viu um cachorrinho perdido. Ele se aproximou devagar para não assustar o animal.",
      "Maria e sua amiga Ana estavam construindo um castelo de areia na praia. O sol brilhava forte no céu azul.",
      "O pequeno robô Bip explorava a floresta encantada. Ele encontrou uma borboleta mágica que brilhava em várias cores.",
      "A princesa Luana estava lendo um livro embaixo de uma árvore. De repente, uma folha caiu sobre sua cabeça.",
      "Pedro e seu avô observavam as estrelas no céu noturno. O avô apontava para as constelações e contava histórias antigas."
    ];
    
    // Personagens de teste
    const characters: Record<string, Character> = {
      main: {
        name: "Criança",
        description: "Criança de 8 anos, cabelos castanhos, olhos grandes e expressivos, sorriso alegre",
        type: "main"
      },
      secondary: {
        name: "Amigo",
        description: "Criança de 7 anos, cabelos cacheados, usa óculos, expressão curiosa",
        type: "secondary"
      }
    };
    
    // Guia de estilo
    const styleGuide: StyleGuide = {
      character: "Crianças com aparência fofa e expressiva, estilo cartoon",
      environment: "Ambientes coloridos e acolhedores, com elementos mágicos sutis",
      artisticStyle: "Ilustração digital com cores vibrantes, estilo livro infantil moderno"
    };
    
    console.log('Gerando imagens para 5 páginas de teste...');
    
    // Gera imagens para as páginas
    const imageUrls = await openaiUnifiedFixService.generateImagesForStory(
      pages,
      characters,
      styleGuide
    );
    
    console.log('Geração de imagens concluída!');
    console.log('URLs das imagens geradas:');
    imageUrls.forEach((url, index) => {
      console.log(`Página ${index + 1}: ${url}`);
    });
    
    console.log('Teste concluído com sucesso!');
  } catch (error) {
    console.error('Erro durante o teste:', error instanceof Error ? error.message : 'Erro desconhecido');
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
  }
}

// Executa o teste
testImageGeneration();