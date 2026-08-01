import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTutorialSlides, TutorialSlide } from "@/hooks/useTutorialSlides";
import { SlideRenderer } from "@/components/tutorial/SlideRenderer";
import { TutorialSlideEditor } from "@/components/tutorial/TutorialSlideEditor";
import { iconMap } from "@/components/tutorial/TutorialSlides";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  ChevronLeft, ChevronRight, Maximize, Minimize, X, Grid3X3,
  Pencil, Plus, Trash2, ArrowUp, ArrowDown, Loader2, Copy, Download, FileText, Presentation
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { exportTutorialPDF, exportTutorialPPTX } from "@/lib/exportTutorial";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Map DB slide to SlideData format used by SlideRenderer
function toSlideData(s: TutorialSlide) {
  return {
    type: s.type as any,
    title: s.title,
    subtitle: s.subtitle ?? undefined,
    items: s.items ?? undefined,
    table: s.table_data ?? undefined,
    diagramNodes: s.diagram_nodes ?? undefined,
    highlightValue: s.highlight_value ?? undefined,
    highlightLabel: s.highlight_label ?? undefined,
    highlightDescription: s.highlight_description ?? undefined,
    screenshotUrl: s.screenshot_url ?? undefined,
    screenshotPosition: s.screenshot_position ?? "right",
    screenshotLayout: s.screenshot_layout ?? "horizontal",
    screenshots: s.screenshots ?? undefined,
    block: s.block,
  };
}

