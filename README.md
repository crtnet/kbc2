# Kids Book Creator

## Instalação

Para instalar todas as dependências necessárias, execute o script de instalação:

```bash
chmod +x install-dependencies.sh
./install-dependencies.sh
```

## Executando o projeto

### Backend

```bash
cd backend
npm run dev
```

### Frontend

```bash
cd frontend
npm start
```

## Melhorias implementadas

1. **Otimização de imagens**:
   - Implementação de cache de imagens no frontend
   - Redimensionamento e compressão automática de imagens
   - Limpeza automática do cache para economizar espaço

2. **Comunicação em tempo real**:
   - Integração com Socket.IO para atualizações em tempo real
   - Autenticação de usuários no socket

3. **Melhorias na interface**:
   - Componente OptimizedImage para carregamento eficiente de imagens
   - Placeholders durante o carregamento
   - Tratamento de erros aprimorado

4. **Funcionalidades do PDF**:
   - Download e compartilhamento de PDFs
   - Barra de progresso para downloads
   - Melhor tratamento de erros

5. **Navegação**:
   - Correção do botão voltar na tela de visualização de PDF

## Estrutura do projeto

### Backend

- `/src/controllers`: Controladores da API
- `/src/models`: Modelos de dados
- `/src/services`: Serviços de negócio
- `/src/utils`: Utilitários

### Frontend

- `/src/components`: Componentes reutilizáveis
- `/src/screens`: Telas do aplicativo
- `/src/services`: Serviços (API, socket, otimização de imagens)
- `/src/contexts`: Contextos React (autenticação, tema)
- `/src/navigation`: Configuração de navegação
- `/src/utils`: Utilitários