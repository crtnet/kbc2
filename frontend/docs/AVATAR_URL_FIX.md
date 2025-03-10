# Correção de Problemas com URLs de Avatares

## Problemas Identificados

Analisando os logs do backend e frontend, identificamos dois problemas principais:

1. **Erro de normalização de URLs no backend:**
   ```
   2025-03-09 11:53:52 error: Erro ao normalizar URL do avatar:
   2025-03-09 11:53:52 error: Erro ao normalizar URLs dos avatares:
   2025-03-09 11:53:52 error: Erro ao criar livro
   ```

2. **Erro 500 no frontend ao tentar criar um livro:**
   ```
   ERROR Erro ao criar livro: [AxiosError: Request failed with status code 500]
   ```

## Causa Raiz

O problema ocorre porque a função de normalização de URLs de avatares estava tentando criar caminhos locais (`/uploads/avatars/filename`) para URLs externas, mas esses caminhos não existem no servidor. Quando o backend tenta processar essas URLs, ocorre um erro.

## Soluções Implementadas

### 1. Melhoria na Normalização de URLs de Avatares

Modificamos a função `normalizeAvatarUrl` para:

- Manter as URLs de CDNs conhecidos (como Flaticon) intactas, apenas garantindo que usem HTTPS
- Usar avatares padrão seguros para URLs desconhecidas em vez de tentar criar caminhos locais
- Tratar erros de normalização de forma mais robusta

```typescript
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
      return avatarUrl.replace('http://', 'https://');
    }
    
    // Para outros CDNs conhecidos, também manter a URL original
    if (isValidCdnUrl(avatarUrl)) {
      // Garantir que a URL use HTTPS
      return avatarUrl.replace('http://', 'https://');
    }
    
    // Para URLs desconhecidas, usar um avatar padrão seguro
    return 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png';
  } catch (error) {
    console.error('Erro ao normalizar URL de avatar:', error);
    // Em caso de erro, usar um avatar padrão seguro
    return 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png';
  }
}
```

### 2. Ampliação da Lista de CDNs Confiáveis

Expandimos a lista de domínios de CDNs confiáveis para incluir mais fontes comuns de imagens:

```typescript
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
```

### 3. Tratamento de Erros Robusto no Serviço de Livros

Melhoramos o tratamento de erros na função `createBook` para:

- Capturar erros específicos de normalização de URLs
- Fornecer avatares padrão seguros em caso de erro
- Verificar a validade das URLs antes de enviar ao backend
- Garantir que apenas URLs de CDNs confiáveis sejam usadas

### 4. Garantia de URLs HTTPS no Seletor de Avatares

Modificamos o componente `AvatarSelector` para garantir que todas as URLs selecionadas usem HTTPS:

```typescript
const handleSelectAvatar = (avatarUrl: string) => {
  console.log('Avatar selecionado:', avatarUrl);
  
  // Garantir que a URL seja HTTPS
  let secureUrl = avatarUrl;
  if (secureUrl.startsWith('http:')) {
    secureUrl = secureUrl.replace('http:', 'https:');
    console.log('URL convertida para HTTPS:', secureUrl);
  }
  
  // Notificar o componente pai
  onSelectAvatar(secureUrl);
  onDismiss();
};
```

## Como Testar as Correções

1. Abra o aplicativo e navegue até a criação de um novo livro
2. Preencha os campos do formulário e selecione avatares para os personagens
3. Verifique se o formulário mantém os dados após a seleção de avatares
4. Complete o formulário e tente criar o livro
5. O livro deve ser criado com sucesso, sem erros 500

## Observações Técnicas

1. **Segurança:**
   - Apenas URLs de CDNs confiáveis são aceitas diretamente
   - URLs HTTP são automaticamente convertidas para HTTPS
   - URLs desconhecidas são substituídas por avatares padrão seguros

2. **Robustez:**
   - Tratamento de erros em múltiplas camadas
   - Fallbacks para casos de falha
   - Logs detalhados para facilitar depuração

## Melhorias Futuras

1. **Sistema de Upload de Avatares:**
   - Implementar um sistema para fazer upload de avatares para o servidor
   - Armazenar avatares localmente em vez de depender de CDNs externos

2. **Cache de Avatares:**
   - Implementar um sistema de cache para avatares frequentemente usados
   - Reduzir dependência de serviços externos

3. **Validação de Imagens:**
   - Verificar se as URLs realmente apontam para imagens válidas
   - Validar dimensões e formatos de imagem