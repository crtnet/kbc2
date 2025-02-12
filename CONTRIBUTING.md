# Contribuindo para o Kids Book Creator

Primeiramente, obrigado por considerar contribuir para o Kids Book Creator! É graças a pessoas como você que podemos criar ferramentas incríveis para estimular a criatividade das crianças.

## Código de Conduta

Este projeto e todos os participantes estão sob o Código de Conduta do Contribuidor. Ao participar, espera-se que você mantenha este código. Por favor, reporte comportamentos inaceitáveis.

## Como posso contribuir?

### Reportando Bugs

- Verifique se o bug já não foi reportado procurando nas Issues do GitHub
- Se você não encontrar uma issue aberta relacionada, crie uma nova
- Inclua um título e uma descrição clara do problema
- Adicione o máximo de informações relevantes possível
- Se possível, adicione exemplos para demonstrar o bug

### Sugerindo Melhorias

- Primeiro, leia a documentação e verifique se a funcionalidade já não existe
- Verifique se a melhoria já não foi sugerida nas Issues do GitHub
- Sugira sua melhoria criando uma nova issue
- Inclua um título e uma descrição clara
- Explique por que esta melhoria seria útil para a maioria dos usuários

### Pull Requests

1. Faça um fork do repositório
2. Clone o fork para sua máquina local
3. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
4. Faça suas alterações
5. Commit suas mudanças (`git commit -m 'Adiciona alguma feature'`)
6. Push para a branch (`git push origin feature/MinhaFeature`)
7. Abra um Pull Request

## Padrões de Código

### JavaScript/TypeScript

- Use TypeScript sempre que possível
- Siga o ESLint configurado no projeto
- Use nomes descritivos para variáveis e funções
- Comente código complexo
- Mantenha funções pequenas e focadas

### Commits

- Use mensagens de commit claras e descritivas
- Use o tempo presente ("Adiciona feature" não "Adicionada feature")
- Limite a primeira linha a 72 caracteres
- Use o corpo do commit para explicações mais detalhadas

### Documentação

- Mantenha a documentação atualizada
- Use markdown para formatação
- Inclua exemplos quando relevante
- Mantenha um estilo consistente

## Estrutura do Projeto

```
kids-book-creator/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── screens/
│   │   ├── services/
│   │   ├── contexts/
│   │   └── utils/
│   └── assets/
└── backend/
    ├── src/
    │   ├── controllers/
    │   ├── models/
    │   ├── routes/
    │   ├── services/
    │   └── utils/
    └── config/
```

## Dicas para Desenvolvimento

### Frontend

- Use componentes funcionais com hooks
- Mantenha os componentes pequenos e reutilizáveis
- Use TypeScript para type-safety
- Siga os padrões de design do Material-UI
- Teste seus componentes

### Backend

- Siga os princípios REST
- Use async/await para operações assíncronas
- Implemente validação adequada
- Mantenha a segurança em mente
- Documente suas APIs

## Processo de Review

1. Seu código será revisado por pelo menos um mantenedor
2. Feedback será dado através dos comentários do PR
3. Mudanças podem ser solicitadas
4. Uma vez aprovado, seu PR será merged

## Recursos Úteis

- [Documentação do React Native](https://reactnative.dev/docs/getting-started)
- [Documentação do Expo](https://docs.expo.dev/)
- [Documentação do Node.js](https://nodejs.org/docs/latest/api/)
- [Guia de TypeScript](https://www.typescriptlang.org/docs/)
- [Documentação do MongoDB](https://docs.mongodb.com/)