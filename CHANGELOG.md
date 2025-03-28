# Changelog

Todas as alterações notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Não lançado]

### Adicionado
- Serviço unificado de avatar (`avatarService.unified.ts`) que combina funcionalidades dos serviços anteriores
- Arquivo de índice para serviços (`services/index.ts`) para centralizar importações
- Documentação detalhada para o diretório de serviços
- Plano de desenvolvimento para guiar o futuro do projeto
- Arquivo de configuração de API (`config/api.ts`) para centralizar configurações de API

### Corrigido
- Erro de importação no `bookAsync.controller.ts` que causava falha na inicialização do servidor
- Erro de importação no `bookService.ts` relacionado ao módulo '../config/api'
- Duplicação de código entre serviços de avatar
- Inconsistência na exportação do serviço OpenAI

### Alterado
- Refatoração do sistema de importação para usar o padrão centralizado
- Melhorias na documentação de código
- Atualização do script fix-imports.ts para detectar mais padrões de importação problemáticos

## [1.0.0] - 2023-XX-XX

### Adicionado
- Funcionalidade inicial de criação de livros
- Sistema de autenticação de usuários
- Geração de histórias usando OpenAI
- Geração de ilustrações usando DALL-E
- Exportação de livros para PDF
- Interface de usuário básica