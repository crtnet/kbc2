import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { IBook } from '../models/Book';
import { logger } from '../utils/logger';
import axios from 'axios';

interface PDFOptions {
  format?: 'A3' | 'A4' | 'A5' | 'landscape';
  margins?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  fonts?: {
    regular: string;
    bold: string;
    italic: string;
  };
  layout?: 'standard' | 'picture-book' | 'comic';
  theme?: 'light' | 'dark' | 'colorful';
}

const defaultOptions: PDFOptions = {
  format: 'A4',
  margins: {
    top: 72,
    bottom: 72,
    left: 72,
    right: 72,
  },
  layout: 'picture-book',
  theme: 'light'
};

// Temas de cores para o PDF
const themes = {
  light: {
    background: '#FFFFFF',
    text: '#333333',
    title: '#1A237E',
    accent: '#3F51B5',
    border: '#DDDDDD'
  },
  dark: {
    background: '#263238',
    text: '#ECEFF1',
    title: '#82B1FF',
    accent: '#448AFF',
    border: '#455A64'
  },
  colorful: {
    background: '#FFFDE7',
    text: '#37474F',
    title: '#FF5722',
    accent: '#FFC107',
    border: '#FFCC80'
  }
};

async function downloadImage(url: string, localPath: string): Promise<string> {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  fs.writeFileSync(localPath, response.data);
  return localPath;
}

async function prepareImages(book: IBook): Promise<Map<number, string>> {
  const imageMap = new Map<number, string>();
  const tempDir = path.join(__dirname, '../../temp');
  
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  for (const page of book.pages) {
    if (page.imageUrl && page.imageUrl.startsWith('http')) {
      const localPath = path.join(tempDir, `${book._id}_page_${page.pageNumber}.jpg`);
      try {
        await downloadImage(page.imageUrl, localPath);
        imageMap.set(page.pageNumber, localPath);
      } catch (error: any) {
        logger.error(`Erro ao preparar imagem para página ${page.pageNumber}: ${error.message}`);
      }
    } else if (page.imageUrl) {
      // Se for um caminho local, usa diretamente
      imageMap.set(page.pageNumber, path.join(__dirname, '../../public', page.imageUrl));
    }
  }

  return imageMap;
}

/**
 * Determina a fonte apropriada com base na faixa etária
 */
function getFontForAgeRange(ageRange: string): { regular: string, bold: string, size: number } {
  // Fontes mais arredondadas e grandes para crianças menores
  if (ageRange === '1-2' || ageRange === '3-4') {
    return {
      regular: 'Helvetica',
      bold: 'Helvetica-Bold',
      size: 16
    };
  }
  // Fontes intermediárias para 5-8 anos
  else if (ageRange === '5-6' || ageRange === '7-8') {
    return {
      regular: 'Helvetica',
      bold: 'Helvetica-Bold',
      size: 14
    };
  }
  // Fontes menores para crianças mais velhas
  else {
    return {
      regular: 'Helvetica',
      bold: 'Helvetica-Bold',
      size: 12
    };
  }
}

/**
 * Adiciona elementos decorativos ao PDF com base no tema e gênero
 */
