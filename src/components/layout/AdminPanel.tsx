import React from 'react';
import { db, auth } from '../../lib/firebase';
import { collection, getDocs, doc, updateDoc, increment, addDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Users, 
  Search, 
  Plus, 
  ArrowUpRight, 
  Gift, 
  ShieldCheck, 
  ExternalLink,
  ChevronRight,
  Loader2,
  RefreshCcw,
  Mail,
  User as UserIcon,
  ShieldIcon
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface UserInfo {
  id: string;
  email: string;
  displayName?: string;
  tokenBalance: number;
  isAdmin?: boolean;
}

interface AdminPanelProps {
  adminUid: string;
}

export function AdminPanel({ adminUid }: AdminPanelProps) {
  const [users, setUsers] = React.useState<UserInfo[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isGiftModalOpen, setIsGiftModalOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<UserInfo | null>(null);
  const [giftAmount, setGiftAmount] = React.useState('50');
  const [giftReason, setGiftReason] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const data = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as UserInfo[];
      setUsers(data);
    } catch (error) {
      toast.error('Error al cargar la lista de usuarios');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchUsers();
  }, [adminUid]);

  const handleGiftTokens = async () => {
    if (!selectedUser || !giftAmount || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const amountNum = Number(giftAmount);
      if (isNaN(amountNum) || amountNum <= 0) throw new Error("Monto inválido");

      const userRef = doc(db, 'users', selectedUser.id);
      await updateDoc(userRef, {
        tokenBalance: increment(amountNum),
        updatedAt: serverTimestamp()
      });

      await addDoc(collection(db, 'transactions'), {
        uid: selectedUser.id,
        amount: amountNum,
        type: 'gift',
        description: giftReason || 'Regalo de administrador',
        timestamp: serverTimestamp(),
        adminId: adminUid
      });

      toast.success(`Se han acreditado ${giftAmount} tokens a ${selectedUser.email || selectedUser.id}`);
      setIsGiftModalOpen(false);
      fetchUsers(); // Refresh list
    } catch (error) {
      toast.error('Error al realizar la operación');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = users.filter(user => 
    (user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.displayName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalTokensDistributed = users.reduce((acc, user) => acc + (user.tokenBalance || 0), 0);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <Badge className="bg-ml-blue/10 text-ml-blue border-none font-black px-3 py-1 uppercase tracking-tighter mb-2">
            Panel de Control
          </Badge>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-10 h-10 text-ml-blue" />
            Administración
          </h1>
          <p className="text-slate-500 font-medium max-w-md">Gestión centralizada de usuarios, balances y distribución de tokens promocionales.</p>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <Card className="bg-white border-none ring-1 ring-slate-200 shadow-sm p-4 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-ml-blue/5 rounded-xl">
              <Users className="w-5 h-5 text-ml-blue" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Usuarios</p>
              <p className="text-xl font-black text-slate-900">{users.length}</p>
            </div>
          </Card>
          <Card className="bg-white border-none ring-1 ring-slate-200 shadow-sm p-4 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-emerald-50 rounded-xl">
              <RefreshCcw className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tokens en Circulación</p>
              <p className="text-xl font-black text-slate-900">{totalTokensDistributed}</p>
            </div>
          </Card>
        </div>
      </div>

      <Card className="border-none ring-1 ring-slate-200 shadow-2xl rounded-[2.5rem] overflow-hidden bg-white">
        <CardHeader className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-ml-blue" />
              Directorio de Usuarios
            </CardTitle>
            <CardDescription className="font-bold">Listado completo de clientes registrados en la plataforma.</CardDescription>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Buscar por email o nombre..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 border-slate-200 rounded-xl focus:ring-ml-blue font-medium"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
             <div className="flex flex-col items-center justify-center py-32 space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-ml-blue" />
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Cargando base de datos...</p>
             </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="divide-y divide-slate-100">
                <AnimatePresence>
                  {filteredUsers.map((user, idx) => (
                    <motion.div 
                      key={user.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className="p-6 hover:bg-slate-50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
                    >
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-[1.25rem] bg-white border border-slate-200 shadow-sm flex items-center justify-center relative overflow-hidden group">
                           {user.isAdmin && (
                             <div className="absolute inset-0 bg-ml-blue opacity-5"></div>
                           )}
                           <UserIcon className={`w-6 h-6 ${user.isAdmin ? 'text-ml-blue' : 'text-slate-400'}`} />
                           {user.isAdmin && (
                             <ShieldIcon className="absolute top-1 right-1 w-3 h-3 text-ml-blue fill-ml-blue" />
                           )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-base font-black text-slate-900 tracking-tight">{user.displayName || (user.email ? user.email.split('@')[0] : 'Usuario')}</p>
                            {user.isAdmin && (
                              <Badge className="bg-ml-blue/10 text-ml-blue border-none font-black uppercase text-[9px] px-2">ADMIN</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-400 mt-0.5">
                            <Mail className="w-3 h-3" />
                            <span className="text-xs font-bold">{user.email || 'Sin correo'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <div className="px-4 py-2 bg-slate-100 rounded-xl border border-slate-200 text-center min-w-[100px]">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">Balance</p>
                          <p className="text-lg font-black text-slate-900 tracking-tight">{user.tokenBalance || 0}</p>
                        </div>
                        
                        <Button 
                          variant="outline" 
                          className="h-12 px-6 border-ml-blue text-ml-blue font-black rounded-xl hover:bg-ml-blue hover:text-white transition-all gap-2"
                          onClick={() => {
                            setSelectedUser(user);
                            setIsGiftModalOpen(true);
                          }}
                        >
                          <Plus className="w-4 h-4" /> 
                          Regalar Tokens
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {filteredUsers.length === 0 && (
                   <div className="py-20 text-center">
                      <p className="text-slate-400 font-bold italic">No se encontraron usuarios que coincidan con la búsqueda.</p>
                   </div>
                )}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Gift Tokens Modal */}
      <Dialog open={isGiftModalOpen} onOpenChange={setIsGiftModalOpen}>
        <DialogContent className="rounded-[2rem] border-none shadow-3xl bg-white max-w-md">
          <DialogHeader className="space-y-4">
            <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
               <Gift className="w-8 h-8 text-purple-600" />
            </div>
            <div className="text-center">
              <DialogTitle className="text-2xl font-black text-slate-900">Acreditar Tokens</DialogTitle>
              <DialogDescription className="font-bold">
                Estás por regalar tokens a <span className="text-slate-900">{selectedUser?.email || selectedUser?.id}</span>
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="space-y-6 py-6">
            <div className="space-y-3">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Cantidad de Tokens</Label>
              <Input 
                type="number" 
                value={giftAmount}
                onChange={(e) => setGiftAmount(e.target.value)}
                className="h-14 text-2xl font-black border-slate-200 rounded-2xl focus:ring-purple-500 text-center"
              />
              <div className="flex gap-2">
                {['50', '100', '500'].map(val => (
                  <Button 
                    key={val}
                    variant="outline" 
                    className={`flex-1 rounded-xl font-bold h-10 ${giftAmount === val ? 'bg-purple-50 border-purple-200 text-purple-600' : 'border-slate-100'}`}
                    onClick={() => setGiftAmount(val)}
                  >
                    +{val}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Motivo / Descripción</Label>
              <Input 
                placeholder="Ej: Bonificación por fidelidad" 
                value={giftReason}
                onChange={(e) => setGiftReason(e.target.value)}
                className="h-12 border-slate-200 rounded-xl focus:ring-purple-500 font-medium"
              />
            </div>
          </div>

          <DialogFooter className="flex-col gap-3 sm:flex-col">
            <Button 
              className="w-full h-14 bg-purple-600 text-white hover:bg-purple-700 font-black rounded-2xl shadow-lg gap-2 text-base transition-all"
              onClick={handleGiftTokens}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Gift className="w-5 h-5" />}
              Confirmar Acreditación
            </Button>
            <Button 
              variant="ghost" 
              className="w-full h-10 rounded-xl font-bold text-slate-400"
              onClick={() => setIsGiftModalOpen(false)}
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
