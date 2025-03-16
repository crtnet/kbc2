// Script simples para testar a geração de imagens com OpenAI
require('dotenv').config();
const OpenAI = require('openai');

// Configuração básica do OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Função para gerar uma imagem
async function generateImage(prompt) {
  try {
    console.log(`Gerando imagem com prompt: "${prompt.substring(0, 100)}..."`);
    
    const response = await openai.images.generate({
      model: "dall-e-2",
      prompt: prompt.substring(0, 1000),
      n: 1,
      size: "1024x1024",
      quality: "standard",
      style: "vivid"
    });

    return response.data[0]?.url;
  } catch (error) {
    console.error('Erro ao gerar imagem:', error.message);
    throw error;
  }
}

// Função principal de teste
async function runTest() {
  try {
    console.log('Iniciando teste simples de geração de imagem...');
    
    // Prompt de teste simples
    const prompt = "Ilustração infantil de uma criança brincando no parque com um cachorrinho. Estilo cartoon colorido, cores vibrantes, traços suaves.";
    
    // Gera a imagem
    const imageUrl = await generateImage(prompt);
    
    console.log('Imagem gerada com sucesso!');
    console.log('URL da imagem:', imageUrl);
  } catch (error) {
    console.error('Erro durante o teste:', error);
  }
}

// Executa o teste
runTest();