function addDecorativeElements(doc: PDFKit.PDFDocument, book: IBook, theme: any, pageWidth: number, pageHeight: number) {
  const { genre, ageRange } = book;
  
  // Adiciona elementos decorativos com base no gênero
  if (genre === 'fantasy') {
    // Elementos mágicos para fantasia
    doc.save()
      .translate(pageWidth - 100, 50)
      .scale(0.5)
      .path('M50,0 C60,10 70,0 80,10 C90,20 100,10 110,20 C120,30 130,20 140,30')
      .lineWidth(3)
      .stroke(theme.accent)
      .restore();
      
    doc.save()
      .translate(50, pageHeight - 70)
      .scale(0.5)
      .path('M0,50 C10,40 20,50 30,40 C40,30 50,40 60,30 C70,20 80,30 90,20')
      .lineWidth(3)
      .stroke(theme.accent)
      .restore();
  } 
  else if (genre === 'adventure') {
    // Elementos de aventura
    doc.save()
      .translate(pageWidth - 80, 40)
      .scale(0.4)
      .path('M0,0 L20,40 L40,0 L60,40 L80,0 L100,40')
      .lineWidth(3)
      .stroke(theme.accent)
      .restore();
      
    doc.save()
      .translate(40, pageHeight - 60)
      .scale(0.4)
      .path('M0,40 L20,0 L40,40 L60,0 L80,40 L100,0')
      .lineWidth(3)
      .stroke(theme.accent)
      .restore();
  }
  else if (genre === 'mystery') {
    // Elementos de mistério
    doc.save()
      .translate(pageWidth - 100, 50)
      .scale(0.5)
      .circle(50, 25, 20)
      .lineWidth(2)
      .stroke(theme.accent)
      .restore();
      
    doc.save()
      .translate(50, pageHeight - 70)
      .scale(0.5)
      .circle(50, 25, 20)
      .lineWidth(2)
      .stroke(theme.accent)
      .restore();
  }
  
  // Adiciona elementos com base na faixa etária
  if (ageRange === '1-2' || ageRange === '3-4') {
    // Elementos mais simples e grandes para crianças pequenas
    doc.save()
      .translate(pageWidth / 2 - 100, 30)
      .scale(0.6)
      .path('M0,0 C50,-20 100,20 150,0 C200,-20 250,20 300,0')
      .lineWidth(4)
      .stroke(theme.accent)
      .restore();
  }
}

