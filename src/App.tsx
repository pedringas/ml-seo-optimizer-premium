import * as React from 'react';
import { Toaster } from 'sonner';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';

import { auth, db, loginWithGoogle, loginWithEmail, registerWithEmailAndProfile, logout } from './lib/firebase';
import { Sidebar } from './components/layout/Sidebar';
import SeoOptimizer from './components/tools/SeoOptimizer';
import ImageGenerator from './components/tools/ImageGenerator';
import HistoryTool from './components/tools/HistoryTool';
import { UserDashboard } from './components/layout/UserDashboard';
import { AdminPanel } from './components/layout/AdminPanel';
import LandingPage from './components/LandingPage';

import {
  Coins,
  Check,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';

import { HistoryItem } from './types';
import { TOKEN_PACKAGES } from './constants';

import { useLanguage } from './lib/i18n';

type AppView = 'landing' | 'app';

export default function App() {
  const { t } = useLanguage();
  const [user, setUser] = React.useState<FirebaseUser | null>(null);
  const [userData, setUserData] = React.useState<{ tokenBalance: number } | null>(null);
  const [activeTool, setActiveTool] = React.useState('seo');
  const [isAuthReady, setIsAuthReady] = React.useState(false);
  const [currentView, setCurrentView] = React.useState<AppView>('landing');

  // Modal States
  const [showPayModal, setShowPayModal] = React.useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = React.useState(false);
  const [showAuthModal, setShowAuthModal] = React.useState(false);
  const [selectedPackage, setSelectedPackage] = React.useState<{ amount: number, price: number } | null>(null);

  // Called by tools when a guest tries to perform an action
  const requireAuth = () => {
    if (!user) {
      setShowAuthModal(true);
      return false;
    }
    return true;
  };

  const isAdmin = user?.email === 'pconti10@gmail.com';

  // Auth & Token Sync
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setIsAuthReady(true);

      if (firebaseUser) {
        // Logged-in users go straight to the app
        setCurrentView('app');
        const userRef = doc(db, 'users', firebaseUser.uid);
        const unsubDoc = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserData(docSnap.data() as any);
          } else {
            setDoc(userRef, {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              firstName: regFirstName || firebaseUser.displayName?.split(' ')[0] || '',
              lastName: regLastName || firebaseUser.displayName?.split(' ').slice(1).join(' ') || '',
              phone: regPhone || '',
              photoURL: firebaseUser.photoURL,
              tokenBalance: 30,
              isAdmin: firebaseUser.email === 'pconti10@gmail.com',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
            setShowAuthModal(false);
            setShowWelcomeModal(true);
          }
        });
        return () => unsubDoc();
      } else {
        setUserData(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // History State
  const [history, setHistory] = React.useState<HistoryItem[]>([]);

  React.useEffect(() => {
    const savedHistory = localStorage.getItem('ml_seo_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Error loading history", e);
      }
    }
  }, []);

  const saveToHistory = (item: HistoryItem) => {
    let currentHistory = [item, ...history];
    let itemsToKeep = 20;

    const trySaving = (data: HistoryItem[]): boolean => {
      try {
        localStorage.setItem('ml_seo_history', JSON.stringify(data));
        return true;
      } catch (e) {
        return false;
      }
    };

    while (itemsToKeep > 0) {
      const reduced = currentHistory.slice(0, itemsToKeep);
      if (trySaving(reduced)) {
        setHistory(reduced);
        return;
      }
      itemsToKeep -= 5;
    }

    const stripImages = (data: HistoryItem[]): HistoryItem[] => {
      return data.map(i => ({
        ...i,
        imageUrl: (i.imageUrl && i.imageUrl.length > 50000) ? undefined : i.imageUrl
      }));
    };

    const strippedHistory = stripImages(currentHistory).slice(0, 10);
    if (trySaving(strippedHistory)) {
      setHistory(strippedHistory);
      return;
    }

    try {
      const singleItem = stripImages([item]);
      localStorage.setItem('ml_seo_history', JSON.stringify(singleItem));
      setHistory(singleItem);
    } catch (e) {
      console.error("FATAL: Could not save even a single stripped history item.");
      localStorage.removeItem('ml_seo_history');
      setHistory([]);
    }
  };

  const handleBuyTokens = (amount: number, price: number) => {
    window.open(`https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=placeholder`, '_blank');
    setShowPayModal(false);
  };

  // Auth form state
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [regFirstName, setRegFirstName] = React.useState('');
  const [regLastName, setRegLastName] = React.useState('');
  const [regPhone, setRegPhone] = React.useState('');
  const [isLoginMode, setIsLoginMode] = React.useState(true);
  const [authError, setAuthError] = React.useState('');

  const resetAuthForm = () => {
    setEmail('');
    setPassword('');
    setRegFirstName('');
    setRegLastName('');
    setRegPhone('');
    setAuthError('');
  };

  const openAuthModal = (mode: 'login' | 'register' = 'login') => {
    setIsLoginMode(mode === 'login');
    resetAuthForm();
    setShowAuthModal(true);
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isLoginMode) {
        await loginWithEmail(email, password);
        setShowAuthModal(false);
        setCurrentView('app');
      } else {
        if (!regFirstName.trim()) { setAuthError('Ingresá tu nombre.'); return; }
        if (!regLastName.trim()) { setAuthError('Ingresá tu apellido.'); return; }
        await registerWithEmailAndProfile(email, password, regFirstName.trim(), regLastName.trim());
        setCurrentView('app');
        // welcome modal opens automatically when Firestore doc is created
      }
    } catch (err: any) {
      setAuthError(err.message || 'Error de autenticación');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      setShowAuthModal(false);
      setCurrentView('app');
    } catch (err: any) {
      console.error('Google Auth Error:', err);
      setAuthError(err.message || 'Error con Google');
    }
  };

  if (!isAuthReady) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#0A0E1A] gap-4">
        <div className="bg-[#fff159] p-4 rounded-3xl animate-bounce shadow-xl shadow-yellow-400/30">
          <Sparkles className="w-12 h-12 text-slate-900" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-2xl font-black text-white italic">PRODUCT PRO</h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest animate-pulse">{t('app.starting')}</p>
        </div>
      </div>
    );
  }

  // ── LANDING (non-authenticated, not entered demo) ──
  if (currentView === 'landing') {
    return (
      <>
        <LandingPage
          onShowAuth={openAuthModal}
          onEnterDemo={() => setCurrentView('app')}
        />
        <AuthModal
          open={showAuthModal}
          onClose={() => { setShowAuthModal(false); resetAuthForm(); }}
          isLoginMode={isLoginMode}
          setIsLoginMode={(v) => { setIsLoginMode(v); resetAuthForm(); }}
          email={email} setEmail={setEmail}
          password={password} setPassword={setPassword}
          regFirstName={regFirstName} setRegFirstName={setRegFirstName}
          regLastName={regLastName} setRegLastName={setRegLastName}
          regPhone={regPhone} setRegPhone={setRegPhone}
          authError={authError}
          onSubmit={handleEmailAuth}
          onGoogle={handleGoogleLogin}
          t={t}
        />
        <Toaster position="top-right" richColors closeButton toastOptions={{
          style: { borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }
        }} />
      </>
    );
  }

  // ── APP (authenticated or demo mode) ──
  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <Sidebar
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        tokenBalance={userData?.tokenBalance || 0}
        userName={user?.displayName ?? null}
        isAdmin={isAdmin}
        onLogout={user ? () => { logout(); setCurrentView('landing'); } : undefined}
        onBuyTokens={() => user ? setShowPayModal(true) : setShowAuthModal(true)}
        user={user}
        onShowAuth={() => openAuthModal('login')}
        onGoLanding={() => setCurrentView('landing')}
      />

      <main className="lg:ml-64 p-4 lg:p-8 transition-all duration-300 pt-[4.5rem] pb-20 lg:pt-4 lg:pb-4">
        <div className="max-w-7xl mx-auto">
          {/* Demo mode banner */}
          {!user && (
            <div className="mb-6 flex items-center justify-between gap-4 px-5 py-3 rounded-2xl bg-[#3483fa]/10 border border-[#3483fa]/20">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-[#3483fa] flex-shrink-0" />
                <p className="text-sm font-bold text-slate-700">
                  Estás en <span className="text-[#3483fa]">modo demo</span>. Registrate gratis y recibí <span className="font-black text-slate-900">30 créditos</span> para usar todas las herramientas.
                </p>
              </div>
              <button
                onClick={() => openAuthModal('register')}
                className="flex-shrink-0 px-4 py-2 rounded-xl bg-[#3483fa] text-white text-xs font-black hover:bg-[#2d6fe0] transition-all"
              >
                Crear cuenta gratis
              </button>
            </div>
          )}

          {activeTool === 'seo' && (
            <SeoOptimizer
              user={user}
              userData={userData}
              isAdmin={isAdmin}
              saveToHistory={saveToHistory}
              openPayModal={() => setShowPayModal(true)}
              onRequireAuth={requireAuth}
            />
          )}

          {activeTool === 'images' && (
            <ImageGenerator
              user={user}
              userData={userData}
              isAdmin={isAdmin}
              saveToHistory={saveToHistory}
              openPayModal={() => setShowPayModal(true)}
              onRequireAuth={requireAuth}
            />
          )}

          {activeTool === 'history' && (
            <HistoryTool
              history={history}
              clearHistory={() => {
                setHistory([]);
                localStorage.removeItem('ml_seo_history');
              }}
            />
          )}

          {activeTool === 'dashboard' && (
            user
              ? <UserDashboard onBuyTokens={() => setShowPayModal(true)} />
              : <div className="flex flex-col items-center justify-center h-96 gap-4">
                  <Sparkles className="w-12 h-12 text-slate-300" />
                  <p className="text-slate-500 font-bold">Creá una cuenta para ver tu historial y saldo</p>
                  <Button onClick={() => openAuthModal('register')} className="bg-[#3483fa] text-white font-black rounded-2xl px-8">Crear cuenta gratis</Button>
                </div>
          )}

          {activeTool === 'admin' && isAdmin && (
            <AdminPanel adminUid={user?.uid!} />
          )}
        </div>
      </main>

      <Toaster position="top-right" richColors closeButton toastOptions={{
        style: { borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }
      }} />

      {/* Pay Modal */}
      <Dialog open={showPayModal} onOpenChange={(val) => { setShowPayModal(val); if (!val) setSelectedPackage(null); }}>
        <DialogContent className="max-w-md bg-white shadow-2xl border-none p-0 overflow-hidden rounded-3xl">
          <div className="p-8 bg-slate-900 text-white">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black flex items-center gap-3">
                <div className="bg-[#fff159] p-2 rounded-xl shadow-lg">
                  <Coins className="w-6 h-6 text-slate-900 fill-slate-900" />
                </div>
                Cargar Tokens
              </DialogTitle>
              <DialogDescription className="text-slate-400 font-medium">
                Selecciona el paquete que mejor se adapte a tus necesidades.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-8 grid gap-4">
            {TOKEN_PACKAGES.map((pkg) => (
              <div
                key={pkg.amount}
                className={`flex items-center justify-between p-5 border-2 rounded-2xl cursor-pointer transition-all bg-white group relative ${selectedPackage?.amount === pkg.amount ? 'border-[#3483fa] shadow-xl ring-1 ring-[#3483fa]/10 scale-[1.02]' : 'border-slate-100 hover:border-slate-200 hover:scale-[1.01]'}`}
                onClick={() => setSelectedPackage(pkg)}
              >
                {pkg.recommended && (
                  <div className="absolute top-0 right-8 transform -translate-y-1/2 bg-[#3483fa] text-white text-[9px] font-black px-3 py-1 rounded-full shadow-lg">RECOMENDADO</div>
                )}
                <div className="flex items-center gap-4">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${selectedPackage?.amount === pkg.amount ? 'border-[#3483fa] bg-[#3483fa]' : 'border-slate-200'}`}>
                    {selectedPackage?.amount === pkg.amount && <Check className="w-4 h-4 text-white" />}
                  </div>
                  <div>
                    <h4 className="font-black text-lg text-slate-800">{pkg.amount} Tokens</h4>
                    <p className="text-xs text-slate-500 font-medium">{pkg.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-black text-2xl text-[#3483fa]">${pkg.price.toLocaleString()}</div>
                  <Badge variant="secondary" className="text-[10px] font-black tracking-widest border-none bg-slate-100">ARS</Badge>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="p-8 pt-0 flex flex-col sm:flex-row gap-3">
            <Button variant="ghost" className="sm:flex-1 h-14 font-black text-slate-500 hover:bg-slate-50 rounded-2xl" onClick={() => setShowPayModal(false)}>
              Volver
            </Button>
            <Button
              className="sm:flex-[2] bg-[#3483fa] hover:bg-[#2d6fe0] text-white font-black h-14 text-lg shadow-xl shadow-[#3483fa]/20 rounded-2xl"
              disabled={!selectedPackage}
              onClick={() => selectedPackage && handleBuyTokens(selectedPackage.amount, selectedPackage.price)}
            >
              Comprar Ahora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Auth Modal */}
      <AuthModal
        open={showAuthModal}
        onClose={() => { setShowAuthModal(false); resetAuthForm(); }}
        isLoginMode={isLoginMode}
        setIsLoginMode={(v) => { setIsLoginMode(v); resetAuthForm(); }}
        email={email} setEmail={setEmail}
        password={password} setPassword={setPassword}
        regFirstName={regFirstName} setRegFirstName={setRegFirstName}
        regLastName={regLastName} setRegLastName={setRegLastName}
        regPhone={regPhone} setRegPhone={setRegPhone}
        authError={authError}
        onSubmit={handleEmailAuth}
        onGoogle={handleGoogleLogin}
        t={t}
      />

      {/* Welcome Modal */}
      <Dialog open={showWelcomeModal} onOpenChange={setShowWelcomeModal}>
        <DialogContent className="max-w-md text-center bg-white shadow-2xl border-none p-0 overflow-hidden rounded-3xl">
          <div className="h-40 bg-[#fff159] flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <Sparkles className="w-full h-full scale-150 rotate-12" />
            </div>
            <div className="bg-white p-5 rounded-[2rem] shadow-2xl relative z-10 animate-bounce">
              <Sparkles className="w-12 h-12 text-slate-900" />
            </div>
          </div>
          <div className="p-10 space-y-6">
            <DialogHeader>
              <DialogTitle className="text-3xl font-black text-slate-900 tracking-tight">¡Bienvenido!</DialogTitle>
              <DialogDescription className="text-base text-slate-600 font-medium px-4">
                ¡Gracias por elegir PRODUCT PRO! Como regalo de bienvenida, te cargamos <span className="font-black text-[#3483fa] underline decoration-[#3483fa]/20">30 Tokens gratuitos</span> en tu cuenta.
              </DialogDescription>
            </DialogHeader>
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex items-center justify-between shadow-inner">
              <div className="text-left">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Saldo Inicial</p>
                <p className="text-3xl font-black text-slate-900">30 <span className="text-sm font-bold text-slate-400 uppercase">Tokens</span></p>
              </div>
              <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
                <Coins className="w-10 h-10 text-[#fff159] fill-[#fff159]" />
              </div>
            </div>
            <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black h-16 text-lg rounded-2xl shadow-xl shadow-slate-900/20" onClick={() => setShowWelcomeModal(false)}>
              ¡Empezar a Optimizar!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Auth Modal Component ──
interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  isLoginMode: boolean;
  setIsLoginMode: (v: boolean) => void;
  email: string; setEmail: (v: string) => void;
  password: string; setPassword: (v: string) => void;
  regFirstName: string; setRegFirstName: (v: string) => void;
  regLastName: string; setRegLastName: (v: string) => void;
  regPhone: string; setRegPhone: (v: string) => void;
  authError: string;
  onSubmit: (e: React.FormEvent) => void;
  onGoogle: () => void;
  t: (key: string) => string;
}

function AuthModal({
  open, onClose, isLoginMode, setIsLoginMode,
  email, setEmail, password, setPassword,
  regFirstName, setRegFirstName, regLastName, setRegLastName,
  regPhone, setRegPhone,
  authError, onSubmit, onGoogle, t
}: AuthModalProps) {
  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
      <DialogContent className="max-w-md bg-white shadow-2xl border-none p-0 overflow-hidden rounded-3xl">
        <div className="h-24 bg-[#3483fa] flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <div className="grid grid-cols-8 gap-4 transform rotate-12 scale-150">
              {[...Array(64)].map((_, i) => (
                <Sparkles key={i} className="text-white w-8 h-8" />
              ))}
            </div>
          </div>
          <div className="bg-white p-3 rounded-[1.5rem] shadow-xl relative z-10">
            <Sparkles className="w-7 h-7 text-[#3483fa]" />
          </div>
        </div>
        <div className="p-8">
          <DialogHeader className="mb-6 text-center">
            <DialogTitle className="text-2xl font-black text-slate-900">
              {isLoginMode ? 'Iniciá sesión' : 'Crear cuenta gratis'}
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium">
              {isLoginMode ? 'Accedé para usar las herramientas de IA.' : '¡Registrate y recibí 30 tokens de regalo!'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={onSubmit} className="space-y-3 mb-4">
            {/* Registration extra fields */}
            {!isLoginMode && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Nombre *</label>
                    <input
                      type="text"
                      placeholder="Juan"
                      value={regFirstName}
                      onChange={e => setRegFirstName(e.target.value)}
                      className="flex h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3483fa]/30"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Apellido *</label>
                    <input
                      type="text"
                      placeholder="García"
                      value={regLastName}
                      onChange={e => setRegLastName(e.target.value)}
                      className="flex h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3483fa]/30"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">
                    Teléfono / WhatsApp <span className="text-slate-400 font-normal">(opcional)</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="+54 9 11 1234-5678"
                    value={regPhone}
                    onChange={e => setRegPhone(e.target.value)}
                    className="flex h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3483fa]/30"
                  />
                  <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                    <span>📱</span> Para recibir novedades y ofertas por WhatsApp
                  </p>
                </div>
              </>
            )}

            <div className="space-y-2">
              <div>
                {!isLoginMode && <label className="text-xs font-bold text-slate-500 mb-1 block">Email *</label>}
                <input
                  type="email"
                  placeholder={t('app.email_placeholder')}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="flex h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3483fa]/30"
                  required
                />
              </div>
              <div>
                {!isLoginMode && <label className="text-xs font-bold text-slate-500 mb-1 block">Contraseña *</label>}
                <input
                  type="password"
                  placeholder={t('app.password_placeholder')}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="flex h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3483fa]/30"
                  required
                />
              </div>
            </div>

            {authError && <p className="text-red-500 text-xs font-medium text-center">{authError}</p>}

            <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold h-11 rounded-xl">
              {isLoginMode ? t('app.login_btn') : t('app.register_btn')}
            </Button>
          </form>

          <div className="text-center mb-4">
            <button
              onClick={() => setIsLoginMode(!isLoginMode)}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium underline"
            >
              {isLoginMode ? t('app.no_account') : t('app.has_account')}
            </button>
          </div>

          <div className="relative mb-5 text-center">
            <span className="text-xs text-slate-400 uppercase tracking-widest font-bold bg-white px-2 relative z-10">O</span>
            <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-slate-200" />
          </div>

          <Button
            type="button"
            className="w-full h-11 bg-white border-2 border-slate-200 text-slate-800 hover:bg-slate-50 font-black text-sm rounded-xl shadow-sm"
            onClick={onGoogle}
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4 mr-2" />
            {t('app.google_btn')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
