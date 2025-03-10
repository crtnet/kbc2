// style.service.ts
export class StyleService {
    private styleGuide = {
      character: "menina de 8 anos, cabelos cacheados vermelhos, vestido amarelo",
      environment: "floresta mágica com cogumelos coloridos",
      artisticStyle: "ilustração cartoon, cores vibrantes"
    };
  
    getStyleGuide() {
      return this.styleGuide;
    }
  }