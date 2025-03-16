#!/bin/bash

# Cores para melhor visualização
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Iniciando instalação de dependências...${NC}"

# Instala dependências do backend
echo -e "${GREEN}Instalando dependências do backend...${NC}"
cd backend
npm install socket.io@4.7.5
if [ $? -ne 0 ]; then
    echo -e "${RED}Erro ao instalar dependências do backend${NC}"
    exit 1
fi
echo -e "${GREEN}Dependências do backend instaladas com sucesso!${NC}"

# Instala dependências do frontend
echo -e "${GREEN}Instalando dependências do frontend...${NC}"
cd ../frontend
npm install expo-file-system@15.4.5 expo-image-manipulator@11.3.0 expo-sharing@11.5.0 socket.io-client@4.7.5
if [ $? -ne 0 ]; then
    echo -e "${RED}Erro ao instalar dependências do frontend${NC}"
    exit 1
fi
echo -e "${GREEN}Dependências do frontend instaladas com sucesso!${NC}"

echo -e "${YELLOW}Todas as dependências foram instaladas com sucesso!${NC}"
echo -e "${GREEN}Agora você pode iniciar o backend com: cd backend && npm run dev${NC}"
echo -e "${GREEN}E o frontend com: cd frontend && npm start${NC}"

exit 0