# Documentação da Seleção de Avatares

## Visão Geral

O sistema de seleção de avatares permite que os usuários escolham avatares pré-definidos ou criem avatares personalizados para os personagens de seus livros. O sistema é inspirado no criador de Mii do Nintendo Wii, permitindo a personalização de diferentes partes do avatar como rosto, olhos, boca, cabelo, etc.

## Estrutura do Sistema

### Componentes Principais

1. **AvatarSelector.tsx**: Modal principal que permite a seleção de avatares pré-definidos ou a criação de avatares personalizados.
2. **AvatarPreview.tsx**: Componente que renderiza a visualização do avatar personalizado.
3. **PartOptions.tsx**: Componente que exibe as opções disponíveis para cada parte do avatar.
4. **ColorSelector.tsx**: Componente que permite a seleção de cores para as partes do avatar.
5. **CustomizationSliders.tsx**: Componente que permite ajustar tamanho, posição e outras propriedades das partes do avatar.

### Fluxo de Dados

1. O usuário abre o modal de seleção de avatar a partir da tela de criação de livro.
2. O usuário pode escolher um avatar pré-definido ou criar um avatar personalizado.
3. Se o usuário escolher criar um avatar personalizado, ele pode selecionar diferentes partes, cores e ajustes.
4. Ao confirmar a seleção, o avatar é salvo no estado do componente pai (CreateBookScreen).
5. O avatar é exibido como miniatura na tela de criação de livro.

## Formato de Dados do Avatar Personalizado

Os avatares personalizados são armazenados em um formato especial que inclui:

1. **URL da face**: URL da imagem da face do avatar, usada como miniatura.
2. **Dados do avatar**: Objeto JSON serializado contendo todas as partes do avatar, suas cores, tamanhos e posições.

O formato completo é:
```
CUSTOM||[URL_da_face]||CUSTOM_AVATAR_DATA||[JSON_serializado]
```

Exemplo:
```
CUSTOM||https://cdn-icons-png.flaticon.com/512/3665/3665909.png||CUSTOM_AVATAR_DATA||{"type":"custom_avatar","parts":[{"partId":"face","option":"https://cdn-icons-png.flaticon.com/512/3665/3665909.png","color":"#FFE0B2","size":1,"position":{"x":0,"y":0}},...]}
```

## Solução de Problemas Comuns

### Avatar não aparece corretamente na miniatura

Se o avatar personalizado não aparecer corretamente na miniatura da tela de criação de livro:

1. Verifique se o formato do avatar está correto (deve começar com `CUSTOM||`).
2. Verifique se a URL da face é válida e acessível.
3. Verifique se os dados JSON do avatar estão completos e válidos.

### Avatar não mantém as customizações ao reabrir o seletor

Se o avatar não mantiver as customizações ao reabrir o seletor:

1. Verifique se o objeto `window.mainCharacterAvatarData` ou `window.secondaryCharacterAvatarData` está sendo corretamente definido antes de abrir o seletor.
2. Verifique se a função `restoreCustomAvatarFromIdentifier` está sendo chamada corretamente.
3. Verifique se o JSON serializado do avatar está completo e válido.

### Partes do avatar não aparecem no preview

Se algumas partes do avatar não aparecerem no preview:

1. Verifique se as URLs das imagens das partes são válidas e acessíveis.
2. Verifique se as propriedades de posição, tamanho e rotação estão dentro dos limites esperados.
3. Verifique se o zIndex das partes está configurado corretamente para garantir a ordem de renderização.

## Melhorias Implementadas

1. **Correção na persistência de dados**: Melhorado o sistema de armazenamento e recuperação dos dados do avatar personalizado.
2. **Melhor tratamento de erros**: Adicionado tratamento de erros mais robusto para lidar com URLs inválidas ou dados corrompidos.
3. **Logs de depuração**: Adicionados logs detalhados para facilitar a depuração de problemas.
4. **Validação de dados**: Implementada validação mais rigorosa dos dados do avatar para garantir que todas as partes obrigatórias estejam presentes.
5. **Melhor feedback visual**: Adicionados indicadores de carregamento e mensagens de erro mais claras.

## Recomendações para Desenvolvimento Futuro

1. **Armazenamento local**: Implementar armazenamento local dos avatares personalizados para evitar perda de dados.
2. **Biblioteca de avatares salvos**: Permitir que os usuários salvem e reutilizem avatares personalizados.
3. **Exportação/importação**: Adicionar funcionalidade para exportar e importar avatares personalizados.
4. **Melhorias de desempenho**: Otimizar o carregamento e renderização de avatares para melhorar o desempenho.
5. **Mais opções de personalização**: Adicionar mais opções de partes, cores e ajustes para os avatares.