# Kids Book Creator

Uma plataforma para criar livros infantis personalizados usando inteligência artificial.

## Funcionalidades

- Criação de livros infantis personalizados
- Geração automática de histórias usando IA
- Geração de ilustrações para cada página
- Sistema de autenticação de usuários
- Gerenciamento de livros por usuário
- Exportação de livros em PDF com ilustrações

## Tecnologias

- Frontend: React Native/Expo com TypeScript
- Backend: Node.js com TypeScript
- Banco de dados: MongoDB
- IA: OpenAI (GPT-3 e DALL-E)

## Configuração

### Pré-requisitos

- Node.js (versão 16 ou superior)
- MongoDB
- Conta OpenAI (para geração de histórias e imagens)

### Passos de Instalação

1. Clone o repositório
```bash
git clone https://github.com/seu-usuario/kids-book-creator.git
cd kids-book-creator
```

2. Configurar Backend
```bash
cd backend
cp .env.example .env
```

3. Edite o arquivo `.env` com suas configurações:
   - Adicione sua chave da API OpenAI
   - Configure a URI do MongoDB
   - Defina uma chave secreta para JWT

4. Instalar dependências e iniciar o backend
```bash
npm install
npm run dev
```

5. Configurar Frontend
```bash
cd ../frontend
cp .env.example .env
npm install
npm start
```

### Configuração da API OpenAI

1. Crie uma conta em [OpenAI Platform](https://platform.openai.com/)
2. Gere uma nova chave de API
3. Copie a chave para o campo `OPENAI_API_KEY` no `.env`

### Solução de Problemas

- Certifique-se de ter uma conexão estável com a internet
- Verifique se todas as variáveis de ambiente estão configuradas corretamente
- Consulte os logs do servidor para detalhes de erros

## API Endpoints

### Autenticação

- POST `/api/auth/register`
  - Registra um novo usuário
  - Body: `{ name, email, password, type }`

- POST `/api/auth/login`
  - Autentica um usuário
  - Body: `{ email, password }`

### Livros

- POST `/api/books`
  - Cria um novo livro
  - Requer autenticação
  - Body: 
    ```json
    {
      "title": "Aventura na Floresta",
      "genre": "Aventura",
      "theme": "Amizade",
      "mainCharacter": "Maria",
      "setting": "Floresta mágica",
      "tone": "Divertido",
      "language": "pt-BR"
    }
    ```
  - Gera história e imagens automaticamente
  - Retorna detalhes do livro criado

- GET `/api/books`
  - Lista todos os livros do usuário
  - Requer autenticação
  - Retorna lista resumida de livros

- GET `/api/books/:id`
  - Obtém detalhes de um livro específico
  - Requer autenticação

- PUT `/api/books/:id`
  - Atualiza um livro existente
  - Requer autenticação

- DELETE `/api/books/:id`
  - Exclui um livro
  - Requer autenticação

- GET `/api/books/:bookId/pdf`
  - Gera e retorna um PDF do livro
  - Requer autenticação
  - Retorna: `{ message: string, pdfUrl: string }`

## Autenticação

O sistema usa JWT (JSON Web Token) para autenticação. Para acessar endpoints protegidos:

1. Faça login para obter o token
2. Inclua o token no header das requisições:
   ```
   Authorization: Bearer {seu-token-aqui}
   ```

## Desenvolvimento

### Estrutura do Projeto

```
backend/
  ├── src/
  │   ├── config/        # Configurações
  │   ├── controllers/   # Controladores
  │   ├── middlewares/   # Middlewares
  │   ├── models/        # Modelos do MongoDB
  │   ├── routes/        # Rotas da API
  │   ├── services/      # Serviços
  │   └── app.ts         # Configuração do Express
  
frontend/
  ├── src/
  │   ├── components/    # Componentes React
  │   ├── screens/       # Telas
  │   ├── services/      # Serviços de API
  │   ├── utils/         # Utilitários
  │   └── App.tsx        # Componente principal
```

### Fluxo de Desenvolvimento

1. Crie uma nova branch para cada feature
2. Implemente os testes
3. Faça commit com mensagens descritivas
4. Atualize a documentação
5. Crie um pull request

## Contribuição

1. Fork o projeto
2. Crie sua branch (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

## Licença

Este projeto está sob a licença MIT.