# Changelog

## [0.3.0] - 2025-02-11

### Changed
- Atualizado modelo OpenAI para gpt-3.5-turbo
- Melhorada a qualidade da geração de histórias
- Otimizado o prompt do sistema

## [0.2.0] - 2025-02-11

### Added
- Adicionada tela ViewBook ao navegador
- Configurada rota de visualização de livro

### Fixed
- Corrigido erro de navegação após criação do livro

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [Não lançado]

### Adicionado
- Implementação completa do controlador de livros
  - Criação de livros com geração de história via OpenAI
  - Geração de imagens para cada página
  - Suporte a múltiplos idiomas
  - Operações CRUD para livros
- Modelo de livros com campos detalhados
- Validações e tratamento de erros
- Logs detalhados para todas as operações
- Sistema completo de geração e visualização de PDF
  - Geração e armazenamento permanente de PDFs
  - Visualizador de PDF com efeito flip page
  - Novo componente PDFViewer
  - Nova tela ViewBookPDFScreen
  - Integração com modelo de Book para armazenar URL do PDF
  - Suporte a imagens e texto formatado no PDF
- Implementação do sistema de geração de PDF
  - Novo serviço PDFService para geração de PDFs
  - Novo controlador PDFController
  - Nova rota para geração de PDF de livros
  - Suporte a imagens e texto formatado no PDF
- Configuração inicial do projeto
- Estrutura básica do backend
- Estrutura básica do frontend
- Sistema de autenticação
- Geração de livros usando IA
- Documentação inicial

### Corrigido
- Problema com token inválido na geração de livros
  - Centralização da configuração JWT
  - Melhor validação de usuário

### Alterado
- Refatoração do serviço OpenAI
- Melhoria na documentação
- Organização do código em módulos