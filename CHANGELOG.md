# Changelog

## [v0.3.0] - Em Desenvolvimento

### Planejado
- Integração com ChatGPT para geração de histórias
- Integração com DALL-E para geração de imagens
- Sistema de visualização de livro com modo flip
- Geração de PDF em formato A3
- Sistema de avatar personalizado
- Expansão do sistema de temas
- Suporte a múltiplos idiomas (i18n)
- Sistema de compartilhamento de livros
- Recursos sociais (likes, comentários)

### Adicionado
- Plano de desenvolvimento detalhado (DEVELOPMENT_PLAN.md)
- Estrutura inicial para novas funcionalidades
- Documentação expandida

## [v0.2.0] - Em Desenvolvimento

### Adicionado
- Sistema completo de temas com suporte a modo claro/escuro
- Novo sistema de navegação com Expo Router
- Sistema de cache de imagens para melhor performance
- Logs detalhados usando Winston no backend
- Sistema robusto de tratamento de erros
- Validações aprimoradas em todas as rotas da API

### Corrigido
- Navegação para FlipBookScreen com tratamento de ID undefined
- Tratamento de erro na busca de PDF
- Validação de URL do PDF
- Segurança na navegação entre telas
- Transformação de IDs de livros no frontend
- Mapeamento de campos de livros do backend
- Fallback para imagem de capa e campos opcionais
- Compatibilidade de status de livros entre frontend/backend

### Em Desenvolvimento
- Sistema de geração de imagens via DALL-E
- Implementação do avatar personalizado
- Suporte a web com @expo/webpack-config

### Planejado
- Sistema de compartilhamento de livros
- Suporte a múltiplos idiomas
- Modo flip para visualização de PDF

## [Anterior]

### Adicionado
- Implementação da visualização de livros na HomeScreen:
  - Novo componente BookList para exibir lista de livros
  - Novo componente BookCard para exibir cada livro
  - Suporte a pull-to-refresh na lista de livros
  - Botão de visualização de PDF para cada livro
  - Sistema de temas com suporte a modo claro/escuro
  - Hook useBooks para gerenciamento do estado dos livros
  - Hook useTheme para gerenciamento de temas
  - Contexto ThemeContext para compartilhamento do tema
  - Temas light e dark predefinidos
  - Logs detalhados para debugging

### Adicionado
- Implementação avançada da geração de PDF com suporte a:
  - Capa personalizada com título, autor e informações do livro
  - Suporte a fontes personalizadas
  - Layout melhorado para texto e imagens
  - Metadados do PDF
  - Download automático de imagens de URLs
  - Sistema de cache de imagens temporário
  - Suporte a diferentes formatos de página
  - Margens personalizáveis

### Corrigido
- Erro de importação no módulo Book
- Problemas de tipagem no modelo Book

### Alterado
- Atualização das dependências do projeto
- Melhorias na estrutura de diretórios
- Adição de logs mais detalhados

### Segurança
- Implementação de limpeza automática de arquivos temporários após geração do PDF