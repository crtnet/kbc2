import { logger } from '../utils/logger';

// Interface para parâmetros de história - movida para cá para evitar importação circular
export interface GenerateStoryParams {
  title: string;
  genre: string;
  theme: string;
  mainCharacter: string;
  mainCharacterAvatar?: string;
  secondaryCharacter?: string;
  secondaryCharacterAvatar?: string;
  setting: string;
  tone: string;
  ageRange: string;
  authorName?: string;
  // **NOVO**: Guia de estilo para consistência visual
  styleGuide?: {
    character?: string;
    environment?: string;
    artisticStyle?: string;
  };
}

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
    ],
    
    friendship: [
      `Em {setting}, vivia {mainCharacter}, que adorava brincar e se divertir. Mas às vezes, {mainCharacter} se sentia um pouco sozinho. "Queria ter um amigo especial para compartilhar minhas aventuras", pensava enquanto brincava no parque.`,

      `Um dia, enquanto {mainCharacter} brincava em {setting}, conheceu {secondaryCharacter}. No início, eles eram tímidos um com o outro, mas logo descobriram que tinham muitas coisas em comum. "Você também gosta de {theme}?", perguntou {mainCharacter} surpreso e feliz.`,

      `{mainCharacter} e {secondaryCharacter} começaram a se encontrar todos os dias em {setting}. Eles inventavam brincadeiras divertidas, contavam histórias engraçadas e riam muito juntos. "Você é meu melhor amigo!", disse {mainCharacter} com um grande sorriso.`,

      `Um dia, {secondaryCharacter} precisou de ajuda com um problema difícil. {mainCharacter} não hesitou em ajudar. "Amigos sempre se ajudam!", disse {mainCharacter}, mostrando que a verdadeira amizade significa estar presente nos momentos bons e ruins.`,

      `Juntos, {mainCharacter} e {secondaryCharacter} aprenderam que a amizade é um dos tesouros mais preciosos da vida. Em {setting}, eles continuaram suas aventuras, sabendo que, não importa o que aconteça, sempre teriam um ao outro para compartilhar risadas, sonhos e momentos especiais.`
    ],
    
    fun: [
      `Era um dia ensolarado em {setting}, e {mainCharacter} estava pronto para se divertir! Com um grande sorriso no rosto, {mainCharacter} saiu de casa cantarolando sua música favorita. "Hoje vai ser o dia mais divertido de todos!", exclamou alegremente.`,

      `Logo, {mainCharacter} encontrou {secondaryCharacter}, que também estava procurando diversão. "Vamos brincar juntos?", convidou {mainCharacter}. E assim começou uma aventura cheia de risos e brincadeiras em {setting}. Eles corriam, pulavam e dançavam sem parar.`,

      `{mainCharacter} teve uma ideia brilhante: "Vamos fazer uma competição de {theme}!". {secondaryCharacter} adorou a sugestão, e logo os dois estavam envolvidos em uma divertida disputa amigável. Outros amigos se juntaram a eles, e a diversão só aumentava.`,

      `De repente, começou a chover! Mas nem mesmo a chuva podia parar a diversão. {mainCharacter} e {secondaryCharacter} começaram a pular nas poças d'água, rindo às gargalhadas. "Esta é a melhor parte!", gritou {mainCharacter}, completamente encharcado mas feliz.`,

      `No final do dia, cansados mas muito felizes, {mainCharacter} e {secondaryCharacter} se despediram. "Foi o melhor dia da minha vida!", disse {mainCharacter}. Eles aprenderam que a verdadeira diversão está em compartilhar momentos especiais com amigos, não importa onde estejam ou o que estejam fazendo.`
    ]
  };

  async generateFallbackStory(params: GenerateStoryParams): Promise<string> {
    logger.info('Gerando história usando fallback service', { 
      title: params.title,
      genre: params.genre,
      theme: params.theme,
      mainCharacter: params.mainCharacter,
      hasSecondaryCharacter: !!params.secondaryCharacter
    });
    
    try {
      // Seleciona o template com base no gênero ou tema, ou usa o template padrão
      let template = this.templates[params.genre.toLowerCase()];
      
      if (!template && params.theme && this.templates[params.theme.toLowerCase()]) {
        template = this.templates[params.theme.toLowerCase()];
      }
      
      if (!template) {
        template = this.templates.adventure;
      }
      
      // Processa cada página do template
      const processedPages = template.map(page => {
        return page
          .replace(/{mainCharacter}/g, params.mainCharacter)
          .replace(/{setting}/g, params.setting)
          .replace(/{theme}/g, params.theme || 'aventuras')
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
      logger.error('Erro ao gerar história fallback:', {
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      
      // Retorna uma história super simples em caso de erro
      return `
Era uma vez ${params.mainCharacter} que vivia em ${params.setting}.
Todos os dias, ${params.mainCharacter} gostava de brincar e se divertir.
Um dia, ${params.mainCharacter} conheceu um novo amigo e eles se tornaram inseparáveis.
Juntos, eles viveram muitas aventuras divertidas.
E assim, ${params.mainCharacter} aprendeu que amizade é o maior tesouro de todos.
      `.trim();
    }
  }

  async generateFallbackImage(): Promise<string> {
    // Lista de URLs de imagens de fallback
    const fallbackImages = [
      'https://placehold.co/600x400/orange/white?text=Imagem+Indisponível',
      'https://placehold.co/600x400/blue/white?text=Ilustração+Infantil',
      'https://placehold.co/600x400/green/white?text=Livro+Infantil',
      'https://placehold.co/600x400/purple/white?text=História+Infantil',
      'https://placehold.co/600x400/red/white?text=Aventura+Infantil'
    ];
    
    // Seleciona uma imagem aleatória da lista
    const randomIndex = Math.floor(Math.random() * fallbackImages.length);
    return fallbackImages[randomIndex];
  }
}

export const storyFallbackService = new StoryFallbackService();