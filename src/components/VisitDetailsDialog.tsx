import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, X, ZoomIn, ImageOff, ChevronLeft, ChevronRight, Camera } from "lucide-react";
import { normalizeManagerName, TeamMember } from "@/lib/normalizeManager";
import { formatDateOnlyPtBR } from "@/lib/utils";
import { toast } from "sonner";

interface VisitDetailsDialogProps {
  visitId: string | null;
  onClose: () => void;
}

interface FormResponse {
  question_id: string;
  response_value: any;
  question?: {
    label: string;
    question_type: string;
    section_id: string;
  };
}

interface Section {
  id: string;
  title: string;
  display_order: number;
}

interface VisitData {
  id: string;
  visit_date: string;
  client_code: string;
  manager: string;
  rca_accompanied: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface LabeledImage {
  url: string;
  label: string;
  questionId: string;
}

// Extract file path from various URL formats
const extractFilePath = (input: string): string => {
  if (!input) return input;
  
  try {
    if (input.startsWith('http://') || input.startsWith('https://')) {
      const url = new URL(input);
      const pathname = url.pathname;
      
      const publicMatch = pathname.match(/\/storage\/v1\/object\/public\/form-images\/(.+)/);
      if (publicMatch) return publicMatch[1];
      
      const signMatch = pathname.match(/\/storage\/v1\/object\/sign\/form-images\/(.+)/);
      if (signMatch) return signMatch[1];
      
      const altPublicMatch = pathname.match(/\/object\/public\/form-images\/(.+)/);
      if (altPublicMatch) return altPublicMatch[1];
      
      const altSignMatch = pathname.match(/\/object\/sign\/form-images\/(.+)/);
      if (altSignMatch) return altSignMatch[1];
    }
    
    return input;
  } catch {
    return input;
  }
};

export function VisitDetailsDialog({ visitId, onClose }: VisitDetailsDialogProps) {
  const [loading, setLoading] = useState(true);
  const [visit, setVisit] = useState<VisitData | null>(null);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    loadTeamMembers();
  }, []);

  useEffect(() => {
    if (visitId) {
      loadVisitDetails();
    }
  }, [visitId]);

  // Generate signed URLs when responses are loaded
  useEffect(() => {
    const generateSignedUrls = async () => {
      const allImages: string[] = [];
      questions.forEach(q => {
        if (q.question_type === "image_upload") {
          const response = responses.find(r => r.question_id === q.id);
          const value = response?.response_value;
          if (Array.isArray(value)) {
            allImages.push(...value);
          }
        }
      });

      if (allImages.length === 0) return;

      setLoadingImages(true);
      const urls: Record<string, string> = {};

      await Promise.all(
        allImages.map(async (originalUrl) => {
          try {
            const filePath = extractFilePath(originalUrl);
            const { data, error } = await supabase.storage
              .from("form-images")
              .createSignedUrl(filePath, 3600);

            if (data?.signedUrl && !error) {
              urls[originalUrl] = data.signedUrl;
            }
          } catch (err) {
            console.error("Error generating signed URL for:", originalUrl, err);
          }
        })
      );

      setSignedUrls(urls);
      setLoadingImages(false);
    };

    if (responses.length > 0 && questions.length > 0) {
      generateSignedUrls();
    }
  }, [responses, questions]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const imgs = getLabeledImages();
      if (e.key === "Escape") setLightboxIndex(null);
      else if (e.key === "ArrowRight") setLightboxIndex(prev => prev !== null ? Math.min(prev + 1, imgs.length - 1) : null);
      else if (e.key === "ArrowLeft") setLightboxIndex(prev => prev !== null ? Math.max(prev - 1, 0) : null);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex, questions, responses]);

  const loadTeamMembers = async () => {
    const { data } = await supabase
      .from("teams_vendors")
      .select("cod_rca_lopes, nome_rca, nome_equipe, cargo")
      .in("cargo", ["supervisor", "coordenador", "gerente"]);
    setTeamMembers(data || []);
  };

  const loadVisitDetails = async () => {
    if (!visitId) return;
    
    setLoading(true);
    setSignedUrls({});
    try {
      const { data: visitData, error: visitError } = await supabase
        .from("visit_forms")
        .select("id, visit_date, client_code, manager, rca_accompanied, address, latitude, longitude")
        .eq("id", visitId)
        .single();

      if (visitError) throw visitError;
      setVisit(visitData);

      // Buscar o template "Visita Comercial" para filtrar somente suas seções/perguntas
      const templatesClient: any = supabase.from("form_templates");
      const { data: templateData } = await templatesClient
        .select("id")
        .eq("slug", "visita")
        .maybeSingle();
      const visitaTemplateId = (templateData as any)?.id as string | undefined;

      const { data: sectionsData } = await supabase
        .from("form_sections")
        .select("*")
        .eq("template_id", visitaTemplateId ?? "00000000-0000-0000-0000-000000000000")
        .eq("is_active", true)
        .order("display_order");
      
      setSections(sectionsData || []);

      const sectionIds = (sectionsData || []).map((s: any) => s.id);
      const { data: questionsData } = await supabase
        .from("form_questions")
        .select("*")
        .in("section_id", sectionIds.length ? sectionIds : ["00000000-0000-0000-0000-000000000000"])
        .eq("is_active", true)
        .order("display_order");
      
      setQuestions(questionsData || []);

      const { data: responsesData } = await supabase
        .from("form_responses")
        .select("question_id, response_value")
        .eq("visit_form_id", visitId);

      setResponses(responsesData || []);
    } catch (error) {
      console.error("Error loading visit details:", error);
    } finally {
      setLoading(false);
    }
  };

  const getResponseValue = (questionId: string) => {
    const response = responses.find(r => r.question_id === questionId);
    return response?.response_value;
  };

  const formatResponseValue = (question: any, value: any): string | string[] => {
    if (value === undefined || value === null || value === "") return "-";

    if (question.question_type === "image_upload" && Array.isArray(value)) {
      return value;
    }

    if (question.question_type === "radio" || question.question_type === "select") {
      const options = question.options as { label: string; value: string }[] | undefined;
      const option = options?.find((opt: any) => opt.value === value);
      return option?.label || String(value);
    }

    if (
      (question.question_type === "checkbox" || question.question_type === "multi_select") &&
      Array.isArray(value)
    ) {
      const options = question.options as { label: string; value: string }[] | undefined;
      return value.map((v: string) => {
        const option = options?.find((opt: any) => opt.value === v);
        return option?.label || v;
      }).join(", ");
    }

    if (question.question_type === "multi_select") {
      const options = question.options as { label: string; value: string }[] | undefined;
      const option = options?.find((opt: any) => opt.value === value);
      return option?.label || String(value);
    }

    if (question.question_type === "slider") {
      return `${value}/5`;
    }

    if (typeof value === "boolean") {
      return value ? "Sim" : "Não";
    }

    return String(value);
  };

  const getQuestionsBySection = (sectionId: string) => {
    return questions.filter(q => q.section_id === sectionId);
  };

  // Build labeled images array with question context
  const getLabeledImages = useCallback((): LabeledImage[] => {
    const labeled: LabeledImage[] = [];
    questions.forEach(q => {
      if (q.question_type === "image_upload") {
        const value = getResponseValue(q.id);
        if (Array.isArray(value)) {
          value.forEach((url: string) => {
            labeled.push({ url, label: q.label, questionId: q.id });
          });
        }
      }
    });
    return labeled;
  }, [questions, responses]);

  const getDisplayUrl = (originalUrl: string): string => {
    return signedUrls[originalUrl] || originalUrl;
  };

  const handleDownloadImage = async (originalUrl: string, index: number) => {
    try {
      const filePath = extractFilePath(originalUrl);
      const { data, error } = await supabase.storage
        .from("form-images")
        .download(filePath);

      if (error || !data) {
        console.error("Error downloading image:", error);
        return;
      }

      const downloadUrl = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `foto_${index + 1}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Error downloading image:", error);
    }
  };

  const handleDownloadAll = async () => {
    const imgs = getLabeledImages();
    if (imgs.length === 0) return;
    setDownloadingAll(true);
    try {
      for (let i = 0; i < imgs.length; i++) {
        await handleDownloadImage(imgs[i].url, i);
        // Small delay between downloads
        if (i < imgs.length - 1) await new Promise(r => setTimeout(r, 500));
      }
      toast.success(`${imgs.length} foto(s) baixada(s) com sucesso!`);
    } catch {
      toast.error("Erro ao baixar fotos");
    } finally {
      setDownloadingAll(false);
    }
  };

  // Open lightbox at specific image index from labeled images
  const openLightbox = (url: string) => {
    const imgs = getLabeledImages();
    const idx = imgs.findIndex(img => img.url === url);
    setLightboxIndex(idx >= 0 ? idx : 0);
  };

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    const imgs = getLabeledImages();
    if (Math.abs(diff) > 50) {
      if (diff < 0 && lightboxIndex !== null && lightboxIndex < imgs.length - 1) {
        setLightboxIndex(lightboxIndex + 1);
      } else if (diff > 0 && lightboxIndex !== null && lightboxIndex > 0) {
        setLightboxIndex(lightboxIndex - 1);
      }
    }
    touchStartX.current = null;
  };

  const labeledImages = getLabeledImages();

  // Image component with loading/error states
  const ImageWithFallback = ({ 
    originalUrl, 
    alt, 
    className, 
    onClick 
  }: { 
    originalUrl: string; 
    alt: string; 
    className?: string; 
    onClick?: () => void;
  }) => {
    const [error, setError] = useState(false);
    const displayUrl = getDisplayUrl(originalUrl);
    const isLoading = loadingImages && !signedUrls[originalUrl];

    if (isLoading) {
      return (
        <div className={`flex items-center justify-center bg-muted ${className}`}>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className={`flex items-center justify-center bg-muted ${className}`}>
          <ImageOff className="h-8 w-8 text-muted-foreground" />
        </div>
      );
    }

    return (
      <img
        src={displayUrl}
        alt={alt}
        className={className}
        onClick={onClick}
        onError={() => setError(true)}
      />
    );
  };

  const currentLightboxImage = lightboxIndex !== null ? labeledImages[lightboxIndex] : null;

  return (
    <>
      <Dialog open={!!visitId} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Detalhes da Visita</DialogTitle>
          </DialogHeader>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <ScrollArea className="max-h-[70vh] pr-4">
              {/* Visit Info */}
              {visit && (
                <div className="mb-6 p-4 bg-muted/50 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Data:</span>{" "}
                      <span className="font-medium">
                        {formatDateOnlyPtBR(visit.visit_date)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Cliente:</span>{" "}
                      <span className="font-medium">{visit.client_code}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Gestor:</span>{" "}
                      <span className="font-medium">{normalizeManagerName(visit.manager, teamMembers)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Vendedor:</span>{" "}
                      <span className="font-medium">{visit.rca_accompanied}</span>
                    </div>
                    {visit.address && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Endereço:</span>{" "}
                        <span className="font-medium">{visit.address}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sections and Responses */}
              <div className="space-y-6">
                {sections.map(section => {
                  const sectionQuestions = getQuestionsBySection(section.id);
                  if (sectionQuestions.length === 0) return null;

                  return (
                    <div key={section.id} className="space-y-3">
                      <h3 className="font-semibold text-primary border-b pb-2">
                        {section.title}
                      </h3>
                      <div className="space-y-2">
                        {sectionQuestions.map(question => {
                          const value = getResponseValue(question.id);
                          const formattedValue = formatResponseValue(question, value);

                          if (question.question_type === "image_upload") {
                            return (
                              <div key={question.id} className="py-2">
                                <p className="text-sm font-medium text-muted-foreground mb-2">
                                  {question.label}
                                </p>
                                {Array.isArray(value) && value.length > 0 ? (
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {value.map((url: string, idx: number) => (
                                      <div
                                        key={idx}
                                        className="relative group aspect-square rounded-lg overflow-hidden border"
                                      >
                                        <ImageWithFallback
                                          originalUrl={url}
                                          alt={`${question.label} - Foto ${idx + 1}`}
                                          className="w-full h-full object-cover cursor-pointer transition-transform hover:scale-105"
                                          onClick={() => openLightbox(url)}
                                        />
                                        {/* Label badge */}
                                        <div className="absolute top-1 left-1">
                                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-black/60 text-white border-0 backdrop-blur-sm">
                                            {question.label}
                                          </Badge>
                                        </div>
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                          <Button
                                            size="icon"
                                            variant="secondary"
                                            className="h-8 w-8"
                                            onClick={() => openLightbox(url)}
                                          >
                                            <ZoomIn className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            size="icon"
                                            variant="secondary"
                                            className="h-8 w-8"
                                            onClick={() => handleDownloadImage(url, idx)}
                                          >
                                            <Download className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <Badge variant="outline">Nenhuma imagem</Badge>
                                )}
                              </div>
                            );
                          }

                          return (
                            <div key={question.id} className="flex justify-between py-1 border-b border-dashed last:border-0">
                              <span className="text-sm text-muted-foreground">
                                {question.label}
                              </span>
                              <span className="text-sm font-medium text-right max-w-[60%]">
                                {formattedValue as string}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Images Gallery Summary */}
              {labeledImages.length > 0 && (
                <div className="mt-6 pt-6 border-t">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-primary flex items-center gap-2">
                      <Camera className="h-5 w-5" />
                      Galeria de Fotos ({labeledImages.length})
                    </h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDownloadAll}
                      disabled={downloadingAll}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      {downloadingAll ? "Baixando..." : "Baixar Todas"}
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {labeledImages.map((img, idx) => (
                      <div
                        key={idx}
                        className="relative group aspect-square rounded-lg overflow-hidden border cursor-pointer"
                        onClick={() => setLightboxIndex(idx)}
                      >
                        <ImageWithFallback
                          originalUrl={img.url}
                          alt={`${img.label} - Foto ${idx + 1}`}
                          className="w-full h-full object-cover transition-transform hover:scale-105"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                          <span className="text-white text-xs font-medium">{img.label}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Navigable Lightbox */}
      {currentLightboxImage && lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
          onClick={() => setLightboxIndex(null)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-10">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-white/20 text-white border-0 backdrop-blur-sm">
                {currentLightboxImage.label}
              </Badge>
              <span className="text-white/70 text-sm">
                {lightboxIndex + 1} de {labeledImages.length}
              </span>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="text-white hover:bg-white/20"
              onClick={() => setLightboxIndex(null)}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>

          {/* Previous */}
          {lightboxIndex > 0 && (
            <Button
              size="icon"
              variant="ghost"
              className="absolute left-2 sm:left-4 text-white hover:bg-white/20 h-10 w-10 z-10"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
          )}

          {/* Image */}
          <img
            src={getDisplayUrl(currentLightboxImage.url)}
            alt={currentLightboxImage.label}
            className="max-w-[90vw] max-h-[80vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Next */}
          {lightboxIndex < labeledImages.length - 1 && (
            <Button
              size="icon"
              variant="ghost"
              className="absolute right-2 sm:right-4 text-white hover:bg-white/20 h-10 w-10 z-10"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          )}

          {/* Bottom bar */}
          <div className="absolute bottom-4 right-4 z-10">
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                handleDownloadImage(currentLightboxImage.url, lightboxIndex);
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
