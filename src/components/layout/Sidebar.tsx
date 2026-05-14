import * as React from 'react';
import { 
  Sparkles, 
  ImageIcon, 
  History, 
  Settings, 
  LogOut, 
  LayoutDashboard,
  Coins,
  Menu,
  X,
  HelpCircle,
  FileDown,
  Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '../../lib/i18n';

interface SidebarProps {
  activeTool: string;
  setActiveTool: (tool: string) => void;
  tokenBalance: number;
  userName?: string | null;
  isAdmin?: boolean;
  onLogout?: () => void;
  onBuyTokens: () => void;
  user?: any;
  onShowAuth?: () => void;
  onGoLanding?: () => void;
}

export function Sidebar({ 
  activeTool, 
  setActiveTool, 
  tokenBalance, 
  userName, 
  isAdmin,
  onLogout,
  onBuyTokens,
  user,
  onShowAuth,
  onGoLanding
}: SidebarProps) {
  // Start closed on mobile, open on desktop
  const [isOpen, setIsOpen] = React.useState(false);
  const [showLangs, setShowLangs] = React.useState(false);
  const { t, language, setLanguage } = useLanguage();

  const tools = [
    { id: 'seo', name: t('sidebar.seo'), icon: Sparkles, color: 'text-ml-blue' },
    { id: 'images', name: t('sidebar.images'), icon: ImageIcon, color: 'text-purple-500' },
    { id: 'dashboard', name: t('sidebar.dashboard'), icon: LayoutDashboard, color: 'text-emerald-500' },
    { id: 'history', name: t('sidebar.history'), icon: History, color: 'text-slate-500' },
  ];

  const adminTools = [
    { id: 'admin', name: t('sidebar.admin_panel'), icon: Settings, color: 'text-orange-500' },
  ];

  const handleNavClick = (toolId: string) => {
    setActiveTool(toolId);
    setIsOpen(false); // close sidebar on mobile after nav
  };

  return (
    <>
      {/* ── Mobile Top Bar ── */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-50 h-14 bg-white border-b border-slate-100 flex items-center justify-between px-4 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-ml-yellow p-1.5 rounded-lg">
            <Sparkles className="w-4 h-4 text-slate-900" />
          </div>
          <span className="font-black text-slate-900 text-base">PRODUCT <span className="text-ml-blue italic">PRO</span></span>
        </div>
        <div className="flex items-center gap-2">
          {user && (
            <div className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg">
              <Coins className="w-3.5 h-3.5 text-ml-yellow fill-ml-yellow" />
              <span className="text-xs font-black text-slate-900">{tokenBalance}</span>
            </div>
          )}
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setIsOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* ── Mobile Drawer Overlay ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar (drawer on mobile, fixed on desktop) ── */}
      <AnimatePresence>
        {(isOpen) && (
          <motion.aside
            key="mobile-drawer"
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl flex flex-col"
          >
            <SidebarContent
              tools={tools}
              adminTools={adminTools}
              activeTool={activeTool}
              handleNavClick={handleNavClick}
              isAdmin={isAdmin}
              showLangs={showLangs}
              setShowLangs={setShowLangs}
              language={language}
              setLanguage={setLanguage}
              t={t}
              user={user}
              userName={userName}
              tokenBalance={tokenBalance}
              onBuyTokens={onBuyTokens}
              onLogout={onLogout}
              onShowAuth={onShowAuth}
              onGoLanding={onGoLanding}
              onClose={() => setIsOpen(false)}
            />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Desktop Sidebar (always visible) ── */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex-col">
        <SidebarContent
          tools={tools}
          adminTools={adminTools}
          activeTool={activeTool}
          handleNavClick={handleNavClick}
          isAdmin={isAdmin}
          showLangs={showLangs}
          setShowLangs={setShowLangs}
          language={language}
          setLanguage={setLanguage}
          t={t}
          user={user}
          userName={userName}
          tokenBalance={tokenBalance}
          onBuyTokens={onBuyTokens}
          onLogout={onLogout}
          onShowAuth={onShowAuth}
          onGoLanding={onGoLanding}
        />
      </aside>

      {/* ── Mobile/Tablet Bottom Nav Bar ── */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] flex items-center justify-around px-1 h-16">
        {[
          { id: 'seo', icon: Sparkles, label: 'SEO' },
          { id: 'images', icon: ImageIcon, label: 'Imágenes' },
          { id: 'dashboard', icon: LayoutDashboard, label: 'Panel' },
          { id: 'history', icon: History, label: 'Historial' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTool(item.id)}
            className="flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-all"
          >
            <div className={`p-1.5 rounded-xl transition-all ${activeTool === item.id ? 'bg-ml-blue shadow-lg shadow-ml-blue/30' : ''}`}>
              <item.icon className={`w-5 h-5 ${activeTool === item.id ? 'text-white' : 'text-slate-400'}`} />
            </div>
            <span className={`text-[9px] font-black uppercase tracking-wide truncate max-w-[60px] ${activeTool === item.id ? 'text-ml-blue' : 'text-slate-400'}`}>
              {item.label}
            </span>
          </button>
        ))}
        {isAdmin && (
          <button
            onClick={() => setActiveTool('admin')}
            className="flex flex-col items-center justify-center gap-1 flex-1 py-2"
          >
            <div className={`p-1.5 rounded-xl transition-all ${activeTool === 'admin' ? 'bg-slate-900 shadow-lg' : ''}`}>
              <Settings className={`w-5 h-5 ${activeTool === 'admin' ? 'text-white' : 'text-slate-400'}`} />
            </div>
            <span className={`text-[9px] font-black uppercase tracking-wide ${activeTool === 'admin' ? 'text-slate-900' : 'text-slate-400'}`}>Admin</span>
          </button>
        )}
      </nav>
    </>
  );
}

// ── Extracted Sidebar Content ──
function SidebarContent({ tools, adminTools, activeTool, handleNavClick, isAdmin, showLangs, setShowLangs, language, setLanguage, t, user, userName, tokenBalance, onBuyTokens, onLogout, onShowAuth, onGoLanding, onClose }: any) {
  return (
    <>
      {/* Logo */}
      <div className="p-6 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-ml-yellow p-2 rounded-xl shadow-sm">
            <Sparkles className="w-6 h-6 text-slate-900" />
          </div>
          <div>
            <h1 className="font-black text-xl tracking-tight text-slate-900">PRODUCT <span className="text-ml-blue italic underline decoration-2 underline-offset-4">PRO</span></h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Toolkit V2.0</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-all">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <p className="px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">{t('sidebar.tools')}</p>
        {tools.map((tool: any) => (
          <button
            key={tool.id}
            onClick={() => handleNavClick(tool.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
              activeTool === tool.id 
                ? 'bg-ml-blue text-white shadow-lg shadow-ml-blue/20' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <tool.icon className={`w-5 h-5 ${activeTool === tool.id ? 'text-white' : tool.color}`} />
            <span className="font-bold text-sm">{tool.name}</span>
            {activeTool === tool.id && (
              <motion.div layoutId="active-pill" className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />
            )}
          </button>
        ))}

        {isAdmin && (
          <>
            <p className="px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-8 mb-4">{t('sidebar.admin')}</p>
            {adminTools.map((tool: any) => (
              <button
                key={tool.id}
                onClick={() => handleNavClick(tool.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  activeTool === tool.id 
                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <tool.icon className={`w-5 h-5 ${activeTool === tool.id ? 'text-white' : tool.color}`} />
                <span className="font-bold text-sm">{tool.name}</span>
              </button>
            ))}
          </>
        )}

        <div className="mt-8 pt-4 border-t border-slate-100 space-y-1">
          {onGoLanding && (
            <button
              onClick={onGoLanding}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all text-sm font-bold"
            >
              <Sparkles className="w-4 h-4 text-[#3483fa]" />
              Ver página de inicio
            </button>
          )}
          <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all text-sm font-bold">
            <HelpCircle className="w-4 h-4 text-slate-400" />
            {t('sidebar.faq')}
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all text-sm font-bold">
            <FileDown className="w-4 h-4 text-slate-400" />
            {t('sidebar.manual')}
          </button>
          <div className="relative">
            <button 
              onClick={() => setShowLangs(!showLangs)}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all text-sm font-bold"
            >
              <Globe className="w-4 h-4 text-slate-400" />
              {t('sidebar.language')} ({language.toUpperCase()})
            </button>
            <AnimatePresence>
              {showLangs && (
                <motion.div 
                  className="absolute z-50 bottom-10 inset-x-4 bg-white border border-slate-200 rounded-xl shadow-lg p-1"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <button onClick={() => { setLanguage('es'); setShowLangs(false); }} className="w-full text-left px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-md">Español</button>
                  <button onClick={() => { setLanguage('en'); setShowLangs(false); }} className="w-full text-left px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-md">English</button>
                  <button onClick={() => { setLanguage('pt'); setShowLangs(false); }} className="w-full text-left px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-md">Português</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </nav>

      {/* User & Tokens */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-slate-500">
              <Coins className="w-4 h-4 text-ml-yellow fill-ml-yellow" />
              <span className="text-[10px] font-bold uppercase">{t('sidebar.balance')}</span>
            </div>
            <Badge className="bg-ml-blue text-white font-black text-xs">{user ? tokenBalance : '—'}</Badge>
          </div>
          <Button className="w-full h-8 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg" onClick={onBuyTokens}>
            {user ? t('sidebar.load_tokens') : 'Comprar Tokens'}
          </Button>
        </div>

        {user ? (
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs uppercase">
                {userName?.charAt(0) || 'U'}
              </div>
              <p className="text-xs font-bold text-slate-900 truncate max-w-[120px]">{userName || 'Usuario'}</p>
            </div>
            <button onClick={onLogout} className="p-2 text-slate-400 hover:text-red-500 transition-colors" title={t('sidebar.logout')}>
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onShowAuth}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-ml-blue text-white font-black text-sm hover:bg-ml-blue/90 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Iniciar sesión
          </button>
        )}
      </div>
    </>
  );
}
