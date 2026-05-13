import { GoogleGenAI } from "@google/genai";
import { ProductInput, GenerationResult, Category, GenerationType, ImageTransformOptions } from "../types";

const apiKey = process.env.GEMINI_API_KEY;

const ai = new GoogleGenAI({ apiKey: apiKey || '' });

const CATEGORY_LABELS: Record<Category, string> = {
  juguetes: "Juguetes",
  bazar: "Bazar",
  libreria: "Librería",
  regaleria: "Regalería",
  electronica: "Electrónica",
};

export async function generateMLContent(product: ProductInput, deepSearch: boolean = true): Promise<GenerationResult> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing in server environment");
  }

  const prompt = `
    Actúa como un experto en SEO para plataformas de e-commerce. 
    Tu tarea es generar 3 versiones de títulos y 3 versiones de descripciones para un producto.
    
    DATOS DEL PRODUCTO:
    - Título original (sin SEO): ${product.title}
    - Características y medidas: ${product.characteristics}
    - Rubro/Categoría: ${CATEGORY_LABELS[product.category]}
    
    REGLAS SOBRE CARACTERÍSTICAS Y ESPECIFICACIONES (CRÍTICO):
    1. NO INVENTES características técnicas, medidas o materiales.
    2. ÚNICAMENTE utiliza la información proporcionada en el campo "Características y medidas".
    3. RESPETO ABSOLUTO AL TEXTO: Mantén la fidelidad total a los nombres de marca, medidas y especificaciones ingresadas. NO permitas errores ortográficos ni cambios de letras en las palabras que el usuario introdujo.
    4. EXCEPCIÓN: Si se proporciona una imagen, puedes analizarla para identificar detalles VISUALES reales (color, forma, textura, logos visibles) y sumarlos, pero nunca inventar medidas numéricas o especificaciones de manufactura que no sean evidentes.
    5. Si el campo de características está vacío, enfócate en los beneficios generales del producto según su título y categoría, pero mantén la sección de especificaciones breve.
    
    REGLAS ESTRICTAS PARA TÍTULOS:
    1. Máximo 60 caracteres (incluyendo espacios y símbolos).
    2. NO usar emojis.
    3. Optimizado para SEO (Palabras clave relevantes al principio).
    4. Debe ser claro y descriptivo.
    
    REGLAS ESTRICTAS PARA DESCRIPCIONES (FORMATO REQUERIDO):
    1. NO usar emojis.
    2. Estructura obligatoria:
       - Párrafo de introducción persuasivo.
       - Sección "CARACTERÍSTICAS PRINCIPALES" con bullet points.
       - Sección "ESPECIFICACIONES TÉCNICAS Y MEDIDAS" con bullet points detallados.
       - Sección "POR QUÉ ELEGIRNOS / BENEFICIOS".
       - Párrafo de cierre invitando a la compra.
    3. Incluir las medidas y características proporcionadas.
    4. Texto profesional y optimizado para conversión.
    
    ${deepSearch ? `
    PROCESO:
    1. Utiliza la herramienta de búsqueda de Google para realizar una investigación de palabras clave integral y profunda. 
    2. Analiza tendencias globales y locales en Google Search, Google Trends y sitios de e-commerce líderes para identificar qué términos tienen mayor volumen de búsqueda y mejor "search intent" (intención de compra).
    3. Identifica las "long-tail keywords" y términos semánticos que los usuarios utilizan en buscadores generales para encontrar este tipo de productos.
    4. Cruza esta información con los términos más exitosos dentro del e-commerce para encontrar el equilibrio perfecto entre el SEO de marketplace y el SEO de buscadores externos (como Google).
    5. Utiliza este mix de palabras clave estratégicamente para redactar títulos que atraigan tráfico tanto interno como externo, y descripciones que respondan a las dudas reales de los usuarios.
    ` : 'PROCESO: Genera el contenido basado en tu conocimiento experto actual sobre SEO en e-commerce sin realizar búsquedas externas.'}
    
    FORMATO DE RESPUESTA (JSON):
    {
      "titles": ["Título 1", "Título 2", "Título 3"],
      "descriptions": ["Descripción 1", "Descripción 2", "Descripción 3"],
      "keywords": ["palabra clave 1", "palabra clave 2", "palabra clave 3", "etc"]
    }
  `;

  const parts: any[] = [];
  
  if (product.image) {
    const base64Data = product.image.split(',')[1];
    const mimeType = product.image.split(';')[0].split(':')[1];
    parts.push({ inlineData: { data: base64Data, mimeType } });
  }
  
  parts.push({ text: prompt });

  const config: any = {
    responseMimeType: "application/json",
  };

  if (deepSearch) {
    config.tools = [{ googleSearch: {} }];
    config.toolConfig = { includeServerSideToolInvocations: true };
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts },
    config: {
      ...config,
      systemInstruction: "Eres un experto en SEO para e-commerce. Tu objetivo es maximizar la visibilidad y conversión de productos."
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("La IA no devolvió texto.");
  }
  
  const result = JSON.parse(text);
  
  return {
    titles: Array.isArray(result.titles) ? result.titles.slice(0, 3) : ["Error"],
    descriptions: Array.isArray(result.descriptions) ? result.descriptions.slice(0, 3) : ["Error"],
    keywords: Array.isArray(result.keywords) ? result.keywords : [],
  };
}

