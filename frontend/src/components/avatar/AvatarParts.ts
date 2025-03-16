// src/components/avatar/AvatarParts.ts
// Definições e tipos para as partes do avatar personalizável

// Tipos básicos
export interface AvatarColor {
  id: string;
  name: string;
  value: string;
}

export interface AvatarPartOption {
  id: string;
  name: string;
  imageUrl: string;
  description?: string; // Descrição detalhada para uso no DALL-E
}

export interface AvatarPart {
  id: string;
  name: string;
  options: AvatarPartOption[];
  zIndex: number;
  colorizeOptions: boolean;
  defaultColor?: string;
}

export interface CustomizationSlider {
  id: string;
  name: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
}

// Tipos para o estado do avatar customizado
export interface CustomAvatarPart {
  option: string;
  color?: string;
  size?: number;
  position?: { x: number; y: number };
  spacing?: number;
  width?: number;
  height?: number;
  rotation?: number;
  density?: number;
}

export interface CustomAvatar {
  face: CustomAvatarPart;
  eyes: CustomAvatarPart;
  eyebrows: CustomAvatarPart;
  nose: CustomAvatarPart;
  mouth: CustomAvatarPart;
  hair: CustomAvatarPart;
  beard: CustomAvatarPart;
  glasses: CustomAvatarPart;
  accessories: CustomAvatarPart;
  outfit: CustomAvatarPart;
}

// Cores padrão disponíveis
export const DEFAULT_COLORS: AvatarColor[] = [
  { id: 'red', name: 'Vermelho', value: '#FF4D4D' },
  { id: 'green', name: 'Verde', value: '#4CAF50' },
  { id: 'blue', name: 'Azul', value: '#2196F3' },
  { id: 'yellow', name: 'Amarelo', value: '#FFC107' },
  { id: 'purple', name: 'Roxo', value: '#9C27B0' },
  { id: 'orange', name: 'Laranja', value: '#FF9800' },
  { id: 'brown', name: 'Marrom', value: '#795548' },
  { id: 'grey', name: 'Cinza', value: '#9E9E9E' },
  { id: 'black', name: 'Preto', value: '#000000' },
  { id: 'white', name: 'Branco', value: '#FFFFFF' },
  { id: 'skin1', name: 'Pele Clara', value: '#FFE0B2' },
  { id: 'skin2', name: 'Pele Média', value: '#FFCC80' },
  { id: 'skin3', name: 'Pele Morena', value: '#D2B48C' },
  { id: 'skin4', name: 'Pele Escura', value: '#A0522D' },
  { id: 'blonde', name: 'Loiro', value: '#FFF176' },
  { id: 'brown_hair', name: 'Castanho', value: '#8D6E63' },
  { id: 'red_hair', name: 'Ruivo', value: '#FF7043' },
  { id: 'black_hair', name: 'Preto', value: '#424242' },
  { id: 'grey_hair', name: 'Grisalho', value: '#B0BEC5' }
];

// Estado inicial para o avatar personalizado com base no tipo CustomAvatar
export const INITIAL_CUSTOM_AVATAR: CustomAvatar = {
  face: {
    option: '',
    color: '#FFE0B2',
    size: 1,
    position: { x: 0, y: 0 }
  },
  eyes: {
    option: '',
    color: '#2196F3',
    size: 1,
    spacing: 1,
    position: { x: 0, y: 0 }
  },
  eyebrows: {
    option: '',
    color: '#8D6E63',
    size: 1,
    spacing: 1,
    position: { x: 0, y: 0 }
  },
  nose: {
    option: '',
    size: 1,
    position: { x: 0, y: 0 }
  },
  mouth: {
    option: '',
    color: '#FF4D4D',
    size: 1,
    width: 1,
    height: 1,
    position: { x: 0, y: 0 }
  },
  hair: {
    option: '',
    color: '#8D6E63',
    size: 1,
    position: { x: 0, y: 0 }
  },
  beard: {
    option: '',
    color: '#8D6E63',
    size: 1,
    density: 1,
    position: { x: 0, y: 0 }
  },
  glasses: {
    option: '',
    color: '#424242',
    size: 1,
    position: { x: 0, y: 0 }
  },
  accessories: {
    option: '',
    color: '#FFC107',
    size: 1,
    position: { x: 0, y: 0 }
  },
  outfit: {
    option: '',
    color: '#2196F3',
    size: 1,
    position: { x: 0, y: 0 }
  }
};

