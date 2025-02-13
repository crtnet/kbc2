import { IntlConfig } from 'react-intl';

const messages = {
  'pt': {
    // Mensagens gerais
    'app.title': 'Kids Book Creator',
    'app.loading': 'Carregando...',
    'app.error': 'Ocorreu um erro',
    
    // Conversão de imagens
    'I86Kj3': 'Converter HEIC para JPG',
    'y+7ihJ': 'Qualidade da Imagem',
    'aZ1Q0A': 'Arraste e solte imagens ou clique para selecionar',
    'qZGdi+': 'Arquivos HEIC são permitidos',
    'W4cWeE': 'Número ilimitado de arquivos',
    'phdZCb': 'Suas fotos não são enviadas para nenhum servidor',
    
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
    
    // Validações
    'validation.required': 'Campo obrigatório',
    'validation.email': 'Email inválido',
    'validation.password': 'Senha deve ter no mínimo 6 caracteres'
  }
};

export const setupIntl = (locale: string = 'pt'): IntlConfig => {
  return {
    locale,
    messages: messages[locale] || messages['pt'],
    defaultLocale: 'pt',
    onError: (err) => {
      if (err.code === 'MISSING_TRANSLATION') {
        console.warn('Missing translation:', err.message);
        return;
      }
      console.error('Intl Error:', err);
    }
  };
};