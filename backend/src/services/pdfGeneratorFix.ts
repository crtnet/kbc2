// src/services/pdfGeneratorFix.ts
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { IBook } from '../models/Book';
import { logger } from '../utils/logger';
import { imageOptimizer } from './imageOptimizer';

/**
 * Versão corrigida do gerador de PDF com melhor tratamento de imagens
 * @param book Livro para gerar o PDF
 * @returns Caminho relativo do PDF gerado
 */
export async function generateBookPDFFixed(book: IBook): Promise<string> {
  // Pasta onde salvamos o PDF
  const pdfDir = path.join(__dirname, '../../public/pdfs');
  if (!fs.existsSync(pdfDir)) {
    fs.mkdirSync(pdfDir, { recursive: true });
  }

  // Nome do arquivo PDF
  const pdfFilename = `${book._id}.pdf`;
  // Caminho absoluto onde criaremos o PDF
  const absolutePdfPath = path.join(pdfDir, pdfFilename);
  // Caminho relativo que vamos guardar no banco
  const relativePdfPath = `/pdfs/${pdfFilename}`;
  
  // Diretório temporário para imagens processadas
  const tempDir = path.join(__dirname, '../../temp', book._id.toString());
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  // Verifica e prepara imagens antes de iniciar a geração do PDF
  const processedImages = await preProcessImages(book, tempDir);
  
  // Cria o documento PDF
  const doc = new PDFDocument({
    size: 'A4',
    margins: {
      top: 72,
      bottom: 72,
      left: 72,
      right: 72,
    },
    bufferPages: true,
    info: {
      Title: book.title,
      Author: book.authorName || 'Anônimo',
      Subject: `Livro infantil - ${book.genre} - ${book.theme}`,
      Keywords: `livro infantil, ${book.genre}, ${book.theme}, ${book.ageRange} anos`,
      Creator: 'Sistema de Geração de Histórias em Quadrinhos',
      Producer: 'PDFKit',
      CreationDate: new Date()
    }
  });
  
  // Cria o stream para o PDF
  const stream = fs.createWriteStream(absolutePdfPath);
  doc.pipe(stream);
  
  // Adiciona a capa
  addCoverPage(doc, book, processedImages);
  
  // Adiciona as páginas do livro
  for (const page of book.pages) {
    addContentPage(doc, book, page, processedImages);
  }
  
  // Adiciona página final com informações do livro
  addInfoPage(doc, book);
  
  // Finaliza o documento
  doc.end();
  
  // Retorna uma promessa que resolve quando o stream terminar
  return new Promise((resolve, reject) => {
    stream.on('finish', () => {
      // Verifica se o PDF foi gerado corretamente
      if (fs.existsSync(absolutePdfPath) && fs.statSync(absolutePdfPath).size > 0) {
        logger.info(`PDF gerado com sucesso: ${relativePdfPath}`, {
          bookId: book._id,
          fileSize: Math.round(fs.statSync(absolutePdfPath).size / 1024) + 'KB'
        });
        resolve(relativePdfPath);
      } else {
        reject(new Error('PDF gerado mas arquivo está vazio ou não existe'));
      }
    });
    
    stream.on('error', (err) => {
      logger.error('Erro no stream do PDF', { 
        error: err instanceof Error ? err.message : 'Erro desconhecido',
        bookId: book._id
      });
      reject(err);
    });
  });
}

/**
 * Pré-processa todas as imagens do livro para garantir que sejam válidas para o PDF
 */
