import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'es' | 'en' | 'pt';

interface Translations {
  [key: string]: {
    es: string;
    en: string;
    pt: string;
  };
}

const translations: Translations = {
  // App.tsx
  'app.starting': { es: 'Iniciando sistema...', en: 'Starting system...', pt: 'Iniciando sistema...' },
  'app.subtitle': { 
    es: 'La suite definitiva para vendedores de e-commerce. Optimiza SEO, imágenes y más con IA.',
    en: 'The ultimate suite for e-commerce sellers. Optimize SEO, images, and more with AI.',
    pt: 'A suíte definitiva para vendedores de e-commerce. Otimize SEO, imagens e muito mais com IA.'
  },
  'app.email_placeholder': { es: 'Correo electrónico', en: 'Email address', pt: 'Endereço de e-mail' },
  'app.password_placeholder': { es: 'Contraseña', en: 'Password', pt: 'Senha' },
  'app.login_btn': { es: 'Iniciar Sesión', en: 'Sign In', pt: 'Entrar' },
  'app.register_btn': { es: 'Registrarse', en: 'Sign Up', pt: 'Inscrever-se' },
  'app.no_account': { es: '¿No tienes cuenta? Regístrate', en: 'No account? Sign up', pt: 'Não tem conta? Registre-se' },
  'app.has_account': { es: '¿Ya tienes cuenta? Inicia sesión', en: 'Already have an account? Sign in', pt: 'Já tem conta? Entre' },
  'app.google_btn': { es: 'Continuar con Google', en: 'Continue with Google', pt: 'Continuar com o Google' },
  'app.auth_attention': { es: 'ATENCIÓN: Debes habilitar Email/Password y Google Sign-In en Firebase Console (Authentication > Sign-in method).', en: 'ATTENTION: You must enable Email/Password and Google Sign-In in Firebase Console.', pt: 'ATENÇÃO: Você deve ativar Email/Password e Google Sign-In no Firebase Console.' },
  'app.welcome_title': { es: '¡Bienvenido!', en: 'Welcome!', pt: 'Bem-vindo!' },
  'app.welcome_desc': { es: '¡Gracias por elegir PRODUCT PRO! Como regalo de bienvenida, hemos cargado', en: 'Thank you for choosing PRODUCT PRO! As a welcome gift, we have loaded', pt: 'Obrigado por escolher o PRODUCT PRO! Como presente de boas-vindas, carregamos' },
  'app.free_tokens': { es: '500 Tokens gratuitos', en: '500 Free Tokens', pt: '500 Tokens gratuitos' },
  'app.welcome_sub': { es: 'en tu cuenta.', en: 'into your account.', pt: 'na sua conta.' },
  'app.close_btn': { es: 'Comenzar a optimizar', en: 'Start optimizing', pt: 'Começar a otimizar' },
  
  // Sidebar
  'sidebar.tools': { es: 'Herramientas', en: 'Tools', pt: 'Ferramentas' },
  'sidebar.admin': { es: 'Administración', en: 'Administration', pt: 'Administração' },
  'sidebar.seo': { es: 'Optimizar SEO', en: 'Optimize SEO', pt: 'Otimizar SEO' },
  'sidebar.images': { es: 'Generar Imágenes', en: 'Generate Images', pt: 'Gerar Imagens' },
  'sidebar.dashboard': { es: 'Panel de Usuario', en: 'User Dashboard', pt: 'Painel de Usuário' },
  'sidebar.history': { es: 'Historial', en: 'History', pt: 'Histórico' },
  'sidebar.admin_panel': { es: 'Panel Admin', en: 'Admin Panel', pt: 'Painel Admin' },
  'sidebar.balance': { es: 'Saldo', en: 'Balance', pt: 'Saldo' },
  'sidebar.load_tokens': { es: 'Cargar Tokens', en: 'Load Tokens', pt: 'Carregar Tokens' },
  'sidebar.logout': { es: 'Cerrar Sesión', en: 'Logout', pt: 'Sair' },
  'sidebar.faq': { es: 'Preguntas Frecuentes', en: 'FAQ', pt: 'Perguntas Frequentes' },
  'sidebar.manual': { es: 'Descargar Manual', en: 'Download Manual', pt: 'Baixar Manual' },
  'sidebar.language': { es: 'Idioma', en: 'Language', pt: 'Idioma' },

  // UserDashboard
  'dashboard.title': { es: 'Panel de Usuario', en: 'User Dashboard', pt: 'Painel de Usuário' },
  'dashboard.subtitle': { es: 'Gestiona tu cuenta y consulta tu balance de tokens.', en: 'Manage your account and check your token balance.', pt: 'Gerencie sua conta e verifique seu saldo de tokens.' },
  'dashboard.current_balance': { es: 'Balance Actual', en: 'Current Balance', pt: 'Saldo Atual' },
  'dashboard.available_tokens': { es: 'Tokens Disponibles', en: 'Available Tokens', pt: 'Tokens Disponíveis' },
  'dashboard.buy_more': { es: 'Comprar Más Tokens', en: 'Buy More Tokens', pt: 'Comprar Mais Tokens' },
  'dashboard.account_info': { es: 'Información de la Cuenta', en: 'Account Information', pt: 'Informações da Conta' },
  'dashboard.account_desc': { es: 'Datos personales y preferencias del sistema.', en: 'Personal data and system preferences.', pt: 'Dados pessoais e preferências do sistema.' },
  'dashboard.username': { es: 'Nombre de usuario', en: 'Username', pt: 'Nome de usuário' },
  'dashboard.not_set': { es: 'No establecido', en: 'Not set', pt: 'Não definido' },
  'dashboard.email': { es: 'Correo electrónico', en: 'Email address', pt: 'Endereço de e-mail' },
  'dashboard.role': { es: 'Rol de usuario', en: 'User role', pt: 'Função do usuário' },
  'dashboard.admin': { es: 'Administrador', en: 'Administrator', pt: 'Administrador' },
  'dashboard.standard': { es: 'Usuario Estándar', en: 'Standard User', pt: 'Usuário Padrão' },
  'dashboard.history_title': { es: 'Historial de Transacciones', en: 'Transaction History', pt: 'Histórico de Transações' },
  'dashboard.history_desc': { es: 'Detalle de compras, regalos y consumo de tokens.', en: 'Details of purchases, gifts, and token usage.', pt: 'Detalhes de compras, presentes e uso de tokens.' },
  'dashboard.download_all': { es: 'Descargar Todo', en: 'Download All', pt: 'Baixar Tudo' },
  'dashboard.recent': { es: 'Reciente', en: 'Recent', pt: 'Recente' },
  'dashboard.tokens': { es: 'Tokens', en: 'Tokens', pt: 'Tokens' },
  'dashboard.no_tx': { es: 'No hay transacciones registradas aún.', en: 'No transactions recorded yet.', pt: 'Nenhuma transação registrada ainda.' },

  // Let's add fallbacks for any missing key by just returning the key itself if not found.
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>('es');

  const t = (key: string, fallback?: string) => {
    if (translations[key] && translations[key][language]) {
      return translations[key][language];
    }
    return fallback || key; // fallback or key
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
