#!/bin/bash

# Navega para o diretório backend
cd backend

# Instala o multer e seus tipos
npm install multer
npm install @types/multer --save-dev

# Volta para o diretório raiz
cd ..

echo "Dependências instaladas com sucesso!"