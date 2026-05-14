import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Copy, 
  Loader2, 
  Package, 
  Layers, 
  Search,
  FileText,
  AlertCircle,
  Sparkles,
  Download,
  X,
  Upload,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Coins,
  Check,
  CheckCircle2,
  Maximize2,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  FileStack
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';

import { Category, ProductInput, GenerationResult, BatchResult, HistoryItem } from '../../types';
import { CATEGORIES } from '../../constants';
import { generateMLContent } from '../../services/gemini';
import { db } from '../../lib/firebase';
import { doc, updateDoc, increment, collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface SeoOptimizerProps {
  user: any;
  userData: any;
  isAdmin: boolean;
  saveToHistory: (item: HistoryItem) => void;
  openPayModal: () => void;
  onRequireAuth: () => boolean;
}

export default function SeoOptimizer({ user, userData, isAdmin, saveToHistory, openPayModal, onRequireAuth }: SeoOptimizerProps) {
  const [activeTab, setActiveTab] = React.useState<'individual' | 'batch'>('individual');
  const [loading, setLoading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const excelInputRef = React.useRef<HTMLInputElement>(null);

  const [deepSearch, setDeepSearch] = React.useState(true);

  // Individual State
  const [individualInput, setIndividualInput] = React.useState<ProductInput>({
    id: '1',
    sku: '',
    title: '',
    characteristics: '',
    category: 'electronica',
    image: undefined
  });
  const [individualResult, setIndividualResult] = React.useState<GenerationResult | null>(null);
  const [selectedIndividual, setSelectedIndividual] = React.useState<{ title: number; desc: number }>({ title: 0, desc: 0 });

  // Batch State
  const [batchInputs, setBatchInputs] = React.useState<ProductInput[]>([
    { id: Math.random().toString(36).substr(2, 9), sku: '', title: '', characteristics: '', category: 'electronica' }
  ]);
  const [batchResults, setBatchResults] = React.useState<BatchResult[]>([]);
  const [selectedBatch, setSelectedBatch] = React.useState<Record<string, { title: number; desc: number }>>({});

  // Modal State
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalData, setModalData] = React.useState<{
    productId: string;
    productTitle: string;
    descriptions: string[];
    currentIndex: number;
  } | null>(null);

  const abortControllerRef = React.useRef<AbortController | null>(null);

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setLoading(false);
      toast.info('Generación detenida por el usuario');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, productId?: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      toast.error('La imagen debe ser menor a 4MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      if (productId) {
        setBatchInputs(batchInputs.map(p => p.id === productId ? { ...p, image: base64 } : p));
      } else {
        setIndividualInput({ ...individualInput, image: base64 });
      }
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (productId?: string) => {
    if (productId) {
      setBatchInputs(batchInputs.map(p => p.id === productId ? { ...p, image: undefined } : p));
    } else {
      setIndividualInput({ ...individualInput, image: undefined });
    }
  };

  const addBatchProduct = () => {
    setBatchInputs([...batchInputs, { id: Math.random().toString(36).substr(2, 9), sku: '', title: '', characteristics: '', category: 'electronica' }]);
  };

  const removeBatchProduct = (id: string) => {
    if (batchInputs.length > 1) {
      setBatchInputs(batchInputs.filter(p => p.id !== id));
    }
  };

  const updateBatchProduct = (id: string, field: keyof ProductInput, value: any) => {
    setBatchInputs(batchInputs.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const openDescriptionModal = (productId: string, productTitle: string, descriptions: string[], currentIndex: number) => {
    setModalData({ productId, productTitle, descriptions, currentIndex });
    setModalOpen(true);
  };

  const navigateModal = (dir: 'next' | 'prev') => {
    if (!modalData) return;
    const { descriptions, currentIndex } = modalData;
    let nextIndex = dir === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= descriptions.length) nextIndex = 0;
    if (nextIndex < 0) nextIndex = descriptions.length - 1;
    setModalData({ ...modalData, currentIndex: nextIndex });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado al portapapeles');
  };

  const downloadExcel = () => {
    const dataToExport = activeTab === 'individual' && individualResult 
      ? [{
          SKU: individualInput.sku,
          Título: individualResult.titles[selectedIndividual.title],
          Categoría: CATEGORIES.find(c => c.value === individualInput.category)?.label,
          Descripción: individualResult.descriptions[selectedIndividual.desc],
          Keywords: individualResult.keywords.join(', ')
        }]
      : batchResults.map(batch => {
          const input = batchInputs.find(p => p.id === batch.productId);
          const selection = selectedBatch[batch.productId] || { title: 0, desc: 0 };
          return {
            SKU: input?.sku,
            Título: batch.result.titles[selection.title],
            Categoría: CATEGORIES.find(c => c.value === input?.category)?.label,
            Descripción: batch.result.descriptions[selection.desc],
            Keywords: batch.result.keywords.join(', ')
          };
        });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Resultados SEO");
    XLSX.writeFile(wb, `SEO_Ecommerce_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const downloadTemplate = () => {
    const template = [
      { SKU: 'EJ123', Titulo: 'Nombre del Producto', Caracteristicas: 'Medidas, material, color, etc.', Categoria: 'electronica' }
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
    XLSX.writeFile(wb, "Plantilla_Carga_SEO.xlsx");
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);

      const newInputs = data.map((row: any) => ({
        id: Math.random().toString(36).substr(2, 9),
        sku: row.SKU || row.sku || '',
        title: row.Titulo || row.titulo || row.Title || '',
        characteristics: row.Caracteristicas || row.caracteristicas || '',
        category: (row.Categoria || row.categoria || 'electronica').toLowerCase() as Category
      }));

      if (newInputs.length > 0) {
        setBatchInputs(newInputs);
        toast.success(`${newInputs.length} productos cargados desde Excel`);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleIndividualGenerate = async () => {
    if (!onRequireAuth()) return;

    const cost = deepSearch ? 2 : 1;
    const currentBalance = userData?.tokenBalance || 0;

    if (!isAdmin && currentBalance < cost) {
      toast.error(`No tienes tokens suficientes (${cost} requeridos)`);
      openPayModal();
      return;
    }

    if (!individualInput.title || !individualInput.characteristics) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    setLoading(true);
    toast.loading('Optimizando SEO individual...', { id: 'gen-toast' });
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      const result = await generateMLContent(individualInput, deepSearch);
      
      if (signal.aborted) return;

      if (!isAdmin) {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          tokenBalance: increment(-cost),
          updatedAt: serverTimestamp()
        });

        await addDoc(collection(db, 'transactions'), {
          uid: user.uid,
          amount: -cost,
          type: 'usage',
          description: `Generación individual${deepSearch ? ' (Deep Search)' : ''}: ${individualInput.title}`,
          timestamp: serverTimestamp()
        });
      }

      setIndividualResult(result);
      setSelectedIndividual({ title: 0, desc: 0 });
      toast.success('Contenido generado exitosamente', { id: 'gen-toast' });
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      console.error("Generation error:", error);
      toast.error(error.message || 'Error al generar contenido');
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleBatchGenerate = async () => {
    if (!onRequireAuth()) return;

    const tokenCost = batchInputs.length * (deepSearch ? 2 : 1);
    const currentBalance = userData?.tokenBalance || 0;

    if (!isAdmin && currentBalance < tokenCost) {
      toast.error(`No tienes tokens suficientes (${tokenCost} requeridos)`);
      openPayModal();
      return;
    }

    const invalid = batchInputs.some(p => !p.title || !p.characteristics);
    if (invalid) {
      toast.error('Por favor completa todos los campos de todos los productos');
      return;
    }

    setLoading(true);
    toast.loading(`Generando lote de ${batchInputs.length} productos...`, { id: 'batch-toast' });
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      const resultsPromises = batchInputs.map(async (input) => {
        const result = await generateMLContent(input, deepSearch);
        return { productId: input.id, result };
      });

      const results = await Promise.all(resultsPromises);
      
      if (signal.aborted) return;

      if (!isAdmin) {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          tokenBalance: increment(-tokenCost),
          updatedAt: serverTimestamp()
        });

        await addDoc(collection(db, 'transactions'), {
          uid: user.uid,
          amount: -tokenCost,
          type: 'usage',
          description: `Generación por lote${deepSearch ? ' (Deep Search)' : ''}: ${tokenCost} productos`,
          timestamp: serverTimestamp()
        });
      }

      const initialSelections: Record<string, { title: number; desc: number }> = {};
      results.forEach(res => {
        initialSelections[res.productId] = { title: 0, desc: 0 };
      });

      setBatchResults(results);
      setSelectedBatch(initialSelections);
      toast.success(`Lote de ${results.length} productos generado con éxito`, { id: 'batch-toast' });
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      console.error("Batch generation error:", error);
      toast.error(error.message || 'Error al generar el lote');
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const resetIndividual = () => {
    if (individualResult) {
      saveToHistory({
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        tool: 'seo',
        type: 'individual',
        data: [{
          sku: individualInput.sku,
          productTitle: individualInput.title,
          category: individualInput.category,
          selectedTitle: individualResult.titles[selectedIndividual.title],
          selectedDescription: individualResult.descriptions[selectedIndividual.desc],
          keywords: individualResult.keywords
        }]
      });
    }
    setIndividualInput({ id: '1', sku: '', title: '', characteristics: '', category: 'electronica', image: undefined });
    setIndividualResult(null);
    setSelectedIndividual({ title: 0, desc: 0 });
  };

  const resetBatch = () => {
    if (batchResults.length > 0) {
      saveToHistory({
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        tool: 'seo',
        type: 'batch',
        data: batchResults.map(batch => {
          const input = batchInputs.find(p => p.id === batch.productId);
          const selection = selectedBatch[batch.productId] || { title: 0, desc: 0 };
          return {
            sku: input?.sku,
            productTitle: input?.title || 'Sin nombre',
            category: input?.category || 'electronica',
            selectedTitle: batch.result.titles[selection.title],
            selectedDescription: batch.result.descriptions[selection.desc],
            keywords: batch.result.keywords
          };
        })
      });
    }
    setBatchInputs([{ id: Math.random().toString(36).substr(2, 9), sku: '', title: '', characteristics: '', category: 'electronica' }]);
    setBatchResults([]);
    setSelectedBatch({});
  };

  return (
    <div className="flex flex-col w-full max-w-6xl mx-auto space-y-12 pb-20">
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full border-none shadow-none bg-transparent flex flex-col gap-10">
        {/* Superior Section - Full Width */}
      <div className="w-full space-y-8">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-6">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-slate-900">E-commerce SEO Optimizer</h2>
            <p className="text-slate-500 font-medium text-sm">Optimiza títulos y descripciones con inteligencia artificial.</p>
          </div>
          
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-2 bg-slate-100/50 px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm">
                <Coins className="w-4 h-4 text-ml-yellow fill-ml-yellow" />
                <span className="text-xs font-black text-slate-900">{userData?.tokenBalance || 0} Tokens</span>
            </div>

            <Button 
                variant="outline"
                className="h-9 px-4 border-slate-200 rounded-xl font-black text-slate-500 text-sm hover:bg-white transition-all shadow-sm hover:border-red-200 hover:text-red-500 group"
                onClick={activeTab === 'batch' ? resetBatch : resetIndividual}
                disabled={loading}
            >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5 group-hover:rotate-180 transition-transform duration-500" /> Reiniciar
            </Button>

            <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
                <button 
                onClick={() => setActiveTab('individual')}
                className={`px-4 py-2 rounded-lg font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 ${activeTab === 'individual' ? 'bg-white shadow-sm text-ml-blue' : 'text-slate-500 hover:text-slate-700'}`}
                >
                <Package className="w-3.5 h-3.5" /> Individual
                </button>
                <button 
                onClick={() => setActiveTab('batch')}
                className={`px-4 py-2 rounded-lg font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 ${activeTab === 'batch' ? 'bg-white shadow-sm text-ml-blue' : 'text-slate-500 hover:text-slate-700'}`}
                >
                <FileStack className="w-3.5 h-3.5" /> En Lote
                </button>
            </div>
          </div>
        </div>
      </div>

        {/* Main Content Card - Stays Below Header */}
        <motion.section 
          layout
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full"
        >
          <Card className="border-none ring-1 ring-slate-200 shadow-3xl rounded-2xl sm:rounded-[3rem] overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/80 border-b border-slate-100 p-5 sm:p-10">
              <div className="flex items-center gap-4">
                <div className="bg-ml-blue p-2.5 rounded-xl shadow-lg shadow-ml-blue/20 shrink-0">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-black text-slate-900 tracking-tight">Datos del Producto</CardTitle>
                  <CardDescription className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">Configuración de Optimización SEO</CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-8 sm:p-10">
              <TabsContent value="individual" className="mt-0 space-y-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                   {/* Main Data Column */}
                   <div className="lg:col-span-12 space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="sku" className="text-xs font-black uppercase text-slate-400 ml-1">SKU / Modelo</Label>
                          <Input 
                            id="sku" 
                            placeholder="ART-001" 
                            className="border-slate-200 h-14 text-lg font-bold rounded-xl transition-all focus:ring-ml-blue bg-slate-50/30" 
                            value={individualInput.sku || ''}
                            onChange={(e) => setIndividualInput({ ...individualInput, sku: e.target.value })}
                          />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                          <Label htmlFor="title" className="text-xs font-black uppercase text-slate-400 ml-1">nombre real o título actual</Label>
                          <Input 
                            id="title" 
                            placeholder="Ej: Auriculares Bluetooth Pro Cancelación de Ruido" 
                            className="border-slate-200 h-14 text-lg font-bold rounded-xl transition-all focus:ring-ml-blue bg-slate-50/30"
                            value={individualInput.title || ''}
                            onChange={(e) => setIndividualInput({ ...individualInput, title: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                         <div className="lg:col-span-2 space-y-6">
                            <div className="space-y-2">
                              <Label className="text-xs font-black uppercase text-slate-400 ml-1">Rubro / Categoría Principal</Label>
                              <Select 
                                value={individualInput.category} 
                                onValueChange={(val: Category) => setIndividualInput({ ...individualInput, category: val })}
                              >
                                <SelectTrigger className="border-slate-200 h-14 text-lg font-bold rounded-xl bg-slate-50/30">
                                  <SelectValue placeholder="Electrónica" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                                  {CATEGORIES.map(cat => (
                                    <SelectItem key={cat.value} value={cat.value} className="font-bold py-3">{cat.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="characteristics" className="text-xs font-black uppercase text-slate-400 ml-1">Características y Especificaciones Técnicas</Label>
                              <div className="relative group">
                                <Textarea 
                                  id="characteristics" 
                                  placeholder="Ej: Material: Aluminio - Batería: 20h - Incluye: Cable USB-C, Manual" 
                                  className="min-h-[180px] border-slate-200 text-lg font-medium p-6 rounded-2xl bg-slate-50/30 focus:bg-white transition-all ring-offset-0 focus:ring-1 focus:ring-ml-blue"
                                  value={individualInput.characteristics || ''}
                                  onChange={(e) => setIndividualInput({ ...individualInput, characteristics: e.target.value })}
                                />
                                <div className="absolute bottom-4 right-4 text-slate-200 group-focus-within:text-ml-blue transition-colors">
                                  <FileText className="w-8 h-8 opacity-20 group-focus-within:opacity-100" />
                                </div>
                              </div>
                            </div>
                         </div>

                         {/* Image Upload Zone */}
                         <div className="space-y-4">
                            <Label className="text-xs font-black uppercase text-slate-400 ml-1 text-center block">Referencia Visual</Label>
                            <div 
                              className={`relative border-2 border-dashed rounded-[2.5rem] aspect-square transition-all cursor-pointer flex flex-col items-center justify-center p-4 overflow-hidden group 
                                ${individualInput.image ? 'border-ml-blue bg-ml-blue/5' : 'border-slate-200 hover:border-ml-blue hover:bg-slate-50 shadow-inner'}`}
                              onClick={() => fileInputRef.current?.click()}
                              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-ml-blue', 'bg-ml-blue/10'); }}
                              onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-ml-blue', 'bg-ml-blue/10'); }}
                              onDrop={(e) => {
                                e.preventDefault();
                                e.currentTarget.classList.remove('border-ml-blue', 'bg-ml-blue/10');
                                const file = e.dataTransfer.files[0];
                                if (file && file.type.startsWith('image/')) {
                                  const reader = new FileReader();
                                  reader.onload = (evt) => setIndividualInput({ ...individualInput, image: evt.target?.result as string });
                                  reader.readAsDataURL(file);
                                }
                              }}
                              onPaste={(e) => {
                                const item = e.clipboardData.items[0];
                                if (item?.type.startsWith('image/')) {
                                  const file = item.getAsFile();
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (evt) => setIndividualInput({ ...individualInput, image: evt.target?.result as string });
                                    reader.readAsDataURL(file);
                                  }
                                }
                              }}
                            >
                              {individualInput.image ? (
                                <div className="relative w-full h-full">
                                  <img src={individualInput.image} className="w-full h-full object-contain rounded-3xl" alt="preview" referrerPolicy="no-referrer" />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center rounded-3xl backdrop-blur-[2px]">
                                     <Button 
                                       variant="destructive" 
                                       size="icon" 
                                       className="h-12 w-12 rounded-full shadow-2xl"
                                       onClick={(e) => { e.stopPropagation(); removeImage(); }}
                                     >
                                       <Trash2 className="w-5 h-5" />
                                     </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center text-center p-6 space-y-4">
                                  <div className="bg-white p-6 rounded-[2rem] shadow-xl ring-1 ring-slate-100 group-hover:scale-110 transition-transform duration-300">
                                    <Upload className="w-8 h-8 text-slate-300 group-hover:text-ml-blue" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-black text-slate-800">Arrastra, Pega o Sube</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Soporta PNG, JPG</p>
                                  </div>
                                </div>
                              )}
                              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e)} />
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
                
                <div className="space-y-8 pt-10 border-t border-slate-100">
                  <div className={`flex items-center space-x-6 p-6 rounded-[2rem] border-2 transition-all duration-300 ${deepSearch ? 'bg-blue-50/50 border-ml-blue/20 shadow-lg shadow-ml-blue/10' : 'bg-emerald-50/50 border-emerald-200/50'}`}>
                    <Checkbox 
                      id="deepSearch" 
                      checked={deepSearch} 
                      onCheckedChange={(checked) => setDeepSearch(!!checked)} 
                      className={`w-7 h-7 rounded-xl border-slate-300 data-[state=checked]:bg-ml-blue data-[state=checked]:border-ml-blue transition-all cursor-pointer`}
                    />
                    <div className="grid gap-2 leading-none flex-1">
                      <label
                        htmlFor="deepSearch"
                        className="text-lg font-black leading-none cursor-pointer flex items-center gap-3"
                      >
                        {deepSearch ? "Modo Deep Search Expert" : "Generación Lightning Fast"}
                        {deepSearch ? (
                          <Badge className="bg-ml-blue h-6 text-[10px] px-3 uppercase font-black rounded-lg">Impacto Máximo</Badge>
                        ) : (
                          <Badge className="bg-emerald-600 h-6 text-[10px] px-3 uppercase font-black rounded-lg">Segundos</Badge>
                        )}
                      </label>
                      <p className="text-xs text-slate-500 font-bold leading-relaxed max-w-3xl">
                        {deepSearch 
                          ? "Utiliza agentes de búsqueda web para analizar tendencias de mercado en tiempo real. Optimización técnica SEO categoría 1. Consume 2 Tokens." 
                          : "Generación instantánea utilizando patrones de copy ganadores ya pre-entrenados. Sin búsqueda externa. Consume 1 Token."}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-6">
                    <Button 
                      variant="outline"
                      className="flex-1 sm:flex-none h-20 px-8 border-slate-200 rounded-[1.5rem] font-black text-slate-500 hover:bg-white transition-all shadow-sm hover:border-red-200 hover:text-red-500 group"
                      onClick={resetIndividual}
                      disabled={loading}
                    >
                      <RefreshCw className="w-6 h-6 mr-3 group-hover:rotate-180 transition-transform duration-500" /> Reiniciar
                    </Button>

                    <Button 
                      className="flex-1 bg-ml-blue hover:bg-ml-blue/90 text-white font-black h-16 sm:h-20 text-base sm:text-2xl shadow-2xl shadow-ml-blue/40 rounded-2xl sm:rounded-[1.5rem] transition-all hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden group"
                      onClick={handleIndividualGenerate}
                      disabled={loading || (!isAdmin && (userData?.tokenBalance || 0) < (deepSearch ? 2 : 1))}
                    >
                      <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                      {loading ? <Loader2 className="w-5 h-5 sm:w-8 sm:h-8 animate-spin mr-2 sm:mr-3 shrink-0" /> : <Sparkles className="w-5 h-5 sm:w-8 sm:h-8 mr-2 sm:mr-3 shrink-0" />}
                      <span className="truncate">Generar SEO Maestro</span>
                      <div className="ml-2 sm:ml-4 flex items-center gap-1 bg-black/20 px-2 sm:px-3 py-1 rounded-full text-xs font-black shrink-0">
                         <Coins className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> {deepSearch ? 2 : 1}
                      </div>
                    </Button>
                    {loading && (
                      <Button 
                        variant="destructive" 
                        className="h-20 px-10 font-black rounded-[1.5rem] text-xl shadow-xl animate-in zoom-in"
                        onClick={handleStop}
                      >
                        <X className="w-6 h-6 mr-2" /> Detener
                      </Button>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="batch" className="mt-0 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Button variant="outline" className="flex-1 gap-4 border-slate-200 h-20 rounded-[1.5rem] font-black hover:bg-slate-50 transition-all text-lg shadow-sm group" onClick={downloadTemplate}>
                    <Download className="w-6 h-6 text-slate-400 group-hover:text-ml-blue transition-colors" /> 
                    <div>
                      <p>Descargar Plantilla</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Formato .xlsx</p>
                    </div>
                  </Button>
                  <Button variant="secondary" className="flex-1 gap-4 h-20 rounded-[1.5rem] font-black bg-slate-100 hover:bg-slate-200 transition-all text-lg shadow-sm group" onClick={() => excelInputRef.current?.click()}>
                    <FileSpreadsheet className="w-6 h-6 text-ml-blue" />
                    <div className="text-left">
                      <p>Subir Excel Completo</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Procesamiento masivo</p>
                    </div>
                  </Button>
                  <input type="file" ref={excelInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleExcelUpload} />
                </div>

            {batchInputs.length > 0 && (
              <div className="space-y-8">
                <div className={`flex items-center space-x-3 p-6 rounded-2xl border transition-all duration-200 ${deepSearch ? 'bg-blue-50 border-ml-blue/30' : 'bg-green-50 border-green-200'}`}>
                  <Checkbox 
                    id="deepSearchBatch" 
                    checked={deepSearch} 
                    onCheckedChange={(checked) => setDeepSearch(!!checked)} 
                    className={`w-6 h-6 border-slate-400 data-[state=checked]:bg-ml-blue data-[state=checked]:border-ml-blue`}
                  />
                  <div className="grid gap-1 leading-none">
                    <label
                      htmlFor="deepSearchBatch"
                      className="text-base font-bold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                    >
                      {deepSearch ? "Deep Search: Investigación SEO Profunda" : "Generación Ultra Rápida"}
                      {deepSearch ? (
                        <Badge className="bg-ml-blue h-5 text-[10px] px-2.5 uppercase leading-none font-black animate-in fade-in zoom-in">Mejor Calidad</Badge>
                      ) : (
                        <Badge className="bg-green-600 h-5 text-[10px] px-2.5 uppercase leading-none font-black animate-in fade-in zoom-in">Extrema Velocidad</Badge>
                      )}
                    </label>
                    <p className="text-xs text-slate-500 font-bold leading-normal mt-1">
                      {deepSearch 
                        ? "Realiza búsquedas web externas para cada producto. Consume 2 Tokens por unidad." 
                        : "Generación en masa instantánea sin búsqueda externa. Consume 1 Token por unidad."}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-2 p-8 bg-slate-900 rounded-2xl text-white shadow-2xl">
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-3">
                      <Layers className="w-8 h-8 text-ml-yellow" />
                      <span className="text-2xl font-black uppercase tracking-tight">Costo Total: {batchInputs.length * (deepSearch ? 2 : 1)} Tokens</span>
                    </div>
                    <p className="text-slate-400 font-bold text-sm mt-1">{deepSearch ? 2 : 1} tokens por cada uno de los {batchInputs.length} productos</p>
                  </div>
                  {userData?.tokenBalance !== undefined && userData.tokenBalance < batchInputs.length * (deepSearch ? 2 : 1) && !isAdmin && (
                    <motion.div 
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="mt-4 bg-red-600/20 border border-red-600/40 rounded-xl px-6 py-3 text-center"
                    >
                      <p className="text-sm text-red-100 font-black">
                        Saldo insuficiente. Te faltan {(batchInputs.length * (deepSearch ? 2 : 1)) - userData.tokenBalance} tokens.
                      </p>
                    </motion.div>
                  )}
                </div>

                <div className="flex gap-4">
                  <Button 
                    variant="outline"
                    className="flex-1 sm:flex-none h-20 px-8 border-slate-200 rounded-2xl font-black text-slate-500 hover:bg-white transition-all shadow-sm hover:border-red-200 hover:text-red-500 group"
                    onClick={resetBatch}
                    disabled={loading}
                  >
                    <RefreshCw className="w-6 h-6 mr-3 group-hover:rotate-180 transition-transform duration-500" /> Reiniciar Lote
                  </Button>

                  <Button 
                    className="flex-1 bg-ml-blue hover:bg-ml-blue/90 text-white font-black h-16 sm:h-20 text-lg sm:text-2xl shadow-xl shadow-ml-blue/30 rounded-2xl transition-all hover:scale-[1.01] active:scale-[0.99]"
                    onClick={handleBatchGenerate}
                    disabled={loading || (!isAdmin && (userData?.tokenBalance || 0) < batchInputs.length * (deepSearch ? 2 : 1))}
                  >
                    {loading ? <Loader2 className="w-8 h-8 animate-spin mr-3" /> : <Sparkles className="w-8 h-8 mr-3" />}
                    Generar Lote Completo ({batchInputs.length})
                  </Button>
                  {loading && (
                    <Button 
                      variant="destructive" 
                      className="h-20 px-10 font-black rounded-2xl"
                      onClick={handleStop}
                    >
                      Detener
                    </Button>
                  )}
                </div>

                <div className="grid gap-6">
                  {batchInputs.map((product, index) => (
                    <Card key={product.id} className="border-slate-200 shadow-sm rounded-xl overflow-hidden ring-1 ring-slate-100 border-none transition-hover hover:ring-slate-300">
                      <CardHeader className="py-4 px-6 bg-slate-50 flex flex-row items-center justify-between border-b border-slate-100">
                        <Badge className="bg-slate-200 text-slate-700 font-black">Producto #{index + 1}</Badge>
                        <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-destructive hover:bg-destructive/5 rounded-full" onClick={() => removeBatchProduct(product.id)}>
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </CardHeader>
                      <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <Label className="text-[10px] font-bold uppercase text-slate-400">Título Actual</Label>
                              <Input 
                                placeholder="Nombre del producto" 
                                value={product.title || ''}
                                onChange={(e) => updateBatchProduct(product.id, 'title', e.target.value)}
                                className="border-slate-200 h-10 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] font-bold uppercase text-slate-400">Categoría</Label>
                              <Select value={product.category} onValueChange={(val: Category) => updateBatchProduct(product.id, 'category', val)}>
                                <SelectTrigger className="border-slate-200 h-10 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {CATEGORIES.map(cat => (
                                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold uppercase text-slate-400">Características</Label>
                            <Textarea 
                              placeholder="Medidas, material, etc."
                              value={product.characteristics || ''}
                              onChange={(e) => updateBatchProduct(product.id, 'characteristics', e.target.value)}
                              className="min-h-[80px] border-slate-200 text-sm"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase text-slate-400 text-center block">Imagen</Label>
                          <div 
                            className={`relative border-2 border-dashed rounded-xl h-[130px] flex flex-col items-center justify-center cursor-pointer transition-colors ${product.image ? 'border-ml-blue bg-ml-blue/5' : 'border-slate-200 hover:bg-slate-50'}`}
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = 'image/*';
                              input.onchange = (e) => handleImageUpload(e as any, product.id);
                              input.click();
                            }}
                          >
                            {product.image ? (
                              <div className="relative w-full h-full p-2">
                                <img src={product.image} className="w-full h-full object-contain rounded-lg" alt="preview" referrerPolicy="no-referrer" />
                                <Button 
                                  variant="destructive" 
                                  size="icon" 
                                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full shadow-md"
                                  onClick={(e) => { e.stopPropagation(); removeImage(product.id); }}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            ) : (
                              <>
                                <ImageIcon className="w-6 h-6 text-slate-300 mb-1" />
                                <span className="text-[10px] font-bold text-slate-400">Subir imagen</span>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  <Button variant="outline" className="w-full border-dashed border-slate-300 h-16 rounded-2xl font-bold bg-white hover:bg-slate-50 text-slate-600 transition-all hover:border-ml-blue hover:text-ml-blue" onClick={addBatchProduct}>
                    <Plus className="w-5 h-5 mr-3" /> Agregar otro producto manualmente
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </CardContent>
      </Card>
    </motion.section>
  </Tabs>

      {/* Results Rendering */}
      <AnimatePresence>
        {((activeTab === 'individual' && individualResult) || (activeTab === 'batch' && batchResults.length > 0)) && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-10 mt-16"
          >
            <Separator className="bg-slate-200" />
            
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-3xl font-black tracking-tight text-slate-900">Resultados Optimizados</h2>
                <p className="text-sm font-bold text-slate-500">Selecciona las versiones finales y descarga tu reporte.</p>
              </div>
              <div className="flex gap-4 w-full md:w-auto">
                <Button 
                  variant="outline" 
                  className="flex-1 md:flex-none gap-2 border-slate-300 h-12 px-6 rounded-xl font-bold hover:bg-slate-100" 
                  onClick={activeTab === 'individual' ? resetIndividual : resetBatch}
                >
                  <Plus className="w-4 h-4" /> Nueva Carga
                </Button>
                <Button className="flex-1 md:flex-none gap-2 bg-emerald-600 hover:bg-emerald-700 text-white h-12 px-6 rounded-xl font-bold shadow-lg shadow-emerald-200" onClick={downloadExcel}>
                  <Download className="w-4 h-4" /> Exportar a Excel
                </Button>
              </div>
            </div>

            {activeTab === 'individual' && individualResult && (
              <div className="space-y-12">
                <section className="space-y-4 bg-white p-8 rounded-3xl ring-1 ring-slate-200 shadow-xl shadow-slate-100/50">
                  <h3 className="text-xs font-black uppercase tracking-widest text-ml-blue flex items-center gap-2">
                    <Search className="w-5 h-5" /> Palabras Clave de Alto Impacto
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {individualResult.keywords.map((kw, i) => (
                      <Badge key={i} variant="secondary" className="bg-slate-100 text-slate-700 border-none px-4 py-2 text-xs font-bold rounded-xl hover:bg-ml-blue/10 hover:text-ml-blue transition-all cursor-default uppercase tracking-tight">
                        {kw}
                      </Badge>
                    ))}
                  </div>
                </section>

                <div className="space-y-6">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 ml-2">
                    <CheckCircle2 className="w-5 h-5 text-ml-blue" /> Sugerencias de Títulos Ganadores
                  </h3>
                  <div className="grid gap-4">
                    {individualResult.titles.map((title, i) => (
                      <div 
                        key={i} 
                        className={`group flex items-center gap-5 p-6 rounded-2xl border-2 transition-all cursor-pointer ${selectedIndividual.title === i ? 'bg-ml-blue/5 border-ml-blue shadow-lg shadow-ml-blue/5' : 'bg-white border-slate-100 hover:border-slate-300'}`}
                        onClick={() => setSelectedIndividual({ ...selectedIndividual, title: i })}
                      >
                        <Checkbox checked={selectedIndividual.title === i} className="w-6 h-6 border-slate-300" onCheckedChange={() => setSelectedIndividual({ ...selectedIndividual, title: i })} />
                        <p className="flex-1 font-bold text-lg text-slate-800 leading-tight">{title}</p>
                        <div className="flex items-center gap-4">
                          <Badge variant="outline" className={`font-black text-[10px] ${title.length > 55 ? 'text-red-500 border-red-100 bg-red-50' : 'text-slate-400 border-slate-100'}`}>
                            {title.length}/60
                          </Badge>
                          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-slate-50" onClick={(e) => { e.stopPropagation(); copyToClipboard(title); }}>
                            <Copy className="w-5 h-5 text-slate-400" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 ml-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Descripciones que multiplican ventas
                  </h3>
                  <div className="grid gap-8">
                    {individualResult.descriptions.map((desc, i) => (
                      <div 
                        key={i} 
                        className={`relative group p-8 rounded-3xl border-2 transition-all cursor-pointer ${selectedIndividual.desc === i ? 'bg-emerald-50/50 border-emerald-500 shadow-lg shadow-emerald-50' : 'bg-white border-slate-100 hover:border-slate-300'}`}
                        onClick={() => setSelectedIndividual({ ...selectedIndividual, desc: i })}
                      >
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-4">
                            <Checkbox checked={selectedIndividual.desc === i} className="w-6 h-6 border-slate-300" onCheckedChange={() => setSelectedIndividual({ ...selectedIndividual, desc: i })} />
                            <Badge className="bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest">Variante SEO #{i + 1}</Badge>
                          </div>
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="outline" size="sm" className="h-10 gap-2 font-bold border-slate-200 rounded-xl" onClick={(e) => { e.stopPropagation(); openDescriptionModal('1', individualInput.title, individualResult.descriptions, i); }}>
                              <Maximize2 className="w-4 h-4" /> Expandir
                            </Button>
                            <Button variant="outline" size="sm" className="h-10 gap-2 font-bold border-slate-200 rounded-xl" onClick={(e) => { e.stopPropagation(); copyToClipboard(desc); }}>
                              <Copy className="w-4 h-4" /> Copiar
                            </Button>
                          </div>
                        </div>
                        <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed line-clamp-4 font-medium">
                          <ReactMarkdown>{desc}</ReactMarkdown>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'batch' && batchResults.length > 0 && (
              <div className="grid gap-8">
                {batchResults.map((batch) => {
                  const input = batchInputs.find(p => p.id === batch.productId);
                  const selection = selectedBatch[batch.productId] || { title: 0, desc: 0 };
                  return (
                    <Card key={batch.productId} className="border-none ring-1 ring-slate-200 shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden group transition-all hover:ring-ml-blue/30">
                      <CardHeader className="py-5 px-8 bg-slate-900 text-white flex flex-row items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="bg-white/10 p-2 rounded-xl">
                            <Package className="w-5 h-5 text-ml-yellow" />
                          </div>
                          <div>
                            <CardTitle className="text-base font-black truncate max-w-xs">{input?.title || 'Producto'}</CardTitle>
                            {input?.sku && <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">REF: {input.sku}</p>}
                          </div>
                        </div>
                        <Badge className="bg-ml-blue text-white font-black border-none uppercase text-[10px] tracking-widest">{input?.category}</Badge>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="grid grid-cols-1 xl:grid-cols-2 divide-y xl:divide-y-0 xl:divide-x divide-slate-100">
                          <div className="p-8 space-y-6 bg-slate-50/30">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-ml-blue" /> Títulos Sugeridos
                            </p>
                            <div className="space-y-3">
                              {batch.result.titles.map((t, i) => (
                                <div 
                                  key={i} 
                                  className={`p-4 rounded-2xl border-2 text-sm flex items-center gap-4 cursor-pointer transition-all ${selection.title === i ? 'border-ml-blue bg-white shadow-md' : 'border-slate-100 bg-white/50 hover:bg-white'}`}
                                  onClick={() => setSelectedBatch({ ...selectedBatch, [batch.productId]: { ...selection, title: i } })}
                                >
                                  <Checkbox checked={selection.title === i} className="w-5 h-5" />
                                  <span className="flex-1 font-bold text-slate-700 leading-tight">{t}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="p-8 space-y-6">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Descripciones Estructuradas
                            </p>
                            <div className="space-y-4">
                              {batch.result.descriptions.map((d, i) => (
                                <div 
                                  key={i} 
                                  className={`p-5 rounded-2xl border-2 space-y-3 cursor-pointer transition-all relative group/item ${selection.desc === i ? 'border-emerald-500 bg-emerald-50/30 shadow-md ring-1 ring-emerald-500/20' : 'border-slate-50 bg-slate-50/50 hover:bg-white'}`}
                                  onClick={() => setSelectedBatch({ ...selectedBatch, [batch.productId]: { ...selection, desc: i } })}
                                >
                                  <div className="flex items-start gap-4">
                                    <Checkbox checked={selection.desc === i} className="w-5 h-5" />
                                    <div className="flex-1 min-w-0">
                                      <div className="prose prose-xs text-slate-600 line-clamp-3 font-medium">
                                        <ReactMarkdown>{d}</ReactMarkdown>
                                      </div>
                                    </div>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-8 w-8 rounded-full opacity-0 group-hover/item:opacity-100 bg-white shadow-sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openDescriptionModal(batch.productId, input?.title || 'Producto', batch.result.descriptions, i);
                                      }}
                                    >
                                      <Maximize2 className="w-4 h-4 text-slate-400" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      {/* Description Expanded Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-[95vw] lg:max-w-6xl h-[92vh] flex flex-col p-0 overflow-hidden rounded-3xl border-none shadow-2xl bg-white">
          <DialogHeader className="p-8 border-b bg-slate-900 shrink-0">
            <div className="flex items-center justify-between text-white">
              <div className="space-y-1">
                <DialogTitle className="text-xl font-black">{modalData?.productTitle}</DialogTitle>
                <div className="flex items-center gap-2">
                  <Badge className="bg-ml-blue text-white font-black text-[10px] tracking-widest uppercase">
                    Versión {modalData ? modalData.currentIndex + 1 : 0} de {modalData?.descriptions.length}
                  </Badge>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Vista Previa Recomendada</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-white/10 rounded-xl p-1">
                  <Button variant="ghost" size="icon" className="rounded-lg h-10 w-10 text-white hover:bg-white/20" onClick={() => navigateModal('prev')}>
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="rounded-lg h-10 w-10 text-white hover:bg-white/20" onClick={() => navigateModal('next')}>
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
                <Button 
                  className="bg-ml-yellow text-slate-900 hover:bg-ml-yellow/90 font-black px-6 h-10 rounded-xl"
                  onClick={() => modalData && copyToClipboard(modalData.descriptions[modalData.currentIndex])}
                >
                  Copiar Todo
                </Button>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 h-10 w-10" onClick={() => setModalOpen(false)}>
                  <X className="w-6 h-6" />
                </Button>
              </div>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto bg-white custom-scrollbar scrollbar-visible">
            <div className="max-w-5xl mx-auto p-8 md:p-16">
              <div className="prose prose-blue max-w-none text-slate-800 leading-relaxed font-medium text-lg lg:text-xl">
                {modalData && <ReactMarkdown>{modalData.descriptions[modalData.currentIndex]}</ReactMarkdown>}
              </div>
            </div>
          </div>
          
          <div className="p-8 bg-slate-50 border-t flex justify-center shrink-0">
            <div className="flex gap-4">
               {modalData?.descriptions.map((_, idx) => (
                 <button 
                   key={idx}
                   onClick={() => setModalData({...modalData, currentIndex: idx})}
                   className={`w-3 h-3 rounded-full transition-all ${modalData.currentIndex === idx ? 'bg-ml-blue w-10' : 'bg-slate-300 hover:bg-slate-400'}`}
                 />
               ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
