import * as React from 'react';
import { Toaster } from 'sonner';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';

import { auth, db, loginWithGoogle, loginWithEmail, registerWithEmail, logout } from './lib/firebase';
import { Sidebar } from './components/layout/Sidebar';
import SeoOptimizer from './components/tools/SeoOptimizer';
import ImageGenerator from './components/tools/ImageGenerator';
import HistoryTool from './components/tools/HistoryTool';
import { UserDashboard } from './components/layout/UserDashboard';
import { AdminPanel } from './components/layout/AdminPanel';

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

export default function App() {
  const { t } = useLanguage();
  const [user, setUser] = React.useState<FirebaseUser | null>(null);
  const [userData, setUserData] = React.useState<{ tokenBalance: number } | null>(null);
  const [activeTool, setActiveTool] = React.useState('seo');
  const [isAuthReady, setIsAuthReady] = React.useState(false);
  
  // Modal States
  const [showPayModal, setShowPayModal] = React.useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = React.useState(false);
  const [selectedPackage, setSelectedPackage] = React.useState<{ amount: number, price: number } | null>(null);

  const isAdmin = user?.email === 'pconti10@gmail.com';

  // Auth & Token Sync
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setIsAuthReady(true);
      
      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const unsubDoc = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserData(docSnap.data() as any);
          } else {
            setDoc(userRef, {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              tokenBalance: 500,
              isAdmin: firebaseUser.email === 'pconti10@gmail.com',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
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

  // History State (Maintained at App level to share across tools if needed)
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

    // Attempt to save normally
    while (itemsToKeep > 0) {
      const reduced = currentHistory.slice(0, itemsToKeep);
      if (trySaving(reduced)) {
        setHistory(reduced);
        return;
      }
      itemsToKeep -= 5;
    }

    // If still failing, try saving items without large base64 strings
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

    // Last resort: save only the newest item, stripped if necessary
    try {
      const singleItem = stripImages([item]);
      localStorage.setItem('ml_seo_history', JSON.stringify(singleItem));
      setHistory(singleItem);
    } catch (e) {
      console.error("FATAL: Could not save even a single stripped history item.");
      // If even this fails, clear history entirely to at least allow future saves
      localStorage.removeItem('ml_seo_history');
      setHistory([]);
    }
  };

  const handleBuyTokens = (amount: number, price: number) => {
    // Integration logic for Mercado Pago would go here
    window.open(`https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=placeholder`, '_blank');
    setShowPayModal(false);
  };

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isLoginMode, setIsLoginMode] = React.useState(true);
  const [authError, setAuthError] = React.useState('');

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isLoginMode) {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail(email, password);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Error de autenticación');
    }
  };

  if (!isAuthReady) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 gap-4">
        <div className="bg-ml-yellow p-4 rounded-3xl animate-bounce shadow-xl">
          <Sparkles className="w-12 h-12 text-slate-900" />
        </div>
        <div className="flex flex-col items-center gap-2">
           <h1 className="text-2xl font-black text-slate-900 italic">PRODUCT PRO</h1>
           <p className="text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">{t('app.starting')}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#F5F5F7] p-4">
        <Card className="max-w-md w-full border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white">
          <div className="h-28 bg-ml-blue flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-20 pointer-events-none">
              <div className="grid grid-cols-8 gap-4 transform rotate-12 scale-150">
                {[...Array(64)].map((_, i) => (
                  <Sparkles key={i} className="text-white w-8 h-8" />
                ))}
              </div>
            </div>
            <div className="bg-white p-4 rounded-[1.5rem] shadow-xl relative z-10 transition-transform hover:scale-110 duration-500">
               <Sparkles className="w-8 h-8 text-ml-blue" />
            </div>
          </div>
          <CardHeader className="text-center pt-8 pb-2">
            <CardTitle className="text-2xl font-black italic tracking-tight text-slate-900 underline decoration-ml-blue/30 underline-offset-8">PRODUCT PRO</CardTitle>
            <CardDescription className="text-slate-500 px-6 font-medium mt-2 text-sm">
              {t('app.subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleEmailAuth} className="space-y-4 mb-4">
              <div className="space-y-2">
                <input 
                  type="email" 
                  placeholder={t('app.email_placeholder')} 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                />
                <input 
                  type="password" 
                  placeholder={t('app.password_placeholder')} 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                />
              </div>
              {authError && <p className="text-red-500 text-xs font-medium text-center">{authError}</p>}
              <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold h-10">
                {isLoginMode ? t('app.login_btn') : t('app.register_btn')}
              </Button>
            </form>
            <div className="text-center mb-4">
              <button 
                onClick={() => { setIsLoginMode(!isLoginMode); setAuthError(''); }}
                className="text-xs text-slate-500 hover:text-slate-800 font-medium underline"
              >
                {isLoginMode ? t('app.no_account') : t('app.has_account')}
              </button>
            </div>
            
            <div className="relative mb-6 text-center">
               <span className="text-xs text-slate-400 uppercase tracking-widest font-bold bg-white px-2 relative z-10">O</span>
               <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-slate-200" />
            </div>

            <Button 
              type="button"
              className="w-full h-12 bg-white border-2 border-slate-200 text-slate-800 hover:bg-slate-50 font-black text-sm rounded-xl shadow-sm transition-all"
              onClick={loginWithGoogle}
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4 mr-2" />
              {t('app.google_btn')}
            </Button>
            
            <p className="text-center text-[9px] text-slate-400 uppercase tracking-widest mt-6 font-bold">
              {t('app.auth_attention')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <Sidebar 
        activeTool={activeTool} 
        setActiveTool={setActiveTool} 
        tokenBalance={userData?.tokenBalance || 0}
        userName={user.displayName}
        isAdmin={isAdmin}
        onLogout={logout}
        onBuyTokens={() => setShowPayModal(true)}
      />

      <main className="md:ml-64 p-4 lg:p-8 transition-all duration-300">
        <div className="max-w-7xl mx-auto pt-14 md:pt-0">
          {activeTool === 'seo' && (
            <SeoOptimizer 
              user={user} 
              userData={userData} 
              isAdmin={isAdmin} 
              saveToHistory={saveToHistory}
              openPayModal={() => setShowPayModal(true)}
            />
          )}

          {activeTool === 'images' && (
            <ImageGenerator 
              user={user} 
              userData={userData} 
              isAdmin={isAdmin} 
              saveToHistory={saveToHistory}
              openPayModal={() => setShowPayModal(true)}
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
            <UserDashboard onBuyTokens={() => setShowPayModal(true)} />
          )}

          {activeTool === 'admin' && isAdmin && (
            <AdminPanel adminUid={user?.uid!} />
          )}
        </div>
      </main>

      <Toaster position="top-right" richColors closeButton toastOptions={{
        style: { borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }
      }} />

      {/* Global Modals */}
      <Dialog open={showPayModal} onOpenChange={(val) => { setShowPayModal(val); if (!val) setSelectedPackage(null); }}>
        <DialogContent className="max-w-md bg-white shadow-2xl border-none p-0 overflow-hidden rounded-3xl">
          <div className="p-8 bg-slate-900 text-white">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black flex items-center gap-3">
                <div className="bg-ml-yellow p-2 rounded-xl shadow-lg">
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
                className={`flex items-center justify-between p-5 border-2 rounded-2xl cursor-pointer transition-all bg-white group relative ${selectedPackage?.amount === pkg.amount ? 'border-ml-blue shadow-xl ring-1 ring-ml-blue/10 scale-[1.02]' : 'border-slate-100 hover:border-slate-200 hover:scale-[1.01]'}`}
                onClick={() => setSelectedPackage(pkg)}
              >
                {pkg.recommended && (
                  <div className="absolute top-0 right-8 transform -translate-y-1/2 bg-ml-blue text-white text-[9px] font-black px-3 py-1 rounded-full shadow-lg">RECOMENDADO</div>
                )}
                <div className="flex items-center gap-4">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${selectedPackage?.amount === pkg.amount ? 'border-ml-blue bg-ml-blue' : 'border-slate-200'}`}>
                    {selectedPackage?.amount === pkg.amount && <Check className="w-4 h-4 text-white" />}
                  </div>
                  <div>
                    <h4 className="font-black text-lg text-slate-800">{pkg.amount} Tokens</h4>
                    <p className="text-xs text-slate-500 font-medium">{pkg.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-black text-2xl text-ml-blue">${pkg.price.toLocaleString()}</div>
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
              className="sm:flex-[2] bg-ml-blue hover:bg-ml-blue/90 text-white font-black h-14 text-lg shadow-xl shadow-ml-blue/20 rounded-2xl"
              disabled={!selectedPackage}
              onClick={() => selectedPackage && handleBuyTokens(selectedPackage.amount, selectedPackage.price)}
            >
              Comprar Ahora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showWelcomeModal} onOpenChange={setShowWelcomeModal}>
        <DialogContent className="max-w-md text-center bg-white shadow-2xl border-none p-0 overflow-hidden rounded-3xl">
          <div className="h-40 bg-ml-yellow flex items-center justify-center relative overflow-hidden">
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
                ¡Gracias por elegir PRODUCT PRO! Como regalo de bienvenida, hemos cargado <span className="font-black text-ml-blue underline decoration-ml-blue/20">500 Tokens gratuitos</span> en tu cuenta.
              </DialogDescription>
            </DialogHeader>
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex items-center justify-between shadow-inner">
              <div className="text-left">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Saldo Inicial</p>
                <p className="text-3xl font-black text-slate-900">500 <span className="text-sm font-bold text-slate-400 uppercase">Tokens</span></p>
              </div>
              <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
                <Coins className="w-10 h-10 text-ml-yellow fill-ml-yellow" />
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
