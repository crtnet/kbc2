# Kids Book Creator - Backend

## Descrição
Backend para o aplicativo de criação de livros infantis, desenvolvido com Node.js, Express e TypeScript.

## Requisitos
- Node.js (v14 ou superior)
- MongoDB

## Instalação
1. Clone o repositório
2. Instale as dependências:
   ```
   npm install
   ```

## Configuração
1. Copie `.env.example` para `.env`
2. Configure as variáveis de ambiente

## Scripts
- `npm run dev`: Iniciar servidor de desenvolvimento
- `npm run build`: Compilar TypeScript
- `npm start`: Iniciar servidor de produção
- `npm test`: Executar testes
- `npm run lint`: Verificar código

## Estrutura do Projeto
- `src/`: Código-fonte
  - `config/`: Configurações
  - `controllers/`: Controladores
  - `models/`: Modelos de dados
  - `routes/`: Definição de rotas
  - `middlewares/`: Middlewares
  - `utils/`: Utilitários
- `public/`: Arquivos públicos
  - `uploads/`: Uploads de imagens
  - `pdfs/`: PDFs gerados
- `logs/`: Arquivos de log

## Rotas
- `POST /api/books`: Criar livro
- `GET /api/books`: Listar livros
- `GET /api/books/:id`: Detalhes do livro
- `PUT /api/books/:id`: Atualizar livro
- `DELETE /api/books/:id`: Deletar livro
- `POST /api/books/:id/generate`: Gerar PDF do livro

## Contribuição
1. Faça um fork do projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Faça um push para a branch
5. Abra um Pull Request

## Licença
[Especificar licença]