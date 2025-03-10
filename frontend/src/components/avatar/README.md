# Componente de Seleção e Personalização de Avatares

Este componente implementa um sistema de seleção e personalização de avatares inspirado no sistema de criação de Miis do Nintendo Wii.

## Instalação de Dependências

Para garantir o funcionamento correto do componente de avatar, instale as seguintes dependências:

```bash
npm install @react-native-community/slider expo-linear-gradient react-native-paper
# ou
yarn add @react-native-community/slider expo-linear-gradient react-native-paper
```

## Características

- Seleção de avatares pré-definidos por categoria, gênero e estilo
- Criação de avatares personalizados com múltiplas opções para cada parte do corpo
- Personalização de cores para diferentes partes do avatar
- Ajustes finos de tamanho, posição e outras propriedades
- Visualização 3D com rotação por gestos
- Função de aleatorização para criar avatares rapidamente
- Salvamento de avatares personalizados

## Componentes

- **AvatarSelector**: Componente principal que gerencia a seleção e personalização de avatares
- **AvatarPreview**: Renderiza a visualização 3D do avatar personalizado
- **ColorSelector**: Interface para seleção de cores
- **CustomizationSliders**: Controles deslizantes para ajustes finos
- **PartOptions**: Exibe as opções disponíveis para cada parte do avatar

## Uso

```tsx
import React, { useState } from 'react';
import { View, Button } from 'react-native';
import AvatarSelector from '../screens/AvatarSelector';

const MyComponent = () => {
  const [avatarSelectorVisible, setAvatarSelectorVisible] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState('');

  const handleSelectAvatar = (avatarUrl: string) => {
    setSelectedAvatar(avatarUrl);
    setAvatarSelectorVisible(false);
  };

  return (
    <View>
      <Button 
        title="Selecionar Avatar" 
        onPress={() => setAvatarSelectorVisible(true)} 
      />
      
      <AvatarSelector
        visible={avatarSelectorVisible}
        onDismiss={() => setAvatarSelectorVisible(false)}
        onSelectAvatar={handleSelectAvatar}
        title="Escolha seu Avatar"
        characterType="child" // Pode ser 'child', 'adult', 'animal' ou 'fantasy'
        enableCustomization={true} // Habilita a criação personalizada de avatar
      />
    </View>
  );
};

export default MyComponent;
```

## Personalização

O componente pode ser personalizado através das seguintes propriedades:

- **visible**: Controla a visibilidade do modal
- **onDismiss**: Função chamada quando o modal é fechado
- **onSelectAvatar**: Função chamada quando um avatar é selecionado
- **title**: Título exibido no modal
- **characterType**: Tipo de personagem ('child', 'adult', 'animal', 'fantasy')
- **enableCustomization**: Habilita a opção de personalização avançada (modo Mii)

## Estrutura de Dados

Os avatares personalizados são compostos por várias partes, cada uma com suas próprias propriedades:

```typescript
interface CustomAvatar {
  [partId: string]: {
    option: string; // URL da imagem da opção selecionada
    color?: string; // Cor aplicada à parte (se colorizeOptions for true)
    size?: number; // Escala geral da parte
    width?: number; // Escala horizontal
    height?: number; // Escala vertical
    spacing?: number; // Espaçamento (para olhos, sobrancelhas)
    rotation?: number; // Rotação em graus
    density?: number; // Densidade (para barba)
    position?: { x: number, y: number }; // Posição relativa
  };
}
```

## Integração com o Backend

O componente se integra com o backend através dos seguintes serviços:

- **avatarService.ts**: Gerencia a obtenção de avatares pré-definidos
- **avatarCustomizationService.ts**: Gerencia a criação, salvamento e edição de avatares personalizados

## Solução de Problemas

Se o controle deslizante não estiver funcionando corretamente, verifique se está usando a versão mais recente do `@react-native-community/slider` em vez do componente `Slider` do `react-native-paper`.

Para problemas com as opções de cor, certifique-se de que `Menu` e `Dialog` do `react-native-paper` estão configurados corretamente e que o posicionamento do menu funciona no seu ambiente.

## Inspiração

Este componente foi inspirado no sistema de criação de Miis do Nintendo Wii, que permite aos usuários criar avatares personalizados de forma intuitiva e divertida.