import { logger } from '../utils/logger';

class TranslationService {
  private genreTranslations: { [key: string]: string } = {
    'adventure': 'Aventura',
    'fantasy': 'Fantasia',
    'mystery': 'Mistério'
  };

  private themeTranslations: { [key: string]: string } = {
    'friendship': 'Amizade',
    'courage': 'Coragem',
    'kindness': 'Bondade'
  };

  private toneTranslations: { [key: string]: string } = {
    'fun': 'Divertido',
    'adventurous': 'Aventureiro',
    'calm': 'Calmo'
  };

  public translateGenre(genre: string): string {
    return this.genreTranslations[genre] || genre;
  }

  public translateTheme(theme: string): string {
    return this.themeTranslations[theme] || theme;
  }

  public translateTone(tone: string): string {
    return this.toneTranslations[tone] || tone;
  }

  public translateBookFields(book: any): any {
    try {
      return {
        ...book,
        genre: this.translateGenre(book.genre),
        theme: this.translateTheme(book.theme),
        tone: this.translateTone(book.tone)
      };
    } catch (error) {
      logger.error('Erro ao traduzir campos do livro', {
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      return book;
    }
  }
}

export const translationService = new TranslationService(); 