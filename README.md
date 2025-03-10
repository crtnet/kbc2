# Aplicativo de Criação de Livros Infantis Personalizados

Este aplicativo permite que usuários criem histórias infantis personalizadas com personagens customizados, gerando automaticamente o conteúdo textual e as ilustrações.

## Principais Funcionalidades

### Criação de Livros Personalizados
- Interface de usuário com processo em etapas para definir título, personagens, cenário, tema e faixa etária
- Seleção de avatares para personagens principais e secundários
- Personalização de gênero, tom narrativo e tema da história
- Descrições detalhadas de personagens e ambientes para melhor consistência visual

### Geração de Conteúdo com IA
- Geração de texto da história usando OpenAI GPT
- Geração de ilustrações para cada página usando DALL-E
- Manutenção da consistência visual dos personagens nas ilustrações
- Guia de estilo personalizado para cada livro

### Produção de PDF
- Geração automática de PDF com layout profissional
- Capa personalizada com título e autor
- Páginas com texto e ilustrações correspondentes
- Múltiplos layouts disponíveis (padrão, livro ilustrado, quadrinhos)
- Temas de cores personalizáveis

### Gerenciamento de Livros
- Listagem de livros criados pelo usuário
- Visualização de livros em formato PDF
- Visualização interativa em formato de flipbook
- Acompanhamento do status de processamento em tempo real

## Arquitetura Técnica

### Frontend (React Native)
- Interface de usuário responsiva com React Native e React Native Paper
- Navegação entre telas com React Navigation
- Gerenciamento de estado com Context API
- Suporte a múltiplos idiomas (i18n)
- Comunicação com o backend via API REST

### Backend (Node.js/Express)
- API RESTful com Express
- Banco de dados MongoDB com Mongoose
- Integração com OpenAI para geração de texto e imagens
- Geração de PDFs com PDFKit
- Sistema de cache para otimização de desempenho
- Tratamento de erros e logging robusto

## Fluxo de Criação de Livro
1. O usuário preenche um formulário em etapas com informações sobre o livro
2. O frontend envia os dados para o backend
3. O backend gera a história usando OpenAI GPT
4. O texto é dividido em páginas (aproximadamente 5 páginas)
5. Para cada página, o sistema gera uma ilustração usando DALL-E
6. As ilustrações mantêm consistência visual com os avatares dos personagens
7. Um PDF é gerado combinando texto e ilustrações
8. O usuário pode visualizar e baixar o PDF final

## Melhorias Implementadas

### Consistência Visual
- Processamento de avatares para manter características consistentes
- Guia de estilo personalizado para cada livro
- Descrições detalhadas de personagens e ambientes

### Layout do PDF
- Múltiplos layouts disponíveis (padrão, livro ilustrado, quadrinhos)
- Temas de cores personalizáveis
- Elementos decorativos baseados no gênero e faixa etária
- Tipografia adaptada à faixa etária do público-alvo

### Experiência do Usuário
- Seleção avançada de avatares com categorias e estilos
- Visualização interativa em formato de flipbook
- Acompanhamento do status de processamento em tempo real
- Upload de avatares personalizados

## Próximos Passos
- Implementação de recursos de compartilhamento social
- Opções de impressão e entrega física
- Suporte a mais idiomas
- Recursos de edição avançada para personalização adicional