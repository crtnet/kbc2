// src/services/imageProcessor.ts
import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../utils/logger';
import sharp from 'sharp';

interface CharacterInfo {
  name: string;
  avatarPath: string;
  type: 'main' | 'secondary';
}

class ImageProcessor {
  /**
   * Prepara uma descrição detalhada do personagem com base no avatar
   * para garantir consistência visual nas ilustrações
   */
  async prepareCharacterDescription(character: CharacterInfo): Promise<string> {
    try {
      logger.info('Preparando descrição do personagem', { 
        name: character.name, 
        type: character.type
      });
      
      // Determina se é uma URL externa
      const isExternalUrl = this.isExternalUrl(character.avatarPath);
      
      // Para URLs externas, usamos uma descrição genérica sem tentar acessar o arquivo
      if (isExternalUrl) {
        logger.info('Avatar é uma URL externa, usando descrição genérica', {
          avatarPath: character.avatarPath
        });
        
        return this.generateGenericDescription(character.name, character.type);
      }
      
      // Para arquivos locais, tentamos extrair informações
      try {
        // Verifica se o arquivo existe
        await fs.access(character.avatarPath);
        
        // Analisa a imagem para extrair informações visuais
        const metadata = await sharp(character.avatarPath).metadata();
        
        // Extrai informações de cores dominantes
        const { dominant, palette } = await this.extractColorInfo(character.avatarPath);
        
        // Constrói a descrição detalhada do personagem
        const characterType = character.type === 'main' ? 'PRINCIPAL' : 'SECUNDÁRIO';
        const description = `PERSONAGEM ${characterType} "${character.name}":
- Aparência: ${this.getCharacterDescription(character.name, character.type)}
- Cores predominantes: ${dominant ? dominant : 'variadas'}, ${palette.join(', ')}
- Estilo visual: ilustração infantil com traços ${metadata.width && metadata.width > 500 ? 'detalhados' : 'simples'} e expressivos
- Expressão: ${this.getExpressionDescription()}

IMPORTANTE: Mantenha EXATAMENTE as mesmas características físicas, roupas e cores em todas as ilustrações.`;

        logger.info('Descrição do personagem gerada com sucesso', { 
          name: character.name,
          descriptionLength: description.length
        });
        
        return description;
      } catch (fileError) {
        logger.warn('Não foi possível acessar o arquivo de avatar local, usando descrição genérica', {
          error: fileError instanceof Error ? fileError.message : 'Erro desconhecido',
          avatarPath: character.avatarPath
        });
        
        // Se não conseguir acessar o arquivo local, usa descrição genérica
        return this.generateGenericDescription(character.name, character.type);
      }
    } catch (error) {
      logger.error('Erro ao preparar descrição do personagem', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        name: character.name
      });
      
      // Retorna uma descrição genérica em caso de erro
      return this.generateGenericDescription(character.name, character.type);
    }
  }
  
  /**
   * Verifica se um caminho é uma URL externa
   */
  private isExternalUrl(path: string): boolean {
    return path.startsWith('http://') || path.startsWith('https://');
  }
  
  /**
   * Gera uma descrição genérica para o personagem
   */
  private generateGenericDescription(name: string, type: 'main' | 'secondary'): string {
    const characterType = type === 'main' ? 'PRINCIPAL' : 'SECUNDÁRIO';
    
    // Determina o tipo de personagem com base no nome
    const isAnimal = /gato|cachorro|urso|leão|tigre|raposa|coelho|lobo|macaco|elefante|girafa|pássaro|pato|galinha/i.test(name);
    
    let appearance = '';
    if (isAnimal) {
      appearance = 'animal antropomórfico com expressão amigável e características humanas';
    } else if (type === 'main') {
      appearance = 'criança com expressão alegre e postura confiante';
    } else {
      appearance = Math.random() > 0.5 
        ? 'adulto com expressão gentil e postura protetora'
        : 'criança com expressão curiosa e postura animada';
    }
    
    const expressions = [
      'sorriso amigável e olhar curioso',
      'expressão alegre e postura confiante',
      'olhar atento e sorriso sutil',
      'expressão calorosa e acolhedora',
      'olhar brilhante e expressão entusiasmada'
    ];
    
    const expression = expressions[Math.floor(Math.random() * expressions.length)];
    
    return `PERSONAGEM ${characterType} "${name}":
- Aparência: ${appearance}
- Cores predominantes: cores vibrantes e harmoniosas
- Estilo visual: ilustração infantil com traços simples e expressivos
- Expressão: ${expression}

IMPORTANTE: Mantenha consistência visual em todas as ilustrações.`;
  }

  /**
   * Extrai informações de cores dominantes da imagem
   */
  private async extractColorInfo(imagePath: string): Promise<{ dominant: string, palette: string[] }> {
    try {
      // Simplificação: em um sistema real, usaríamos uma biblioteca de análise de cores
      // como node-vibrant ou uma API de análise de imagem
      
      // Valores simulados para demonstração
      const colorOptions = [
        'vermelho', 'azul', 'verde', 'amarelo', 'roxo', 
        'laranja', 'rosa', 'marrom', 'cinza', 'branco'
      ];
      
      // Seleciona cores aleatórias para simular a extração
      const dominant = colorOptions[Math.floor(Math.random() * colorOptions.length)];
      const paletteSize = 2 + Math.floor(Math.random() * 3); // 2-4 cores
      
      const palette: string[] = [];
      while (palette.length < paletteSize) {
        const color = colorOptions[Math.floor(Math.random() * colorOptions.length)];
        if (!palette.includes(color) && color !== dominant) {
          palette.push(color);
        }
      }
      
      return { dominant, palette };
    } catch (error) {
      logger.error('Erro ao extrair informações de cores', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        imagePath
      });
      return { 
        dominant: 'colorido', 
        palette: ['cores variadas', 'tons vibrantes'] 
      };
    }
  }

  /**
   * Gera uma descrição genérica do personagem com base no nome
   */
  private getCharacterDescription(name: string, type: 'main' | 'secondary'): string {
    const childDescriptions = [
      'criança com expressão alegre',
      'personagem infantil com sorriso carismático',
      'figura carismática com olhos expressivos',
      'personagem com aparência amigável e cativante',
      'criança com postura confiante e olhar curioso'
    ];
    
    const adultDescriptions = [
      'adulto com expressão gentil',
      'figura adulta com aparência sábia',
      'personagem maduro com postura confiante',
      'adulto com olhar acolhedor',
      'figura adulta com aparência protetora'
    ];
    
    const animalDescriptions = [
      'animal antropomórfico com expressão amigável',
      'criatura fantástica com características únicas',
      'animal com postura bípede e expressão humana',
      'criatura mágica com aparência cativante',
      'animal personificado com traços expressivos'
    ];
    
    // Determina o tipo de personagem com base no nome
    const isAnimal = /gato|cachorro|urso|leão|tigre|raposa|coelho|lobo|macaco|elefante|girafa|pássaro|pato|galinha/i.test(name);
    
    if (isAnimal) {
      return animalDescriptions[Math.floor(Math.random() * animalDescriptions.length)];
    } else if (type === 'main') {
      return childDescriptions[Math.floor(Math.random() * childDescriptions.length)];
    } else {
      // 50% chance de ser adulto para personagem secundário
      return Math.random() > 0.5 
        ? adultDescriptions[Math.floor(Math.random() * adultDescriptions.length)]
        : childDescriptions[Math.floor(Math.random() * childDescriptions.length)];
    }
  }

  /**
   * Gera uma descrição de expressão facial
   */
  private getExpressionDescription(): string {
    const expressions = [
      'sorriso amigável e olhar curioso',
      'expressão alegre e postura confiante',
      'olhar atento e sorriso sutil',
      'expressão calorosa e acolhedora',
      'olhar brilhante e expressão entusiasmada',
      'sorriso largo e olhos expressivos',
      'expressão serena e olhar gentil'
    ];
    
    return expressions[Math.floor(Math.random() * expressions.length)];
  }

  /**
   * Descreve uma imagem para uso em prompts de geração de imagem
   * @param imagePath Caminho da imagem a ser descrita
   * @returns Descrição textual da imagem
   */
  async describeImage(imagePath: string): Promise<string> {
    try {
      logger.info('Descrevendo imagem para uso em prompt', { imagePath });
      
      // Verifica se é uma URL externa
      if (this.isExternalUrl(imagePath)) {
        logger.info('Imagem é uma URL externa, usando descrição genérica', { imagePath });
        
        // Para URLs do Flaticon, tenta extrair informações do nome do arquivo
        if (imagePath.includes('cdn-icons-png.flaticon.com')) {
          const urlParts = imagePath.split('/');
          const fileName = urlParts[urlParts.length - 1];
          
          // Extrai o ID do ícone (número antes da extensão)
          const iconId = fileName.replace(/\.png$/, '');
          
          logger.info('Imagem identificada como ícone do Flaticon', { iconId });
          
          // Retorna uma descrição genérica para ícones do Flaticon
          return `personagem estilizado em formato de ícone, estilo flat design com cores sólidas e traços simples`;
        }
        
        // Para outras URLs externas
        return `personagem com aparência amigável e expressão cativante`;
      }
      
      // Para arquivos locais, tenta extrair informações
      try {
        // Verifica se o arquivo existe
        await fs.access(imagePath);
        
        // Analisa a imagem para extrair informações visuais
        const metadata = await sharp(imagePath).metadata();
        
        // Extrai informações de cores dominantes
        const { dominant, palette } = await this.extractColorInfo(imagePath);
        
        // Constrói a descrição da imagem
        const description = `personagem com cores predominantes ${dominant} e ${palette.join(', ')}, 
          estilo ${metadata.width && metadata.width > 500 ? 'detalhado' : 'simples'} 
          com expressão ${this.getExpressionDescription()}`;
        
        logger.info('Descrição da imagem gerada com sucesso', { 
          imagePath,
          descriptionLength: description.length
        });
        
        return description;
      } catch (fileError) {
        logger.warn('Não foi possível acessar o arquivo de imagem local, usando descrição genérica', {
          error: fileError instanceof Error ? fileError.message : 'Erro desconhecido',
          imagePath
        });
        
        // Se não conseguir acessar o arquivo local, usa descrição genérica
        return `personagem com aparência amigável e expressão cativante`;
      }
    } catch (error) {
      logger.error('Erro ao descrever imagem', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        imagePath
      });
      
      // Retorna uma descrição genérica em caso de erro
      return `personagem com aparência amigável`;
    }
  }
  
  /**
   * Processa uma imagem para otimizar seu uso nas ilustrações
   * Retorna o caminho original se for uma URL externa
   */
  async processImage(imagePath: string, outputPath: string): Promise<string> {
    try {
      // Se for uma URL externa, retorna o caminho original
      if (this.isExternalUrl(imagePath)) {
        logger.info('Imagem é uma URL externa, retornando sem processamento', { imagePath });
        return imagePath;
      }
      
      // Para arquivos locais, processa normalmente
      await sharp(imagePath)
        .resize(1024, 1024, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(outputPath);
      
      return outputPath;
    } catch (error) {
      logger.error('Erro ao processar imagem', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        imagePath
      });
      return imagePath; // Retorna o caminho original em caso de erro
    }
  }
}

export const imageProcessor = new ImageProcessor();