export async function generateBookPDF(book: IBook, options: PDFOptions = defaultOptions): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const imageMap = await prepareImages(book);

      // Pasta onde realmente salvamos o PDF
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

      // Determina o tema de cores com base nas preferências ou usa o padrão
      const themeKey = book.coverStyle?.theme || options.theme || 'light';
      const theme = themes[themeKey as keyof typeof themes];
      
      // Determina a fonte com base na faixa etária
      const fontSettings = getFontForAgeRange(book.ageRange);

      const stream = fs.createWriteStream(absolutePdfPath);
      const doc = new PDFDocument({
        size: options.format,
        margins: options.margins,
        autoFirstPage: false,
        bufferPages: true // Permite modificar páginas após criação
      });
      doc.pipe(stream);

      // Configura dimensões da página
      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;

      // ===== CAPA DO LIVRO =====
      doc.addPage();
      
      // Estilos de capa
      const coverStyle = book.coverStyle || {};
      const backgroundColor = coverStyle.backgroundColor || theme.background;
      const titleColor = coverStyle.titleColor || theme.title;
      const authorColor = coverStyle.authorColor || theme.text;
      const titleFontSize = coverStyle.titleFontSize || 32;
      const authorFontSize = coverStyle.authorFontSize || 16;
      const coverImageStyle = coverStyle.coverImageStyle || {};

      // Adiciona cor de fundo
      doc
        .rect(0, 0, pageWidth, pageHeight)
        .fill(backgroundColor);

      // Adiciona borda decorativa
      doc
        .rect(20, 20, pageWidth - 40, pageHeight - 40)
        .lineWidth(3)
        .stroke(theme.border);

      // Adiciona elementos decorativos com base no tema e gênero
      addDecorativeElements(doc, book, theme, pageWidth, pageHeight);

      // Adiciona imagem de capa
      if (book.pages[0]?.imageUrl) {
        try {
          const coverImagePath = imageMap.get(1);
          if (coverImagePath) {
            const imageWidth = pageWidth * (coverImageStyle.width || 0.7);
            const imageHeight = pageHeight * (coverImageStyle.height || 0.5);
            const opacity = coverImageStyle.opacity || 1;

            doc.opacity(opacity);
            doc.image(coverImagePath, {
              width: imageWidth,
              height: imageHeight,
              align: 'center',
              valign: 'center',
              x: (pageWidth - imageWidth) / 2,
              y: pageHeight * 0.25
            });
            doc.opacity(1); // Restaura opacidade
          }
        } catch (imgErr) {
          logger.warn('Erro ao adicionar imagem de capa', { error: imgErr });
        }
      }

      // Título do livro
      doc
        .fontSize(titleFontSize)
        .font('Helvetica-Bold')
        .fillColor(titleColor)
        .text(book.title, {
          align: 'center',
          y: 100
        });

      // Autor
      doc
        .fontSize(authorFontSize)
        .font('Helvetica')
        .fillColor(authorColor)
        .text(`por ${book.authorName || 'Anônimo'}`, {
          align: 'center',
          y: pageHeight - 120
        });

      // Adiciona informações adicionais
      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor(authorColor)
        .text(`Gênero: ${book.genre} | Tema: ${book.theme} | Faixa etária: ${book.ageRange} anos`, {
          align: 'center',
          y: pageHeight - 80
        });

      // ===== PÁGINAS DO LIVRO =====
      const layout = options.layout || 'picture-book';
      
      for (const page of book.pages) {
        doc.addPage();
        
        // Adiciona cor de fundo
        doc
          .rect(0, 0, pageWidth, pageHeight)
          .fill(backgroundColor);
          
        // Adiciona número da página
        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor(theme.text)
          .text(`${page.pageNumber}`, {
            align: 'center',
            y: pageHeight - 40
          });
          
        // Adiciona elementos decorativos sutis
        doc
          .rect(30, 30, pageWidth - 60, pageHeight - 60)
          .lineWidth(1)
          .stroke(theme.border);
          
        // Adiciona conteúdo com base no layout escolhido
        if (layout === 'picture-book') {
          // Layout de livro ilustrado: imagem grande no topo, texto abaixo
          if (imageMap.has(page.pageNumber)) {
            const imagePath = imageMap.get(page.pageNumber)!;
            try {
              doc.image(imagePath, {
                fit: [pageWidth - 100, pageHeight * 0.5],
                align: 'center',
                y: 50
              });
            } catch (imgErr: any) {
              logger.error(`Erro ao adicionar imagem na página ${page.pageNumber}: ${imgErr.message}`);
            }
          }
          
          // Texto abaixo da imagem
          doc
            .fontSize(fontSettings.size)
            .font(fontSettings.regular)
            .fillColor(theme.text)
            .text(page.text || '', {
              align: 'justify',
              width: pageWidth - 100,
              x: 50,
              y: pageHeight * 0.6,
              paragraphGap: 10,
              lineGap: 5
            });
        } 
        else if (layout === 'comic') {
          // Layout de quadrinhos: imagem e texto intercalados
          const paragraphs = (page.text || '').split('\n\n');
          let yPosition = 50;
          
          if (paragraphs.length > 0 && imageMap.has(page.pageNumber)) {
            // Divide o texto e a imagem
            const firstPart = paragraphs.slice(0, Math.ceil(paragraphs.length / 2)).join('\n\n');
            const secondPart = paragraphs.slice(Math.ceil(paragraphs.length / 2)).join('\n\n');
            
            // Primeira parte do texto
            doc
              .fontSize(fontSettings.size)
              .font(fontSettings.regular)
              .fillColor(theme.text)
              .text(firstPart, {
                align: 'justify',
                width: pageWidth - 100,
                x: 50,
                y: yPosition,
                paragraphGap: 10,
                lineGap: 5
              });
              
            yPosition += doc.heightOfString(firstPart, {
              width: pageWidth - 100,
              paragraphGap: 10,
              lineGap: 5
            }) + 20;
            
            // Imagem no meio
            const imagePath = imageMap.get(page.pageNumber)!;
            try {
              doc.image(imagePath, {
                fit: [pageWidth - 100, pageHeight * 0.3],
                align: 'center',
                y: yPosition
              });
              
              yPosition += pageHeight * 0.3 + 20;
            } catch (imgErr: any) {
              logger.error(`Erro ao adicionar imagem na página ${page.pageNumber}: ${imgErr.message}`);
            }
            
            // Segunda parte do texto
            doc
              .fontSize(fontSettings.size)
              .font(fontSettings.regular)
              .fillColor(theme.text)
              .text(secondPart, {
                align: 'justify',
                width: pageWidth - 100,
                x: 50,
                y: yPosition,
                paragraphGap: 10,
                lineGap: 5
              });
          } else {
            // Fallback para layout padrão se não houver parágrafos suficientes
            if (imageMap.has(page.pageNumber)) {
              const imagePath = imageMap.get(page.pageNumber)!;
              try {
                doc.image(imagePath, {
                  fit: [pageWidth - 100, pageHeight * 0.4],
                  align: 'center',
                  y: 50
                });
                yPosition = pageHeight * 0.4 + 70;
              } catch (imgErr: any) {
                logger.error(`Erro ao adicionar imagem na página ${page.pageNumber}: ${imgErr.message}`);
              }
            }
            
            doc
              .fontSize(fontSettings.size)
              .font(fontSettings.regular)
              .fillColor(theme.text)
              .text(page.text || '', {
                align: 'justify',
                width: pageWidth - 100,
                x: 50,
                y: yPosition,
                paragraphGap: 10,
                lineGap: 5
              });
          }
        }
        else {
          // Layout padrão: texto no topo, imagem abaixo
          doc
            .fontSize(fontSettings.size)
            .font(fontSettings.regular)
            .fillColor(theme.text)
            .text(page.text || '', {
              align: 'justify',
              width: pageWidth - 100,
              x: 50,
              y: 50,
              paragraphGap: 10,
              lineGap: 5
            });
            
          if (imageMap.has(page.pageNumber)) {
            const textHeight = doc.y - 50;
            const imagePath = imageMap.get(page.pageNumber)!;
            try {
              doc.image(imagePath, {
                fit: [pageWidth - 100, pageHeight - textHeight - 100],
                align: 'center',
                y: textHeight + 70
              });
            } catch (imgErr: any) {
              logger.error(`Erro ao adicionar imagem na página ${page.pageNumber}: ${imgErr.message}`);
            }
          }
        }
      }
      
      // Adiciona página final com informações do livro
      doc.addPage();
      
      // Adiciona cor de fundo
      doc
        .rect(0, 0, pageWidth, pageHeight)
        .fill(backgroundColor);
        
      // Adiciona borda decorativa
      doc
        .rect(30, 30, pageWidth - 60, pageHeight - 60)
        .lineWidth(2)
        .stroke(theme.border);
        
      // Título
      doc
        .fontSize(24)
        .font('Helvetica-Bold')
        .fillColor(theme.title)
        .text('Sobre este livro', {
          align: 'center',
          y: 100
        });
        
      // Informações do livro
      doc
        .fontSize(12)
        .font('Helvetica')
        .fillColor(theme.text)
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
        doc
          .moveDown()
          .text(`Personagem secundário: ${book.secondaryCharacter}`, {
            align: 'left',
            width: pageWidth - 100,
            x: 50
          });
      }
      
      doc
        .moveDown()
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
      doc
        .fontSize(10)
        .font('Helvetica-Oblique')
        .fillColor(theme.text)
        .text('Este livro foi gerado automaticamente com tecnologia de inteligência artificial.', {
          align: 'center',
          y: pageHeight - 100
        });

      doc.end();

      stream.on('finish', () => {
        // Limpa as imagens temporárias
        imageMap.forEach((imgPath) => {
          if (imgPath.includes('temp') && fs.existsSync(imgPath)) {
            fs.unlinkSync(imgPath);
          }
        });

        logger.info('PDF gerado com sucesso', { 
          bookId: book._id, 
          pdfPath: relativePdfPath,
          absolutePdfPath
        });
        // Retorna apenas o caminho relativo
        resolve(relativePdfPath);
      });

      stream.on('error', (err) => {
        logger.error('Erro ao gerar stream do PDF', { error: err.message });
        reject(err);
      });
    } catch (error: any) {
      logger.error('Erro completo ao gerar PDF', { 
        bookId: book._id, 
        error: error.message,
        stack: error.stack 
      });
      reject(error);
    }
  });
}