async function preProcessImages(book: IBook, tempDir: string): Promise<Map<number, string>> {
  const imageMap = new Map<number, string>();
  const fallbackImagePath = path.join(__dirname, '../../public/assets/images/fallback-page.jpg');
  
  // Garante que temos uma imagem de fallback
  if (!fs.existsSync(path.dirname(fallbackImagePath))) {
    fs.mkdirSync(path.dirname(fallbackImagePath), { recursive: true });
  }
  
  if (!fs.existsSync(fallbackImagePath) || fs.statSync(fallbackImagePath).size === 0) {
    await imageOptimizer.createFallbackImage(fallbackImagePath);
  }
  
  logger.info(`Pré-processando ${book.pages.length} imagens para o livro "${book.title}"`, {
    bookId: book._id,
    totalPages: book.pages.length
  });
  
  // Processa cada página sequencialmente para evitar problemas de memória
  for (let i = 0; i < book.pages.length; i++) {
    const page = book.pages[i];
    const pageNumber = page.pageNumber;
    
    try {
      // Verifica se a página tem URL de imagem
      if (!page.imageUrl || page.imageUrl === '') {
        throw new Error(`Página ${pageNumber} não tem URL de imagem`);
      }
      
      // Caminho para a imagem processada
      const processedPath = path.join(tempDir, `page_${pageNumber}_processed.jpg`);
      
      // Processa a imagem com base no tipo de URL
      if (page.imageUrl.startsWith('http')) {
        // Imagem remota - baixa e processa
        try {
          const axios = require('axios');
          const response = await axios.get(page.imageUrl, { 
            responseType: 'arraybuffer',
            timeout: 10000 // 10 segundos
          });
          
          // Salva a imagem temporariamente
          const tempPath = path.join(tempDir, `page_${pageNumber}_temp.jpg`);
          fs.writeFileSync(tempPath, response.data);
          
          // Otimiza a imagem para o PDF - configurações mais conservadoras
          await imageOptimizer.optimizeImage(
            tempPath,
            processedPath,
            { 
              width: 400, 
              height: 400, 
              quality: 70,
              format: 'jpeg' // Força JPEG para todas as imagens
            }
          );
          
          // Verifica se a imagem processada é válida
          if (await imageOptimizer.isValidImage(processedPath)) {
            imageMap.set(pageNumber, processedPath);
            logger.info(`Imagem para página ${pageNumber} processada com sucesso`, {
              bookId: book._id,
              pageNumber
            });
          } else {
            throw new Error('Imagem processada inválida');
          }
        } catch (error) {
          throw new Error(`Erro ao processar imagem remota: ${error.message}`);
        }
      } else if (page.imageUrl.startsWith('/')) {
        // Imagem local - processa diretamente
        try {
          const localPath = path.join(__dirname, '../../public', page.imageUrl);
          
          if (!fs.existsSync(localPath) || fs.statSync(localPath).size === 0) {
            throw new Error('Arquivo local não encontrado ou vazio');
          }
          
          // Otimiza a imagem para o PDF
          await imageOptimizer.optimizeImage(
            localPath,
            processedPath,
            { 
              width: 400, 
              height: 400, 
              quality: 70,
              format: 'jpeg' // Força JPEG para todas as imagens
            }
          );
          
          // Verifica se a imagem processada é válida
          if (await imageOptimizer.isValidImage(processedPath)) {
            imageMap.set(pageNumber, processedPath);
            logger.info(`Imagem local para página ${pageNumber} processada com sucesso`, {
              bookId: book._id,
              pageNumber
            });
          } else {
            throw new Error('Imagem processada inválida');
          }
        } catch (error) {
          throw new Error(`Erro ao processar imagem local: ${error.message}`);
        }
      } else {
        throw new Error(`URL de imagem inválida: ${page.imageUrl}`);
      }
    } catch (error) {
      logger.error(`Erro ao processar imagem para página ${pageNumber}`, {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        bookId: book._id,
        pageNumber
      });
      
      // Usa imagem de fallback em caso de erro
      try {
        const fallbackPath = path.join(tempDir, `page_${pageNumber}_fallback.jpg`);
        await imageOptimizer.createFallbackImage(fallbackPath);
        imageMap.set(pageNumber, fallbackPath);
        
        logger.info(`Usando imagem de fallback para página ${pageNumber}`, {
          bookId: book._id,
          pageNumber
        });
      } catch (fallbackError) {
        // Se falhar ao criar fallback, usa o fallback global
        imageMap.set(pageNumber, fallbackImagePath);
        logger.warn(`Usando fallback global para página ${pageNumber}`, {
          bookId: book._id,
          pageNumber
        });
      }
    }
    
    // Libera memória após processar cada imagem
    global.gc && global.gc();
  }
  
  // Verifica se todas as páginas têm imagens
  for (let i = 1; i <= book.pages.length; i++) {
    if (!imageMap.has(i)) {
      // Usa fallback para páginas sem imagem
      const fallbackPath = path.join(tempDir, `page_${i}_fallback.jpg`);
      try {
        await imageOptimizer.createFallbackImage(fallbackPath);
        imageMap.set(i, fallbackPath);
      } catch (error) {
        imageMap.set(i, fallbackImagePath);
      }
      
      logger.warn(`Adicionando fallback para página ${i} (faltante)`, {
        bookId: book._id,
        pageNumber: i
      });
    }
  }
  
  logger.info(`Pré-processamento de imagens concluído para o livro "${book.title}"`, {
    bookId: book._id,
    totalPages: book.pages.length,
    processedImages: imageMap.size
  });
  
  return imageMap;
}

