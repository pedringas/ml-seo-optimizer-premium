import * as React from 'react';
import { 
  History as HistoryIcon, 
  Trash2, 
  Download, 
  Package, 
  Layers, 
  Clock 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HistoryItem } from '../../types';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

interface HistoryToolProps {
  history: HistoryItem[];
  clearHistory: () => void;
}

export default function HistoryTool({ history, clearHistory }: HistoryToolProps) {
  const downloadHistoryItem = (item: HistoryItem) => {
    if (item.tool === 'images') {
      if (item.type === 'individual' && item.imageUrl) {
        const link = document.createElement('a');
        link.href = item.imageUrl;
        link.download = `Imagen_Historial_${item.id}.png`;
        link.click();
      } else {
        toast.info('Para lotes de imágenes, usa la descarga directa desde el generador.');
      }
      return;
    }

    const ws = XLSX.utils.json_to_sheet(item.data.map(p => ({
      SKU: p.sku,
      Título: p.selectedTitle,
      Categoría: p.category,
      Descripción: p.selectedDescription,
      Keywords: p.keywords.join(', ')
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Historial SEO");
    XLSX.writeFile(wb, `SEO_Historial_${new Date(item.timestamp).toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-black tracking-tight text-slate-900">Historial</h2>
          <p className="text-sm font-medium text-slate-500">Recupera tus optimizaciones anteriores.</p>
        </div>
        {history.length > 0 && (
          <Button variant="ghost" className="text-red-500 hover:bg-red-50 gap-2 font-bold" onClick={clearHistory}>
            <Trash2 className="w-4 h-4" /> Borrar Todo
          </Button>
        )}
      </div>

      {history.length === 0 ? (
        <Card className="border-dashed border-slate-200 bg-slate-50/50 rounded-3xl">
          <CardContent className="flex flex-col items-center justify-center py-24 text-center">
            <div className="bg-white p-6 rounded-full shadow-sm mb-6">
              <Clock className="w-12 h-12 text-slate-300" />
            </div>
            <h3 className="text-xl font-black text-slate-700">No hay registros</h3>
            <p className="text-sm font-medium text-slate-400 max-w-sm mt-3">
              Genera optimizaciones para verlas aquí reflejadas. El historial se guarda localmente en esta sesión.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {history.map((item) => (
            <Card key={item.id} className="border-none ring-1 ring-slate-200 hover:ring-ml-blue/30 transition-all rounded-2xl overflow-hidden group">
              <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className={`p-4 rounded-2xl relative overflow-hidden group/thumb ${item.tool === 'images' ? 'bg-purple-100 text-purple-600' : (item.type === 'individual' ? 'bg-ml-blue/10 text-ml-blue' : 'bg-emerald-100 text-emerald-600')}`}>
                    {item.tool === 'images' ? (
                      item.imageUrl ? (
                        <div className="w-16 h-16 -m-4 relative overflow-hidden">
                          <img src={item.imageUrl} className="w-full h-full object-cover" alt="Thumbnail" referrerPolicy="no-referrer" />
                        </div>
                      ) : <Layers className="w-6 h-6" />
                    ) : (item.type === 'individual' ? <Package className="w-6 h-6" /> : <Layers className="w-6 h-6" />)}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-sm sm:text-lg text-slate-800 truncate max-w-[200px] sm:max-w-none">
                        {item.tool === 'images' 
                          ? (item.type === 'individual' ? `Transformación: ${item.data[0].productName || 'Sin Nombre'}` : `Lote de ${item.imageCount || item.data.length} Imágenes`)
                          : (item.type === 'individual' ? item.data[0].productTitle : `${item.data.length} Productos en Lote`)
                        }
                      </h4>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {new Date(item.timestamp).toLocaleString()}
                      </span>
                      <Badge variant="secondary" className={`text-[9px] font-black h-5 px-2 uppercase tracking-tighter border-none ${item.tool === 'images' ? 'bg-purple-50 text-purple-500' : 'bg-slate-100 text-slate-500'}`}>
                        {item.tool === 'images' ? 'Imágenes' : 'SEO Optimizer'}
                      </Badge>
                      <Badge variant="outline" className="text-[9px] font-black h-5 px-2 uppercase border-slate-200 text-slate-500 tracking-tighter">
                        {item.type === 'individual' ? 'Modo Individual' : 'Carga Masiva'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    {item.tool === 'images' && item.imageUrl && (
                        <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden hidden md:block">
                            <img src={item.imageUrl} className="w-full h-full object-contain" alt="Preview" />
                        </div>
                    )}
                    <Button 
                        className="flex-1 md:flex-none gap-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 h-12 px-6 rounded-xl font-bold transition-all group-hover:border-ml-blue group-hover:text-ml-blue" 
                        onClick={() => downloadHistoryItem(item)}
                    >
                        <Download className="w-5 h-5" /> 
                        {item.tool === 'images' ? 'Descargar' : 'Exportar Planilla'}
                    </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
