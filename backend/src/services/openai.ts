import { Configuration, OpenAIApi } from 'openai';
import { config } from '../config';

if (!config.openai.apiKey) {
  console.error('OPENAI_API_KEY não está configurada!');
  process.exit(1);
}

const configuration = new Configuration({
  apiKey: config.openai.apiKey
});

const openai = new OpenAIApi(configuration);

export const generateStory = async (book: any) => {
  const storyPrompt = `
    Crie uma história infantil em português com as seguintes características:
    - Título: ${book.title}
    - Gênero: ${book.genre}
    - Tema: ${book.theme}
    - Personagem Principal: ${book.mainCharacter}
    - Cenário: ${book.setting}
    - Tom: ${book.tone}
    
    A história deve:
    - Ter aproximadamente 500 palavras
    - Ser dividida em 5 páginas
    - Cada página deve ter um parágrafo curto
    - Ser adequada para crianças
    - Ter uma moral relacionada ao tema
    - Ser envolvente e criativa
    - Incluir diálogos
    - Ter um final feliz
  `;

  const response = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: "Você é um escritor especializado em histórias infantis. Crie histórias envolventes, adequadas para crianças, com lições de moral e finais felizes."
      },
      {
        role: "user",
        content: storyPrompt
      }
    ],
    temperature: 0.7,
    max_tokens: 1000,
  });

  return response.data.choices[0]?.message?.content?.trim() || '';
};

export const generateImage = async (text: string) => {
  const imagePrompt = `
    Crie uma ilustração infantil colorida para a seguinte cena:
    "${text}"
    
    Estilo:
    - Ilustração infantil colorida
    - Estilo amigável e acolhedor
    - Cores vibrantes
    - Personagens expressivos
    - Adequado para crianças
  `;

  const imageResponse = await openai.createImage({
    prompt: imagePrompt,
    n: 1,
    size: "512x512",
  });

  return imageResponse.data.data[0].url || '';
};