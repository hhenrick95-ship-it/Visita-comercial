import danoneLiq850 from "@/assets/danone/danone-liq-mor-850g.png";
import danoneNatural160 from "@/assets/danone/danone-natural-int-160g.png";
import yoproChoco from "@/assets/danone/yopro-choco-15g.png";
import yoproMorango from "@/assets/danone/yopro-morango-15g.png";
import danoninho320 from "@/assets/danone/danoninho-320g-petit.png";
import activia800 from "@/assets/danone/activia-800g-morango.png";
import danoneMorango170 from "@/assets/danone/danone-morango-170g.png";
import danoninhoPouch70 from "@/assets/danone/danoninho-pouch-70g.png";
import activia170 from "@/assets/danone/activia-170g-morango.png";

/**
 * Mapa de imagens usadas em perguntas de formulário.
 * No banco, `form_questions.image_url` guarda apenas a chave (ex: "danone-liq-mor-850g")
 * ou uma URL absoluta (http...). Assets do projeto precisam ser importados como
 * módulos para funcionar no Vite/preview.
 */
const QUESTION_IMAGES: Record<string, string> = {
  "danone-liq-mor-850g": danoneLiq850,
  "danone-natural-int-160g": danoneNatural160,
  "yopro-choco-15g": yoproChoco,
  "yopro-morango-15g": yoproMorango,
  "danoninho-320g-petit": danoninho320,
  "activia-800g-morango": activia800,
  "danone-morango-170g": danoneMorango170,
  "danoninho-pouch-70g": danoninhoPouch70,
  "activia-170g-morango": activia170,
};

export function resolveQuestionImage(imageUrl?: string | null): string | null {
  if (!imageUrl) return null;
  if (/^(https?:)?\/\//.test(imageUrl) || imageUrl.startsWith("data:")) return imageUrl;
  const key = imageUrl.replace(/^.*\//, "").replace(/\.(png|jpe?g|webp)$/i, "");
  return QUESTION_IMAGES[key] || null;
}

export const QUESTION_IMAGE_KEYS = Object.keys(QUESTION_IMAGES);
