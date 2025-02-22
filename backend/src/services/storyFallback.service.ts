import { GenerateStoryParams } from './openai.service';
import { logger } from '../utils/logger';

class StoryFallbackService {
  private templates: Record<string, string[]> = {
    fantasy: [
      `Em um lugar mágico chamado {setting}, vivia {mainCharacter}, uma criança cheia de sonhos e imaginação. Todos os dias, {mainCharacter} olhava pela janela e imaginava as aventuras incríveis que poderia viver. "Hoje será um dia especial!", pensava, enquanto observava as nuvens dançando no céu azul.`,

      `Numa bela manhã, {secondaryCharacter} apareceu trazendo uma notícia extraordinária. "Precisamos de sua ajuda, {mainCharacter}!", disse {secondaryCharacter} com os olhos brilhando. "Existe uma missão muito importante, e só você pode nos ajudar." {mainCharacter} sentiu seu coração bater mais forte de emoção.`,

      `Juntos, {mainCharacter} e {secondaryCharacter} embarcaram em uma jornada mágica pelo {setting}. Encontraram criaturas encantadas e descobriram segredos escondidos. "Nunca imaginei que pudesse ser tão corajoso!", exclamou {mainCharacter}, enquanto enfrentavam desafios mágicos.`,

      `O maior desafio estava por vir. Uma grande sombra cobriu o {setting}, e todos ficaram assustados. Mas {mainCharacter} lembrou de todas as lições que aprendeu durante a aventura. "Não vou desistir!", declarou com determinação, inspirando todos ao seu redor.`,

      `Com coragem e sabedoria, {mainCharacter} encontrou uma solução mágica que trouxe luz de volta ao {setting}. {secondaryCharacter} sorriu orgulhoso: "Você conseguiu!". Naquele dia, todos aprenderam que a verdadeira magia está em acreditar em si mesmo e nunca desistir dos seus sonhos.`
    ],
      
    adventure: [
      `Era uma manhã especial em {setting}, e {mainCharacter} acordou sentindo que algo incrível estava para acontecer. O sol brilhava de um jeito diferente, e os pássaros cantavam suas melodias mais alegres. "Hoje vai ser um dia inesquecível!", pensou {mainCharacter} com um sorriso no rosto.`,

      `De repente, {secondaryCharacter} chegou correndo com um mapa misterioso nas mãos. "Olha só o que eu encontrei, {mainCharacter}!", exclamou animado. O mapa mostrava um caminho secreto em {setting}, levando a um tesouro escondido. Os olhos de {mainCharacter} brilharam de empolgação.`,

      `{mainCharacter} e {secondaryCharacter} começaram sua busca pelo tesouro. Atravessaram pontes, subiram árvores e seguiram pistas. "Estamos no caminho certo!", disse {mainCharacter}, enquanto ajudava {secondaryCharacter} a passar por um caminho difícil. A amizade deles ficava mais forte a cada desafio.`,

      `Quando chegaram perto do local do tesouro, encontraram um grande obstáculo. "Como vamos passar?", perguntou {secondaryCharacter} preocupado. {mainCharacter} pensou por um momento e teve uma ideia brilhante. Trabalhando juntos, eles encontraram um jeito de superar o desafio.`,

      `Finalmente, alcançaram o local do tesouro. Mas o que encontraram foi uma surpresa: não era ouro nem joias, era um baú cheio de fotos de suas aventuras juntos. {mainCharacter} e {secondaryCharacter} sorriram um para o outro, percebendo que o verdadeiro tesouro era a amizade que construíram durante a jornada.`
    ]
  };

  async generateFallbackStory(params: GenerateStoryParams): Promise<string> {
    logger.info('Gerando história usando fallback service', { params });
    
    try {
      const template = this.templates[params.genre.toLowerCase()] || this.templates.fantasy;
      
      // Processa cada página do template
      const processedPages = template.map(page => {
        return page
          .replace(/{mainCharacter}/g, params.mainCharacter)
          .replace(/{setting}/g, params.setting)
          .replace(/{secondaryCharacter}/g, params.secondaryCharacter || 'um amigo especial');
      });

      // Junta as páginas com duas quebras de linha entre elas
      const story = processedPages.join('\n\n');

      logger.info('História gerada com sucesso usando fallback', {
        pageCount: processedPages.length,
        totalWords: story.split(/\s+/).length
      });

      return story;
    } catch (error) {
      logger.error('Erro ao gerar história fallback:', error);
      throw new Error('Não foi possível gerar a história usando o serviço de fallback');
    }
  }

  async generateFallbackImage(): Promise<string> {
    // Retorna URL de uma imagem padrão armazenada localmente
    return '/assets/default-story-image.png';
  }
}

export const storyFallbackService = new StoryFallbackService();