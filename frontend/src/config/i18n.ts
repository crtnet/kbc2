// frontend/src/config/i18n.ts
import { IntlProvider } from 'react-intl';

const messages = {
  'pt-BR': {
    // Mensagens gerais
    'app.title': 'Kids Book Creator',
    'app.loading': 'Carregando...',
    'app.error': 'Ocorreu um erro',

    // Login e Autenticação
    'login.title': 'Entrar',
    'login.email': 'Email',
    'login.password': 'Senha',
    'login.submit': 'Entrar',
    'login.error': 'Erro ao fazer login',
    'login.success': 'Login realizado com sucesso',

    // Registro
    'register.title': 'Criar Conta',
    'register.name': 'Nome',
    'register.email': 'Email',
    'register.password': 'Senha',
    'register.submit': 'Cadastrar',

    // Livros
    'books.title': 'Meus Livros',
    'books.create': 'Criar Novo Livro',
    'books.view': 'Visualizar Livro',
    'books.edit': 'Editar Livro',
    'books.delete': 'Excluir Livro',
    'books.empty': 'Nenhum livro encontrado',
    'books.loading': 'Carregando livros...',
    'books.error': 'Erro ao carregar livros',

    // Mensagens de erro
    'error.unauthorized': 'Sessão expirada. Por favor, faça login novamente.',
    'error.connection': 'Erro de conexão com o servidor',
    'error.unknown': 'Ocorreu um erro inesperado',

    // Mensagens específicas
    'I86Kj3': 'HEIC para JPG',
    'y+7ihJ': 'Qualidade',
    'aZ1Q0A': 'Arraste e solte imagens ou clique para selecionar',
    'qZGdi+': 'Arquivos HEIC são permitidos',
    'W4cWeE': 'número ilimitado de arquivos',
    'phdZCb': 'Suas fotos não são enviadas para nenhum servidor.',

    // Validações
    'validation.required': 'Campo obrigatório',
    'validation.email': 'Email inválido',
    'validation.password': 'Senha deve ter no mínimo 6 caracteres'
  }
};

/**
 * Retorna as mensagens para o locale desejado.
 * Se o locale começar com "pt" (ex.: "pt", "pt-PT"), retorna as mensagens de "pt-BR".
 */
export const getMessages = (locale: string): Record<string, string> => {
  if (locale.startsWith('pt')) {
    return messages['pt-BR'];
  }
  return messages[locale] || messages['pt-BR'];
};

/**
 * Configura a internacionalização garantindo que, se o locale for "pt"
 * (ou variante), as mensagens e o locale sejam normalizados para "pt-BR".
 */
export const setupIntl = (locale: string = 'pt-BR') => {
  const normalizedLocale = locale.startsWith('pt') ? 'pt-BR' : locale;
  return {
    locale: normalizedLocale,
    messages: getMessages(normalizedLocale)
  };
};

export default IntlProvider;
