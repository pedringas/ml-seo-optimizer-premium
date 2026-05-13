import { ProductInput, GenerationResult, GenerationType, ImageTransformOptions } from "../types";

export async function generateMLContent(product: ProductInput, deepSearch: boolean = true): Promise<GenerationResult> {
  const response = await fetch("/api/gemini/generate-content", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ product, deepSearch }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to generate content");
  }

  return response.json();
}

export async function transformProductImage(
  imageBase64: string, 
  type: GenerationType, 
  options: ImageTransformOptions = {}
): Promise<string> {
  const response = await fetch("/api/gemini/transform-image", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ imageBase64, type, options }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to transform image");
  }

  const data = await response.json();
  return data.imageUrl;
}
