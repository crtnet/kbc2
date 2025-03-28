// src/services/index.ts
// Este arquivo centraliza as exportações de todos os serviços
// para facilitar a importação e manutenção

// Serviço de Avatar Unificado
export { avatarService } from './avatarService.unified';

// Serviços de Livro
export { bookService } from './bookService';

// Serviços de OpenAI
export { openaiService } from './openai.unified';

// Serviços de PDF
export { pdfService } from './pdfService';

// Serviços de Imagem
export { imageProcessor } from './imageProcessor';
export { imageOptimizer } from './imageOptimizer';

// Serviços de Cache
export { cacheService } from './cache.service';

// Serviços de Geração de Histórias
export { storyGenerator } from './storyGenerator';
export { storyFallbackService } from './storyFallback.service';

// Serviços de Estilo
export { styleService } from './style.service';