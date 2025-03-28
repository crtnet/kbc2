# Serviços da Aplicação

Este diretório contém todos os serviços utilizados pela aplicação para geração de livros infantis ilustrados.

## Estrutura de Serviços

### Serviços Principais

- **avatarService.unified.ts**: Serviço unificado para gerenciamento de avatares dos personagens
- **bookService.ts**: Serviço para gerenciamento de livros
- **openai.unified.ts**: Serviço unificado para interação com a API da OpenAI
- **pdfService.ts**: Serviço para geração de PDFs dos livros

### Serviços de Processamento de Imagem

- **imageProcessor.ts**: Processamento de imagens geradas
- **imageOptimizer.ts**: Otimização de imagens para melhor desempenho
- **imageAnalysisService.ts**: Análise de imagens para garantir qualidade e adequação

### Serviços de Geração de Conteúdo

- **storyGenerator.ts**: Geração de histórias para os livros
- **storyFallback.service.ts**: Serviço de fallback para garantir geração de histórias mesmo em caso de falhas

### Serviços de Suporte

- **cache.service.ts**: Serviço de cache para melhorar desempenho
- **style.service.ts**: Serviço para gerenciamento de estilos visuais dos livros

## Boas Práticas

1. **Centralização de Importações**: Use o arquivo `index.ts` para importar serviços
2. **Serviços Unificados**: Prefira usar os serviços unificados (com sufixo `.unified`) que combinam funcionalidades
3. **Tratamento de Erros**: Todos os serviços devem implementar tratamento robusto de erros
4. **Logging**: Use o logger centralizado para registrar operações importantes
5. **Fallbacks**: Implemente mecanismos de fallback para garantir resiliência

## Exemplo de Uso

```typescript
// Importação recomendada
import { avatarService, bookService } from '../services';

// Uso do serviço
const avatarUrl = avatarService.processAvatarUrl(rawUrl, isMainCharacter);
```