export async function transformProductImage(
  imageBase64: string, 
  type: GenerationType, 
  options: ImageTransformOptions = {}
): Promise<string> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing in server environment");
  }

  const base64Data = imageBase64.split(',')[1];
  const mimeType = imageBase64.split(';')[0].split(':')[1];

  let prompt = '';
  switch (type) {
    case 'PRO_STUDIO':
      const pName = options.productName || 'producto';
      prompt = `Analiza la imagen adjunta. Transformala en una fotografía de producto de ecommerce de estándar profesional.
Requisitos clave:
1. Fidelidad: Mantén un 100% de fidelidad con la forma, colores, materiales y detalles del ${pName} original de la foto. NO INVENTES ELEMENTOS NI MODIFIQUES EL PRODUCTO.
2. Respeto al Texto: Si el producto tiene marcas o textos visibles, mantenlos idénticos. No permitas errores ortográficos.
3. Entorno: El producto debe estar centrado sobre un fondo blanco puro (RGB 255,255,255) infinito.
4. Iluminación: Usa iluminación de estudio fotográfico suave para crear volumen y sombras de contacto realistas en la base.
5. Formato: La imagen final debe ser cuadrada (aspect ratio 1:1).`;
      break;
    case 'LIFESTYLE':
      const env = options.environment ? `ENTORNO ESPECÍFICO SOLICITADO: ${options.environment}.` : 'Coloca el producto en un entorno de uso realista y estéticamente agradable.';
      const desc = options.productName ? `NOMBRE DEL PRODUCTO: ${options.productName}.` : '';
      prompt = `Genera una fotografía técnica de estilo "Lifestyle" para este producto. 
${desc} 
${env} 

REGLAS ESTRICTAS:
1. FIDELIDAD: El producto debe ser exactamente igual al de la foto original. No cambies su forma, color o marca.
2. ENTORNO: Utiliza ÚNICAMENTE el entorno solicitado. Sé literal. No agregues personas ni elementos que distraigan si no fueron solicitados.
3. CALIDAD: Estética aspiracional de catálogo de alta gama.
4. TEXTO: Si hay algún texto en el entorno o producto, debe estar perfectamente escrito, sin errores ortográficos ni cambios de letras.`;
      break;
    case 'COVER':
      const coverEnv = options.environment ? `Entorno solicitado: ${options.environment}.` : 'Entorno elegante y minimalista en situación de uso.';
      prompt = `Genera una FOTO DE PORTADA premium para ${options.productName || 'el producto'}. 
Reglas estrictas:
1. Muestra el producto en una situación de uso real siguiendo fielmente el entorno: ${coverEnv}.
2. NO debe haber humanos ni partes del cuerpo humano.
3. NO debe haber símbolos, logotipos añadidos o textos inventados.
4. FIDELIDAD ABSOLUTA: No modifiques la estructura ni colores del producto original.
5. Ortografía impecable en cualquier texto que aparezca de forma natural (ej: etiquetas propias del producto).`;
      break;
    case 'MEASURES':
      const { w, h, d } = options.measures || { w: '?', h: '?', d: '?' };
      const weightText = options.weight ? `Además, incluye una etiqueta con un símbolo de pesa y el texto "peso" seguido del valor: ${options.weight} kg.` : '';
      const measurementDesc = options.measurementType === 'CYLINDER' 
        ? `Se trata de un producto cilíndrico o esférico. Indica: ALTO (H): ${h} cm, DIÁMETRO (D): ${d} cm`
        : `Se trata de un producto rectangular. Indica: ANCHO (W): ${w} cm, ALTO (H): ${h} cm, PROFUNDIDAD (D): ${d} cm`;

      prompt = `Genera una infografía de medidas profesional para este producto. 
      SOBRE LA IMAGEN: Añade líneas de cota gráficas y elegantes (dimensión técnica) indicando las siguientes dimensiones:
      ${measurementDesc}
      ${weightText}
      REGLAS ESTRICTAS:
      1. Es OBLIGATORIO que figure la leyenda "cm" junto a cada número de medida introducido.
      2. NO agregues ningún otro texto descriptivo, título promocional, o palabras aleatorias. Solo muestra las líneas de cota, los números proveídos y la palabra "cm". Respetar estrictamente lo que introdujo el usuario.
      3. Mantén un estilo estilizado e hipertecnico propio del ecommerce premium.`;
      break;
    case 'INFOGRAPHIC':
      const infoTitle = options.infographicTitle ? `TÍTULO: ${options.infographicTitle}` : '';
      const features = options.features || 'Características principales del producto';
      
      let stylePrompt = '';
      let formatInstructions = `Usa llamadas (callouts) con líneas dinámicas y un diseño gráfico audaz tipo marca líder de tecnología.`;

      switch (options.infographicType) {
        case 'COLORED':
          stylePrompt = `ESTILO VISUAL: Producto centrado como héroe. Usa colores vibrantes, patrones geométricos modernos y simbología técnica (iconos).`;
          break;
        case 'IN_USE':
          stylePrompt = `ESTILO VISUAL: Producto en una situación de uso real y aspiracional, minimalista y limpio.`;
          formatInstructions = `NO uses flechas y NO uses colores llamativos. Muestra el producto en uso y simplemente agrega bullet points minimalistas al costado para listar las características: ${features}. El diseño debe ser extremadamente sobrio y elegante.`;
          break;
        case 'MINIMALIST':
          stylePrompt = `ESTILO VISUAL: Diseño ultra minimalista y discreto sin distracción de colores de fondo fuertes.`;
          formatInstructions = `Usa indicadores sutiles sin saturar la composición gráfica.`;
          break;
        case 'PREMIUM_STUDIO':
          stylePrompt = `ESTILO VISUAL: Infografía de alta gama tipo catálogo de lujo, con contrastes profundos y sombras fotográficas.`;
          break;
        default:
          stylePrompt = `ESTILO VISUAL: Usa colores vibrantes, patrones geométricos modernos y simbología técnica (iconos).`;
      }

      prompt = `Genera una infografía de producto de ALTO IMPACTO. 
      ${stylePrompt}
      ${infoTitle}
      CONTENIDO A DESTACAR: ${features}.
      ${formatInstructions}`;
      break;
    case 'DETAIL':
      const detailInst = options.features ? `ENFOQUE ESPECÍFICO: ${options.features}.` : 'La composición debe centrarse en un detalle específico, textura o acabado del producto para resaltar su calidad.';
      prompt = `Genera una imagen de "DETALLE" de nivel profesional para este producto. 
${detailInst}
FIDELIDAD EXTREMA: El detalle debe ser 100% coherente con el producto mostrado en las fotos adjuntas. Observa texturas, materiales, costuras y grabados. 
ORTOGRAFÍA: Si hay texto visible en el detalle, debe ser idéntico al original, sin errores.
ESTILO: Primer plano (close-up) elegante con profundidad de campo (bokeh) artística y profesional. Evita humanos.`;
      break;
  }

  const parts: any[] = [{ inlineData: { data: base64Data, mimeType } }];

  // Add reference images if provided
  if (options.detailReferenceImages && options.detailReferenceImages.length > 0) {
    options.detailReferenceImages.forEach((refBase64) => {
      const refData = refBase64.split(',')[1];
      const refMimeType = refBase64.split(';')[0].split(':')[1];
      parts.push({ inlineData: { data: refData, mimeType: refMimeType } });
    });
  }

  parts.push({ text: prompt });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: parts,
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1"
      }
    },
  });

  if (!response.candidates || response.candidates.length === 0) {
    throw new Error("El modelo no generó ningún candidato.");
  }

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  
  throw new Error("No se pudo transformar la imagen.");
}