/**
 * Adiciona a capa do livro ao PDF
 */
function addCoverPage(doc: PDFKit.PDFDocument, book: IBook, imageMap: Map<number, string>) {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  
  // Adiciona uma nova página
  doc.addPage();
  
  // Cor de fundo
  doc.rect(0, 0, pageWidth, pageHeight).fill('#FFFFFF');
  
  // Borda decorativa
  doc.rect(20, 20, pageWidth - 40, pageHeight - 40)
    .lineWidth(3)
    .stroke('#DDDDDD');
  
  // Título do livro
  doc.fontSize(32)
    .font('Helvetica-Bold')
    .fillColor('#1A237E')
    .text(book.title, {
      align: 'center',
      y: 100
    });
  
  // Imagem de capa
  if (imageMap.has(1)) {
    try {
      const coverImagePath = imageMap.get(1);
      if (coverImagePath && fs.existsSync(coverImagePath) && fs.statSync(coverImagePath).size > 0) {
        const imageWidth = pageWidth * 0.7;
        const imageHeight = pageHeight * 0.5;
        
        doc.image(coverImagePath, {
          width: imageWidth,
          height: imageHeight,
          align: 'center',
          valign: 'center',
          x: (pageWidth - imageWidth) / 2,
          y: pageHeight * 0.25
        });
      }
    } catch (error) {
      logger.warn('Erro ao adicionar imagem de capa', { 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        bookId: book._id
      });
      
      // Adiciona um retângulo colorido como fallback visual
      const rectWidth = pageWidth * 0.7;
      const rectHeight = pageHeight * 0.4;
      doc.rect((pageWidth - rectWidth) / 2, pageHeight * 0.3, rectWidth, rectHeight)
        .fillAndStroke('#f0f0f0', '#cccccc');
      
      doc.fontSize(14)
        .fillColor('#666666')
        .text('Imagem não disponível', {
          width: rectWidth,
          align: 'center',
          y: pageHeight * 0.3 + rectHeight / 2 - 7
        });
    }
  }
  
  // Autor
  doc.fontSize(16)
    .font('Helvetica')
    .fillColor('#333333')
    .text(`por ${book.authorName || 'Anônimo'}`, {
      align: 'center',
      y: pageHeight - 120
    });
  
  // Informações adicionais
  doc.fontSize(10)
    .font('Helvetica')
    .fillColor('#333333')
    .text(`Gênero: ${book.genre} | Tema: ${book.theme} | Faixa etária: ${book.ageRange} anos`, {
      align: 'center',
      y: pageHeight - 80
    });
}

/**
 * Adiciona uma página de conteúdo ao PDF
 */
