# Guia de Contribuição

Obrigado pelo interesse em contribuir com o Kids Book Creator! Este documento fornece diretrizes para contribuir com o projeto.

## Código de Conduta

Este projeto adota um Código de Conduta que esperamos que todos os participantes sigam. Por favor, leia o [Código de Conduta](CODE_OF_CONDUCT.md) para entender quais ações são e não são toleradas.

## Como Contribuir

### Reportando Bugs

Bugs são rastreados como issues no GitHub. Ao criar uma issue para um bug, inclua:

- Um título claro e descritivo
- Passos detalhados para reproduzir o bug
- Comportamento esperado vs. comportamento observado
- Screenshots, se aplicável
- Informações sobre seu ambiente (sistema operacional, navegador, etc.)

### Sugerindo Melhorias

Melhorias também são rastreadas como issues no GitHub. Ao sugerir uma melhoria, inclua:

- Um título claro e descritivo
- Uma descrição detalhada da melhoria proposta
- Justificativa para a melhoria
- Possíveis implementações, se você tiver ideias

### Pull Requests

1. Faça um fork do repositório
2. Clone seu fork: `git clone https://github.com/seu-usuario/kids-book-creator.git`
3. Crie uma branch para sua feature: `git checkout -b feature/nova-funcionalidade`
4. Faça suas alterações
5. Execute os testes: `npm test`
6. Commit suas alterações: `git commit -m 'Adiciona nova funcionalidade'`
7. Push para a branch: `git push origin feature/nova-funcionalidade`
8. Abra um Pull Request

## Padrões de Código

### Estilo de Código

- Use TypeScript para todo o código
- Siga o estilo de código definido nos arquivos de configuração do ESLint e Prettier
- Documente funções e classes usando JSDoc

### Estrutura de Commits

- Use mensagens de commit claras e descritivas
- Use o tempo presente ("Adiciona feature" não "Adicionou feature")
- Limite a primeira linha a 72 caracteres
- Referencie issues e pull requests quando apropriado

### Testes

- Adicione testes para novas funcionalidades
- Mantenha a cobertura de testes existente
- Execute a suite de testes antes de submeter um PR

## Estrutura do Projeto

### Backend

```
backend/
├── src/
│   ├── config/         # Configurações
│   ├── controllers/    # Controladores
│   ├── models/         # Modelos de dados
│   ├── routes/         # Rotas da API
│   ├── services/       # Serviços
│   ├── queues/         # Filas de processamento
│   ├── utils/          # Utilitários
│   ├── app.ts          # Configuração do Express
│   └── server.ts       # Ponto de entrada
├── public/             # Arquivos estáticos
└── tests/              # Testes
```

### Frontend

```
frontend/
├── src/
│   ├── components/     # Componentes React
│   ├── screens/        # Telas do aplicativo
│   ├── services/       # Serviços
│   ├── contexts/       # Contextos React
│   ├── navigation/     # Configuração de navegação
│   └── utils/          # Utilitários
├── assets/             # Recursos estáticos
└── App.tsx             # Componente raiz
```

## Diretrizes de Importação

Para manter o código organizado e consistente, siga estas diretrizes de importação:

### Backend

```typescript
// Importações de bibliotecas externas
import express from 'express';
import mongoose from 'mongoose';

// Importações de arquivos locais
import { config } from '../config';
import { logger } from '../utils/logger';

// Importações de serviços (use o arquivo index.ts)
import { avatarService, bookService } from '../services';
```

### Frontend

```typescript
// Importações de bibliotecas externas
import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';

// Importações de componentes
import { Button } from '../components/Button';

// Importações de serviços
import { api } from '../services/api';
```

## Processo de Revisão

Os Pull Requests serão revisados pelos mantenedores do projeto. O processo de revisão pode incluir:

- Verificação de estilo de código
- Verificação de funcionalidade
- Verificação de testes
- Verificação de documentação

## Recursos Adicionais

- [Documentação do TypeScript](https://www.typescriptlang.org/docs/)
- [Documentação do React Native](https://reactnative.dev/docs/getting-started)
- [Documentação do Express](https://expressjs.com/)