const Tutorial = () => {
  const { slides: dbSlides, isLoading, upsertSlide, deleteSlide, reorderSlides, uploadScreenshot } = useTutorialSlides();
  const { role } = useAuth();
  const isAdmin = role === "admin";

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editingSlide, setEditingSlide] = useState<TutorialSlide | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();
  const navigate = useNavigate();

  const totalSlides = dbSlides.length;
  const progress = totalSlides > 0 ? ((currentSlide + 1) / totalSlides) * 100 : 0;

  const goTo = useCallback((index: number) => {
    setCurrentSlide(Math.max(0, Math.min(index, totalSlides - 1)));
    setShowGrid(false);
  }, [totalSlides]);

  const next = useCallback(() => goTo(currentSlide + 1), [currentSlide, goTo]);
  const prev = useCallback(() => goTo(currentSlide - 1), [currentSlide, goTo]);

  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editorOpen) return; // Don't navigate while editing
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      else if (e.key === "Escape") {
        if (showGrid) { setShowGrid(false); setEditMode(false); }
        else if (isFullscreen) document.exitFullscreen();
        else if (editMode) setEditMode(false);
        else navigate(-1);
      }
      else if (e.key === "g" || e.key === "G") setShowGrid(v => !v);
      else if (e.key === "f" || e.key === "F") toggleFullscreen();
      else if ((e.key === "e" || e.key === "E") && isAdmin) setEditMode(v => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, isFullscreen, showGrid, navigate, toggleFullscreen, editMode, editorOpen, isAdmin]);

  // Auto-hide controls
  useEffect(() => {
    if (editMode) return;
    const onMove = () => {
      setShowControls(true);
      clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setShowControls(false), 3000);
    };
    window.addEventListener("mousemove", onMove);
    return () => { window.removeEventListener("mousemove", onMove); clearTimeout(hideTimer.current); };
  }, [editMode]);

  const handleSaveSlide = async (data: Partial<TutorialSlide>) => {
    if (!data.id) {
      // New slide - set display_order to end
      data.display_order = totalSlides;
    }
    await upsertSlide.mutateAsync(data);
  };

  const handleDeleteSlide = async () => {
    if (!deleteTarget) return;
    try {
      await deleteSlide.mutateAsync(deleteTarget);
      toast.success("Slide excluído");
      if (currentSlide >= totalSlides - 1) setCurrentSlide(Math.max(0, totalSlides - 2));
    } catch (e: any) {
      toast.error(e.message);
    }
    setDeleteTarget(null);
  };

  const handleDuplicateSlide = async (slide: TutorialSlide) => {
    try {
      const { id, created_at, updated_at, ...rest } = slide as any;
      await upsertSlide.mutateAsync({ ...rest, display_order: totalSlides });
      toast.success("Slide duplicado");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleMoveSlide = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= totalSlides) return;
    const updates = [
      { id: dbSlides[index].id, display_order: dbSlides[targetIndex].display_order },
      { id: dbSlides[targetIndex].id, display_order: dbSlides[index].display_order },
    ];
    await reorderSlides.mutateAsync(updates);
  };

  const handleExportPDF = async () => {
    toast.info("Gerando PDF...");
    const slideData = dbSlides.map(toSlideData);
    await exportTutorialPDF(slideData);
    toast.success("PDF exportado!");
  };

  const handleExportPPTX = async () => {
    toast.info("Gerando PowerPoint...");
    const slideData = dbSlides.map(toSlideData);
    await exportTutorialPPTX(slideData);
    toast.success("PowerPoint exportado!");
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-white animate-spin" />
      </div>
    );
  }

  if (totalSlides === 0) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <p className="text-white text-xl">Nenhum slide cadastrado</p>
        {isAdmin && (
          <Button onClick={() => { setEditingSlide(null); setEditorOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Criar Primeiro Slide
          </Button>
        )}
      </div>
    );
  }

  // Grid view
  if (showGrid) {
    return (
      <div ref={containerRef} className="min-h-screen bg-slate-950 p-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-white">Todos os Slides ({totalSlides})</h2>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button variant="outline" className="text-white border-white/20" onClick={() => setEditMode(v => !v)}>
                <Pencil className="w-4 h-4 mr-2" /> {editMode ? "Sair da Edição" : "Editar"}
              </Button>
            )}
            <Button variant="ghost" className="text-white" onClick={() => setShowGrid(false)}>
              <X className="w-5 h-5 mr-2" /> Fechar
            </Button>
          </div>
        </div>

        {isAdmin && editMode && (
          <div className="mb-6">
            <Button onClick={() => { setEditingSlide(null); setEditorOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Novo Slide
            </Button>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {dbSlides.map((slide, i) => (
            <div key={slide.id} className="relative group">
              <button
                onClick={() => editMode ? (() => { setEditingSlide(slide); setEditorOpen(true); })() : goTo(i)}
                className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all hover:scale-105 w-full ${
                  i === currentSlide ? "border-blue-500 ring-2 ring-blue-500/50" : "border-white/10 hover:border-white/30"
                }`}
              >
                <div className="w-full h-full">
                  <SlideRenderer slide={toSlideData(slide)} slideNumber={i + 1} totalSlides={totalSlides} />
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs py-1 px-2 text-center truncate">
                  {i + 1}. {slide.title}
                </div>
              </button>

              {editMode && (
                <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => handleMoveSlide(i, -1)} disabled={i === 0}>
                    <ArrowUp className="w-3 h-3" />
                  </Button>
                  <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => handleMoveSlide(i, 1)} disabled={i === totalSlides - 1}>
                    <ArrowDown className="w-3 h-3" />
                  </Button>
                  <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => handleDuplicateSlide(slide)} title="Duplicar">
                    <Copy className="w-3 h-3" />
                  </Button>
                  <Button size="icon" variant="destructive" className="h-7 w-7" onClick={() => setDeleteTarget(slide.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Editor dialog */}
        <TutorialSlideEditor
          slide={editingSlide}
          open={editorOpen}
          onClose={() => { setEditorOpen(false); setEditingSlide(null); }}
          onSave={handleSaveSlide}
          onUploadScreenshot={uploadScreenshot}
        />

        {/* Delete confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir slide?</AlertDialogTitle>
              <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteSlide}>Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  const currentSlideData = toSlideData(dbSlides[currentSlide]);

  return (
    <div
      ref={containerRef}
      className="h-screen w-screen bg-slate-950 flex flex-col select-none overflow-hidden"
      onClick={(e) => {
        if (editMode) return;
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        if (x > rect.width / 2) next(); else prev();
      }}
    >
      {/* Slide */}
      <div className="flex-1 relative">
        <SlideRenderer
          slide={currentSlideData}
          slideNumber={currentSlide + 1}
          totalSlides={totalSlides}
        />
      </div>

      {/* Controls overlay */}
      <div
        className={`absolute bottom-0 left-0 right-0 transition-opacity duration-300 z-50 ${
          showControls || editMode ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <Progress value={progress} className="h-1 rounded-none bg-white/10" />
        <div className="flex items-center justify-between px-6 py-3 bg-black/50 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-white/70 hover:text-white" onClick={() => navigate(-1)}>
              <X className="w-5 h-5" />
            </Button>
            <span className="text-white/50 text-sm min-w-[80px]">
              {currentSlide + 1} / {totalSlides}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="text-white/70 hover:text-white" onClick={prev} disabled={currentSlide === 0}>
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white/70 hover:text-white" onClick={next} disabled={currentSlide === totalSlides - 1}>
              <ChevronRight className="w-6 h-6" />
            </Button>
          </div>

          <div className="flex items-center gap-1">
            {isAdmin && (
              <Button
                variant="ghost"
                size="icon"
                className={`text-white/70 hover:text-white ${editMode ? "bg-blue-600/50" : ""}`}
                onClick={() => {
                  if (!editMode) {
                    setEditMode(true);
                    setShowGrid(true);
                  } else {
                    setEditMode(false);
                  }
                }}
              >
                <Pencil className="w-5 h-5" />
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white/70 hover:text-white">
                  <Download className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportPDF}>
                  <FileText className="w-4 h-4 mr-2" /> Exportar PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPPTX}>
                  <Presentation className="w-4 h-4 mr-2" /> Exportar PowerPoint
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="icon" className="text-white/70 hover:text-white" onClick={() => setShowGrid(true)}>
              <Grid3X3 className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white/70 hover:text-white" onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tutorial;
