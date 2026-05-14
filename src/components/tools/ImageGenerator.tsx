import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  ImageIcon, 
  Sparkles, 
  Download, 
  Wand2,
  Loader2,
  Coins,
  Check,
  X,
  RefreshCw,
  Layout,
  Type as TypeIcon,
  AlertCircle,
  Upload,
  Camera,
  ImagePlus,
  ArrowRight,
  ChevronRight,
  Maximize2,
  Layers,
  FileStack,
  Trash2,
  Play,
  Plus,
  Weight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { transformProductImage } from '../../services/gemini';
import { db } from '../../lib/firebase';
import { doc, updateDoc, increment, addDoc, collection, serverTimestamp } from 'firebase/firestore';

import { HistoryItem } from '../../types';

interface ImageGeneratorProps {
  user: any;
  userData: any;
  isAdmin: boolean;
  saveToHistory: (item: HistoryItem) => void;
  openPayModal: () => void;
  onRequireAuth: () => boolean;
}

type GenerationType = 'PRO_STUDIO' | 'LIFESTYLE' | 'MEASURES' | 'INFOGRAPHIC' | 'COVER' | 'DETAIL';

const LIFESTYLE_SCENARIOS = [
  "Mesa de madera rústica",
  "Cocina moderna minimalista",
  "Jardín soleado con césped",
  "Escritorio de oficina elegante",
  "Living acogedor con luz natural",
  "Dormitorio infantil colorido",
  "Baño de spa con mármol",
  "Lobby de hotel de lujo",
  "Mesa de café en terraza exterior",
  "Estante de biblioteca clásica"
];

interface BatchItemSettings {
  productName?: string;
  environment?: string;
  measures?: { w: string, h: string, d: string };
  measurementType?: 'BOX' | 'CYLINDER';
  weight?: string;
  infographicTitle?: string;
  infographicType?: 'COLORED' | 'IN_USE' | 'MINIMALIST' | 'PREMIUM_STUDIO';
  features?: string;
  type: GenerationType;
}

interface BatchItem {
  id: string;
  fileName: string;
  original: string;
  hero: string | null;
  variant: string | null;
  status: 'idle' | 'processing' | 'done' | 'error';
  error?: string;
  settings: BatchItemSettings;
}

