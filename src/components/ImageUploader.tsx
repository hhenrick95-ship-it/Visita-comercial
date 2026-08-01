import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Image as ImageIcon, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ImageUploaderProps {
  value: string[];
  onChange: (urls: string[]) => void;
  maxImages?: number;
}

// Helper function to extract file path from public URL or signed URL
const extractFilePath = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    // For signed URLs, the path is before the query params
    // For public URLs, extract from the path
    const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/form-images\/(.+)/);
    if (pathMatch) {
      return pathMatch[1];
    }
    // Try to match just the filename if it's a simple path
    const simpleMatch = urlObj.pathname.match(/\/([^/]+\.[^/]+)$/);
    if (simpleMatch) {
      return simpleMatch[1];
    }
    return null;
  } catch {
    // If not a valid URL, assume it's just a file path
    return url;
  }
};

// Comprime/redimensiona uma imagem no client para evitar OOM em mobile.
// Reduz fotos de câmera (5-12 MB, 4000x3000) para ~200-500 KB a 1600px max.
function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), ms);
    promise
      .then((value) => resolve(value))
      .catch((error) => reject(error))
      .finally(() => window.clearTimeout(timer));
  });
}

async function compressImage(file: File, maxDim = 1280, quality = 0.72): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await withTimeout(new Promise<HTMLImageElement>((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = reject;
      im.src = objectUrl;
    }), 12000, "Tempo excedido ao carregar imagem");
    const { width, height } = img;
    const scale = Math.min(1, maxDim / Math.max(width, height));
    const w = Math.round(width * scale);
    const h = Math.round(height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const blob = await withTimeout(new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality)
    ), 12000, "Tempo excedido ao comprimir imagem");
    // Libera memória do canvas
    canvas.width = 0;
    canvas.height = 0;
    if (!blob) return file;
    const baseName = (file.name || "foto").replace(/\.[^.]+$/, "");
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function ImageUploader({ value = [], onChange, maxImages = 10 }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [inputVersion, setInputVersion] = useState(0);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Generate signed URLs for private bucket access
  useEffect(() => {
    const generateSignedUrls = async () => {
      const newSignedUrls: Record<string, string> = {};
      
      for (const url of value) {
        // Skip if we already have a signed URL for this
        if (signedUrls[url]) {
          newSignedUrls[url] = signedUrls[url];
          continue;
        }

        const filePath = extractFilePath(url);
        if (filePath) {
          try {
            const { data, error } = await supabase.storage
              .from("form-images")
              .createSignedUrl(filePath, 3600); // 1 hour expiry

            if (!error && data?.signedUrl) {
              newSignedUrls[url] = data.signedUrl;
            } else {
              // Fallback to original URL if signing fails
              newSignedUrls[url] = url;
            }
          } catch {
            newSignedUrls[url] = url;
          }
        } else {
          newSignedUrls[url] = url;
        }
      }
      
      setSignedUrls(newSignedUrls);
    };

    if (value.length > 0) {
      generateSignedUrls();
    }
  }, [value]);

  const resetNativeInputs = () => {
    try {
      if (galleryInputRef.current) galleryInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    } catch {
      // Alguns WebViews/iOS podem bloquear o reset direto; recriar o input resolve.
    }
    setInputVersion((version) => version + 1);
  };

  const handleGalleryClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resetNativeInputs();
    window.setTimeout(() => galleryInputRef.current?.click(), 0);
  };

  const handleCameraClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resetNativeInputs();
    window.setTimeout(() => cameraInputRef.current?.click(), 0);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const inputEl = e.target;
    const files = inputEl.files ? Array.from(inputEl.files) : [];
    // Reset input value IMEDIATAMENTE (antes de qualquer await) para que o
    // iOS/Safari aceite selecionar o MESMO arquivo (ou tirar outra foto)
    // novamente na próxima tentativa. Se resetarmos só no finally e algo
    // travar no meio, o input fica "preso" e o usuário acha que "não vai".
    try { inputEl.value = ""; } catch {}
    if (files.length === 0) return;

    if (value.length + files.length > maxImages) {
      toast.error(`Máximo de ${maxImages} imagens permitidas`);
      return;
    }

    setUploading(true);
    const uploadedPaths: string[] = [];
    const failures: string[] = [];

    try {
      // Processa cada arquivo isoladamente: erro em 1 foto não derruba as outras.
      for (let i = 0; i < files.length; i++) {
        const original = files[i];
        try {
          const file = await withTimeout(
            compressImage(original),
            25000,
            "Tempo excedido ao preparar imagem"
          );
          const fileExt = (file.name.split(".").pop() || "jpg").toLowerCase();
          const fileName = `${Date.now()}-${i}-${Math.random().toString(36).slice(2)}.${fileExt}`;
          const filePath = `${fileName}`;

          const { error: uploadError } = await withTimeout(
            supabase.storage
              .from("form-images")
              .upload(filePath, file, { contentType: file.type, upsert: true }),
            45000,
            "Tempo excedido ao enviar imagem"
          );

          if (uploadError) throw uploadError;
          uploadedPaths.push(filePath);
        } catch (perFileErr: any) {
          console.error("[ImageUploader] falha em arquivo", original?.name, perFileErr);
          failures.push(original?.name || `foto ${i + 1}`);
        }
      }

      if (uploadedPaths.length > 0) {
        onChange([...value, ...uploadedPaths]);
        toast.success(`${uploadedPaths.length} imagem(ns) enviada(s) com sucesso`);
      }
      if (failures.length > 0) {
        toast.error(`Falha ao enviar ${failures.length} foto(s)`, {
          description: "Tente novamente. Se persistir, use a opção Galeria.",
        });
      }
    } finally {
      if (mountedRef.current) setUploading(false);
      // Garantia extra — inputs limpos para permitir nova seleção.
      resetNativeInputs();
    }
  };

  const handleRemove = (index: number) => {
    const newUrls = value.filter((_, i) => i !== index);
    const removed = value[index];
    if (removed) {
      setSignedUrls((prev) => {
        const next = { ...prev };
        delete next[removed];
        return next;
      });
    }
    onChange(newUrls);
  };

  // Get the display URL for an image (signed URL or fallback)
  const getDisplayUrl = (url: string): string => {
    return signedUrls[url] || url;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {value.map((url, index) => (
          <div key={index} className="relative group">
            <img
              src={getDisplayUrl(url)}
              alt={`Upload ${index + 1}`}
              loading="lazy"
              decoding="async"
              className="w-full h-32 object-cover rounded-lg"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => handleRemove(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}

        {value.length < maxImages && (
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg h-32 flex flex-col items-center justify-center gap-2 p-2">
            {uploading ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            ) : (
              <div className="flex flex-col gap-2 w-full">
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  className="w-full min-h-[44px]"
                  onClick={handleCameraClick}
                >
                  <Camera className="h-4 w-4" />
                  Tirar foto
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full min-h-[44px]"
                  onClick={handleGalleryClick}
                >
                  <ImageIcon className="h-4 w-4" />
                  Galeria
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <input
        key={`gallery-${inputVersion}`}
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={handleFileSelect}
        onClick={(e) => {
          e.currentTarget.value = "";
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        disabled={uploading}
      />

      <input
        key={`camera-${inputVersion}`}
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={handleFileSelect}
        onClick={(e) => {
          e.currentTarget.value = "";
        }}
        disabled={uploading}
      />

      <p className="text-sm text-muted-foreground">
        {value.length} / {maxImages} imagens
      </p>
    </div>
  );
}
