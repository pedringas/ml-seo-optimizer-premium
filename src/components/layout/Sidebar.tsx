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
  onLogout: () => void;
  onBuyTokens: () => void;
}

export function Sidebar({ 
  activeTool, 
  setActiveTool, 
  tokenBalance, 
  userName, 
  isAdmin,
  onLogout,
  onBuyTokens
}: SidebarProps) {
  const [isOpen, setIsOpen] = React.useState(true);
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

  return (
    <>
      {/* Mobile Toggle */}
      <Button 
        variant="ghost" 
        size="icon" 
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X /> : <Menu />}
      </Button>

      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 transition-transform duration-300 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 flex flex-col`}>
        {/* Logo */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-ml-yellow p-2 rounded-xl shadow-sm">
              <Sparkles className="w-6 h-6 text-slate-900" />
            </div>
            <div>
              <h1 className="font-black text-xl tracking-tight text-slate-900">PRODUCT <span className="text-ml-blue italic underline decoration-2 underline-offset-4">PRO</span></h1>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Toolkit V2.0</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <p className="px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">{t('sidebar.tools')}</p>
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                activeTool === tool.id 
                  ? 'bg-ml-blue text-white shadow-lg shadow-ml-blue/20' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <tool.icon className={`w-5 h-5 ${activeTool === tool.id ? 'text-white' : tool.color}`} />
              <span className="font-bold text-sm">{tool.name}</span>
              {activeTool === tool.id && (
                <motion.div 
                  layoutId="active-pill" 
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-white" 
                />
              )}
            </button>
          ))}

          {isAdmin && (
            <>
              <p className="px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-8 mb-4">{t('sidebar.admin')}</p>
              {adminTools.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => setActiveTool(tool.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
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
                      className="absolute z-50 bottom-10 inset-x-4 bg-white border border-slate-200 rounded-xl shadow-lg p-1 overflow-hidden"
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
              <Badge className="bg-ml-blue text-white font-black text-xs">{tokenBalance}</Badge>
            </div>
            <Button 
              className="w-full h-8 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg"
              onClick={onBuyTokens}
            >
              {t('sidebar.load_tokens')}
            </Button>
          </div>

          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs uppercase">
                {userName?.charAt(0) || 'U'}
              </div>
              <div className="hidden lg:block">
                <p className="text-xs font-bold text-slate-900 truncate max-w-[100px]">{userName || 'Usuario'}</p>
              </div>
            </div>
            <button 
              onClick={onLogout}
              className="p-2 text-slate-400 hover:text-red-500 transition-colors"
              title={t('sidebar.logout')}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