export default function ImageGenerator({ user, userData, isAdmin, saveToHistory, openPayModal, onRequireAuth }: ImageGeneratorProps) {
  // --- Individual Mode States ---
  const [rawImage, setRawImage] = React.useState<string | null>(null);
  const [heroImage, setHeroImage] = React.useState<string | null>(null);
  const [variantImage, setVariantImage] = React.useState<string | null>(null);
  const [productName, setProductName] = React.useState('');
  const [environment, setEnvironment] = React.useState('');
  const [infographicTitle, setInfographicTitle] = React.useState('');
  const [infographicType, setInfographicType] = React.useState<'COLORED' | 'IN_USE' | 'MINIMALIST' | 'PREMIUM_STUDIO'>('COLORED');
  const [generationType, setGenerationType] = React.useState<GenerationType>('COVER');
  const [lastGeneratedType, setLastGeneratedType] = React.useState<GenerationType | null>(null);
  const [detailReferenceImages, setDetailReferenceImages] = React.useState<string[]>([]);
  
  // --- Batch Mode States ---
  const [isBatchMode, setIsBatchMode] = React.useState(false);
  const [batchItems, setBatchItems] = React.useState<BatchItem[]>([]);
  const [processingBatch, setProcessingBatch] = React.useState(false);
  const [selectedBatchItemId, setSelectedBatchItemId] = React.useState<string | null>(null);
  const [loadedSpreadsheetName, setLoadedSpreadsheetName] = React.useState<string | null>(null);
  const [batchValidation, setBatchValidation] = React.useState<{
    matched: number;
    missingImages: string[];
    missingInSheet: string[];
    totalRows: number;
  } | null>(null);

  // --- Modal Preview States ---
  const [previewModalOpen, setPreviewModalOpen] = React.useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = React.useState<number | null>(null);
  const [previewType, setPreviewType] = React.useState<'individual' | 'batch'>('individual');
  const [activePreviewImage, setActivePreviewImage] = React.useState<'hero' | 'variant'>('hero');

  // --- Common Logic States ---
  const [loading, setLoading] = React.useState(false);
  const [loadingType, setLoadingType] = React.useState<GenerationType | null>(null);
  
  // --- Input Parameters ---
  const [measures, setMeasures] = React.useState({ w: '', h: '', d: '' });
  const [measurementType, setMeasurementType] = React.useState<'BOX' | 'CYLINDER'>('BOX');
  const [weight, setWeight] = React.useState('');
  const [features, setFeatures] = React.useState('');

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const batchInputRef = React.useRef<HTMLInputElement>(null);
  const csvInputRef = React.useRef<HTMLInputElement>(null);

  const CLEAN_COST = 5;
  const VARIANT_COST = 3;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen debe ser menor a 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setRawImage(reader.result as string);
      setHeroImage(null);
      setVariantImage(null);
    };
    reader.readAsDataURL(file);
  };

  const handleBatchFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`La imagen ${file.name} es muy grande (>5MB)`);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const newItem: BatchItem = {
          id: Math.random().toString(36).substr(2, 9),
          fileName: file.name,
          original: reader.result as string,
          hero: null,
          variant: null,
          status: 'idle',
          settings: {
            type: 'PRO_STUDIO',
            measures: { w: '', h: '', d: '' }
          }
        };
        setBatchItems(prev => [...prev, newItem]);
      };
      reader.readAsDataURL(file);
    });
  };

  const updateBatchItemSettings = (id: string, updates: Partial<BatchItemSettings>) => {
    setBatchItems(prev => prev.map(item => 
      item.id === id ? { ...item, settings: { ...item.settings, ...updates } } : item
    ));
  };

  const applyGlobalSettingsToBatch = () => {
    setBatchItems(prev => prev.map(item => ({
      ...item,
      settings: {
        ...item.settings,
        productName: productName || item.settings.productName,
        environment: environment || item.settings.environment,
        measures: (measures.w || measures.h || measures.d) ? { ...measures } : item.settings.measures,
        measurementType: measurementType || item.settings.measurementType,
        weight: weight || item.settings.weight,
        infographicTitle: infographicTitle || item.settings.infographicTitle,
        features: features || item.settings.features,
      }
    })));
    toast.success("Configuración aplicada a todo el lote");
  };

  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadedSpreadsheetName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        if (jsonData.length === 0) {
          toast.error("El archivo está vacío");
          return;
        }

        let matchCount = 0;
        let missingImages: string[] = [];
        let missingInSheet: string[] = [];

        const newItems = batchItems.map(item => {
          const pureName = item.fileName.split('.')[0].toLowerCase();
          const row = jsonData.find(row => {
            const firstCellValue = String(Object.values(row)[0] || '').toLowerCase();
            return firstCellValue.includes(pureName) || pureName.includes(firstCellValue.split('.')[0]);
          });

          if (row) {
            matchCount++;
            return {
              ...item,
              settings: {
                ...item.settings,
                productName: row.productName || row.Nombre || item.settings.productName,
                environment: row.environment || row.Entorno || item.settings.environment,
                measures: {
                  w: String(row.width || row.Ancho || item.settings.measures?.w || ''),
                  h: String(row.height || row.Alto || item.settings.measures?.h || ''),
                  d: String(row.depth || row.Profundidad || item.settings.measures?.d || ''),
                },
                measurementType: (String(row.measurementType || row.TipoMedida).toUpperCase() === 'CYLINDER' ? 'CYLINDER' : 'BOX') as 'BOX' | 'CYLINDER',
                weight: String(row.weight_kg || row.Peso || item.settings.weight || ''),
                infographicType: (['COLORED', 'IN_USE', 'MINIMALIST', 'PREMIUM_STUDIO'].includes(String(row.infographicType || row.Estilo).toUpperCase()) ? String(row.infographicType || row.Estilo).toUpperCase() : 'COLORED') as any,
                infographicTitle: row.infographicTitle || row.TituloInfo || item.settings.infographicTitle,
                features: row.features || row.Caracteristicas || item.settings.features,
              }
            };
          } else {
            missingInSheet.push(item.fileName);
            return item;
          }
        });

        // Check for filenames in JSON that are not in batchItems
        jsonData.forEach(row => {
          const rowFileName = String(Object.values(row)[0] || '').toLowerCase();
          const found = batchItems.some(item => {
            const pureName = item.fileName.split('.')[0].toLowerCase();
            return rowFileName.includes(pureName) || pureName.includes(rowFileName.split('.')[0]);
          });
          if (!found) missingImages.push(rowFileName);
        });

        setBatchItems(newItems);
        setBatchValidation({
          matched: matchCount,
          missingImages: missingImages,
          missingInSheet: missingInSheet,
          totalRows: jsonData.length
        });
        
        if (missingImages.length > 0 || missingInSheet.length > 0) {
          const warnMsg = [];
          if (missingImages.length > 0) warnMsg.push(`Faltan ${missingImages.length} imágenes por cargar.`);
          if (missingInSheet.length > 0) warnMsg.push(`${missingInSheet.length} imágenes cargadas no están en la planilla.`);
          toast.warning(warnMsg.join(' '), { duration: 5000 });
        } else {
          toast.success(`Planilla procesada: ${matchCount} coincidencias perfectas.`);
        }
      } catch (err) {
        console.error("Sheet process error:", err);
        toast.error("Error al procesar la planilla. Asegúrate de usar el formato correcto.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const [activeStep, setActiveStep] = React.useState<1 | 2 | 3>(1);

  const downloadCsvTemplate = () => {
    const csvContent = "filename,productName,environment,width,height,depth,measurementType(BOX/CYLINDER),weight_kg,infographicType(COLORED/IN_USE/MINIMALIST/PREMIUM_STUDIO),infographicTitle,features\n" +
      "producto1.jpg,Nombre Ejemplo,Mesa de madera,10,20,5,BOX,1.5,COLORED,Título Increíble,Característica 1 | Característica 2";
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "plantilla_carga_masiva.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadXlsTemplate = () => {
    try {
      const data = [
        ["filename", "productName", "environment", "width", "height", "depth", "measurementType(BOX/CYLINDER)", "weight_kg", "infographicType(COLORED/IN_USE/MINIMALIST/PREMIUM_STUDIO)", "infographicTitle", "features"],
        ["producto1.jpg", "Nombre Ejemplo", "Mesa de madera", "10", "20", "5", "BOX", "1.5", "COLORED", "Título Increíble", "Característica 1 | Característica 2"]
      ];
      
      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
      XLSX.writeFile(wb, "plantilla_carga_masiva.xlsx");
    } catch (error) {
      console.error("XLS Generation failed:", error);
      toast.error("Error al generar plantilla Excel. Prueba con CSV.");
    }
  };

  const currentBatchItem = isBatchMode ? batchItems.find(i => i.id === selectedBatchItemId) : null;

  // Helper to compress image for history (to avoid LocalStorage quota issues)
  // We compress it to a maximum of 800px and 0.6 quality for history storage
  const compressForHistory = (base64: string, maxDim = 800): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > maxDim) {
            height *= maxDim / width;
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width *= maxDim / height;
            height = maxDim;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.6)); // Aggressive JPEG compression
        } else {
          resolve(base64);
        }
      };
      img.onerror = () => resolve(base64);
      img.src = base64;
    });
  };

  const handleTransform = async (type: GenerationType) => {
    if (!onRequireAuth()) return;

    const sourceImage = type === 'PRO_STUDIO' ? rawImage : (heroImage || rawImage);
    if (!sourceImage) {
      toast.error('Primero debes subir una imagen');
      return;
    }

    const cost = type === 'PRO_STUDIO' ? CLEAN_COST : VARIANT_COST;
    const currentBalance = userData?.tokenBalance || 0;
    
    if (!isAdmin && currentBalance < cost) {
      toast.error(`Tokens insuficientes (${cost} requeridos)`);
      openPayModal();
      return;
    }

    setLoading(true);
    setLoadingType(type);
    const toastId = toast.loading('Transformando imagen con IA...', { id: 'img-transform' });

    try {
      const resultImageUrl = await transformProductImage(sourceImage, type, { 
        productName,
        environment,
        infographicTitle,
        infographicType,
        measures, 
        measurementType,
        weight,
        features,
        detailReferenceImages: type === 'DETAIL' ? detailReferenceImages : []
      });
      
      if (!isAdmin) {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          tokenBalance: increment(-cost),
          updatedAt: serverTimestamp()
        });

        await addDoc(collection(db, 'transactions'), {
          uid: user.uid,
          amount: -cost,
          type: 'usage_image_transform',
          description: `Transformación ${type}`,
          timestamp: serverTimestamp()
        });
      }

      if (type === 'PRO_STUDIO') {
        setHeroImage(resultImageUrl);
        setVariantImage(null);
      } else {
        setVariantImage(resultImageUrl);
        setLastGeneratedType(type);
      }
      
       // Save to History with Compressed image
       const compressedImage = await compressForHistory(resultImageUrl);
       saveToHistory({
         id: Math.random().toString(36).substr(2, 9),
         timestamp: Date.now(),
         tool: 'images',
         type: 'individual',
         data: [{
           productName: productName,
           type: type,
           imageUrl: compressedImage
         }],
         imageUrl: compressedImage
       });
 
       toast.success('¡Imagen transformada con éxito!', { id: toastId });
    } catch (error: any) {
      console.error("Image transform error:", error);
      toast.error(error.message || 'Error en la transformación', { id: toastId });
    } finally {
      setLoading(false);
      setLoadingType(null);
    }
  };

  // Process a single item from the batch for a specific marketing type
  const processSingleBatchItem = async (itemId: string, type: GenerationType) => {
    if (processingBatch || loading) return;
    
    const item = batchItems.find(i => i.id === itemId);
    if (!item || !item.hero) {
      toast.error('Primero debes optimizar la imagen (Paso 2)');
      return;
    }

    setProcessingBatch(true);
    setBatchItems(prev => prev.map(i => i.id === itemId ? { ...i, status: 'processing' } : i));
    
    try {
      const resultImageUrl = await transformProductImage(item.hero, type, { 
        productName: item.settings.productName,
        environment: item.settings.environment,
        measures: item.settings.measures,
        measurementType: item.settings.measurementType,
        weight: item.settings.weight,
        infographicTitle: item.settings.infographicTitle,
        infographicType: item.settings.infographicType,
        features: item.settings.features,
        detailReferenceImages: []
      });

      if (resultImageUrl) {
        setBatchItems(prev => prev.map(i => i.id === itemId ? { 
          ...i, 
          variant: resultImageUrl, 
          status: 'done' 
        } : i));
        
        if (!isAdmin) {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, {
            tokenBalance: increment(-VARIANT_COST)
          });
        }

        // Save to history
        saveToHistory({
          id: Math.random().toString(36).substr(2, 9),
          timestamp: Date.now(),
          tool: 'images',
          type: 'individual',
          data: [{
            productName: item.settings.productName || item.fileName,
            type: type,
            imageUrl: resultImageUrl
          }],
          imageUrl: resultImageUrl
        });

        toast.success('Imagen generada con éxito');
      }
    } catch (error) {
      console.error("Single item generation error:", error);
      setBatchItems(prev => prev.map(i => i.id === itemId ? { ...i, status: 'error' } : i));
      toast.error('Error al generar imagen');
    } finally {
      setProcessingBatch(false);
    }
  };

  const processBatch = async (type: GenerationType) => {
    if (!onRequireAuth()) return;
    const itemsToProcess = batchItems.filter(item => item.status === 'idle' || (type !== 'PRO_STUDIO' && item.hero));
    
    if (itemsToProcess.length === 0) {
      toast.error('No hay imágenes listas para procesar');
      return;
    }

    const perItemCost = type === 'PRO_STUDIO' ? CLEAN_COST : VARIANT_COST;
    const totalCost = itemsToProcess.length * perItemCost;
    const currentBalance = userData?.tokenBalance || 0;

    if (!isAdmin && currentBalance < totalCost) {
      toast.error(`Tokens insuficientes para el lote (${totalCost} requeridos)`);
      openPayModal();
      return;
    }

    setProcessingBatch(true);
    toast.loading(`Procesando lote (${itemsToProcess.length} imágenes)...`, { id: 'batch-toast' });

    for (const item of itemsToProcess) {
      setBatchItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'processing' } : i));
      
      try {
        const source = type === 'PRO_STUDIO' ? item.original : (item.hero || item.original);
        const resultImageUrl = await transformProductImage(source, type, { 
          productName: item.settings.productName,
          environment: item.settings.environment,
          infographicTitle: item.settings.infographicTitle,
          infographicType: item.settings.infographicType,
          measures: item.settings.measures,
          measurementType: item.settings.measurementType,
          weight: item.settings.weight,
          features: item.settings.features,
          detailReferenceImages: []
        });
        
        if (!isAdmin) {
          const userRef = doc(db, "users", user.uid);
          await updateDoc(userRef, { tokenBalance: increment(-perItemCost) });
          await addDoc(collection(db, "transactions"), {
            uid: user.uid,
            amount: -perItemCost,
            type: "usage_image_batch",
            description: `Batch ${type}`,
            timestamp: serverTimestamp(),
          });
        }

        setBatchItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? {
                  ...i,
                  status: "done",
                  hero: type === "PRO_STUDIO" ? resultImageUrl : i.hero,
                  variant: type !== "PRO_STUDIO" ? resultImageUrl : i.variant,
                }
              : i
          )
        );

         // Save each to History with compressed image
         const compressed = await compressForHistory(resultImageUrl);
         saveToHistory({
           id: Math.random().toString(36).substr(2, 9),
           timestamp: Date.now(),
           tool: "images",
           type: "individual",
           data: [
             {
               productName: item.settings.productName || item.fileName,
               type: type,
               imageUrl: compressed,
             },
           ],
           imageUrl: compressed,
         });
      } catch (err: any) {
        setBatchItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'error', error: err.message } : i));
      }
    }

    // Save Batch to History
    saveToHistory({
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      tool: 'images',
      type: 'batch',
      data: batchItems.filter(i => i.status === 'done').map(i => ({
        productName: i.settings.productName,
        type: type,
        imageUrl: i.variant || i.hero
      })),
      imageCount: itemsToProcess.length
    });

    setProcessingBatch(false);
    toast.success('Lote completado', { id: 'batch-toast' });
  };

  const resetIndividual = () => {
    setRawImage(null);
    setHeroImage(null);
    setVariantImage(null);
    setProductName('');
    setEnvironment('');
    setInfographicTitle('');
    setInfographicType('COLORED');
    setMeasures({ w: '', h: '', d: '' });
    setFeatures('');
    toast.success('Formulario reiniciado');
  };

  const resetBatch = () => {
    setBatchItems([]);
    setLoadedSpreadsheetName(null);
    setBatchValidation(null);
    toast.success('Lote reiniciado');
  };

  const downloadImage = async (url: string, name: string) => {
    if (!url) return;
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `${name}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error("Download failed:", error);
      // Fallback to traditional method
      const link = document.createElement('a');
      link.href = url;
      link.download = `${name}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const downloadAllImages = () => {
    let count = 0;
    batchItems.forEach((item, index) => {
      if (item.hero) {
        downloadImage(item.hero, `product_${item.settings.productName || index}_main`);
        count++;
      }
      if (item.variant) {
        downloadImage(item.variant, `product_${item.settings.productName || index}_variant_${item.settings.type}`);
        count++;
      }
    });
    if (count > 0) {
      toast.success(`Descargando ${count} imágenes...`);
    } else {
      toast.error('No hay imágenes procesadas para descargar');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Massive Preview Modal */}
      <AnimatePresence>
        {previewModalOpen && (selectedImageIndex !== null) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-10 pointer-events-auto"
          >
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/95 backdrop-blur-xl"
              onClick={() => setPreviewModalOpen(false)}
            />
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-6xl aspect-square md:aspect-video bg-white rounded-[3rem] overflow-hidden shadow-2xl flex flex-col md:flex-row"
            >
              {/* Image Area */}
              <div className="flex-1 bg-slate-50 relative flex items-center justify-center p-8 group">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={`${selectedImageIndex}-${activePreviewImage}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    src={
                      previewType === 'individual' 
                        ? (activePreviewImage === 'hero' ? heroImage! : variantImage!)
                        : (activePreviewImage === 'hero' ? batchItems[selectedImageIndex].hero! : batchItems[selectedImageIndex].variant!)
                    }
                    className="max-w-full max-h-full object-contain drop-shadow-2xl"
                    alt="Preview"
                  />
                </AnimatePresence>

                {/* Navigation Arrows (Batch only) */}
                {previewType === 'batch' && batchItems.length > 1 && (
                  <>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImageIndex(prev => prev! > 0 ? prev! - 1 : batchItems.length - 1);
                      }}
                      className="absolute left-6 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-4 rounded-full shadow-xl transition-all hover:scale-110 active:scale-90 text-slate-900 z-10"
                    >
                      <ChevronRight className="w-6 h-6 rotate-180" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImageIndex(prev => prev! < batchItems.length - 1 ? prev! + 1 : 0);
                      }}
                      className="absolute right-6 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-4 rounded-full shadow-xl transition-all hover:scale-110 active:scale-90 text-slate-900 z-10"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </>
                )}
              </div>

              {/* Info Area */}
              <div className="w-full md:w-96 border-l border-slate-100 p-8 flex flex-col justify-between bg-white overflow-y-auto">
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-ml-blue/10 text-ml-blue border-none font-black px-4 py-1.5 rounded-xl uppercase tracking-widest text-[10px]">
                      {activePreviewImage === 'hero' ? 'Estudio Pro' : 'Marketing'}
                    </Badge>
                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100" onClick={() => setPreviewModalOpen(false)}>
                      <X className="w-6 h-6 text-slate-400" />
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-2xl font-black text-slate-900">
                      {previewType === 'individual' ? (productName || 'Producto Individual') : (batchItems[selectedImageIndex].settings.productName || `Producto #${selectedImageIndex + 1}`)}
                    </h4>
                    <div className="p-5 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-3">
                       <p className="text-[10px] font-black uppercase text-slate-400">Detalles de Generación</p>
                       <div className="space-y-2">
                          {previewType === 'batch' && (
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-slate-500">Tipo:</span>
                              <span className="font-black text-slate-900 uppercase tracking-tight">{batchItems[selectedImageIndex].settings.type}</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-500">Formato:</span>
                            <span className="font-black text-slate-900">1:1 Square</span>
                          </div>
                       </div>
                    </div>
                  </div>

                  {/* Toggle between Hero/Variant if both exist */}
                  <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 rounded-2xl">
                    <button 
                      onClick={() => setActivePreviewImage('hero')}
                      className={`px-4 py-3 rounded-xl font-bold text-xs transition-all ${activePreviewImage === 'hero' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                      disabled={!(previewType === 'individual' ? !!heroImage : !!batchItems[selectedImageIndex].hero)}
                    >
                      Optimizada
                    </button>
                    <button 
                      onClick={() => setActivePreviewImage('variant')}
                      className={`px-4 py-3 rounded-xl font-bold text-xs transition-all ${activePreviewImage === 'variant' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                      disabled={!(previewType === 'individual' ? !!variantImage : !!batchItems[selectedImageIndex].variant)}
                    >
                      Marketing
                    </button>
                  </div>
                </div>

                <div className="space-y-4 pt-10">
                  <Button 
                    className="w-full bg-ml-blue hover:bg-ml-blue/90 text-white font-black h-16 rounded-2xl shadow-xl shadow-ml-blue/20 transition-all hover:-translate-y-1 active:translate-y-0"
                    onClick={() => {
                      const image = previewType === 'individual' 
                        ? (activePreviewImage === 'hero' ? heroImage! : variantImage!)
                        : (activePreviewImage === 'hero' ? batchItems[selectedImageIndex].hero! : batchItems[selectedImageIndex].variant!);
                      downloadImage(image, `product_${Date.now()}`);
                    }}
                  >
                    <Download className="w-5 h-5 mr-3" /> Descargar Actual
                  </Button>
                  <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {previewType === 'batch' ? `Imagen ${selectedImageIndex + 1} de ${batchItems.length}` : 'Vista Individual'}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200/60 pb-6 sm:pb-8">
        <div className="space-y-1 sm:space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 leading-tight">Transformador de Imágenes Pro</h2>
          <p className="text-slate-500 max-w-2xl font-medium text-xs sm:text-base">De fotos de celular a fotografía de estudio profesional por IA.</p>
        </div>
        
        <div className="flex flex-wrap gap-2 sm:gap-4 self-start md:self-auto items-center">
          <div className="flex items-center gap-2 bg-slate-100/50 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm">
              <Coins className="w-3.5 h-3.5 sm:w-4 h-4 text-ml-yellow fill-ml-yellow" />
              <span className="text-[10px] sm:text-xs font-black text-slate-900 tracking-tight">{userData?.tokenBalance || 0} Tokens</span>
          </div>

          <Button 
            variant="outline"
            className="h-9 sm:h-12 px-3 sm:px-6 border-slate-200 rounded-xl sm:rounded-2xl font-black text-slate-500 text-[10px] sm:text-sm hover:bg-white transition-all shadow-sm group"
            onClick={isBatchMode ? resetBatch : resetIndividual}
            disabled={loading || processingBatch}
          >
            <RefreshCw className="w-3.5 h-3.5 sm:w-4 h-4 mr-1.5 sm:mr-2 group-hover:rotate-180 transition-transform duration-500" /> Reiniciar
          </Button>

          <div className="bg-slate-100 p-1 rounded-xl sm:rounded-2xl flex gap-1">
             <button 
               onClick={() => setIsBatchMode(false)}
               className={`px-3 py-1.5 sm:px-6 sm:py-2.5 rounded-lg sm:rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 sm:gap-2 ${!isBatchMode ? 'bg-white shadow-sm text-ml-blue' : 'text-slate-500 hover:text-slate-700'}`}
             >
               <Maximize2 className="w-3.5 h-3.5 sm:w-4 h-4" /> Indi.
             </button>
             <button 
               onClick={() => setIsBatchMode(true)}
               className={`px-3 py-1.5 sm:px-6 sm:py-2.5 rounded-lg sm:rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 sm:gap-2 ${isBatchMode ? 'bg-white shadow-sm text-ml-blue' : 'text-slate-500 hover:text-slate-700'}`}
             >
               <FileStack className="w-3.5 h-3.5 sm:w-4 h-4" /> Lote
             </button>
          </div>
        </div>
      </div>

      <div className={`grid grid-cols-1 gap-8 items-start ${!isBatchMode ? 'max-w-6xl mx-auto' : ''}`}>
        {/* Workflow Controls (Accordion style) */}
        <div className="w-full space-y-4">
          {/* Step 1: Upload & Management */}
          <Card className={`border-none ring-1 ring-slate-200 shadow-xl rounded-[2rem] overflow-hidden bg-white transition-all ${activeStep === 1 ? 'ring-ml-blue ring-2' : ''}`}>
             <div 
               className="w-full text-left cursor-pointer transition-colors hover:bg-slate-50/50"
               onClick={() => setActiveStep(activeStep === 1 ? (isBatchMode ? 1 : 1) : 1)} // Keep 1 toggleable or fixed?
             >
               <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6 flex flex-row items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div className="bg-ml-blue p-2 rounded-xl text-white">
                      {isBatchMode ? <FileStack className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
                    </div>
                    Paso 1: {isBatchMode ? `Carga y Gestión del Lote` : 'Imagen de Origen'}
                  </CardTitle>
                    <div className="flex items-center gap-2">
                      {isBatchMode && (
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={(e) => { e.stopPropagation(); downloadCsvTemplate(); }} 
                            className="h-8 rounded-lg text-[10px] font-black uppercase text-ml-blue hover:bg-ml-blue/5 border border-dashed border-ml-blue/30"
                          >
                             <Download className="w-3 h-3 mr-1" /> Template CSV
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={(e) => { e.stopPropagation(); downloadXlsTemplate(); }} 
                            className="h-8 rounded-lg text-[10px] font-black uppercase text-emerald-600 hover:bg-emerald-50 border border-dashed border-emerald-300/30"
                          >
                             <Download className="w-3 h-3 mr-1" /> Template XLS
                          </Button>
                        </div>
                      )}
                      {activeStep === 1 ? <Plus className="w-4 h-4 rotate-45 transition-transform" /> : <ChevronRight className="w-4 h-4 transition-transform text-slate-400" />}
                    </div>
               </CardHeader>
             </div>
             
             <AnimatePresence>
               {activeStep === 1 && (
                 <motion.div
                   initial={{ height: 0, opacity: 0 }}
                   animate={{ height: 'auto', opacity: 1 }}
                   exit={{ height: 0, opacity: 0 }}
                   transition={{ duration: 0.3 }}
                 >
                   <CardContent className="p-6 space-y-4 border-t border-slate-50">
                      <input 
                        type="file" 
                        ref={isBatchMode ? batchInputRef : fileInputRef} 
                        onChange={isBatchMode ? handleBatchFileUpload : handleFileUpload} 
                        className="hidden" 
                        accept="image/*" 
                        multiple={isBatchMode}
                      />
                      
                      {!isBatchMode ? (
                        <div className={`grid grid-cols-1 ${rawImage ? 'md:grid-cols-2' : 'grid-cols-1'} gap-8 items-center`}>
                          {rawImage ? (
                            <div className="relative aspect-square rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-inner bg-[#F8F9FB] group">
                              <img src={rawImage} className="w-full h-full object-contain p-6" alt="Original" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                 <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} className="font-black rounded-xl uppercase text-[10px] tracking-widest h-10 px-6">
                                   Cambiar Foto
                                 </Button>
                              </div>
                            </div>
                          ) : (
                            <div 
                              onClick={() => fileInputRef.current?.click()}
                              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-ml-blue', 'bg-ml-blue/5'); }}
                              onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-ml-blue', 'bg-ml-blue/5'); }}
                              onDrop={(e) => {
                                e.preventDefault();
                                e.currentTarget.classList.remove('border-ml-blue', 'bg-ml-blue/5');
                                const file = e.dataTransfer.files[0];
                                if (file && file.type.startsWith('image/')) {
                                  const reader = new FileReader();
                                  reader.onload = (evt) => {
                                    setRawImage(evt.target?.result as string);
                                    setHeroImage(null);
                                    setVariantImage(null);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                              className="w-full aspect-video md:aspect-square border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 hover:bg-slate-50 hover:border-ml-blue transition-all cursor-pointer group"
                            >
                              <div className="bg-white p-5 rounded-3xl shadow-xl group-hover:scale-110 transition-transform ring-1 ring-slate-100">
                                <Upload className="w-8 h-8 text-ml-blue" />
                              </div>
                              <div className="text-center px-4">
                                <p className="font-black text-slate-900 text-base italic">Subir Imagen del Producto</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Arrastra, Pega o Sube (JPG/PNG)</p>
                              </div>
                            </div>
                          )}

                          {rawImage && (
                            <div className="flex flex-col justify-center space-y-6">
                              <div className="p-8 bg-ml-blue/5 rounded-[2.5rem] border border-ml-blue/10 space-y-3">
                                <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">Imagen Capturada</h4>
                                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                  ¡Perfecto! Hemos detectado tu producto. Ahora pasaremos a la fase de optimización para que tu foto parezca tomada en un estudio profesional.
                                </p>
                              </div>
                              <Button 
                                onClick={() => setActiveStep(2)}
                                className="h-14 bg-white text-ml-blue border-2 border-ml-blue/10 hover:bg-ml-blue hover:text-white font-black rounded-2xl transition-all uppercase text-xs tracking-widest shadow-lg shadow-ml-blue/10"
                              >
                                Empezar Optimización <ArrowRight className="w-5 h-5 ml-2" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-6">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <button 
                                onClick={() => batchInputRef.current?.click()}
                                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-ml-blue', 'bg-ml-blue/5'); }}
                                onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-ml-blue', 'bg-ml-blue/5'); }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  e.currentTarget.classList.remove('border-ml-blue', 'bg-ml-blue/5');
                                  const files = Array.from(e.dataTransfer.files);
                                  files.forEach(file => {
                                    if (file && file.type.startsWith('image/')) {
                                      const reader = new FileReader();
                                      reader.onload = (evt) => {
                                        const newItem: BatchItem = {
                                          id: Math.random().toString(36).substr(2, 9),
                                          fileName: file.name,
                                          original: evt.target?.result as string,
                                          hero: null,
                                          variant: null,
                                          status: 'idle',
                                          settings: {
                                            type: 'PRO_STUDIO',
                                            measures: { w: '', h: '', d: '' }
                                          }
                                        };
                                        setBatchItems(prev => [...prev, newItem]);
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  });
                                }}
                                className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 hover:bg-slate-50 hover:border-ml-blue transition-all"
                              >
                                 <div className="bg-slate-100 p-3 rounded-xl group-hover:bg-ml-blue/10 transition-colors">
                                    <Plus className="w-8 h-8 text-slate-400" />
                                 </div>
                                 <div className="text-center">
                                    <p className="font-black text-slate-900 text-sm">Añadir Imágenes</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Arrastra o Sube</p>
                                 </div>
                              </button>
                              <button 
                                onClick={() => csvInputRef.current?.click()}
                                className="border-2 border-dashed border-ml-blue/20 bg-ml-blue/5 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 hover:bg-ml-blue/10 transition-all group"
                              >
                                 <FileStack className="w-8 h-8 text-ml-blue group-hover:scale-110 transition-transform" />
                                 <div className="text-center">
                                    <p className="font-black text-ml-blue text-sm">
                                      {loadedSpreadsheetName ? 'Planilla Cargada' : 'Cargar Planilla'}
                                    </p>
                                    <p className="text-[10px] font-black text-ml-blue/50 uppercase truncate max-w-[150px]">
                                      {loadedSpreadsheetName ? loadedSpreadsheetName : 'Excel o CSV'}
                                    </p>
                                 </div>
                                 <input 
                                    type="file" 
                                    ref={csvInputRef} 
                                    onChange={handleCsvImport} 
                                    className="hidden" 
                                    accept=".csv, .xls, .xlsx"
                                  />
                               </button>
                            </div>

                            {/* Integrated Batch List */}
                           {batchItems.length > 0 && (
                             <div className="space-y-4 pt-4 border-t border-slate-100">
                               <div className="flex items-center justify-between">
                                  <div className="flex flex-col">
                                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                       Lote Actual <Badge variant="secondary" className="bg-slate-100 text-slate-600 rounded-lg">{batchItems.length}</Badge>
                                    </h4>
                                    {batchValidation && (
                                       <div className="space-y-3 mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                          <div className="flex items-center justify-between">
                                            <h5 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Resumen de Validación</h5>
                                            <Badge variant="outline" className="text-[10px] font-bold bg-white">{batchValidation.totalRows} filas en planilla</Badge>
                                          </div>
                                          
                                          <div className="grid grid-cols-3 gap-2">
                                            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center">
                                              <p className="text-[9px] font-bold text-slate-400 uppercase">Vinculados</p>
                                              <p className="text-xl font-black text-emerald-600">{batchValidation.matched}</p>
                                            </div>
                                            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center">
                                              <p className="text-[9px] font-bold text-slate-400 uppercase">Faltan Fotos</p>
                                              <p className="text-xl font-black text-red-500">{batchValidation.missingImages.length}</p>
                                            </div>
                                            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center">
                                              <p className="text-[9px] font-bold text-slate-400 uppercase">Extra Fotos</p>
                                              <p className="text-xl font-black text-amber-500">{batchValidation.missingInSheet.length}</p>
                                            </div>
                                          </div>

                                          {batchValidation.missingImages.length > 0 && (
                                            <div className="bg-red-50 border border-red-100 p-3 rounded-xl">
                                              <p className="text-[9px] font-black text-red-600 uppercase flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" /> Faltan las siguientes imágenes (según planilla):
                                              </p>
                                              <div className="mt-2 flex flex-wrap gap-1">
                                                {batchValidation.missingImages.map(name => (
                                                  <Badge key={name} variant="secondary" className="bg-white text-red-500 text-[8px] font-bold py-0">{name}</Badge>
                                                ))}
                                              </div>
                                            </div>
                                          )}

                                          {batchValidation.missingInSheet.length > 0 && (
                                            <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl">
                                              <p className="text-[9px] font-black text-amber-600 uppercase flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" /> Imágenes cargadas no encontradas en la planilla:
                                              </p>
                                              <div className="mt-2 flex flex-wrap gap-1">
                                                {batchValidation.missingInSheet.map(name => (
                                                  <Badge key={name} variant="secondary" className="bg-white text-amber-600 text-[8px] font-bold py-0">{name}</Badge>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                       </div>
                                    )}
                                  </div>
                                  <Button variant="ghost" size="sm" onClick={() => { setBatchItems([]); setBatchValidation(null); setLoadedSpreadsheetName(null); }} className="text-xs text-red-500 hover:text-red-600 font-bold uppercase">
                                     <Trash2 className="w-3.5 h-3.5 mr-1" /> Limpiar Todo
                                  </Button>
                               </div>
                               
                               <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                  {batchItems.map((item, index) => {
                                    const hasData = batchValidation ? !batchValidation.missingInSheet.includes(item.fileName) : true;
                                    return (
                                    <div 
                                      key={item.id} 
                                      onClick={() => setSelectedBatchItemId(item.id)}
                                      className={`relative aspect-square rounded-[1.5rem] overflow-hidden border-2 cursor-pointer transition-all group ${selectedBatchItemId === item.id ? 'border-ml-blue scale-105 shadow-xl' : 'border-transparent hover:border-slate-300'} ${!hasData ? 'ring-2 ring-amber-400' : ''}`}
                                    >
                                      <img src={item.original} className="w-full h-full object-cover" />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                         <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={(e) => { e.stopPropagation(); setBatchItems(prev => prev.filter(i => i.id !== item.id)); }}>
                                            <Trash2 className="w-4 h-4" />
                                         </Button>
                                      </div>
                                      {item.status === 'done' && (
                                        <div className="absolute top-2 right-2 bg-emerald-500 text-white p-1 rounded-full shadow-lg">
                                          <Check className="w-3 h-3" />
                                        </div>
                                      )}
                                      {!hasData && (
                                        <div className="absolute top-2 right-2 bg-amber-500 text-white p-1 rounded-full shadow-lg" title="No está en el Excel">
                                          <AlertCircle className="w-3 h-3" />
                                        </div>
                                      )}
                                      {item.status === 'processing' && (
                                        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center">
                                           <Loader2 className="w-6 h-6 text-white animate-spin" />
                                        </div>
                                      )}
                                      <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md text-[8px] font-black text-white px-2 py-0.5 rounded-full uppercase tracking-tighter">
                                         #{index + 1}
                                      </div>
                                    </div>
                                  );})}
                               </div>
                               
                               <div className="flex justify-end pt-4">
                                  <Button 
                                    onClick={() => {
                                      if (batchItems.length === 0) {
                                        toast.error("Sube algunas imágenes primero");
                                        return;
                                      }
                                      if (!loadedSpreadsheetName) {
                                        toast.error("Carga la planilla de Excel/CSV para continuar");
                                        return;
                                      }
                                      if (batchValidation && batchValidation.missingImages.length > 0) {
                                        toast.error(`Faltan ${batchValidation.missingImages.length} imágenes por subir según la planilla`);
                                        return;
                                      }
                                      setActiveStep(2);
                                    }}
                                    className="h-14 px-8 bg-ml-blue hover:bg-ml-blue/90 text-white font-black rounded-2xl transition-all uppercase text-xs tracking-widest shadow-xl shadow-ml-blue/10"
                                  >
                                    Validar y Continuar <ArrowRight className="w-5 h-5 ml-2" />
                                  </Button>
                               </div>
                             </div>
                           )}
                        </div>
                      )}
                   </CardContent>
                 </motion.div>
               )}
             </AnimatePresence>
          </Card>

          {/* Step 2: Optimization (Collapsible) */}
          <Card className={`border-none ring-1 ring-slate-200 shadow-xl rounded-[2rem] overflow-hidden bg-white transition-all 
            ${activeStep === 2 ? 'ring-ml-blue ring-2' : ''} 
            ${((!isBatchMode && !rawImage) || (isBatchMode && batchItems.length === 0)) ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
             <div 
               className={`w-full text-left ${((!isBatchMode && !rawImage) || (isBatchMode && batchItems.length === 0)) ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50/50 transition-colors'}`}
               onClick={() => !((!isBatchMode && !rawImage) || (isBatchMode && batchItems.length === 0)) && setActiveStep(2)}
             >
               <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6 flex flex-row items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div className="bg-ml-yellow p-2 rounded-xl">
                      <Sparkles className="w-5 h-5 text-slate-900" />
                    </div>
                    Paso 2: Optimización Pro
                  </CardTitle>
                  {activeStep === 2 ? <Plus className="w-4 h-4 rotate-45 transition-transform" /> : <ChevronRight className="w-4 h-4 transition-transform text-slate-400" />}
               </CardHeader>
             </div>

             <AnimatePresence>
               {activeStep === 2 && (
                 <motion.div
                   initial={{ height: 0, opacity: 0 }}
                   animate={{ height: 'auto', opacity: 1 }}
                   exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <CardContent className="p-6 space-y-6">
                        {isBatchMode && batchValidation && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 pt-2">
                               <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center gap-3">
                                  <div className="bg-emerald-500 p-2 rounded-xl text-white">
                                     <Check className="w-4 h-4" />
                                  </div>
                                  <div>
                                     <p className="text-[10px] font-black uppercase text-emerald-600">Vinculados</p>
                                     <p className="text-xl font-black text-emerald-700">{batchValidation.matched} / {batchValidation.totalRows}</p>
                                  </div>
                               </div>
                               <div className={`${batchValidation.missingImages.length > 0 ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'} p-4 rounded-2xl border flex items-center gap-3`}>
                                  <div className={`${batchValidation.missingImages.length > 0 ? 'bg-red-500' : 'bg-slate-300'} p-2 rounded-xl text-white`}>
                                     <Camera className="w-4 h-4" />
                                  </div>
                                  <div>
                                     <p className={`text-[10px] font-black uppercase ${batchValidation.missingImages.length > 0 ? 'text-red-600' : 'text-slate-500'}`}>Faltan en Lote</p>
                                     <p className={`text-xl font-black ${batchValidation.missingImages.length > 0 ? 'text-red-700' : 'text-slate-700'}`}>{batchValidation.missingImages.length}</p>
                                  </div>
                               </div>
                               <div className={`${batchValidation.missingInSheet.length > 0 ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100'} p-4 rounded-2xl border flex items-center gap-3`}>
                                  <div className={`${batchValidation.missingInSheet.length > 0 ? 'bg-amber-500' : 'bg-slate-300'} p-2 rounded-xl text-white`}>
                                     <FileStack className="w-4 h-4" />
                                  </div>
                                  <div>
                                     <p className={`text-[10px] font-black uppercase ${batchValidation.missingInSheet.length > 0 ? 'text-amber-600' : 'text-slate-500'}`}>Sin Datos Excel</p>
                                     <p className={`text-xl font-black ${batchValidation.missingInSheet.length > 0 ? 'text-amber-700' : 'text-slate-700'}`}>{batchValidation.missingInSheet.length}</p>
                                  </div>
                               </div>
                            </div>
                         )}

                         <div className={`grid grid-cols-1 ${!isBatchMode ? 'md:grid-cols-2' : ''} gap-8 items-center`}>
                           <div className="flex flex-col justify-center space-y-6">
                             <div className="p-8 bg-ml-yellow/5 rounded-[2.5rem] border border-ml-yellow/10 space-y-2">
                                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                  Haremos que tu producto brille. Esta fase elimina el fondo original y aplica una iluminación de estudio profesional sobre fondo blanco puro.
                                </p>
                             </div>
                             
                             <div className="flex gap-4">
                               <Button 
                                 onClick={() => isBatchMode ? processBatch('PRO_STUDIO') : handleTransform('PRO_STUDIO')}
                                 disabled={loadingType === 'PRO_STUDIO' || (!isBatchMode && heroImage !== null) || !rawImage}
                                 className="flex-1 h-16 sm:h-20 bg-ml-yellow hover:bg-ml-yellow/90 text-slate-900 font-black rounded-2xl sm:rounded-[1.5rem] shadow-xl shadow-ml-yellow/10 gap-2 text-sm sm:text-xl uppercase tracking-wider"
                               >
                                 {(loadingType === 'PRO_STUDIO' || processingBatch) ? <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin" /> : <Sparkles className="w-6 h-6 sm:w-8 sm:h-8" />}
                                 <span>{isBatchMode ? 'Optimizar Lote' : 'Optimizar Imagen'}</span>
                               </Button>
                               
                               {!isBatchMode && heroImage && (
                                 <Button 
                                   variant="outline"
                                   onClick={() => downloadImage(heroImage, 'optimizado')}
                                   className="h-14 w-14 rounded-2xl border-slate-200"
                                 >
                                   <Download className="w-5 h-5" />
                                 </Button>
                               )}
                             </div>
                             
                             {!isBatchMode && heroImage && (
                               <Button 
                                 variant="outline" 
                                 onClick={() => setActiveStep(3)}
                                 className="w-full h-12 border-slate-200 text-slate-600 font-black rounded-2xl hover:bg-slate-50 transition-all uppercase text-[10px] tracking-widest"
                               >
                                 Configurar Marketing <ChevronRight className="w-4 h-4 ml-2" />
                               </Button>
                             )}

                             <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase text-slate-400">
                               <Coins className="w-3 h-3" /> {isBatchMode ? `Total: ${batchItems.length * CLEAN_COST}` : `Costo: ${CLEAN_COST}`} Tokens
                             </div>
                          </div>

                          {!isBatchMode && (
                            <div className="relative aspect-square w-full rounded-[2.5rem] overflow-hidden bg-[#F8F9FB] border border-slate-100 shadow-inner flex items-center justify-center group">
                              {heroImage ? (
                                <>
                                  <img 
                                    src={heroImage} 
                                    className="w-full h-full object-contain p-6 transition-transform duration-500 group-hover:scale-105" 
                                    alt="Optimized preview" 
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                     <Button 
                                       size="icon" 
                                       className="h-12 w-12 bg-white rounded-2xl shadow-xl border-none text-ml-blue hover:bg-slate-50 transition-all"
                                       onClick={() => {
                                         setPreviewType('individual');
                                         setSelectedImageIndex(0);
                                         setActivePreviewImage('hero');
                                         setPreviewModalOpen(true);
                                       }}
                                     >
                                       <Maximize2 className="w-5 h-5" />
                                     </Button>
                                  </div>
                                </>
                              ) : (
                                <div className="text-center space-y-3 opacity-30">
                                   <Sparkles className="w-16 h-16 mx-auto text-slate-400" />
                                   <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Esperando Optimización</p>
                                </div>
                              )}
                              {(loadingType === 'PRO_STUDIO' || processingBatch) && !isBatchMode && (
                                <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                                  <Loader2 className="w-10 h-10 animate-spin text-ml-blue" />
                                  <p className="text-[10px] font-black text-ml-blue uppercase tracking-widest animate-pulse">Procesando...</p>
                                </div>
                              )}
                            </div>
                          )}
                        
                         {/* Global Config for Batch is removed per request */}
                      </div>

                      {/* Integrated Batch Results List in Step 2 */}
                      {isBatchMode && batchItems.length > 0 && (
                        <div className="pt-8 border-t border-slate-100 space-y-6">
                           <div className="flex items-center justify-between">
                              <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                 Resultados y Variantes de Marketing
                              </h4>
                              {batchItems.some(i => i.status === 'done') && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={downloadAllImages} 
                                  className="h-8 text-[10px] font-black uppercase border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                                >
                                   <Download className="w-3.5 h-3.5 mr-1" /> Descargar Todo
                                </Button>
                              )}
                           </div>

                                                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                              {batchItems.map((item, index) => (
                                <div key={item.id} className={`bg-white rounded-[2rem] shadow-xl border transition-all overflow-hidden ${selectedBatchItemId === item.id ? 'ring-2 ring-ml-blue border-transparent' : 'border-slate-100'}`}>
                                    <div className="bg-slate-50/50 px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">#{index + 1} {item.fileName}</span>
                                        <div className="flex gap-2">
                                          <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-7 w-7 rounded-lg text-slate-400" 
                                            onClick={() => { 
                                              setSelectedBatchItemId(item.id); 
                                              setSelectedImageIndex(index); 
                                              setPreviewType('batch');
                                              setActivePreviewImage(item.variant ? 'variant' : 'hero');
                                              setPreviewModalOpen(true); 
                                            }}
                                          >
                                             <Maximize2 className="w-3.5 h-3.5" />
                                          </Button>
                                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-red-400" onClick={() => setBatchItems(prev => prev.filter(i => i.id !== item.id))}>
                                             <Trash2 className="w-3.5 h-3.5" />
                                          </Button>
                                        </div>
                                    </div>
                                    <div className="p-5 space-y-5">
                                        <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 group">
                                          <img src={item.variant || item.hero || item.original} className="w-full h-full object-contain p-2" alt="Batch result" referrerPolicy="no-referrer" />
                                          {(item.status === 'processing') && (
                                            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                                              <Loader2 className="w-8 h-8 text-ml-blue animate-spin" />
                                              <p className="text-[9px] font-black uppercase text-ml-blue">Generando...</p>
                                            </div>
                                          )}
                                        </div>

                                        {!item.hero && (
                                          <Button 
                                            variant="secondary"
                                            className="w-full h-10 bg-ml-blue/5 hover:bg-ml-blue/10 text-ml-blue font-black rounded-xl border border-ml-blue/20 text-xs"
                                            onClick={() => processSingleBatchItem(item.id, 'PRO_STUDIO')}
                                            disabled={item.status === 'processing' || processingBatch}
                                          >
                                            <Sparkles className="w-3.5 h-3.5 mr-2" /> Optimizar Pro
                                          </Button>
                                        )}

                                        <div className="space-y-4 pt-3 border-t border-slate-100">
                                          <div className="space-y-1.5">
                                            <Label className="text-[10px] font-black uppercase text-slate-400">Nombre del Producto</Label>
                                            <Input 
                                              placeholder="Nombre del Producto" 
                                              value={item.settings.productName || ''}
                                              onChange={(e) => updateBatchItemSettings(item.id, { productName: e.target.value })}
                                              className="h-9 text-xs font-bold border-slate-200 rounded-lg bg-slate-50/50"
                                            />
                                          </div>

                                          {item.hero && (
                                            <div className="space-y-4">
                                               <div className="space-y-2">
                                                  <Label className="text-[10px] font-black uppercase text-slate-400">Tipo de Imagen a Generar</Label>
                                                  <div className="grid grid-cols-2 gap-2">
                                                    <Button 
                                                      variant={item.settings.type === 'COVER' ? 'default' : 'outline'}
                                                      size="sm"
                                                      className={`h-9 text-[9px] font-bold uppercase rounded-xl gap-1.5 ${item.settings.type === 'COVER' ? 'bg-ml-blue text-white' : 'border-slate-200'}`}
                                                      onClick={() => updateBatchItemSettings(item.id, { type: 'COVER' })}
                                                    >
                                                      <Camera className="w-3.5 h-3.5" /> Portada
                                                    </Button>
                                                    <Button 
                                                      variant={item.settings.type === 'LIFESTYLE' ? 'default' : 'outline'}
                                                      size="sm"
                                                      className={`h-9 text-[9px] font-bold uppercase rounded-xl gap-1.5 ${item.settings.type === 'LIFESTYLE' ? 'bg-purple-500 text-white' : 'border-slate-200'}`}
                                                      onClick={() => updateBatchItemSettings(item.id, { type: 'LIFESTYLE' })}
                                                    >
                                                      <Play className="w-3.5 h-3.5" /> Lifestyle
                                                    </Button>
                                                    <Button 
                                                      variant={item.settings.type === 'MEASURES' ? 'default' : 'outline'}
                                                      size="sm"
                                                      className={`h-9 text-[9px] font-bold uppercase rounded-xl gap-1.5 ${item.settings.type === 'MEASURES' ? 'bg-emerald-500 text-white' : 'border-slate-200'}`}
                                                      onClick={() => updateBatchItemSettings(item.id, { type: 'MEASURES' })}
                                                    >
                                                      <Maximize2 className="w-3.5 h-3.5" /> Medidas
                                                    </Button>
                                                    <Button 
                                                      variant={item.settings.type === 'INFOGRAPHIC' ? 'default' : 'outline'}
                                                      size="sm"
                                                      className={`h-9 text-[9px] font-bold uppercase rounded-xl gap-1.5 ${item.settings.type === 'INFOGRAPHIC' ? 'bg-slate-900 text-white' : 'border-slate-200'}`}
                                                      onClick={() => updateBatchItemSettings(item.id, { type: 'INFOGRAPHIC' })}
                                                    >
                                                      <Layout className="w-3.5 h-3.5" /> Info
                                                    </Button>
                                                  </div>
                                               </div>

                                               {/* Conditional Fields based on Type */}
                                               <AnimatePresence mode="wait">
                                                  {(item.settings.type === 'COVER' || item.settings.type === 'LIFESTYLE') && (
                                                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="space-y-1.5">
                                                      <div className="flex items-center justify-between">
                                                        <Label className="text-[10px] font-black uppercase text-slate-400">Entorno / Escenario</Label>
                                                        {item.settings.type === 'LIFESTYLE' && (
                                                          <Select onValueChange={(val: string) => updateBatchItemSettings(item.id, { environment: val })}>
                                                            <SelectTrigger className="h-6 w-auto text-[8px] font-black uppercase border-none bg-slate-100 text-slate-500 rounded-md px-2">
                                                              <SelectValue placeholder="Sugerencias" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                              {LIFESTYLE_SCENARIOS.map(s => (
                                                                <SelectItem key={s} value={s} className="text-[9px] font-bold">{s}</SelectItem>
                                                              ))}
                                                            </SelectContent>
                                                          </Select>
                                                        )}
                                                      </div>
                                                      <textarea 
                                                        placeholder="Mesa de madera, cocina moderna, etc..." 
                                                        value={item.settings.environment || ''}
                                                        onChange={(e) => updateBatchItemSettings(item.id, { environment: e.target.value })}
                                                        className="w-full h-16 p-3 text-[10px] font-medium rounded-lg border border-slate-200 bg-slate-50/50 resize-none"
                                                      />
                                                    </motion.div>
                                                  )}

                                                  {item.settings.type === 'MEASURES' && (
                                                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="space-y-1.5">
                                                      <div className="flex items-center justify-between">
                                                         <Label className="text-[10px] font-black uppercase text-slate-400">Medidas y Peso</Label>
                                                         <div className="flex bg-white rounded-lg p-0.5 border border-slate-200">
                                                            <button 
                                                              onClick={() => updateBatchItemSettings(item.id, { measurementType: 'BOX' })}
                                                              className={`px-2 py-1 rounded-md text-[8px] font-black uppercase transition-all ${item.settings.measurementType === 'BOX' ? 'bg-ml-blue text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                                            >
                                                               Caja
                                                            </button>
                                                            <button 
                                                              onClick={() => updateBatchItemSettings(item.id, { measurementType: 'CYLINDER' })}
                                                              className={`px-2 py-1 rounded-md text-[8px] font-black uppercase transition-all ${item.settings.measurementType === 'CYLINDER' ? 'bg-ml-blue text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                                            >
                                                               Cilindro
                                                            </button>
                                                         </div>
                                                      </div>
                                                      <div className="grid grid-cols-4 gap-2">
                                                         {item.settings.measurementType === 'CYLINDER' ? (
                                                           <>
                                                              <Input placeholder="H" value={item.settings.measures?.h || ''} onChange={(e) => updateBatchItemSettings(item.id, { measures: { ...item.settings.measures!, h: e.target.value } })} className="col-span-2 h-8 text-[11px] font-bold rounded-lg border-slate-200" />
                                                              <Input placeholder="D" value={item.settings.measures?.d || ''} onChange={(e) => updateBatchItemSettings(item.id, { measures: { ...item.settings.measures!, d: e.target.value } })} className="h-8 text-[11px] font-bold rounded-lg border-slate-200" />
                                                           </>
                                                         ) : (
                                                           <>
                                                              <Input placeholder="W" value={item.settings.measures?.w || ''} onChange={(e) => updateBatchItemSettings(item.id, { measures: { ...item.settings.measures!, w: e.target.value } })} className="h-8 text-[11px] font-bold rounded-lg border-slate-200" />
                                                              <Input placeholder="H" value={item.settings.measures?.h || ''} onChange={(e) => updateBatchItemSettings(item.id, { measures: { ...item.settings.measures!, h: e.target.value } })} className="h-8 text-[11px] font-bold rounded-lg border-slate-200" />
                                                              <Input placeholder="D" value={item.settings.measures?.d || ''} onChange={(e) => updateBatchItemSettings(item.id, { measures: { ...item.settings.measures!, d: e.target.value } })} className="h-8 text-[11px] font-bold rounded-lg border-slate-200" />
                                                           </>
                                                         )}
                                                         <div className="relative">
                                                            <Input placeholder="kg" value={item.settings.weight || ''} onChange={(e) => updateBatchItemSettings(item.id, { weight: e.target.value })} className="h-8 text-[11px] font-bold rounded-lg border-slate-200 pl-5" />
                                                            <Weight className="absolute left-1 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                                                         </div>
                                                      </div>
                                                    </motion.div>
                                                  )}

                                                  {item.settings.type === 'INFOGRAPHIC' && (
                                                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="space-y-2">
                                                      <div className="grid grid-cols-2 gap-2">
                                                        <div className="space-y-1">
                                                          <Label className="text-[10px] font-black uppercase text-slate-400">Título Infografía</Label>
                                                          <Input 
                                                            placeholder="Ej: Calidad Superior" 
                                                            value={item.settings.infographicTitle || ''} 
                                                            onChange={(e) => updateBatchItemSettings(item.id, { infographicTitle: e.target.value })} 
                                                            className="h-8 text-[11px] font-bold rounded-lg border-slate-200" 
                                                          />
                                                        </div>
                                                        <div className="space-y-1">
                                                          <Label className="text-[10px] font-black uppercase text-slate-400">Estilo Infografía</Label>
                                                          <Select 
                                                            value={item.settings.infographicType || 'COLORED'} 
                                                            onValueChange={(val: any) => updateBatchItemSettings(item.id, { infographicType: val })}
                                                          >
                                                             <SelectTrigger className="h-8 text-[11px] font-bold rounded-lg border-slate-200">
                                                                <SelectValue placeholder="Estilo" />
                                                             </SelectTrigger>
                                                             <SelectContent>
                                                                <SelectItem value="COLORED">Colores</SelectItem>
                                                                <SelectItem value="IN_USE">En Uso</SelectItem>
                                                                <SelectItem value="MINIMALIST">Mina.</SelectItem>
                                                                <SelectItem value="PREMIUM_STUDIO">Premium Studio</SelectItem>
                                                             </SelectContent>
                                                          </Select>
                                                        </div>
                                                      </div>
                                                      <div className="space-y-1">
                                                        <Label className="text-[10px] font-black uppercase text-slate-400">Características (Puntos clave)</Label>
                                                        <textarea 
                                                          placeholder="Eco-friendly | Alta Duración..." 
                                                          value={item.settings.features || ''} 
                                                          onChange={(e) => updateBatchItemSettings(item.id, { features: e.target.value })} 
                                                          className="w-full h-16 p-3 text-[10px] font-medium rounded-lg border border-slate-200 bg-slate-50/50 resize-none"
                                                        />
                                                      </div>
                                                    </motion.div>
                                                  )}
                                               </AnimatePresence>

                                               {/* Generation Button (Only appears if type != PRO_STUDIO and hero exists) */}
                                               {item.settings.type !== 'PRO_STUDIO' && (
                                                 <Button 
                                                   className={`w-full h-11 font-black rounded-2xl shadow-lg transition-all gap-2 mt-2
                                                     ${item.settings.type === 'COVER' ? 'bg-ml-blue hover:bg-ml-blue/90' : 
                                                       item.settings.type === 'LIFESTYLE' ? 'bg-purple-500 hover:bg-purple-600' :
                                                       item.settings.type === 'MEASURES' ? 'bg-emerald-500 hover:bg-emerald-600' :
                                                       'bg-slate-900 hover:bg-black'}`}
                                                   onClick={() => processSingleBatchItem(item.id, item.settings.type)}
                                                   disabled={item.status === 'processing' || processingBatch}
                                                 >
                                                   {item.status === 'processing' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                                   Generar {item.settings.type === 'COVER' ? 'Portada' : 
                                                            item.settings.type === 'LIFESTYLE' ? 'Lifestyle' :
                                                            item.settings.type === 'MEASURES' ? 'Medidas' : 'Infografía'}
                                                 </Button>
                                               )}
                                            </div>
                                          )}
                                        </div>
                                    </div>
                                </div>
                              ))}
                           </div>
                        </div>
                      )}
                    </CardContent>
                 </motion.div>
               )}
             </AnimatePresence>
          </Card>

          {/* Step 3: Global Marketing Config (Hidden in Batch mode per request) */}
          {!isBatchMode && (
            <Card className={`border-none ring-1 ring-slate-200 shadow-xl rounded-[2rem] overflow-hidden bg-white transition-all 
              ${activeStep === 3 ? 'ring-purple-500 ring-2' : ''} 
              ${(!heroImage ? 'opacity-50 grayscale pointer-events-none' : '')}`}>
               
               <div 
                 className={`w-full text-left ${!heroImage ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50/50 transition-colors'}`}
                 onClick={() => heroImage && setActiveStep(3)}
               >
                 <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6 flex flex-row items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <div className="bg-purple-500 p-2 rounded-xl">
                        <ImagePlus className="w-5 h-5 text-white" />
                      </div>
                      Paso 3: Variantes de Marketing
                    </CardTitle>
                    {activeStep === 3 ? <Plus className="w-4 h-4 rotate-45 transition-transform" /> : <ChevronRight className="w-4 h-4 transition-transform text-slate-400" />}
                 </CardHeader>
               </div>

               <AnimatePresence>
                 {activeStep === 3 && (
                   <motion.div
                     initial={{ height: 0, opacity: 0 }}
                     animate={{ height: 'auto', opacity: 1 }}
                     exit={{ height: 0, opacity: 0 }}
                     transition={{ duration: 0.3 }}
                   >
                     <CardContent className="p-6 space-y-6">
                        <div className={`grid grid-cols-1 ${!isBatchMode ? 'md:grid-cols-2' : ''} gap-8 items-center`}>
                            {/* Individual Configurator */}
                            <div className="space-y-6">
                               <div className="space-y-2">
                                 <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nombre del Producto</Label>
                                 <Input 
                                    placeholder="Ej: Auriculares Sony" 
                                    value={productName || ''}
                                    onChange={(e) => setProductName(e.target.value)}
                                    className="h-14 text-sm font-bold border-slate-200 rounded-2xl bg-slate-50/50"
                                 />
                               </div>
                               
                               <div className="p-6 bg-slate-50/50 rounded-[2rem] border border-slate-100 space-y-5">
                                 <div className="space-y-2">
                                   <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Variantes Creativas</Label>
                                   <div className="grid grid-cols-2 gap-2">
                                     <Button variant="outline" className={`h-16 font-black rounded-2xl text-[9px] uppercase flex flex-col gap-1 border-slate-200 ${generationType === 'COVER' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500'}`} onClick={() => setGenerationType('COVER')}>
                                        <Camera className="w-5 h-5" /> Portada
                                     </Button>
                                     <Button variant="outline" className={`h-16 font-black rounded-2xl text-[9px] uppercase flex flex-col gap-1 border-slate-200 ${generationType === 'LIFESTYLE' ? 'bg-purple-600 text-white' : 'bg-white text-slate-500'}`} onClick={() => setGenerationType('LIFESTYLE')}>
                                        <Play className="w-5 h-5" /> Lifestyle
                                     </Button>
                                     <Button variant="outline" className={`h-16 font-black rounded-2xl text-[9px] uppercase flex flex-col gap-1 border-slate-200 ${generationType === 'MEASURES' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-500'}`} onClick={() => setGenerationType('MEASURES')}>
                                        <Maximize2 className="w-5 h-5" /> Medidas
                                     </Button>
                                     <Button variant="outline" className={`h-16 font-black rounded-2xl text-[9px] uppercase flex flex-col gap-1 border-slate-200 ${generationType === 'INFOGRAPHIC' ? 'bg-ml-yellow text-slate-900 border-ml-yellow/20' : 'bg-white text-slate-500'}`} onClick={() => setGenerationType('INFOGRAPHIC')}>
                                        <Layout className="w-5 h-5" /> Info
                                     </Button>
                                     <Button variant="outline" className={`h-16 font-black rounded-2xl text-[9px] uppercase flex flex-col gap-1 border-slate-200 ${generationType === 'DETAIL' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500'}`} onClick={() => setGenerationType('DETAIL')}>
                                        <Layers className="w-5 h-5" /> Detalle
                                     </Button>
                                   </div>
                                 </div>

                                 {/* Conditional Detail Fields */}
                                 <AnimatePresence mode="wait">
                                   {(generationType === 'COVER' || generationType === 'LIFESTYLE') && (
                                     <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                          <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Entorno / Escenario</Label>
                                          {generationType === 'LIFESTYLE' && (
                                            <Select onValueChange={(val: string) => setEnvironment(val)}>
                                              <SelectTrigger className="h-7 w-auto text-[9px] font-black uppercase border-none bg-slate-100 text-slate-500 rounded-lg px-2">
                                                <SelectValue placeholder="Sugerencias" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {LIFESTYLE_SCENARIOS.map(s => (
                                                  <SelectItem key={s} value={s} className="text-[10px] font-bold">{s}</SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          )}
                                        </div>
                                        <textarea 
                                          placeholder="Ej: Mesa de madera rústica, jardín soleado..." 
                                          value={environment || ''}
                                          onChange={(e) => setEnvironment(e.target.value)}
                                          className="w-full min-h-[100px] p-4 text-xs font-medium rounded-2xl border border-slate-200 bg-white focus:ring-2 focus:ring-ml-blue/20 transition-all resize-none"
                                        />
                                     </motion.div>
                                   )}

                                   {generationType === 'DETAIL' && (
                                     <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                                        <div className="space-y-2">
                                           <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Imágenes de Referencia (Opcional)</Label>
                                           <p className="text-[9px] text-slate-400 font-medium italic mb-2">Sube fotos detalladas del producto para que la IA capture texturas y acabados reales.</p>
                                           <div className="flex flex-wrap gap-2">
                                              {detailReferenceImages.map((img, idx) => (
                                                <div key={idx} className="relative w-16 h-16 rounded-xl border border-slate-200 overflow-hidden group">
                                                   <img src={img} className="w-full h-full object-cover" />
                                                   <button 
                                                     onClick={() => setDetailReferenceImages(prev => prev.filter((_, i) => i !== idx))}
                                                     className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                                   >
                                                      <X className="w-3 h-3" />
                                                   </button>
                                                </div>
                                              ))}
                                              {detailReferenceImages.length < 3 && (
                                                <button 
                                                  onClick={() => {
                                                    const input = document.createElement('input');
                                                    input.type = 'file';
                                                    input.accept = 'image/*';
                                                    input.onchange = (e: any) => {
                                                      const file = e.target.files?.[0];
                                                      if (file) {
                                                        const reader = new FileReader();
                                                        reader.onload = (evt) => {
                                                          setDetailReferenceImages(prev => [...prev, evt.target?.result as string]);
                                                        };
                                                        reader.readAsDataURL(file);
                                                      }
                                                    };
                                                    input.click();
                                                  }}
                                                  className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 hover:border-ml-blue hover:text-ml-blue transition-all"
                                                >
                                                   <Plus className="w-5 h-5" />
                                                </button>
                                              )}
                                           </div>
                                        </div>
                                        <div className="space-y-2">
                                          <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Instrucciones de Detalle</Label>
                                          <textarea 
                                            placeholder="Ej: Zoom en las costuras de cuero, detalle del logo grabado..." 
                                            value={features || ''}
                                            onChange={(e) => setFeatures(e.target.value)}
                                            className="w-full min-h-[80px] p-4 text-xs font-medium rounded-2xl border border-slate-200 bg-white resize-none"
                                          />
                                        </div>
                                     </motion.div>
                                   )}

                                   {generationType === 'MEASURES' && (
                                     <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                                        <div className="flex items-center justify-between">
                                           <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Medidas del Empaque</Label>
                                           <div className="flex bg-white rounded-lg p-0.5 border border-slate-200">
                                              <button onClick={() => setMeasurementType('BOX')} className={`px-3 py-1 rounded-md text-[9px] font-black uppercase transition-all ${measurementType === 'BOX' ? 'bg-ml-blue text-white shadow-sm' : 'text-slate-400'}`}>Caja</button>
                                              <button onClick={() => setMeasurementType('CYLINDER')} className={`px-3 py-1 rounded-md text-[9px] font-black uppercase transition-all ${measurementType === 'CYLINDER' ? 'bg-ml-blue text-white shadow-sm' : 'text-slate-400'}`}>Cilindro</button>
                                           </div>
                                        </div>
                                        <div className="grid grid-cols-4 gap-3">
                                           {measurementType === 'BOX' ? (
                                             <>
                                               <Input placeholder="W" value={measures.w} onChange={(e) => setMeasures({...measures, w: e.target.value})} className="h-10 text-xs font-bold rounded-xl border-slate-200" />
                                               <Input placeholder="H" value={measures.h} onChange={(e) => setMeasures({...measures, h: e.target.value})} className="h-10 text-xs font-bold rounded-xl border-slate-200" />
                                               <Input placeholder="D" value={measures.d} onChange={(e) => setMeasures({...measures, d: e.target.value})} className="h-10 text-xs font-bold rounded-xl border-slate-200" />
                                             </>
                                           ) : (
                                             <>
                                               <Input placeholder="H" value={measures.h} onChange={(e) => setMeasures({...measures, h: e.target.value})} className="col-span-2 h-10 text-xs font-bold rounded-xl border-slate-200" />
                                               <Input placeholder="D" value={measures.d} onChange={(e) => setMeasures({...measures, d: e.target.value})} className="h-10 text-xs font-bold rounded-xl border-slate-200" />
                                             </>
                                           )}
                                           <div className="relative">
                                              <Input placeholder="kg" value={weight} onChange={(e) => setWeight(e.target.value)} className="h-10 text-xs font-bold rounded-xl border-slate-200 pl-6" />
                                              <Weight className="absolute left-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                           </div>
                                        </div>
                                     </motion.div>
                                   )}

                                   {generationType === 'INFOGRAPHIC' && (
                                     <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                          <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Título</Label>
                                            <Input placeholder="Ej: Calidad Premium" value={infographicTitle} onChange={(e) => setInfographicTitle(e.target.value)} className="h-12 text-xs font-bold rounded-xl border-slate-200" />
                                          </div>
                                          <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Estilo</Label>
                                            <Select value={infographicType} onValueChange={(val: any) => setInfographicType(val)}>
                                              <SelectTrigger className="h-12 text-xs font-bold rounded-xl border-slate-200">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="COLORED">Colores</SelectItem>
                                                <SelectItem value="IN_USE">En Uso</SelectItem>
                                                <SelectItem value="MINIMALIST">Mínima</SelectItem>
                                                <SelectItem value="PREMIUM_STUDIO">Premium</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </div>
                                        </div>
                                        <div className="space-y-2">
                                          <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Características (Puntos clave)</Label>
                                          <textarea 
                                            placeholder="Punto 1 | Punto 2 | Punto 3..." 
                                            value={features || ''}
                                            onChange={(e) => setFeatures(e.target.value)}
                                            className="w-full min-h-[80px] p-4 text-xs font-medium rounded-2xl border border-slate-200 bg-white focus:ring-2 focus:ring-ml-blue/20 transition-all resize-none"
                                          />
                                        </div>
                                     </motion.div>
                                   )}
                                 </AnimatePresence>
                               </div>

                               <div className="space-y-4">
                                  <div className="flex gap-4">
                                    <Button 
                                      onClick={() => handleTransform(generationType)}
                                      disabled={loadingType !== null || !heroImage}
                                      className="flex-1 h-16 sm:h-20 bg-slate-900 hover:bg-black text-white font-black rounded-2xl shadow-xl gap-3 text-sm sm:text-xl uppercase tracking-wider"
                                    >
                                      {loadingType !== null ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                                      <span>Generar Arte</span>
                                    </Button>
                                    
                                    {variantImage && (
                                      <Button 
                                        variant="outline"
                                        onClick={() => downloadImage(variantImage, 'marketing')}
                                        className="h-14 w-14 rounded-2xl border-slate-200"
                                      >
                                        <Download className="w-5 h-5" />
                                      </Button>
                                    )}
                                  </div>
                                  <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase text-slate-400">
                                    <Coins className="w-3 h-3" /> Costo: {VARIANT_COST} Tokens
                                  </div>
                               </div>
                            </div>

                            <div className="relative aspect-square w-full rounded-[2.5rem] overflow-hidden bg-[#F8F9FB] border border-slate-100 shadow-inner flex items-center justify-center group">
                               {variantImage ? (
                                 <>
                                   <img 
                                     src={variantImage} 
                                     className="w-full h-full object-contain p-6 transition-transform duration-500 group-hover:scale-105" 
                                     alt="Marketing variant" 
                                     referrerPolicy="no-referrer"
                                   />
                                   <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-4">
                                      <Button 
                                        size="icon" 
                                        className="h-12 w-12 bg-white rounded-2xl shadow-xl border-none text-slate-900 hover:bg-white hover:scale-110 transition-all"
                                        onClick={() => {
                                          setPreviewType('individual');
                                          setSelectedImageIndex(0);
                                          setActivePreviewImage('variant');
                                          setPreviewModalOpen(true);
                                        }}
                                      >
                                        <Maximize2 className="w-5 h-5" />
                                      </Button>
                                   </div>
                                 </>
                               ) : (
                                 <div className="flex flex-col items-center justify-center text-slate-300 gap-3">
                                    <div className="p-10 bg-white rounded-[2.5rem] shadow-sm ring-1 ring-slate-100 italic font-black text-4xl">?</div>
                                    <p className="text-xs font-bold italic">Esperando generación...</p>
                                 </div>
                               )}
                               {loadingType !== null && (
                                 <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                                   <Loader2 className="w-10 h-10 animate-spin text-ml-blue" />
                                   <p className="text-[10px] font-black text-ml-blue uppercase tracking-widest animate-pulse">Creando Arte...</p>
                                 </div>
                               )}
                            </div>
                         </div>
                      </CardContent>
                    </motion.div>
                  )}
                </AnimatePresence>
             </Card>
           )}
         </div>
       </div>
     </div>
   );
}

