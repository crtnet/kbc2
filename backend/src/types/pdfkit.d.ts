import { PDFDocument } from 'pdfkit';

declare module 'pdfkit' {
  interface PDFDocument {
    openImage(imageBuffer: Buffer): any;
  }
} 