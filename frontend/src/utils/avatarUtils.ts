/**
 * Utilitário para processar URLs de avatares antes de enviar ao backend
 */

/**
 * Normaliza uma URL de avatar para garantir que ela seja válida e compatível com o backend
 * 
 * @param avatarUrl URL do avatar a ser normalizada
 * @returns URL normalizada
 */
export const normalizeAvatarUrl = (avatarUrl: string): string => {
  if (!avatarUrl) return '';
  
  try {
    // Se a URL já está normalizada, retorná-la diretamente
    if (avatarUrl.startsWith('data:') || avatarUrl.startsWith('/uploads/')) {
      return avatarUrl;
    }
    
    // Verificar se a URL é de um CDN conhecido (flaticon, etc)
    if (avatarUrl.includes('cdn-icons-png.flaticon.com')) {
      // Para URLs do Flaticon, garantir que sejam HTTPS e não modificar mais nada
      // Manter a URL original do CDN, apenas garantindo HTTPS
      return avatarUrl.replace('http://', 'https://');
    }
    
    // Para outros CDNs conhecidos, também manter a URL original
    if (isValidCdnUrl(avatarUrl)) {
      // Garantir que a URL use HTTPS
      return avatarUrl.replace('http://', 'https://');
    }
    
    // Para URLs desconhecidas, usar um avatar padrão seguro
    // Em vez de tentar criar um caminho local que pode não existir no servidor
    return 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png';
  } catch (error) {
    console.error('Erro ao normalizar URL de avatar:', error);
    // Em caso de erro, usar um avatar padrão seguro
    return 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png';
  }
}

/**
 * Determina se uma URL é um avatar CDN válido
 * 
 * @param url URL a ser validada
 * @returns true se for uma URL de CDN válida
 */
export const isValidCdnUrl = (url: string): boolean => {
  if (!url) return false;
  
  // Lista de domínios de CDN confiáveis
  const trustedCdnDomains = [
    'cdn-icons-png.flaticon.com',
    'flaticon.com',
    'pngimg.com',
    'cloudflare.com',
    'githubusercontent.com',
    'iconfinder.com',
    'icons8.com',
    'pixabay.com',
    'unsplash.com',
    'pexels.com',
    'freepik.com',
    'shutterstock.com',
    'istockphoto.com',
    'adobe.com',
    'googleusercontent.com'
  ];
  
  return trustedCdnDomains.some(domain => url.includes(domain));
}