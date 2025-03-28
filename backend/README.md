# Backend do Kids Book Creator

## Configuração Inicial

1. Instale as dependências:
   ```
   npm install
   ```

2. Configure o arquivo `.env` com suas variáveis de ambiente (use `.env.example` como referência).

3. Crie um usuário de teste para login:
   ```
   npm run create:testuser
   ```
   
   Este comando criará um usuário com as seguintes credenciais:
   - Email: crtnet@hotmail.com
   - Senha: senha123

4. Inicie o servidor:
   ```
   npm run dev
   ```

## Estrutura do Projeto

- `src/controllers`: Controladores da aplicação
- `src/models`: Modelos do banco de dados
- `src/routes`: Rotas da API
- `src/middlewares`: Middlewares da aplicação
- `src/config`: Configurações da aplicação
- `src/utils`: Utilitários
- `src/scripts`: Scripts para tarefas específicas

## API Endpoints

### Autenticação

- `POST /api/auth/register`: Registra um novo usuário
- `POST /api/auth/login`: Faz login com email e senha
- `GET /api/auth/verify`: Verifica se o token é válido (requer autenticação)
- `POST /api/auth/refresh-token`: Atualiza o token de acesso

### Livros

- `GET /api/books`: Lista todos os livros do usuário (requer autenticação)
- `POST /api/books`: Cria um novo livro (requer autenticação)
- `GET /api/books/:id`: Obtém detalhes de um livro (requer autenticação)
- `PUT /api/books/:id`: Atualiza um livro (requer autenticação)
- `DELETE /api/books/:id`: Remove um livro (requer autenticação)
- `GET /api/books/:id/pdf`: Obtém o PDF de um livro (requer autenticação)

## WebSockets

O servidor utiliza Socket.IO para comunicação em tempo real. Os clientes podem se conectar ao WebSocket e receber atualizações sobre o progresso da geração de livros.

### Eventos

- `authenticate`: Autentica o cliente com o ID do usuário
- `book_progress_update`: Envia atualizações sobre o progresso da geração de um livro