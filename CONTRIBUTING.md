# Contribuindo para o Kids Book Creator

## Visão Geral

O Kids Book Creator é um projeto open-source focado em criar uma plataforma robusta para geração de livros infantis personalizados. Valorizamos contribuições que mantenham nossos altos padrões de qualidade e foco na experiência do usuário.

## Processo de Desenvolvimento

### 1. Preparação do Ambiente

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/kids-book-creator.git
cd kids-book-creator

# Instale as dependências do backend
cd backend
npm install
cp .env.example .env

# Instale as dependências do frontend
cd ../frontend
npm install
cp .env.example .env
```

### 2. Padrões de Código

#### TypeScript
- Use tipos explícitos sempre que possível
- Evite `any`
- Use interfaces para definir contratos
- Implemente error handling adequado

```typescript
// ✅ Bom
interface BookProps {
  id: string;
  title: string;
  coverUrl?: string;
}

function BookCard({ id, title, coverUrl }: BookProps) {
  // ...
}

// ❌ Evitar
function BookCard(props: any) {
  // ...
}
```

#### React/React Native
- Use Hooks funcionais
- Implemente error boundaries
- Otimize re-renders
- Use memo quando apropriado

```typescript
// ✅ Bom
const BookList = memo(({ books }: { books: Book[] }) => {
  const renderItem = useCallback(({ item }: { item: Book }) => (
    <BookCard {...item} />
  ), []);

  return <FlatList data={books} renderItem={renderItem} />;
});

// ❌ Evitar
class BookList extends React.Component {
  // ...
}
```

#### Estilização
- Use Styled Components
- Mantenha temas consistentes
- Implemente responsividade
- Suporte modo escuro

```typescript
// ✅ Bom
const Container = styled.View`
  padding: ${({ theme }) => theme.spacing.medium}px;
  background-color: ${({ theme }) => theme.colors.background};
`;

// ❌ Evitar
const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: 'white',
  },
});
```

### 3. Testes

- Escreva testes unitários para lógica de negócio
- Implemente testes de integração para APIs
- Use mocks apropriadamente
- Mantenha cobertura >80%

```typescript
// ✅ Bom
describe('BookService', () => {
  it('should generate PDF with correct metadata', async () => {
    const book = await BookService.generatePDF({
      title: 'Test Book',
      author: 'Test Author',
    });
    
    expect(book.metadata.title).toBe('Test Book');
  });
});
```

### 4. Documentação

- Documente APIs com JSDoc
- Mantenha README atualizado
- Adicione comentários em código complexo
- Use Conventional Commits

```typescript
/**
 * Gera um novo PDF do livro com metadados e imagens
 * @param {BookConfig} config - Configuração do livro
 * @returns {Promise<Book>} Livro gerado com URL do PDF
 * @throws {ValidationError} Se config for inválido
 */
async function generateBook(config: BookConfig): Promise<Book> {
  // ...
}
```

### 5. Performance

- Implemente lazy loading
- Use cache apropriadamente
- Otimize assets
- Monitore bundle size

### 6. Segurança

- Valide inputs
- Sanitize dados
- Implemente rate limiting
- Siga OWASP guidelines

## Processo de Review

1. Crie uma branch descritiva
2. Faça commits atômicos
3. Escreva testes
4. Atualize documentação
5. Abra PR com descrição detalhada
6. Responda reviews prontamente

## Recursos Úteis

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [React Native Best Practices](https://reactnative.dev/docs/performance)
- [Styled Components Docs](https://styled-components.com/docs)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Conventional Commits](https://www.conventionalcommits.org/)

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