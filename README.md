# Kids Book Creator

## Sobre o Projeto
Kids Book Creator é uma aplicação para criar livros infantis personalizados usando tecnologias modernas como geração de texto e imagens por IA.

## Tecnologias Utilizadas
- Frontend: React Native/Expo com TypeScript
- Backend: Node.js com TypeScript
- Banco de Dados: MongoDB
- Geração de Imagens: DALL-E (OpenAI)
- Geração de PDF: PDFKit

## Funcionalidades
- Geração de histórias personalizadas
- Geração de imagens via DALL-E
- Geração de PDF com layout profissional
- Suporte a múltiplos idiomas
- Sistema de compartilhamento de livros
- Temas visuais personalizáveis
- Avatar do personagem personalizado

## Configuração do Ambiente

### Pré-requisitos
- Node.js 14+
- MongoDB
- Yarn ou NPM
- Expo CLI (para o frontend)

### Backend
1. Instale as dependências:
```bash
cd backend
npm install
```

2. Configure as variáveis de ambiente:
```bash
cp .env.example .env
```

3. Inicie o servidor:
```bash
npm run dev
```

### Frontend
1. Instale as dependências:
```bash
cd frontend
npm install
```

2. Configure as variáveis de ambiente:
```bash
cp .env.example .env
```

3. Inicie o aplicativo:
```bash
npm start
```

## Estrutura do Projeto

### Backend
```
backend/
├── src/
│   ├── controllers/    # Controladores da aplicação
│   ├── models/         # Modelos do MongoDB
│   ├── routes/         # Rotas da API
│   ├── services/       # Serviços (PDF, OpenAI, etc)
│   ├── utils/          # Utilitários
│   └── config/         # Configurações
├── assets/
│   └── fonts/         # Fontes personalizadas
├── public/
│   └── pdfs/         # PDFs gerados
└── temp/             # Arquivos temporários
```

### Frontend
```
frontend/
├── src/
│   ├── components/    # Componentes React
│   ├── screens/       # Telas do aplicativo
│   ├── services/      # Serviços e API
│   ├── utils/         # Utilitários
│   └── themes/        # Temas visuais
```

## Geração de PDF
O sistema de geração de PDF inclui:
- Capa personalizada com informações do livro
- Suporte a fontes personalizadas
- Layout otimizado para texto e imagens
- Metadados do PDF
- Suporte a diferentes formatos de página
- Sistema de cache de imagens

## Próximos Passos
1. ✅ Implementação da geração de PDF
2. ✅ Visualização de livros na HomeScreen
3. ✅ Suporte a diferentes temas visuais
4. ⏳ Implementação da geração de imagens via DALL-E
5. ⏳ Implementação do avatar do personagem
6. ⏳ Sistema de compartilhamento de livros
7. ⏳ Suporte a múltiplos idiomas

## Contribuindo
1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## Licença
Este projeto está licenciado sob a licença MIT - veja o arquivo [LICENSE.md](LICENSE.md) para detalhes.