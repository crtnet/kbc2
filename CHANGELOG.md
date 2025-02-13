# Changelog

## [Não publicado]

### Corrigido
- Correção de navegação para FlipBookScreen com tratamento de ID undefined
- Adicionado tratamento de erro mais robusto na busca de PDF
- Validação adicional para URL do PDF
- Melhoria na segurança da navegação entre telas
- Correção da transformação de IDs de livros no frontend
- Mapeamento correto dos campos de livros vindos do backend
- Adicionado fallback para imagem de capa e campos opcionais
- Tratamento de status de livros para compatibilidade frontend/backend

### Adicionado
- Logs de erro detalhados para problemas de navegação e carregamento de PDF
- Mapeamento robusto de dados de livros
- Suporte a campos opcionais e valores padrão

### Planejado
- Sistema de visualização de livros na HomeScreen
- Visualizador de PDF com modo flip
- Sistema de geração e persistência de avatar
- Suporte a diferentes temas visuais
- Sistema de compartilhamento de livros
- Suporte a múltiplos idiomas

### Em Desenvolvimento
- Correção de dependências para suporte web
- Instalação de @expo/webpack-config

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