// Definição das partes do avatar
export const AVATAR_PARTS: AvatarPart[] = [
  {
    id: 'face',
    name: 'Rosto',
    zIndex: 1,
    colorizeOptions: true,
    defaultColor: '#FFE0B2',
    options: [
      { 
        id: 'face_round', 
        name: 'Redondo', 
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/3665/3665909.png',
        description: 'Rosto redondo e cheio, com bochechas proeminentes e feições suaves. Formato circular com queixo arredondado.'
      },
      { 
        id: 'face_oval', 
        name: 'Oval', 
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/3665/3665931.png',
        description: 'Rosto oval e equilibrado, com maçãs do rosto suavemente definidas e queixo levemente afilado. Formato alongado e harmonioso.'
      },
      { 
        id: 'face_square', 
        name: 'Quadrado', 
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/3665/3665921.png',
        description: 'Rosto quadrado com mandíbula forte e angular. Testa larga e queixo definido, criando uma aparência determinada e confiante.'
      },
      { 
        id: 'face_heart', 
        name: 'Coração', 
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/3665/3665941.png',
        description: 'Rosto em formato de coração com testa larga que se afunila até um queixo pontudo. Maçãs do rosto altas e expressivas.'
      },
      { 
        id: 'face_triangle', 
        name: 'Triângulo', 
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/3665/3665951.png',
        description: 'Rosto triangular com queixo estreito e testa mais larga. Maçãs do rosto altas e estrutura facial angular.'
      }
    ]
  },
  {
    id: 'eyes',
    name: 'Olhos',
    zIndex: 5,
    colorizeOptions: true,
    defaultColor: '#2196F3',
    options: [
      { 
        id: 'eyes_round', 
        name: 'Redondos', 
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/3665/3665845.png',
        description: 'Olhos grandes e redondos, expressivos e brilhantes. Transmitem curiosidade e inocência, ideais para personagens infantis.'
      },
      { 
        id: 'eyes_almond', 
        name: 'Amendoados', 
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/3665/3665851.png',
        description: 'Olhos amendoados com cantos externos levemente elevados. Formato elegante e expressivo, transmitindo inteligência e perspicácia.'
      },
      { 
        id: 'eyes_wide', 
        name: 'Grandes', 
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/3665/3665847.png',
        description: 'Olhos muito grandes e abertos, ocupando boa parte do rosto. Transmitem surpresa, entusiasmo e energia, perfeitos para personagens animados.'
      },
      { 
        id: 'eyes_sleepy', 
        name: 'Sonolentos', 
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/3665/3665849.png',
        description: 'Olhos semicerrados com pálpebras caídas, transmitindo uma expressão sonolenta ou relaxada. Dão ao personagem um ar tranquilo ou pensativo.'
      },
      { 
        id: 'eyes_playful', 
        name: 'Brincalhões', 
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/3665/3665855.png',
        description: 'Olhos com formato divertido e expressivo, levemente inclinados para cima nos cantos. Transmitem alegria, travessura e um espírito brincalhão.'
      }
    ]
  },
  {
    id: 'eyebrows',
    name: 'Sobrancelhas',
    zIndex: 6,
    colorizeOptions: true,
    defaultColor: '#8D6E63',
    options: [
      { 
        id: 'eyebrows_straight', 
        name: 'Retas', 
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/3665/3665859.png',
        description: 'Sobrancelhas retas e horizontais, transmitindo uma expressão neutra ou séria. Dão ao personagem um ar calmo e equilibrado.'
      },
      { 
        id: 'eyebrows_arched', 
        name: 'Arqueadas', 
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/3665/3665862.png',
        description: 'Sobrancelhas arqueadas e expressivas, elevadas no meio. Transmitem surpresa, curiosidade ou questionamento.'
      },
      { 
        id: 'eyebrows_thick', 
        name: 'Grossas', 
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/3665/3665865.png',
        description: 'Sobrancelhas grossas e marcantes, dando ao personagem uma aparência forte e definida. Transmitem confiança e determinação.'
      },
      { 
        id: 'eyebrows_thin', 
        name: 'Finas', 
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/3665/3665867.png',
        description: 'Sobrancelhas finas e delicadas, criando uma expressão suave e refinada. Dão ao personagem um ar elegante ou sofisticado.'
      },
      { 
        id: 'eyebrows_angled', 
        name: 'Anguladas', 
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/3665/3665870.png',
        description: 'Sobrancelhas anguladas com inclinação para baixo no centro, criando uma expressão séria ou determinada. Transmitem foco e intensidade.'
      }
    ]
  },
  {
    id: 'nose',
    name: 'Nariz',
    zIndex: 4,
    colorizeOptions: true,
    defaultColor: '#FFE0B2',
    options: [
      { 
        id: 'nose_small', 
        name: 'Pequeno', 
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/3665/3665874.png',
        description: 'Nariz pequeno e delicado, quase botão, adequado para personagens infantis ou estilizados. Proporciona uma aparência fofa e amigável.'
      },
      { 
        id: 'nose_medium', 
        name: 'Médio', 
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/3665/3665877.png',
        description: 'Nariz de tamanho médio e proporção equilibrada. Formato natural que se harmoniza bem com diferentes tipos de rosto.'
      },
      { 
        id: 'nose_large', 
        name: 'Grande', 
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/3665/3665880.png',
        description: 'Nariz grande e proeminente, criando uma característica marcante. Pode dar ao personagem uma aparência distinta ou cômica.'
      },
      { 
        id: 'nose_pointed', 
        name: 'Pontudo', 
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/3665/3665882.png',
        description: 'Nariz afilado e pontudo, criando uma característica marcante. Pode transmitir curiosidade, perspicácia ou um ar travesso.'
      },
      { 
        id: 'nose_round', 
        name: 'Arredondado', 
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/3665/3665885.png',
        description: 'Nariz arredondado e suave, com ponta boleada. Transmite uma aparência amigável e acessível, ideal para personagens simpáticos.'
      }
    ]
  },
  {
    id: 'mouth',
    name: 'Boca',
    zIndex: 3,
    colorizeOptions: true,
    defaultColor: '#FF4D4D',
    options: [
      { 
        id: 'mouth_smile', 
        name: 'Sorriso', 
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/3665/3665889.png',
        description: 'Boca sorridente com cantos elevados, transmitindo alegria e simpatia. Sorriso amigável e acolhedor que ilumina o rosto.'
      },
      { 
        id: 'mouth_neutral', 
        name: 'Neutra', 
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/3665/3665891.png',
        description: 'Boca em linha reta, expressão neutra ou séria. Transmite calma, concentração ou uma atitude reservada.'
      },
      { 
        id: 'mouth_wide', 
        name: 'Larga', 
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/3665/3665893.png',
        description: 'Boca larga e expressiva, ocupando boa parte da largura do rosto. Transmite entusiasmo, extroversão ou uma personalidade comunicativa.'
      },
      { 
        id: 'mouth_small', 
        name: 'Pequena', 
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/3665/3665895.png',
        description: 'Boca pequena e delicada, criando uma expressão suave e gentil. Pode transmitir timidez, doçura ou refinamento.'
      },
      { 
        id: 'mouth_laugh', 
        name: 'Rindo', 
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/3665/3665898.png',
        description: 'Boca aberta em uma risada genuína, mostrando dentes. Transmite alegria contagiante, diversão e um espírito descontraído.'
      }
    ]
  },
  {
    id: 'hair',
    name: 'Cabelo',
    zIndex: 10,
    colorizeOptions: true,
    defaultColor: '#8D6E63',
    options: [
      { 
        id: 'hair_none', 
        name: 'Nenhum', 
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/8148/8148760.png',
        description: 'Sem cabelo, cabeça lisa ou careca. Pode transmitir maturidade, minimalismo ou um visual distinto e marcante.'
      },
      { 
        id: 'hair_short', 
        name: 'Curto', 
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/3244/3244365.png',
        description: 'Cabelo curto e bem aparado, com comprimento uniforme. Visual prático e arrumado que transmite organização e objetividade.'
      },
      { 
        id: 'hair_medium', 
        name: 'Médio', 
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/3244/3244351.png',
        description: 'Cabelo de comprimento médio, chegando até a altura do queixo. Estilo versátil que combina praticidade com um toque de suavidade.'
      },
      { 
        id: 'hair_long', 
        name: 'Longo', 
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/3244/3244347.png',
        description: 'Cabelo longo e escoado, passando dos ombros. Transmite uma aparência fluida e expressiva, com movimento natural.'
      },
      { 
        id: 'hair_curly', 
        name: 'Cacheado', 
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/3244/3244362.png',
        description: 'Cabelo cacheado com cachos definidos e volumosos. Transmite personalidade vibrante, naturalidade e expressividade.'
      },
      { 
        id: 'hair_spiky', 
        name: 'Espetado', 
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/3244/3244358.png',
        description: 'Cabelo curto com pontas arrepiadas e espetadas para cima. Transmite energia, atitude e um espírito rebelde ou descolado.'
      },
      { 
        id: 'hair_bald', 
        name: 'Careca', 
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/3244/3244331.png',
        description: 'Cabeça completamente sem cabelos, lisa e polida. Transmite uma aparência distinta, minimalista e confiante.'
      },
      { 
        id: 'hair_bob', 
        name: 'Chanel', 
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/3244/3244342.png',
        description: 'Corte chanel na altura do queixo, com pontas retas. Visual clássico e elegante que transmite organização e sofisticação.'
      },
      { 
        id: 'hair_bun', 
        name: 'Coque', 
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/3244/3244338.png',
        description: 'Cabelo preso em um coque no topo ou atrás da cabeça. Transmite praticidade, elegância e um ar organizado ou profissional.'
      },
      { 
        id: 'hair_ponytail', 
        name: 'Rabo de Cavalo', 
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/3244/3244345.png',
        description: 'Cabelo preso em um rabo de cavalo alto ou baixo. Visual dinâmico e prático que transmite energia e movimento.'
      }
    ]
  },
  {
    id: 'beard',
    name: 'Barba',
    zIndex: 2,
    colorizeOptions: true,
    defaultColor: '#8D6E63',
    options: [
      { 
        id: 'beard_none', 
        name: 'Nenhuma', 
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/8148/8148760.png',
        description: 'Sem barba, rosto liso e bem barbeado. Transmite juventude, limpeza ou um visual mais formal.'
      },
      { 
        id: 'beard_short', 
        name: 'Curta', 
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/1326/1326377.png',
        description: 'Barba curta e aparada, cobrindo o queixo e parte das bochechas. Transmite maturidade controlada e um visual cuidado.'
      },
      { 
        id: 'beard_medium', 
        name: 'Média', 
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/1326/1326405.png',
        description: 'Barba de comprimento médio, bem definida e volumosa. Transmite masculinidade, confiança e um estilo descontraído.'
      },
      { 
        id: 'beard_long', 
        name: 'Longa', 
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/1326/1326419.png',
        description: 'Barba longa e espessa, cobrindo boa parte do rosto e pescoço. Transmite sabedoria, experiência ou um espírito livre.'
      },
      { 
        id: 'beard_goatee', 
        name: 'Cavanhaque', 
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/1326/1326425.png',
        description: 'Barba estilo cavanhaque, concentrada no queixo e ao redor da boca. Transmite um visual distinto, intelectual ou artístico.'
      },
      { 
        id: 'beard_mustache', 
        name: 'Bigode', 
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/1326/1326187.png',
        description: 'Apenas bigode, sem barba no queixo ou bochechas. Transmite um visual clássico, elegante ou com personalidade marcante.'
      }
    ]
  },
  {
    id: 'glasses',
    name: 'Óculos',
    zIndex: 7,
    colorizeOptions: true,
    defaultColor: '#424242',
    options: [
      { 
        id: 'glasses_none', 
        name: 'Nenhum', 
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/8148/8148760.png',
        description: 'Sem óculos, olhos naturais sem acessórios. Visual limpo e desimpedido.'
      },
      { 
        id: 'glasses_round', 
        name: 'Redondos', 
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/6411/6411516.png',
        description: 'Óculos com armação redonda e lentes circulares. Transmitem um visual intelectual, criativo ou retrô.'
      },
      { 
        id: 'glasses_square', 
        name: 'Quadrados', 
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/6411/6411518.png',
        description: 'Óculos com armação quadrada e cantos definidos. Transmitem seriedade, profissionalismo e um visual estruturado.'
      },
      { 
        id: 'glasses_rimless', 
        name: 'Sem Aro', 
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/6411/6411520.png',
        description: 'Óculos sem armação visível, apenas com lentes e hastes. Transmitem elegância, minimalismo e sofisticação discreta.'
      },
      { 
        id: 'glasses_sunglasses', 
        name: 'De Sol', 
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/6411/6411522.png',
        description: 'Óculos escuros que cobrem os olhos. Transmitem um ar misterioso, descolado ou proteção contra o sol.'
      }
    ]
  },
  {
    id: 'accessories',
    name: 'Acessórios',
    zIndex: 11,
    colorizeOptions: true,
    defaultColor: '#FFC107',
    options: [
      { 
        id: 'accessories_none', 
        name: 'Nenhum', 
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/8148/8148760.png',
        description: 'Sem acessórios adicionais. Visual limpo e descomplicado.'
      },
      { 
        id: 'accessories_hat', 
        name: 'Chapéu', 
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/8148/8148728.png',
        description: 'Chapéu clássico com abas e copa. Transmite elegância, estilo vintage ou um visual sofisticado.'
      },
      { 
        id: 'accessories_cap', 
        name: 'Boné', 
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/8148/8148725.png',
        description: 'Boné esportivo com aba frontal. Transmite um visual casual, jovem e descontraído.'
      },
      { 
        id: 'accessories_beanie', 
        name: 'Gorro', 
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/8148/8148731.png',
        description: 'Gorro de malha que cobre a cabeça. Transmite um visual aconchegante, descolado ou preparado para o frio.'
      },
      { 
        id: 'accessories_headband', 
        name: 'Bandana', 
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/8148/8148734.png',
        description: 'Bandana ou faixa na cabeça. Transmite um visual esportivo, aventureiro ou com personalidade.'
      },
      { 
        id: 'accessories_earring', 
        name: 'Brinco', 
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/8148/8148740.png',
        description: 'Brincos nas orelhas. Transmitem um visual estilizado, expressivo ou com toque pessoal.'
      }
    ]
  },
  {
    id: 'outfit',
    name: 'Roupa',
    zIndex: 0,
    colorizeOptions: true,
    defaultColor: '#2196F3',
    options: [
      { 
        id: 'outfit_tshirt', 
        name: 'Camiseta', 
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/1867/1867700.png',
        description: 'Camiseta básica de manga curta. Transmite um visual casual, confortável e descontraído.'
      },
      { 
        id: 'outfit_shirt', 
        name: 'Camisa', 
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/1867/1867710.png',
        description: 'Camisa social ou casual com botões. Transmite um visual mais formal, organizado ou profissional.'
      },
      { 
        id: 'outfit_hoodie', 
        name: 'Moletom', 
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/1867/1867721.png',
        description: 'Moletom com capuz. Transmite um visual jovem, descontraído e confortável, ideal para clima frio.'
      },
      { 
        id: 'outfit_suit', 
        name: 'Terno', 
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/1867/1867731.png',
        description: 'Terno completo com paletó e gravata. Transmite elegância, formalidade e profissionalismo.'
      },
      { 
        id: 'outfit_dress', 
        name: 'Vestido', 
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/1867/1867742.png',
        description: 'Vestido elegante. Transmite feminilidade, elegância e um visual mais elaborado.'
      },
      { 
        id: 'outfit_uniform', 
        name: 'Uniforme', 
        imageUrl: 'https://cdn-icons-png.flaticon.com/512/1867/1867752.png',
        description: 'Uniforme ou roupa de trabalho. Transmite profissionalismo, função específica ou pertencimento a um grupo.'
      }
    ]
  }
];

