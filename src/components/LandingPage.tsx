import * as React from 'react';
import {
  Sparkles, Zap, Clock, TrendingUp, ImageIcon, Search,
  CheckCircle, ArrowRight, Star, Gift, ChevronDown, Play,
  BarChart3, ShieldCheck, Coins, Camera, Layers, Ruler, Layout, Info
} from 'lucide-react';

// ── Before/After Image Demo Section ──
const IMAGE_VARIANTS = [
  {
    id: 'studio',
    label: 'Estudio',
    icon: Camera,
    color: 'from-blue-500 to-blue-600',
    badge: 'bg-blue-500',
    description: 'Fondo blanco profesional, iluminación perfecta',
    tag: '📸 Estudio Profesional',
    afterImage: 'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=500&q=80', // Reemplazar con '/images/despues-estudio.jpg'
  },
  {
    id: 'lifestyle',
    label: 'Lifestyle',
    icon: Sparkles,
    color: 'from-amber-500 to-orange-500',
    badge: 'bg-amber-500',
    description: 'Producto en contexto de uso real',
    tag: '✨ Lifestyle',
    afterImage: 'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=500&q=80', // Reemplazar con '/images/despues-lifestyle.jpg'
  },
  {
    id: 'medidas',
    label: 'Medidas',
    icon: Ruler,
    color: 'from-cyan-500 to-teal-500',
    badge: 'bg-cyan-500',
    description: 'Dimensiones y especificaciones técnicas',
    tag: '📐 Medidas técnicas',
    afterImage: 'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=500&q=80', // Reemplazar con '/images/despues-medidas.jpg'
  },
  {
    id: 'portada',
    label: 'Portada E-Commerce',
    icon: Layout,
    color: 'from-yellow-400 to-yellow-500',
    badge: 'bg-yellow-500',
    description: 'Formato optimizado para portada de E-Commerce',
    tag: '🏆 Portada',
    afterImage: 'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=500&q=80', // Reemplazar con '/images/despues-portada.jpg'
  },
  {
    id: 'infografia',
    label: 'Infografía',
    icon: Info,
    color: 'from-purple-500 to-violet-600',
    badge: 'bg-purple-500',
    description: 'Beneficios y características destacadas',
    tag: '💡 Infografía',
    afterImage: 'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=500&q=80', // Reemplazar con '/images/despues-infografia.jpg'
  },
];