function addContentPage(doc: PDFKit.PDFDocument, book: IBook, page: any, imageMap: Map<number, string>) {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  
  // Adiciona uma nova página
  doc.addPage();
  
  // Cor de fundo
  doc.rect(0, 0, pageWidth, pageHeight).fill('#FFFFFF');
  
  // Borda decorativa
  doc.rect(30, 30, pageWidth - 60, pageHeight - 60)
    .lineWidth(1)
    .stroke('#DDDDDD');
  
  // Número da página
  doc.fontSize(10)
    .font('Helvetica')
    .fillColor('#333333')
    .text(`${page.pageNumber}`, {
      align: 'center',
      y: pageHeight - 40
    });
  
  // Layout de livro ilustrado: imagem no topo, texto abaixo
  // Adiciona a imagem
  if (imageMap.has(page.pageNumber)) {
    try {
      const imagePath = imageMap.get(page.pageNumber);
      if (imagePath && fs.existsSync(imagePath) && fs.statSync(imagePath).size > 0) {
        // Dimensões para a imagem
        const maxWidth = pageWidth - 100;
        const maxHeight = pageHeight * 0.5;
        
        // Centraliza a imagem horizontalmente
        const xPosition = (pageWidth - maxWidth) / 2;
        
        // Adiciona a imagem
        doc.image(imagePath, {
          width: maxWidth,
          height: maxHeight,
          x: xPosition,
          y: 50,
          fit: [maxWidth, maxHeight]
        });
      } else {
        throw new Error('Imagem inválida ou inexistente');
      }
    } catch (error) {
      logger.warn(`Erro ao adicionar imagem na página ${page.pageNumber}`, { 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        bookId: book._id,
        pageNumber: page.pageNumber
      });
      
      // Adiciona um retângulo colorido como fallback visual
      const rectWidth = pageWidth - 100;
      const rectHeight = pageHeight * 0.4;
      doc.rect(50, 50, rectWidth, rectHeight)
        .fillAndStroke('#f0f0f0', '#cccccc');
      
      doc.fontSize(14)
        .fillColor('#666666')
        .text('Imagem não disponível', {
          width: rectWidth,
          align: 'center',
          y: 50 + rectHeight / 2 - 7
        });
    }
  } else {
    // Adiciona um retângulo colorido como fallback visual
    const rectWidth = pageWidth - 100;
    const rectHeight = pageHeight * 0.4;
    doc.rect(50, 50, rectWidth, rectHeight)
      .fillAndStroke('#f0f0f0', '#cccccc');
    
    doc.fontSize(14)
      .fillColor('#666666')
      .text('Imagem não disponível', {
        width: rectWidth,
        align: 'center',
        y: 50 + rectHeight / 2 - 7
      });
  }
  
  // Texto abaixo da imagem
  doc.fontSize(12)
    .font('Helvetica')
    .fillColor('#333333')
    .text(page.text || '', {
      align: 'justify',
      width: pageWidth - 100,
      x: 50,
      y: pageHeight * 0.6,
      paragraphGap: 10,
      lineGap: 5
    });
}

/**
 * Adiciona a página de informações ao final do PDF
 */
function addInfoPage(doc: PDFKit.PDFDocument, book: IBook) {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  
  // Adiciona uma nova página
  doc.addPage();
  
  // Cor de fundo
  doc.rect(0, 0, pageWidth, pageHeight).fill('#FFFFFF');
  
  // Borda decorativa
  doc.rect(30, 30, pageWidth - 60, pageHeight - 60)
    .lineWidth(2)
    .stroke('#DDDDDD');
  
  // Título
  doc.fontSize(24)
    .font('Helvetica-Bold')
    .fillColor('#1A237E')
    .text('Sobre este livro', {
      align: 'center',
      y: 100
    });
  
  // Informações do livro
  doc.fontSize(12)
    .font('Helvetica')
    .fillColor('#333333')
    .moveDown(2)
    .text(`Título: ${book.title}`, {
      align: 'left',
      width: pageWidth - 100,
      x: 50
    })
    .moveDown()
    .text(`Autor: ${book.authorName || 'Anônimo'}`, {
      align: 'left',
      width: pageWidth - 100,
      x: 50
    })
    .moveDown()
    .text(`Gênero: ${book.genre}`, {
      align: 'left',
      width: pageWidth - 100,
      x: 50
    })
    .moveDown()
    .text(`Tema: ${book.theme}`, {
      align: 'left',
      width: pageWidth - 100,
      x: 50
    })
    .moveDown()
    .text(`Personagem principal: ${book.mainCharacter}`, {
      align: 'left',
      width: pageWidth - 100,
      x: 50
    });
  
  if (book.secondaryCharacter) {
    doc.moveDown()
      .text(`Personagem secundário: ${book.secondaryCharacter}`, {
        align: 'left',
        width: pageWidth - 100,
        x: 50
      });
  }
  
  doc.moveDown()
    .text(`Cenário: ${book.setting}`, {
      align: 'left',
      width: pageWidth - 100,
      x: 50
    })
    .moveDown()
    .text(`Faixa etária: ${book.ageRange} anos`, {
      align: 'left',
      width: pageWidth - 100,
      x: 50
    })
    .moveDown(2)
    .text(`Criado em: ${new Date(book.createdAt || Date.now()).toLocaleDateString('pt-BR')}`, {
      align: 'left',
      width: pageWidth - 100,
      x: 50
    });
  
  // Rodapé
  doc.fontSize(10)
    .font('Helvetica-Oblique')
    .fillColor('#333333')
    .text('Este livro foi gerado automaticamente com tecnologia de inteligência artificial.', {
      align: 'center',
      y: pageHeight - 100
    });
}