import React from 'react';
import { db, auth } from '../../lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { 
  Wallet, 
  History, 
  User as UserIcon, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Gift, 
  CreditCard,
  LayoutDashboard,
  LogOut,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { es, enUS, pt } from 'date-fns/locale';
import { useLanguage } from '../../lib/i18n';

interface Transaction {
  id: string;
  amount: number;
  type: 'purchase' | 'usage' | 'gift';
  description: string;
  timestamp: any;
}

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  tokenBalance: number;
  isAdmin?: boolean;
}

export function UserDashboard({ onBuyTokens }: { onBuyTokens: () => void }) {
  const { t, language } = useLanguage();
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [loading, setLoading] = React.useState(true);

  const dateLocale = language === 'en' ? enUS : language === 'pt' ? pt : es;

  React.useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Listen to user profile
    const unsubProfile = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      if (doc.exists()) {
        setProfile({ uid: doc.id, ...doc.data() } as UserProfile);
      }
    });

    // Listen to transactions
    const q = query(
      collection(db, 'transactions'),
      where('uid', '==', user.uid),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const unsubTransactions = onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];
      setTransactions(txs);
      setLoading(false);
    });

    return () => {
      unsubProfile();
      unsubTransactions();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ml-blue"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8 pb-20 sm:pb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <LayoutDashboard className="w-8 h-8 text-ml-blue" />
            {t('dashboard.title')}
          </h1>
          <p className="text-slate-500 font-medium">{t('dashboard.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
            {profile?.photoURL ? (
              <img src={profile.photoURL} alt={profile.displayName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-ml-blue/10">
                <UserIcon className="w-5 h-5 text-ml-blue" />
              </div>
            )}
          </div>
          <div className="pr-4 overflow-hidden">
            <p className="text-xs font-black text-slate-900 leading-none truncate max-w-[100px] sm:max-w-[200px]">{profile?.displayName || profile?.email?.split('@')[0]}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[100px] sm:max-w-[200px]">{profile?.email}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Token Balance Card */}
        <Card className="border-none ring-1 ring-slate-200 shadow-xl rounded-[2rem] overflow-hidden bg-gradient-to-br from-ml-blue to-blue-700 text-white">
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <Badge className="bg-white/20 backdrop-blur-md text-white border-none font-black uppercase text-[10px]">
                {t('dashboard.current_balance')}
              </Badge>
            </div>
            <div className="space-y-1">
              <h2 className="text-4xl sm:text-5xl font-black tracking-tighter leading-none">
                {profile?.tokenBalance || 0}
              </h2>
              <p className="text-blue-100 font-bold uppercase tracking-widest text-xs">{t('dashboard.available_tokens')}</p>
            </div>
            <Separator className="my-6 bg-white/10" />
            <Button className="w-full bg-white text-ml-blue hover:bg-blue-50 font-black rounded-xl h-12" onClick={onBuyTokens}>
              {t('dashboard.buy_more')}
            </Button>
          </CardContent>
        </Card>

        {/* User Info Card */}
        <Card className="md:col-span-2 border-none ring-1 ring-slate-200 shadow-xl rounded-[2rem] overflow-hidden bg-white">
          <CardHeader>
            <CardTitle className="text-xl font-black text-slate-900 flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-ml-blue" />
                {t('dashboard.account_info')}
              </div>
              <Button onClick={() => auth.signOut()} variant="outline" className="text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200 gap-2 h-8 text-xs font-bold px-3">
                <LogOut className="w-3 h-3" />
                {t('sidebar.logout')}
              </Button>
            </CardTitle>
            <CardDescription className="font-bold">{t('dashboard.account_desc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('dashboard.username')}</p>
                <p className="text-sm font-bold text-slate-700">{profile?.displayName || t('dashboard.not_set')}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('dashboard.email')}</p>
                <p className="text-sm font-bold text-slate-700">{profile?.email}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('dashboard.role')}</p>
                <div className="flex items-center gap-2">
                  <Badge variant={profile?.isAdmin ? "default" : "secondary"} className="font-black uppercase text-[10px]">
                    {profile?.isAdmin ? t('dashboard.admin') : t('dashboard.standard')}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction History */}
      <Card className="border-none ring-1 ring-slate-200 shadow-xl rounded-[2.5rem] overflow-hidden bg-white">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-6">
          <div className="space-y-1">
            <CardTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
              <History className="w-5 h-5 text-ml-blue" />
              {t('dashboard.history_title')}
            </CardTitle>
            <CardDescription className="font-bold">{t('dashboard.history_desc')}</CardDescription>
          </div>
          <Button variant="outline" className="rounded-xl font-bold text-xs">{t('dashboard.download_all')}</Button>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            {transactions.length > 0 ? (
              <div className="divide-y divide-slate-50">
                {transactions.map((tx, idx) => (
                  <motion.div 
                    key={tx.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-6 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${
                        tx.type === 'purchase' ? 'bg-emerald-50 text-emerald-600' :
                        tx.type === 'gift' ? 'bg-purple-50 text-purple-600' :
                        'bg-slate-50 text-slate-400'
                      }`}>
                        {tx.type === 'purchase' ? <CreditCard className="w-5 h-5" /> :
                         tx.type === 'gift' ? <Gift className="w-5 h-5" /> :
                         <ArrowDownLeft className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900 tracking-tight">{tx.description}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                          {tx.timestamp?.toDate ? format(tx.timestamp.toDate(), "d 'de' MMMM, HH:mm", { locale: dateLocale }) : t('dashboard.recent')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-lg font-black tracking-tight ${
                        tx.amount > 0 ? 'text-emerald-600' : 'text-slate-400'
                      }`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount}
                      </span>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('dashboard.tokens')}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-4">
                <History className="w-12 h-12 opacity-20" />
                <p className="font-bold">{t('dashboard.no_tx')}</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
