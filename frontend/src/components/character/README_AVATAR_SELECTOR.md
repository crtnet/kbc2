# Seletor de Avatares estilo Mii/Nintendo

Este componente implementa um seletor de avatares interativo inspirado no sistema de criação de Mii do Nintendo Wii, oferecendo uma experiência rica de personalização de personagens para os usuários.

## Funcionalidades

### Modo de Lista
- Exibe uma lista de avatares pré-definidos filtráveis por categoria, gênero e estilo visual
- Suporta pesquisa por texto
- Design responsivo que se adapta a diferentes tamanhos de tela

### Modo de Criação de Avatar (estilo Mii)
- Interface 3D interativa com rotação de avatar por gestos de arrastar
- Sistema completo de personalização por partes:
  - Rosto (forma e cor)
  - Olhos (estilo, cor e espaçamento)
  - Sobrancelhas (estilo e cor)
  - Nariz (tamanho e posição)
  - Boca (estilo e cor)
  - Cabelo (estilo, cor e volume)
  - Barba (estilo e cor)
  - Óculos e acessórios
  - Roupa (estilo e cor)
- Ajustes finos com sliders para cada característica:
  - Tamanho
  - Posição vertical
  - Espaçamento (para olhos)
- Paleta de cores personalizáveis com possibilidade de salvar cores favoritas
- Botão de aleatorização para gerar avatares randomicamente

## Como usar

```tsx
import AvatarSelector from '../components/character/AvatarSelector';

// Em seu componente:
const [avatarSelectorVisible, setAvatarSelectorVisible] = useState(false);
const [selectedAvatar, setSelectedAvatar] = useState('');

// Função para selecionar um avatar
const handleSelectAvatar = (avatarUrl: string) => {
  setSelectedAvatar(avatarUrl);
};

// No JSX do seu componente:
<Button onPress={() => setAvatarSelectorVisible(true)}>
  Selecionar Avatar
</Button>

<AvatarSelector
  visible={avatarSelectorVisible}
  onDismiss={() => setAvatarSelectorVisible(false)}
  onSelectAvatar={handleSelectAvatar}
  title="Escolha um Avatar"
  characterType="child" // Opções: 'child', 'adult', 'animal', 'fantasy'
/>
```

## Requisitos

Este componente utiliza:
- React Native Paper para UI
- Animated API do React Native para animações
- PanResponder para gestos de rotação
- expo-linear-gradient para efeitos de fundo

## Adaptações Necessárias para Produção

Para um ambiente de produção, as seguintes adaptações serão necessárias:

1. **Servidor de Composição de Imagens**: Implementar um endpoint no backend para compor as diversas partes do avatar em uma imagem final

2. **Armazenamento Persistente**: Adicionar funcionalidade para salvar avatares personalizados no servidor

3. **Color Picker Real**: Substituir o menu de cores atual por um color picker completo

4. **Assets Reais**: Substituir as imagens de placeholder por assets reais para cada parte do avatar

5. **Renderização em Camadas**: Implementar um sistema de renderização em camadas para mostrar todas as partes do avatar simultaneamente no preview

## Exemplo de Fluxo Completo

1. Usuário abre o seletor de avatares
2. Escolhe entre usar um avatar pré-definido ou criar um personalizado
3. Se optar por criar, utiliza a interface estilo Mii para personalizar cada aspecto
4. Após confirmar, o frontend envia as seleções para o backend
5. O backend compõe a imagem final e retorna a URL
6. O avatar personalizado é então associado ao personagem do livro

## Inspiração

Este componente foi inspirado no sistema de criação de personagens Mii do Nintendo Wii, oferecendo uma experiência familiar e intuitiva para os usuários enquanto mantém a simplicidade necessária para uma aplicação mobile.