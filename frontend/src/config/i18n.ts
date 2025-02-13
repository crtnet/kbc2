import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

const resources = {
  pt: {
    translation: {
      "I86Kj3": "HEIC para JPG",
      "y+7ihJ": "Qualidade",
      "aZ1Q0A": "Arraste e solte imagens ou clique aqui",
      "qZGdi+": "Arquivos HEIC são permitidos",
      "W4cWeE": "número ilimitado de arquivos",
      "phdZCb": "Suas fotos não são enviadas para nenhum servidor.",
      "login": {
        "title": "Login",
        "email": "E-mail",
        "password": "Senha",
        "submit": "Entrar",
        "register": "Criar conta",
        "forgotPassword": "Esqueceu a senha?"
      },
      "errors": {
        "invalidCredentials": "E-mail ou senha inválidos",
        "serverError": "Erro ao conectar com o servidor"
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: Localization.locale.split('-')[0],
    fallbackLng: 'pt',
    interpolation: {
      escapeValue: false
    },
    react: {
      useSuspense: false
    }
  });

export default i18n;