FROM node:18-alpine

WORKDIR /app

# Instala dependências do sistema necessárias
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev

# Copia os arquivos de configuração de dependências
COPY package*.json ./

# Instala as dependências
RUN npm install

# Copia o código-fonte
COPY . .

# Cria diretórios necessários
RUN mkdir -p storage/pdfs storage/images public/pdfs public/uploads

# Compila o TypeScript
RUN npm run build

# Expõe a porta que a aplicação usa
EXPOSE 3000

# Comando para iniciar a aplicação
CMD ["npm", "start"]