function BeforeAfterSection({ onShowAuth }: { onShowAuth: (m: 'register') => void }) {
  const [selected, setSelected] = React.useState(IMAGE_VARIANTS[0]);

  // 1. Imagen de ANTES (la original sin editar)
  // Para usar una tuya, cambiá esto por algo como: const BEFORE_IMG = '/images/antes.jpg';
  const BEFORE_IMG = 'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=500&q=80';

  return (
    <section className="py-24 px-6 bg-white/[0.02] border-y border-white/5">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs font-black uppercase tracking-widest text-[#fff159] mb-3">Resultados Reales</p>
          <h2 className="text-3xl sm:text-4xl font-black mb-4">De foto de celular a imagen profesional</h2>
          <p className="text-slate-400 max-w-xl mx-auto">Elegí el tipo de imagen que necesitás y la IA hace la transformación en segundos</p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {IMAGE_VARIANTS.map((v) => (
            <button
              key={v.id}
              onClick={() => setSelected(v)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black transition-all ${
                selected.id === v.id
                  ? `bg-gradient-to-r ${v.color} text-white shadow-lg scale-105`
                  : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              <v.icon className="w-4 h-4" />
              {v.label}
            </button>
          ))}
        </div>

        {/* Before / After cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* BEFORE */}
          <div className="rounded-3xl overflow-hidden border border-white/10 bg-white/[0.03]">
            <div className="px-5 py-3 flex items-center gap-3 border-b border-white/10">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <span className="text-xs font-black uppercase tracking-widest text-slate-500">Antes — Foto de celular</span>
            </div>
            <div className="relative aspect-square bg-slate-900/50 overflow-hidden">
              <img
                src={BEFORE_IMG}
                alt="Foto tomada con celular"
                className="w-full h-full object-cover"
              />
              {/* Simulate phone imperfections */}
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-slate-900/40" />
              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                <Camera className="w-3 h-3" /> IMG_3847.jpg
              </div>
              <div className="absolute bottom-3 left-3 right-3 bg-black/50 backdrop-blur-sm rounded-xl p-2">
                <p className="text-[10px] text-red-400 font-bold">✕ Fondo desprolijo · Iluminación pobre · Sin optimización</p>
              </div>
            </div>
          </div>

          {/* AFTER */}
          <div className="rounded-3xl overflow-hidden border border-white/10 bg-white/[0.03]">
            <div className="px-5 py-3 flex items-center gap-3 border-b border-white/10">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-xs font-black uppercase tracking-widest text-emerald-400">Después — {selected.label} con IA</span>
            </div>
            <div className="relative aspect-square overflow-hidden bg-slate-900">
              <img
                src={selected.afterImage}
                alt={`Resultado ${selected.label}`}
                className="w-full h-full object-cover transition-all duration-700"
              />

              {/* Variant-specific overlays */}
              {selected.id === 'medidas' && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-1/2 left-4 right-4 h-px border-t-2 border-dashed border-cyan-400/70" />
                  <div className="absolute left-1/2 top-4 bottom-4 w-px border-l-2 border-dashed border-cyan-400/70" />
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-cyan-500 text-white text-[10px] font-black px-2 py-0.5 rounded">25 cm</div>
                  <div className="absolute top-1/2 left-4 -translate-y-1/2 bg-cyan-500 text-white text-[10px] font-black px-2 py-0.5 rounded">12 cm</div>
                </div>
              )}
              {selected.id === 'infografia' && (
                <div className="absolute top-3 right-3 space-y-1">
                  {['✓ Premium', '✓ Natural', '✓ Sin parabenos'].map(f => (
                    <div key={f} className="bg-purple-600/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-lg">{f}</div>
                  ))}
                </div>
              )}
              {selected.id === 'portada' && (
                <div className="absolute bottom-0 inset-x-0 bg-[#3483fa] py-3 px-4">
                  <p className="text-white font-black text-sm tracking-wide">PRODUCTO DESTACADO</p>
                  <p className="text-white/70 text-[10px]">Precio especial · Envío gratis</p>
                </div>
              )}

              <div className="absolute top-3 left-3">
                <div className={`${selected.badge} text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg`}>
                  {selected.tag}
                </div>
              </div>
              <div className="absolute bottom-3 left-3 right-3 bg-black/50 backdrop-blur-sm rounded-xl p-2">
                <p className="text-[10px] text-emerald-400 font-bold">✓ {selected.description}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-10">
          <button
            onClick={() => onShowAuth('register')}
            className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-black bg-[#3483fa] hover:bg-[#2d6fe0] text-white transition-all shadow-xl shadow-blue-500/30 hover:-translate-y-0.5"
          >
            <Gift className="w-5 h-5" />
            Probá gratis con tus productos
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </button>
          <p className="text-xs text-slate-600 mt-3">30 créditos gratis · Sin tarjeta requerida</p>
        </div>
      </div>
    </section>
  );
}

interface LandingPageProps {
  onShowAuth: (mode?: 'login' | 'register') => void;
  onEnterDemo: () => void;
}

export default function LandingPage({ onShowAuth, onEnterDemo }: LandingPageProps) {
  const [activeFaq, setActiveFaq] = React.useState<number | null>(null);

  const features = [
    {
      icon: Search,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      title: 'SEO Automatizado con IA',
      description: 'Generá títulos y descripciones optimizados para tu E-Commerce en segundos. La IA analiza las tendencias de búsqueda y maximiza tu visibilidad.',
      stat: '10x más rápido',
    },
    {
      icon: ImageIcon,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
      title: 'Imágenes Pro con IA',
      description: 'Transformá fotos simples en imágenes profesionales: fondo blanco, infografías, lifestyle y más. Sin fotógrafo, sin Photoshop.',
      stat: '80% menos costo',
    },
    {
      icon: BarChart3,
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-600',
      title: 'Análisis y Seguimiento',
      description: 'Historial completo de todas tus optimizaciones. Compará versiones, reusá contenido y tomá decisiones basadas en datos.',
      stat: 'Todo en un lugar',
    },
  ];

  const benefits = [
    { icon: Clock, label: 'Ahorro de tiempo', value: '5 hs/semana', sub: 'en promedio por vendedor' },
    { icon: TrendingUp, label: 'Más visibilidad', value: '+40%', sub: 'en búsquedas' },
    { icon: Coins, label: 'Ahorro en costos', value: '$50.000+', sub: 'vs. agencia o fotógrafo' },
  ];

  const steps = [
    { n: '01', title: 'Creá tu cuenta gratis', desc: 'Registrate en segundos y recibí 30 créditos de regalo para probar todo.' },
    { n: '02', title: 'Subí tu producto', desc: 'Ingresá el nombre, características y una foto de tu producto.' },
    { n: '03', title: 'La IA hace el trabajo', desc: 'En segundos tenés títulos SEO, descripciones y fotos profesionales listas.' },
    { n: '04', title: 'Publicá y vendé más', desc: 'Copiá el contenido y publicá en tu E-Commerce con todo optimizado.' },
  ];

  const faqs = [
    { q: '¿Qué son los créditos?', a: 'Los créditos son la moneda de la plataforma. Cada acción (generar un título, transformar una imagen) consume créditos. Al registrarte recibís 30 créditos gratis para probar todas las herramientas.' },
    { q: '¿Necesito saber de IA o SEO?', a: 'Para nada. La plataforma está diseñada para vendedores, no para técnicos. Solo cargás los datos de tu producto y la IA hace el resto.' },
    { q: '¿Funciona para cualquier categoría?', a: 'Sí. Product Pro funciona para todas las categorías: electrónica, indumentaria, hogar, juguetes, herramientas, y mucho más.' },
    { q: '¿Puedo probar antes de pagar?', a: 'Sí, los 30 créditos de bienvenida son completamente gratis, sin tarjeta de crédito requerida. También podés ver una demo sin registrarte.' },
  ];

  return (
    <div className="min-h-screen bg-[#0A0E1A] text-white font-sans overflow-x-hidden">

      {/* ── HEADER NAV ── */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-white/5 backdrop-blur-xl bg-[#0A0E1A]/80">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-[#fff159] p-1.5 rounded-xl shadow-lg shadow-yellow-400/30">
              <Sparkles className="w-5 h-5 text-slate-900" />
            </div>
            <span className="font-black text-xl tracking-tight">
              PRODUCT <span className="text-[#3483fa] italic">PRO</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onEnterDemo}
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-slate-300 hover:text-white hover:bg-white/5 transition-all"
            >
              <Play className="w-4 h-4" />
              Ver demo
            </button>
            <button
              onClick={() => onShowAuth('login')}
              className="px-4 py-2 rounded-xl text-sm font-bold text-slate-300 hover:text-white hover:bg-white/5 transition-all"
            >
              Iniciar sesión
            </button>
            <button
              onClick={() => onShowAuth('register')}
              className="px-5 py-2 rounded-xl text-sm font-black bg-[#3483fa] hover:bg-[#2d6fe0] text-white transition-all shadow-lg shadow-blue-500/30"
            >
              Empezar gratis
            </button>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#3483fa]/15 rounded-full blur-[120px]" />
          <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-[#fff159]/5 rounded-full blur-[80px]" />
        </div>

        <div className="relative max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-bold text-[#fff159] mb-8 backdrop-blur-sm">
            <Gift className="w-4 h-4" />
            30 créditos gratis al registrarte · Sin tarjeta
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.08] mb-6">
            Vendé más en tu{' '}
            <span className="relative inline-block">
              <span className="text-[#8b5cf6]">E-Commerce</span>
              <span className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r from-[#8b5cf6] to-[#fff159] rounded-full opacity-60" />
            </span>{' '}
            con el poder de la{' '}
            <span className="text-[#fff159]">IA</span>
          </h1>

          <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mb-10">
            Automatizá la creación de títulos SEO, descripciones optimizadas e imágenes profesionales.
            Lo que antes te llevaba horas, ahora son <strong className="text-white">segundos</strong>.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              id="hero-cta-register"
              onClick={() => onShowAuth('register')}
              className="group flex items-center gap-3 px-8 py-4 rounded-2xl text-lg font-black bg-[#3483fa] hover:bg-[#2d6fe0] text-white transition-all shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5"
            >
              <Gift className="w-5 h-5" />
              Crear cuenta gratis
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </button>
            <button
              id="hero-cta-demo"
              onClick={onEnterDemo}
              className="flex items-center gap-3 px-8 py-4 rounded-2xl text-lg font-black bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all hover:-translate-y-0.5"
            >
              <Play className="w-5 h-5 text-[#fff159]" />
              Probar sin registrarme
            </button>
          </div>

          {/* Social proof */}
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-slate-500">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Sin tarjeta de crédito</span>
            </div>
            <div className="hidden sm:block w-1 h-1 rounded-full bg-slate-700" />
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>Cancelá cuando quieras</span>
            </div>
            <div className="hidden sm:block w-1 h-1 rounded-full bg-slate-700" />
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 text-[#fff159] fill-[#fff159]" />
              ))}
              <span className="ml-1">4.9/5 estrellas</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── METRICS BAR ── */}
      <section className="py-12 px-6 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8">
          {benefits.map((b) => (
            <div key={b.label} className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <b.icon className="w-5 h-5 text-[#3483fa]" />
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">{b.label}</span>
              </div>
              <div className="text-4xl font-black text-white mb-1">{b.value}</div>
              <p className="text-sm text-slate-500">{b.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PROBLEM SECTION ── */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-black mb-6">
            ¿Cuántas horas perdés optimizando<br />
            <span className="text-slate-500">publicaciones manualmente?</span>
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            La mayoría de los vendedores invierten <span className="text-white font-bold">5 o más horas semanales</span> escribiendo títulos, descripciones y editando fotos. Ese tiempo vale dinero. <span className="text-[#fff159] font-bold">Product Pro lo hace por vos en segundos.</span>
          </p>

          {/* Before / After */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-6 text-left">
            <div className="p-6 rounded-2xl bg-red-950/30 border border-red-500/20">
              <p className="text-xs font-black uppercase tracking-widest text-red-400 mb-4">❌ Sin Product Pro</p>
              <ul className="space-y-3 text-sm text-slate-300">
                {[
                  'Horas escribiendo títulos y descripciones',
                  'Fotos de baja calidad que no convierten',
                  'Sin saber qué palabras clave usar',
                  'Contratar diseñadores o agencias',
                  'Publicaciones inconsistentes',
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">✕</span> {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-6 rounded-2xl bg-emerald-950/30 border border-emerald-500/20">
              <p className="text-xs font-black uppercase tracking-widest text-emerald-400 mb-4">✅ Con Product Pro</p>
              <ul className="space-y-3 text-sm text-slate-300">
                {[
                  'Títulos SEO generados en segundos',
                  'Imágenes profesionales con IA',
                  'Palabras clave optimizadas automáticamente',
                  'Cero costo de diseño o agencia',
                  'Contenido uniforme y premium',
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">✓</span> {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── BEFORE / AFTER ── */}
      <BeforeAfterSection onShowAuth={onShowAuth} />

      {/* ── FEATURES ── */}
      <section className="py-24 px-6 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-black uppercase tracking-widest text-[#3483fa] mb-3">Herramientas</p>
            <h2 className="text-3xl sm:text-4xl font-black">Todo lo que necesitás para vender más</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="group p-8 rounded-3xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.15] hover:bg-white/[0.06] transition-all duration-300 hover:-translate-y-1"
              >
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-6 shadow-lg`}>
                  <f.icon className="w-6 h-6 text-white" />
                </div>
                <div className="inline-block px-3 py-1 rounded-full bg-white/5 text-xs font-black text-slate-400 mb-4">
                  {f.stat}
                </div>
                <h3 className="text-xl font-black text-white mb-3">{f.title}</h3>
                <p className="text-slate-400 leading-relaxed text-sm">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-black uppercase tracking-widest text-[#fff159] mb-3">Cómo funciona</p>
            <h2 className="text-3xl sm:text-4xl font-black">En 4 pasos simples</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <div key={s.n} className="relative">
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-white/20 to-transparent z-0" />
                )}
                <div className="relative z-10 text-center lg:text-left">
                  <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-[#3483fa] to-[#2d6fe0] items-center justify-center mb-4 shadow-xl shadow-blue-500/20">
                    <span className="text-xl font-black text-white">{s.n}</span>
                  </div>
                  <h3 className="font-black text-white mb-2">{s.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FREE CREDITS CTA BANNER ── */}
      <section className="py-8 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#fff159] to-[#f5e200] p-10 text-center">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl pointer-events-none" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900/20 rounded-full text-sm font-black text-slate-900 mb-4">
                <Gift className="w-4 h-4" />
                OFERTA DE BIENVENIDA
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3">
                30 créditos gratis para empezar
              </h2>
              <p className="text-slate-700 font-medium max-w-xl mx-auto mb-8 text-lg">
                Al crear tu cuenta, te regalamos 30 créditos para que pruebes todas las herramientas sin poner un peso.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => onShowAuth('register')}
                  className="group flex items-center gap-3 px-8 py-4 rounded-2xl text-lg font-black bg-slate-900 hover:bg-slate-800 text-white transition-all shadow-xl hover:-translate-y-0.5"
                >
                  <Sparkles className="w-5 h-5 text-[#fff159]" />
                  Reclamar mis 30 créditos gratis
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </button>
                <button
                  onClick={onEnterDemo}
                  className="flex items-center gap-2 px-6 py-4 rounded-2xl text-base font-bold text-slate-700 hover:text-slate-900 transition-all"
                >
                  <Play className="w-4 h-4" />
                  Ver demo primero
                </button>
              </div>
              <p className="text-xs text-slate-600 mt-4">Sin tarjeta de crédito · Sin compromiso · Cancelá cuando quieras</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black">Preguntas frecuentes</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden"
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-5 text-left font-bold text-white hover:bg-white/5 transition-all"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 transition-transform duration-300 flex-shrink-0 ml-4 ${activeFaq === i ? 'rotate-180' : ''}`}
                  />
                </button>
                {activeFaq === i && (
                  <div className="px-6 pb-5 text-slate-400 text-sm leading-relaxed border-t border-white/5 pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-[#3483fa]/20 border border-[#3483fa]/30 mb-6">
              <Zap className="w-10 h-10 text-[#3483fa]" />
            </div>
          </div>
          <h2 className="text-4xl sm:text-5xl font-black mb-6 leading-tight">
            Empezá a vender más<br />
            <span className="text-[#3483fa]">hoy mismo</span>
          </h2>
          <p className="text-xl text-slate-400 mb-10 leading-relaxed">
            Únete a los vendedores que ya optimizan sus publicaciones con IA.
            Tu primer mes con 30 créditos gratis, <span className="text-white font-bold">sin riesgos</span>.
          </p>
          <button
            onClick={() => onShowAuth('register')}
            className="group inline-flex items-center gap-3 px-10 py-5 rounded-2xl text-xl font-black bg-[#3483fa] hover:bg-[#2d6fe0] text-white transition-all shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-1"
          >
            <Gift className="w-6 h-6" />
            Crear mi cuenta gratis
            <ArrowRight className="w-6 h-6 transition-transform group-hover:translate-x-1" />
          </button>
          <p className="text-sm text-slate-600 mt-5">30 créditos gratis · Sin tarjeta · Cancelá cuando quieras</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-[#fff159] p-1.5 rounded-lg">
              <Sparkles className="w-4 h-4 text-slate-900" />
            </div>
            <span className="font-black text-white">PRODUCT <span className="text-[#3483fa] italic">PRO</span></span>
          </div>
          <p className="text-xs text-slate-600">© 2026 Product Pro. Todos los derechos reservados.</p>
          <div className="flex items-center gap-4 text-xs text-slate-600">
            <span className="hover:text-slate-400 cursor-pointer transition-colors">Términos</span>
            <span className="hover:text-slate-400 cursor-pointer transition-colors">Privacidad</span>
            <span className="hover:text-slate-400 cursor-pointer transition-colors">Soporte</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
