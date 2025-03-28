# Kids Book Creator - Aplicativo de Criação de Livros Infantis com IA

Este aplicativo permite criar livros infantis ilustrados utilizando inteligência artificial para gerar histórias e ilustrações personalizadas.

## Visão Geral

O Kids Book Creator é uma plataforma inovadora que permite aos usuários criar livros infantis personalizados com ilustrações geradas por IA. O aplicativo utiliza tecnologias avançadas de processamento de linguagem natural e geração de imagens para criar histórias únicas e envolventes para crianças.

## Requisitos do Sistema

- Node.js 18 ou superior
- Docker e Docker Compose (para ambiente de desenvolvimento)
- MongoDB (pode ser usado via Docker)
- Redis (pode ser usado via Docker)
- Chave de API da OpenAI (para geração de conteúdo)

## Instalação e Configuração

### Usando Docker (Recomendado)

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/kids-book-creator.git
cd kids-book-creator
```

2. Configure as variáveis de ambiente:
   - Copie o arquivo `.env.example` para `.env` no diretório `backend`
   - Ajuste as variáveis conforme necessário, especialmente a chave da API OpenAI

3. Inicie os containers com Docker Compose:
```bash
docker-compose up -d
```

Isso iniciará o MongoDB, Redis e o backend em containers separados.

### Instalação Manual

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/kids-book-creator.git
cd kids-book-creator
```

2. Instale as dependências:
```bash
chmod +x install-dependencies.sh
./install-dependencies.sh
```

3. Configure o backend:
```bash
cd backend
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

4. Configure o frontend:
```bash
cd frontend
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

## Executando o Projeto

### Com Docker

O projeto já estará em execução após o `docker-compose up -d`.

- Backend: http://localhost:3000
- Frontend: http://localhost:19006 (após iniciar o frontend manualmente)

### Manualmente

#### Backend

```bash
cd backend
npm run dev
```

#### Frontend

```bash
cd frontend
npm start
```

## Arquitetura do Sistema

### Backend

O backend é construído com Node.js e Express, utilizando uma arquitetura em camadas:

- **Controllers**: Gerenciam as requisições HTTP e respostas
- **Services**: Contêm a lógica de negócio
- **Models**: Definem os esquemas de dados e interação com o banco de dados
- **Queues**: Processamento assíncrono de tarefas pesadas (geração de livros)
- **Middlewares**: Funções intermediárias para autenticação, validação, etc.

### Frontend

O frontend é desenvolvido com React Native, permitindo a execução em múltiplas plataformas:

- **Screens**: Telas do aplicativo
- **Components**: Componentes reutilizáveis
- **Services**: Comunicação com a API e outros serviços
- **Contexts**: Gerenciamento de estado global
- **Navigation**: Configuração de rotas e navegação

## Funcionalidades Principais

1. **Criação de Livros**:
   - Geração de histórias personalizadas com IA
   - Ilustrações geradas por IA baseadas no contexto da história
   - Processamento assíncrono para melhor experiência do usuário

2. **Personalização**:
   - Escolha de personagens e cenários
   - Definição de temas e tons da história
   - Customização de avatares para os personagens

3. **Visualização e Compartilhamento**:
   - Visualização do livro em formato digital
   - Exportação para PDF
   - Compartilhamento via link ou arquivo

4. **Gerenciamento de Biblioteca**:
   - Lista de livros criados
   - Edição e exclusão de livros
   - Filtros e busca

## Tecnologias Utilizadas

- **Backend**:
  - Node.js e Express
  - TypeScript
  - MongoDB (banco de dados)
  - Redis (cache e filas)
  - Bull (processamento de filas)
  - OpenAI API (GPT-4 e DALL-E)

- **Frontend**:
  - React Native
  - Expo
  - TypeScript
  - React Navigation
  - Axios

## Estrutura de Diretórios

```
kids-book-creator/
├── backend/                # Código do servidor
│   ├── src/
│   │   ├── config/         # Configurações
│   │   ├── controllers/    # Controladores
│   │   ├── models/         # Modelos de dados
│   │   ├── routes/         # Rotas da API
│   │   ├── services/       # Serviços
│   │   ├── queues/         # Filas de processamento
│   │   ├── utils/          # Utilitários
│   │   ├── app.ts          # Configuração do Express
│   │   └── server.ts       # Ponto de entrada
│   ├── public/             # Arquivos estáticos
│   └── tests/              # Testes
├── frontend/               # Código do cliente
│   ├── src/
│   │   ├── components/     # Componentes React
│   │   ├── screens/        # Telas do aplicativo
│   │   ├── services/       # Serviços
│   │   ├── contexts/       # Contextos React
│   │   ├── navigation/     # Configuração de navegação
│   │   └── utils/          # Utilitários
│   ├── assets/             # Recursos estáticos
│   └── App.tsx             # Componente raiz
└── docker-compose.yml      # Configuração Docker
```

## Plano de Desenvolvimento

Consulte o arquivo [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) para detalhes sobre o roadmap de desenvolvimento do projeto.

## Changelog

Consulte o arquivo [CHANGELOG.md](CHANGELOG.md) para um histórico detalhado das alterações do projeto.

## Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Faça commit das suas alterações (`git commit -m 'Adiciona nova funcionalidade'`)
4. Faça push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

Para mais detalhes, consulte o arquivo [CONTRIBUTING.md](CONTRIBUTING.md).

## Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo LICENSE para detalhes.