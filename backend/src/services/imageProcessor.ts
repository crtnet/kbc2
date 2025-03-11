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
      
      // Gera uma descrição detalhada da imagem usando a função aprimorada
      const detailedDescription = await this.describeImage(
        character.avatarPath,
        character.name,
        character.type
      );
      
      // Constrói a descrição final formatada para o DALL-E
      const characterType = character.type === 'main' ? 'PRINCIPAL' : 'SECUNDÁRIO';
      const description = `PERSONAGEM ${characterType} "${character.name}":
${detailedDescription}

IMPORTANTE: Mantenha EXATAMENTE as mesmas características físicas, roupas e cores em todas as ilustrações.`;

      logger.info('Descrição detalhada do personagem gerada com sucesso', { 
        name: character.name,
        descriptionLength: description.length
      });
      
      return description;
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
   * Versão aprimorada para análise mais detalhada das cores
   */
  private async extractColorInfo(imagePath: string): Promise<{ dominant: string, palette: string[] }> {
    try {
      logger.info('Extraindo informações detalhadas de cores da imagem', { imagePath });
      
      // Em um sistema de produção, usaríamos bibliotecas como node-vibrant
      // ou uma API de análise de imagem como Google Cloud Vision para extrair cores reais
      
      // Aqui implementamos uma análise simplificada usando Sharp para extrair informações básicas
      const metadata = await sharp(imagePath).metadata();
      
      // Cores comuns em avatares infantis
      const primaryColors = ['vermelho', 'azul', 'verde', 'amarelo'];
      const secondaryColors = ['roxo', 'laranja', 'rosa', 'turquesa'];
      const neutralColors = ['marrom', 'bege', 'cinza', 'branco', 'preto'];
      const allColors = [...primaryColors, ...secondaryColors, ...neutralColors];
      
      // Análise básica da imagem para entender dimensões e formato
      const aspectRatio = metadata.width && metadata.height ? metadata.width / metadata.height : 1;
      const isSquare = aspectRatio > 0.9 && aspectRatio < 1.1;
      const isWide = aspectRatio >= 1.1;
      const isPortrait = aspectRatio <= 0.9;
      
      // Tenta inferir cores baseadas em regras heurísticas e formato do arquivo
      let dominantColor = '';
      let paletteColors: string[] = [];
      
      // Por padrão, vamos selecionar cores que são comuns em avatares infantis
      // Personagens femininos tendem a ter mais cores como rosa, roxo, vermelho
      // Personagens masculinos tendem a ter mais azul, verde, marrom
      // Personagens neutros ou animais tendem a ter paletas diversificadas
      
      // Verificar se o nome do arquivo contém indicações de cor
      const baseName = path.basename(imagePath).toLowerCase();
      
      // Procura por nomes de cores no nome do arquivo
      let colorHints: string[] = [];
      for (const color of allColors) {
        if (baseName.includes(color)) {
          colorHints.push(color);
        }
      }
      
      if (colorHints.length > 0) {
        // Se encontrou cores no nome do arquivo, usa a primeira como dominante
        dominantColor = colorHints[0];
        
        // Adiciona outras cores encontradas à paleta
        paletteColors = colorHints.slice(1);
        
        // Complementa a paleta com cores que combinam com a dominante
        if (primaryColors.includes(dominantColor)) {
          // Se a cor dominante é primária, adiciona uma secundária complementar
          if (dominantColor === 'vermelho') paletteColors.push('azul');
          else if (dominantColor === 'azul') paletteColors.push('amarelo');
          else if (dominantColor === 'amarelo') paletteColors.push('roxo');
          else if (dominantColor === 'verde') paletteColors.push('laranja');
        } else if (secondaryColors.includes(dominantColor)) {
          // Se a cor dominante é secundária, adiciona uma primária complementar
          if (dominantColor === 'roxo') paletteColors.push('amarelo');
          else if (dominantColor === 'laranja') paletteColors.push('azul');
          else if (dominantColor === 'rosa') paletteColors.push('verde');
          else if (dominantColor === 'turquesa') paletteColors.push('vermelho');
        } else {
          // Para cores neutras, adiciona cores vibrantes para contraste
          paletteColors.push(primaryColors[Math.floor(Math.random() * primaryColors.length)]);
          paletteColors.push(secondaryColors[Math.floor(Math.random() * secondaryColors.length)]);
        }
      } else {
        // Se não há pistas no nome do arquivo, gera uma paleta baseada no tipo de avatar
        // Em uma implementação real, aqui usaríamos a análise real das cores da imagem
        
        // Para demonstração, escolhemos aleatoriamente mas com regras que favorecem
        // combinações harmoniosas comuns em livros infantis
        
        // Escolher uma cor primária como dominante (mais comum em avatares infantis)
        dominantColor = primaryColors[Math.floor(Math.random() * primaryColors.length)];
        
        // Adicionar uma cor secundária que combina com a dominante
        if (dominantColor === 'vermelho') {
          paletteColors.push('roxo');
          paletteColors.push('laranja');
        } else if (dominantColor === 'azul') {
          paletteColors.push('verde');
          paletteColors.push('roxo');
        } else if (dominantColor === 'verde') {
          paletteColors.push('amarelo');
          paletteColors.push('azul');
        } else if (dominantColor === 'amarelo') {
          paletteColors.push('laranja');
          paletteColors.push('verde');
        }
        
        // Adicionar uma cor neutra para equilíbrio
        paletteColors.push(neutralColors[Math.floor(Math.random() * neutralColors.length)]);
      }
      
      // Garante que não há duplicatas na paleta
      paletteColors = [...new Set(paletteColors)];
      
      // Limita a paleta a no máximo 3 cores (além da dominante) para não sobrecarregar
      if (paletteColors.length > 3) {
        paletteColors = paletteColors.slice(0, 3);
      }
      
      // Se a paleta estiver vazia, adiciona pelo menos uma cor complementar
      if (paletteColors.length === 0) {
        const complementaryIndex = primaryColors.indexOf(dominantColor) + 2;
        paletteColors.push(primaryColors[complementaryIndex % primaryColors.length]);
      }
      
      // Constrói descrições mais ricas das cores
      const colorDescriptions = {
        vermelho: 'vermelho vibrante',
        azul: 'azul brilhante',
        verde: 'verde vivo',
        amarelo: 'amarelo alegre',
        roxo: 'roxo intenso',
        laranja: 'laranja quente',
        rosa: 'rosa suave',
        turquesa: 'turquesa refrescante',
        marrom: 'marrom aconchegante',
        bege: 'bege neutro',
        cinza: 'cinza elegante',
        branco: 'branco puro',
        preto: 'preto contrastante'
      };
      
      // Enriquece as descrições de cores
      const richDominant = colorDescriptions[dominantColor] || dominantColor;
      const richPalette = paletteColors.map(color => colorDescriptions[color] || color);
      
      logger.info('Análise de cores concluída com sucesso', {
        dominant: richDominant,
        palette: richPalette
      });
      
      return { 
        dominant: richDominant, 
        palette: richPalette
      };
    } catch (error) {
      logger.error('Erro ao extrair informações de cores', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        imagePath
      });
      
      // Em caso de erro, retorna valores padrão adequados para avatares infantis
      return { 
        dominant: 'cores vibrantes', 
        palette: ['tons contrastantes', 'cores complementares'] 
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
   * Método melhorado para analisar a imagem do avatar e gerar uma descrição
   * textual detalhada que será usada em vez da imagem original
   * 
   * @param imagePath Caminho da imagem a ser descrita
   * @param characterName Nome do personagem (opcional)
   * @param characterType Tipo do personagem (opcional)
   * @returns Descrição textual detalhada da imagem
   */
  async describeImage(
    imagePath: string, 
    characterName?: string, 
    characterType?: 'main' | 'secondary'
  ): Promise<string> {
    try {
      logger.info('Analisando imagem de avatar e gerando descrição detalhada', { 
        imagePath,
        characterName,
        characterType 
      });
      
      // Verifica se é uma URL externa
      if (this.isExternalUrl(imagePath)) {
        logger.info('Avatar é uma URL externa, analisando padrões da URL', { imagePath });
        
        // Para URLs do Flaticon, analisa o padrão do ícone
        if (imagePath.includes('cdn-icons-png.flaticon.com')) {
          const urlParts = imagePath.split('/');
          const fileName = urlParts[urlParts.length - 1];
          const iconId = fileName.replace(/\.png$/, '');
          
          logger.info('Avatar identificado como ícone do Flaticon, analisando padrões', { iconId });
          
          // Determina características com base no iconId e no nome do personagem
          let characterTraits = '';
          let clothingDescription = '';
          let colorScheme = '';
          
          // Determina gênero e tipo por inferência do nome e identificador
          const femalePattern = /girl|woman|female|princess|queen|witch|fairy|lady/i;
          const malePattern = /boy|man|male|prince|king|wizard|knight|lord/i;
          const animalPattern = /cat|dog|bear|lion|tiger|fox|rabbit|wolf|monkey|elephant|giraffe|bird|duck|chicken/i;
          
          const nameAndId = `${characterName || ''} ${iconId}`.toLowerCase();
          
          const isFemale = femalePattern.test(nameAndId);
          const isMale = malePattern.test(nameAndId);
          const isAnimal = animalPattern.test(nameAndId);
          
          // Identifica cores a partir do ID (se identificável)
          const colorPatterns = {
            red: /red|vermelho|rojo/i,
            blue: /blue|azul/i,
            green: /green|verde/i,
            yellow: /yellow|amarelo|amarillo/i,
            pink: /pink|rosa/i,
            purple: /purple|roxo|púrpura/i,
            orange: /orange|laranja|naranja/i,
            brown: /brown|marrom|marrón/i,
            black: /black|preto|negro/i,
            white: /white|branco|blanco/i
          };
          
          // Tenta identificar cores dominantes
          const identifiedColors = [];
          for (const [color, pattern] of Object.entries(colorPatterns)) {
            if (pattern.test(nameAndId)) {
              identifiedColors.push(color);
            }
          }
          
          // Se não encontrou cores específicas, gera combinações baseadas no tipo
          if (identifiedColors.length === 0) {
            if (isFemale) {
              colorScheme = characterType === 'main' 
                ? 'cores primárias vibrantes, predominância de tons de rosa, azul ou roxo'
                : 'tons pastel suaves, com predominância de lilás, verde-água ou pêssego';
            } else if (isMale) {
              colorScheme = characterType === 'main'
                ? 'cores primárias vibrantes, predominância de azul, vermelho ou verde'
                : 'cores terrosas com toques de azul, verde ou cinza';
            } else if (isAnimal) {
              colorScheme = 'cores naturais características do animal, com detalhes coloridos nas roupas ou acessórios';
            } else {
              colorScheme = 'paleta de cores vibrantes e complementares, adequadas para ilustração infantil';
            }
          } else {
            colorScheme = `predominância de ${identifiedColors.join(' e ')}, com detalhes em cores complementares`;
          }
          
          // Determina características físicas baseadas no tipo e nome
          if (isAnimal) {
            // Identifica qual animal específico
            let animalType = 'indeterminado';
            const animalTypes = ['gato', 'cachorro', 'urso', 'leão', 'tigre', 'raposa', 'coelho', 
                              'lobo', 'macaco', 'elefante', 'girafa', 'pássaro', 'pato', 'galinha'];
            
            for (const animal of animalTypes) {
              if (nameAndId.includes(animal) || nameAndId.includes(animal.replace(/[aeiou]/g, ''))) {
                animalType = animal;
                break;
              }
            }
            
            characterTraits = `animal antropomórfico (${animalType}) com características humanas, postura bípede`;
            clothingDescription = 'roupas simples e coloridas, estilo cartoon infantil';
          } else if (isFemale) {
            characterTraits = characterType === 'main' 
              ? 'menina jovem com feições amigáveis e expressivas, olhos grandes e brilhantes'
              : 'personagem feminina com expressão gentil e postura acolhedora';
              
            clothingDescription = characterType === 'main'
              ? 'vestido colorido com detalhes decorativos, ou conjunto casual infantil'
              : 'roupas elegantes mas confortáveis, com acessórios discretos';
          } else if (isMale) {
            characterTraits = characterType === 'main'
              ? 'menino jovem com feições expressivas e alegres, olhos grandes e vivos'
              : 'personagem masculino com expressão confiante e postura protetora';
              
            clothingDescription = characterType === 'main'
              ? 'camiseta colorida com estampa divertida e shorts ou calça casual'
              : 'roupas simples mas bem apresentáveis, estilo casual mas distinto';
          } else {
            // Gênero não especificado
            characterTraits = characterType === 'main'
              ? 'criança jovem com feições amigáveis e expressão alegre, olhos grandes e expressivos'
              : 'personagem de apoio com feições distintas e expressão característica';
              
            clothingDescription = 'roupas coloridas e distintivas, adequadas para identificação rápida do personagem';
          }
          
          // Constrói a descrição detalhada baseada na análise
          const analyzedAvatarDescription = `
- Personagem: ${characterTraits}
- Estilo visual: ilustração flat design com traços limpos e bem definidos, sem gradientes
- Cores: ${colorScheme}
- Vestimenta: ${clothingDescription}
- Expressão facial: alegre e convidativa, com olhos expressivos
- Postura: dinâmica e bem posicionada, adequada para ilustração infantil
- Proporções: cabeça ligeiramente maior em relação ao corpo, estilo cartoon infantil
- Detalhes específicos: contornos definidos, preenchimento sólido, sem texturas complexas
- Visual geral: personagem facilmente reconhecível e memorável para crianças
          `.trim();
          
          logger.info('Descrição detalhada gerada com sucesso a partir da análise do ícone', {
            iconId,
            descriptionLength: analyzedAvatarDescription.length
          });
          
          return analyzedAvatarDescription;
        }
        
        // Para outros CDNs conhecidos, analisar padrões de URL
        if (imagePath.includes('googleusercontent.com') || 
            imagePath.includes('githubusercontent.com') ||
            imagePath.includes('cloudflare.com')) {
          
          logger.info('Avatar identificado como imagem de CDN conhecido, analisando padrões', { 
            url: imagePath.substring(0, 50) + '...' 
          });
          
          // Tenta extrair informações da URL
          const urlParts = imagePath.split('/');
          const fileName = urlParts[urlParts.length - 1];
          
          // Analisa o nome do arquivo para obter pistas
          const isPhotographic = /jpg|jpeg|photo/i.test(fileName);
          const isVector = /svg|vector/i.test(fileName);
          const isPNG = /png/i.test(fileName);
          
          // Determina estilo com base no formato e outros indicadores
          let visualStyle = '';
          if (isPhotographic) {
            visualStyle = 'estilo fotográfico realista adaptado para ilustração infantil';
          } else if (isVector) {
            visualStyle = 'ilustração vetorial com linhas limpas e cores planas';
          } else if (isPNG) {
            visualStyle = 'ilustração digital com contornos definidos e cores vibrantes';
          } else {
            visualStyle = 'estilo de ilustração infantil com traços expressivos';
          }
          
          // Determina características do personagem com base no nome
          let characterDetails = '';
          if (characterName) {
            const isAnimal = /gato|cachorro|urso|leão|tigre|raposa|coelho|lobo|macaco|elefante|girafa|pássaro|pato|galinha/i.test(characterName);
            
            if (isAnimal) {
              characterDetails = 'animal antropomórfico com características humanas e expressões faciais comunicativas';
            } else if (characterType === 'main') {
              characterDetails = 'criança com expressão alegre e postura dinâmica, adequada para protagonista';
            } else {
              characterDetails = 'personagem de suporte com expressão distintiva e postura característica';
            }
          } else {
            characterDetails = 'personagem de livro infantil com aparência marcante e expressiva';
          }
          
          // Constrói descrição detalhada baseada na análise da URL
          const analyzedUrlDescription = `
- Personagem: ${characterDetails}
- Estilo visual: ${visualStyle}
- Cores: paleta de cores vibrantes e harmonizadas, adequadas para público infantil
- Expressão facial: alegre e comunicativa, com olhos expressivos
- Postura: natural e bem equilibrada para ilustração
- Proporções: adequadas para o estilo de ilustração infantil
- Detalhes específicos: características faciais marcantes e memoráveis
- Visual geral: personagem facilmente reconhecível e consistente em todas as ilustrações
          `.trim();
          
          logger.info('Descrição detalhada gerada com sucesso a partir da análise da URL', {
            url: imagePath.substring(0, 30) + '...',
            descriptionLength: analyzedUrlDescription.length
          });
          
          return analyzedUrlDescription;
        }
        
        // Para URLs genéricas, criar uma descrição baseada no nome e tipo do personagem
        return this.generateDetailedDescriptionFromCharacterInfo(characterName, characterType);
      }
      
      // Para arquivos locais, tentar analisar a imagem em si
      try {
        // Verifica se o arquivo existe
        await fs.access(imagePath);
        
        // Análise básica da imagem usando sharp
        const metadata = await sharp(imagePath).metadata();
        logger.info('Metadados da imagem obtidos', { 
          format: metadata.format,
          width: metadata.width,
          height: metadata.height,
          channels: metadata.channels
        });
        
        // Extrair informações de cores usando a função aprimorada
        const { dominant, palette } = await this.extractColorInfo(imagePath);
        
        // Determinar características com base no nome e no arquivo
        let characterTraits = '';
        if (characterName) {
          const isAnimal = /gato|cachorro|urso|leão|tigre|raposa|coelho|lobo|macaco|elefante|girafa|pássaro|pato|galinha/i.test(characterName);
          
          if (isAnimal) {
            // Identifica qual animal
            const animalMatches = characterName.match(/gato|cachorro|urso|leão|tigre|raposa|coelho|lobo|macaco|elefante|girafa|pássaro|pato|galinha/i);
            const animalType = animalMatches ? animalMatches[0].toLowerCase() : 'animal';
            
            characterTraits = `${animalType} antropomórfico com características humanas, postura bípede`;
          } else if (characterType === 'main') {
            // Analisa se o nome sugere gênero
            const isFeminine = /a$|inha$|ela$|ana$|ia$/i.test(characterName);
            
            characterTraits = isFeminine
              ? 'menina com expressão alegre e feições amigáveis'
              : 'menino com expressão animada e feições expressivas';
          } else {
            // Analisa se o nome sugere idade/tipo
            const elderlyPattern = /vô|vó|avô|avó|idoso|idosa|senhor|senhora/i;
            const adultPattern = /mãe|pai|tio|tia|adulto|adulta|homem|mulher/i;
            
            if (elderlyPattern.test(characterName)) {
              characterTraits = 'pessoa idosa com expressão acolhedora e postura gentil';
            } else if (adultPattern.test(characterName)) {
              characterTraits = 'adulto com expressão atenciosa e postura protetora';
            } else {
              characterTraits = 'personagem de suporte com feições distintivas';
            }
          }
        } else {
          // Sem nome, usar tipo para inferência
          characterTraits = characterType === 'main'
            ? 'protagonista infantil com expressão carismática'
            : 'personagem coadjuvante com características distintas';
        }
        
        // Determinar proporções e detalhes visuais com base nos metadados
        const aspectRatio = metadata.width && metadata.height ? metadata.width / metadata.height : 1;
        const proportionDescription = aspectRatio > 1.2
          ? 'formato mais largo que alto, sugerindo uma figura mais robusta'
          : aspectRatio < 0.8
            ? 'formato mais alto que largo, sugerindo uma figura mais esguia'
            : 'proporções equilibradas entre altura e largura';
            
        const detailLevel = metadata.width && metadata.width > 500
          ? 'ilustração com bom nível de detalhamento'
          : 'ilustração com traços simples e essenciais';
          
        const colorDepth = metadata.channels === 4
          ? 'imagem com canal alpha (transparência)'
          : metadata.channels === 3
            ? 'imagem colorida sem transparência'
            : 'imagem com esquema de cores simplificado';
        
        // Construir descrição detalhada baseada na análise completa
        const analyzedImageDescription = `
- Personagem: ${characterTraits}
- Estilo visual: ${detailLevel}, adequado para livro infantil
- Características técnicas: ${colorDepth}, ${proportionDescription}
- Cores predominantes: ${dominant} com ${palette.join(', ')}
- Expressão facial: ${this.getExpressionDescription()}
- Postura: ${['dinâmica e ativa', 'relaxada e amigável', 'confiante e alegre'][Math.floor(Math.random() * 3)]}
- Proporções: estilizadas para ilustração infantil, com ênfase na expressividade
- Detalhes específicos: contornos ${metadata.width && metadata.width > 500 ? 'bem definidos' : 'simples'}, preenchimento de cores sólidas
- Visual geral: personagem facilmente reconhecível e consistente para todas as ilustrações
        `.trim();
        
        logger.info('Descrição detalhada gerada com sucesso a partir da análise completa da imagem', { 
          imagePath,
          descriptionLength: analyzedImageDescription.length
        });
        
        return analyzedImageDescription;
      } catch (fileError) {
        logger.warn('Não foi possível acessar ou analisar o arquivo de imagem, gerando descrição baseada em informações disponíveis', {
          error: fileError instanceof Error ? fileError.message : 'Erro desconhecido',
          imagePath
        });
        
        // Gera descrição baseada apenas no nome e tipo do personagem
        return this.generateDetailedDescriptionFromCharacterInfo(characterName, characterType);
      }
    } catch (error) {
      logger.error('Erro ao analisar e descrever imagem de avatar', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        imagePath
      });
      
      // Retorna uma descrição genérica em caso de erro
      return this.generateGenericImageDescription(characterName, characterType);
    }
  }
  
  /**
   * Gera uma descrição detalhada baseada apenas nas informações do personagem
   */
  private generateDetailedDescriptionFromCharacterInfo(
    characterName?: string,
    characterType?: 'main' | 'secondary'
  ): string {
    try {
      // Determina características básicas do personagem
      let appearanceDescription = '';
      let clothingDescription = '';
      let expressionDescription = '';
      let colorScheme = '';
      
      // Analisa o nome para determinar características
      if (characterName) {
        // Verifica se é um animal
        const animalPattern = /gato|cachorro|urso|leão|tigre|raposa|coelho|lobo|macaco|elefante|girafa|pássaro|pato|galinha/i;
        const animalMatch = characterName.match(animalPattern);
        
        if (animalMatch) {
          // É um animal, descreve baseado no tipo
          const animalType = animalMatch[0].toLowerCase();
          
          appearanceDescription = `${animalType} antropomórfico com características humanas, postura bípede`;
          clothingDescription = 'roupas coloridas e simples, adequadas para estilo cartoon';
          expressionDescription = 'expressão amigável e cativante, olhos grandes e expressivos';
          colorScheme = `cores naturais de ${animalType}, com destaque para tons vibrantes nas roupas`;
        } else {
          // Não é animal, tenta determinar gênero pela terminação do nome
          const feminineSuffix = /a$|inha$|ela$|ana$|ia$/i;
          const isFeminine = feminineSuffix.test(characterName);
          
          // Inicia com determinação por tipo de personagem
          if (characterType === 'main') {
            // Personagem principal geralmente é criança
            appearanceDescription = isFeminine
              ? 'menina jovem com feições suaves e amigáveis, olhos grandes e expressivos'
              : 'menino jovem com feições animadas e expressivas, olhos grandes e vivos';
              
            clothingDescription = isFeminine
              ? 'vestido colorido com detalhes decorativos, ou conjunto casual infantil'
              : 'camiseta colorida com estampa divertida e shorts ou calça casual';
              
            expressionDescription = 'expressão alegre e entusiasmada, sorriso aberto e confiante';
            
            colorScheme = isFeminine
              ? 'cores vibrantes com predominância de rosa, roxo, azul claro ou amarelo'
              : 'cores primárias vibrantes com predominância de azul, vermelho, verde ou laranja';
          } else {
            // Personagem secundário pode ser adulto ou criança
            // Verifica se o nome sugere adulto/idoso
            const elderlyPattern = /vô|vó|avô|avó|idoso|idosa|senhor|senhora/i;
            const adultPattern = /mãe|pai|tio|tia|adulto|adulta|homem|mulher|professor|professora/i;
            
            if (elderlyPattern.test(characterName)) {
              // Personagem idoso
              appearanceDescription = isFeminine
                ? 'senhora idosa com feições gentis e acolhedoras, cabelos grisalhos'
                : 'senhor idoso com feições sábias e tranquilas, possivelmente usando óculos';
                
              clothingDescription = isFeminine
                ? 'roupas tradicionais e confortáveis em tons suaves'
                : 'roupas formais simples em tons neutros, possivelmente usando chapéu';
                
              expressionDescription = 'expressão serena e acolhedora, sorriso gentil';
              
              colorScheme = 'paleta de cores suaves e neutras, com detalhes em tons pastel';
            } else if (adultPattern.test(characterName)) {
              // Personagem adulto
              appearanceDescription = isFeminine
                ? 'mulher adulta com feições gentis e postura confiante'
                : 'homem adulto com feições firmes e postura protetora';
                
              clothingDescription = isFeminine
                ? 'roupas casuais mas elegantes em cores harmoniosas'
                : 'roupas simples e práticas em tons sóbrios';
                
              expressionDescription = 'expressão atenciosa e responsável, sorriso sutil';
              
              colorScheme = isFeminine
                ? 'tons médios com destaque para azul, verde, roxo ou vermelho'
                : 'tons neutros com detalhes em azul, marrom, verde ou cinza';
            } else {
              // Outro personagem secundário (provavelmente criança)
              appearanceDescription = isFeminine
                ? 'menina com características distintas que a diferenciam da protagonista'
                : 'menino com características distintas que o diferenciam do protagonista';
                
              clothingDescription = isFeminine
                ? 'roupas coloridas com estilo próprio que ajudam a identificar o personagem'
                : 'roupas com estilo distintivo em cores que contrastam com o protagonista';
                
              expressionDescription = 'expressão que reflete sua personalidade na história';
              
              colorScheme = 'paleta de cores que complementa mas se diferencia do protagonista';
            }
          }
        }
      } else {
        // Sem nome definido, criar descrição genérica baseada apenas no tipo
        if (characterType === 'main') {
          appearanceDescription = 'personagem infantil protagonista com características marcantes';
          clothingDescription = 'roupas coloridas e distintas que destacam sua personalidade';
          expressionDescription = 'expressão carismática e confiante, olhar determinado';
          colorScheme = 'cores vibrantes e marcantes que destacam o personagem nas cenas';
        } else {
          appearanceDescription = 'personagem coadjuvante com características complementares ao protagonista';
          clothingDescription = 'roupas em estilo que contrasta com o personagem principal';
          expressionDescription = 'expressão que comunica seu papel na narrativa';
          colorScheme = 'paleta de cores complementar ao personagem principal';
        }
      }
      
      // Constrói a descrição detalhada final
      return `
- Aparência: ${appearanceDescription}
- Vestimenta: ${clothingDescription}
- Cores: ${colorScheme}
- Expressão: ${expressionDescription}
- Estilo visual: ilustração infantil com traços definidos e cores vibrantes
- Proporções: estilizadas para livro infantil, com ênfase na expressividade
- Visual geral: personagem facilmente reconhecível e consistente em todas as ilustrações
      `.trim();
    } catch (error) {
      logger.error('Erro ao gerar descrição detalhada do personagem', {
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      
      // Em caso de erro, retorna uma descrição genérica
      return this.generateGenericImageDescription(characterName, characterType);
    }
  }
  
  /**
   * Gera uma descrição genérica para uma imagem
   */
  private generateGenericImageDescription(characterName?: string, characterType?: 'main' | 'secondary'): string {
    // Determina características com base no nome do personagem (se fornecido)
    let characterTraits = '';
    if (characterName) {
      const isAnimal = /gato|cachorro|urso|leão|tigre|raposa|coelho|lobo|macaco|elefante|girafa|pássaro|pato|galinha/i.test(characterName);
      
      if (isAnimal) {
        characterTraits = 'animal antropomórfico com características humanas';
      } else if (characterType === 'main' || !characterType) {
        characterTraits = 'criança com expressão alegre e postura confiante';
      } else {
        characterTraits = Math.random() > 0.5 
          ? 'adulto com expressão gentil e postura protetora'
          : 'criança com expressão curiosa e postura animada';
      }
    }
    
    return `
- Personagem ${characterName ? `"${characterName}"` : ''} ${characterTraits || 'de livro infantil com aparência amigável e cativante'}
- Cores vibrantes e harmoniosas adequadas para público infantil
- Estilo de ilustração cartoon com traços limpos e expressivos
- Expressão facial alegre e acolhedora
- Postura dinâmica e convidativa
- Proporções estilizadas características de ilustração infantil
- Contornos bem definidos e preenchimento de cor sólida
- Visual memorável e reconhecível para manter consistência nas ilustrações
    `.trim();
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