// Definição de sliders de customização para cada parte
export const AVATAR_SLIDERS: { [key: string]: CustomizationSlider[] } = {
  face: [
    { id: 'size', name: 'Tamanho', min: 0.8, max: 1.2, step: 0.01, defaultValue: 1 },
    { id: 'width', name: 'Largura', min: 0.8, max: 1.2, step: 0.01, defaultValue: 1 },
    { id: 'height', name: 'Altura', min: 0.8, max: 1.2, step: 0.01, defaultValue: 1 }
  ],
  eyes: [
    { id: 'size', name: 'Tamanho', min: 0.8, max: 1.5, step: 0.01, defaultValue: 1 },
    { id: 'spacing', name: 'Espaçamento', min: 0.5, max: 1.5, step: 0.01, defaultValue: 1 },
    { id: 'position_y', name: 'Posição Vertical', min: -20, max: 20, step: 1, defaultValue: 0 }
  ],
  eyebrows: [
    { id: 'size', name: 'Tamanho', min: 0.8, max: 1.5, step: 0.01, defaultValue: 1 },
    { id: 'spacing', name: 'Espaçamento', min: 0.5, max: 1.5, step: 0.01, defaultValue: 1 },
    { id: 'position_y', name: 'Posição Vertical', min: -20, max: 20, step: 1, defaultValue: 0 }
  ],
  nose: [
    { id: 'size', name: 'Tamanho', min: 0.8, max: 1.5, step: 0.01, defaultValue: 1 },
    { id: 'position_y', name: 'Posição Vertical', min: -20, max: 20, step: 1, defaultValue: 0 },
    { id: 'position_x', name: 'Posição Horizontal', min: -10, max: 10, step: 1, defaultValue: 0 }
  ],
  mouth: [
    { id: 'size', name: 'Tamanho', min: 0.8, max: 1.5, step: 0.01, defaultValue: 1 },
    { id: 'width', name: 'Largura', min: 0.8, max: 1.5, step: 0.01, defaultValue: 1 },
    { id: 'position_y', name: 'Posição Vertical', min: -20, max: 20, step: 1, defaultValue: 0 }
  ],
  hair: [
    { id: 'size', name: 'Tamanho', min: 0.8, max: 1.5, step: 0.01, defaultValue: 1 },
    { id: 'position_y', name: 'Posição Vertical', min: -30, max: 10, step: 1, defaultValue: 0 }
  ],
  beard: [
    { id: 'size', name: 'Tamanho', min: 0.8, max: 1.5, step: 0.01, defaultValue: 1 },
    { id: 'density', name: 'Densidade', min: 0.7, max: 1.3, step: 0.01, defaultValue: 1 },
    { id: 'position_y', name: 'Posição Vertical', min: -15, max: 15, step: 1, defaultValue: 0 }
  ],
  glasses: [
    { id: 'size', name: 'Tamanho', min: 0.8, max: 1.5, step: 0.01, defaultValue: 1 },
    { id: 'position_y', name: 'Posição Vertical', min: -15, max: 15, step: 1, defaultValue: 0 }
  ],
  accessories: [
    { id: 'size', name: 'Tamanho', min: 0.8, max: 1.5, step: 0.01, defaultValue: 1 },
    { id: 'position_y', name: 'Posição Vertical', min: -30, max: 10, step: 1, defaultValue: 0 },
    { id: 'rotation', name: 'Rotação', min: -30, max: 30, step: 1, defaultValue: 0 }
  ],
  outfit: [
    { id: 'size', name: 'Tamanho', min: 0.8, max: 1.5, step: 0.01, defaultValue: 1 }
  ]
};