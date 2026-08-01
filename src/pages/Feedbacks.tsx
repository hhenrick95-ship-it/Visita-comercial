import { useState, useEffect, useMemo, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, Pencil, Trash2, FileDown, Plus, Loader2, Eye, Download } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { exportFeedbacksToCSV } from "@/lib/exportToCSV";
import { AIInsightsPanel } from "@/components/AIInsightsPanel";
import { generateFeedbackPDF } from "@/lib/generateFeedbackPDF";
import { VisitDetailsDialog } from "@/components/VisitDetailsDialog";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePagination } from "@/hooks/usePagination";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { FeedbackListSkeleton, FiltersSkeleton } from "@/components/skeletons";
import { DateTreeFilter } from "@/components/ui/date-tree-filter";
import { Combobox } from "@/components/ui/combobox";
import { ActiveFiltersBar, ActiveFilter } from "@/components/ActiveFiltersBar";
import { PageHeader } from "@/components/PageHeader";

interface Feedback {
  id: string;
  created_at: string;
  vendor_code: string;
  supervisor: string;
  constructive_criticism: string;
  action_plan: string;
  visit_form_id: string;
}

export default function Feedbacks() {
  const { role } = useAuth();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  // Date tree filter
  const now = new Date();
  const currentYear = now.getFullYear().toString();
  const currentMonth = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedYears, setSelectedYears] = useState<string[]>([currentYear]);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([currentMonth]);
  const [filterSupervisor, setFilterSupervisor] = useState("");
  const [filterVendor, setFilterVendor] = useState("");

  const [availableTeams, setAvailableTeams] = useState<Array<{ cod_equipe: string; nome_equipe: string }>>([]);

  // Edit/Delete states
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingFeedback, setEditingFeedback] = useState<Feedback | null>(null);
  const [editForm, setEditForm] = useState({
    supervisor: "",
    constructive_criticism: "",
    action_plan: ""
  });
  const [saving, setSaving] = useState(false);

  // Create feedback states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [availableVisits, setAvailableVisits] = useState<Array<{ id: string; visit_date: string; manager: string; rca_accompanied: string; client_code: string }>>([]);
  const [loadingVisits, setLoadingVisits] = useState(false);
  const [createForm, setCreateForm] = useState({
    visit_form_id: "",
    supervisor: "",
    constructive_criticism: "",
    action_plan: ""
  });
  const [creating, setCreating] = useState(false);
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);

  // Available filter options
  const availableOptions = useMemo(() => {
    const supervisors = [...new Set(feedbacks.map(f => f.supervisor))].filter(Boolean).sort();
    const vendors = [...new Set(feedbacks.map(f => f.vendor_code))].filter(Boolean).sort();
    const dates = feedbacks.map(f => f.created_at?.substring(0, 10)).filter(Boolean);
    return { supervisors, vendors, dates };
  }, [feedbacks]);

  // Apply filters
  const filteredFeedbacks = useMemo(() => {
    let filtered = feedbacks;

    // Date filter (tree selection)
    if (selectedMonths.length > 0) {
      filtered = filtered.filter(f => {
        const yearMonth = f.created_at?.substring(0, 7);
        return selectedMonths.includes(yearMonth);
      });
    } else if (selectedYears.length > 0) {
      filtered = filtered.filter(f => {
        const year = f.created_at?.substring(0, 4);
        return selectedYears.includes(year);
      });
    }

    if (filterSupervisor) {
      filtered = filtered.filter(f => f.supervisor === filterSupervisor);
    }

    if (filterVendor) {
      filtered = filtered.filter(f => f.vendor_code === filterVendor);
    }

    return filtered;
  }, [feedbacks, selectedYears, selectedMonths, filterSupervisor, filterVendor]);

  // Pagination
  const {
    paginatedItems,
    currentPage,
    totalPages,
    goToPage,
    resetPage,
    startIndex,
    endIndex,
    totalItems,
  } = usePagination(filteredFeedbacks, { itemsPerPage: 10 });

  const handleDateSelectionChange = useCallback((years: string[], months: string[]) => {
    setSelectedYears(years);
    setSelectedMonths(months);
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedYears([]);
    setSelectedMonths([]);
    setFilterSupervisor("");
    setFilterVendor("");
  }, []);

  const hasActiveFilters = selectedYears.length > 0 || selectedMonths.length > 0 || !!filterSupervisor || !!filterVendor;

  // Active filters bar
  const activeFilters = useMemo<ActiveFilter[]>(() => {
    const list: ActiveFilter[] = [];
    if (selectedMonths.length > 0) {
      list.push({
        key: "dates",
        label: "Período",
        value: `${selectedMonths.length} mês(es)`,
        onRemove: () => handleDateSelectionChange([], []),
      });
    } else if (selectedYears.length > 0) {
      list.push({
        key: "dates",
        label: "Período",
        value: selectedYears.join(", "),
        onRemove: () => handleDateSelectionChange([], []),
      });
    }
    if (filterSupervisor) {
      list.push({
        key: "supervisor",
        label: "Supervisor",
        value: filterSupervisor,
        onRemove: () => setFilterSupervisor(""),
      });
    }
    if (filterVendor) {
      list.push({
        key: "vendor",
        label: "Vendedor",
        value: filterVendor,
        onRemove: () => setFilterVendor(""),
      });
    }
    return list;
  }, [selectedMonths, selectedYears, filterSupervisor, filterVendor, handleDateSelectionChange]);

  // Reset page when filters change
  useEffect(() => {
    resetPage();
  }, [selectedYears, selectedMonths, filterSupervisor, filterVendor]);

  useEffect(() => {
    fetchFeedbacks();
    fetchTeams();
  }, []);

  const fetchFeedbacks = async () => {
    try {
      const { data, error } = await supabase
        .from("feedbacks")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFeedbacks(data || []);
    } catch (error) {
      console.error("Error fetching feedbacks:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from("teams_vendors")
        .select("cod_equipe, nome_equipe")
        .order("nome_equipe");

      if (error) throw error;

      const uniqueTeams = Array.from(
        new Map(data?.map(item => [item.cod_equipe, item]) || []).values()
      );
      setAvailableTeams(uniqueTeams);
    } catch (error) {
      console.error("Error fetching teams:", error);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("feedbacks")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      setFeedbacks((prev) => prev.filter((f) => f.id !== deleteId));
      toast.success("Feedback excluído com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao excluir feedback: " + error.message);
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const handleEdit = (feedback: Feedback) => {
    setEditingFeedback(feedback);
    setEditForm({
      supervisor: feedback.supervisor,
      constructive_criticism: feedback.constructive_criticism,
      action_plan: feedback.action_plan
    });
  };

  const handleSaveEdit = async () => {
    if (!editingFeedback) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("feedbacks")
        .update({
          supervisor: editForm.supervisor,
          constructive_criticism: editForm.constructive_criticism,
          action_plan: editForm.action_plan
        })
        .eq("id", editingFeedback.id);

      if (error) throw error;

      setFeedbacks((prev) =>
        prev.map((f) =>
          f.id === editingFeedback.id
            ? { ...f, ...editForm }
            : f
        )
      );
      toast.success("Feedback atualizado com sucesso!");
      setEditingFeedback(null);
    } catch (error: any) {
      toast.error("Erro ao atualizar feedback: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const fetchVisitsForCreate = async () => {
    setLoadingVisits(true);
    try {
      const { data, error } = await supabase
        .from("visit_forms")
        .select("id, visit_date, manager, rca_accompanied, client_code")
        .order("visit_date", { ascending: false })
        .limit(200);

      if (error) throw error;
      setAvailableVisits(data || []);
    } catch (error) {
      console.error("Erro ao carregar visitas:", error);
    } finally {
      setLoadingVisits(false);
    }
  };

  const handleOpenCreate = () => {
    setCreateForm({ visit_form_id: "", supervisor: "", constructive_criticism: "", action_plan: "" });
    setShowCreateDialog(true);
    fetchVisitsForCreate();
  };

  const handleCreateFeedback = async () => {
    if (!createForm.visit_form_id || !createForm.supervisor || !createForm.constructive_criticism || !createForm.action_plan) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    setCreating(true);
    try {
      const selectedVisit = availableVisits.find(v => v.id === createForm.visit_form_id);
      const { data, error } = await supabase
        .from("feedbacks")
        .insert({
          visit_form_id: createForm.visit_form_id,
          vendor_code: selectedVisit?.rca_accompanied || "",
          supervisor: createForm.supervisor,
          constructive_criticism: createForm.constructive_criticism,
          action_plan: createForm.action_plan,
        })
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        setFeedbacks(prev => [data[0], ...prev]);
      }
      toast.success("Feedback criado com sucesso!");
      setShowCreateDialog(false);
    } catch (error: any) {
      toast.error("Erro ao criar feedback: " + error.message);
    } finally {
      setCreating(false);
    }
  };

  const handleGeneratePDF = async (feedback: Feedback) => {
    setGeneratingPdfId(feedback.id);
    try {
      const { data: visitData, error } = await supabase
        .from("visit_forms")
        .select("visit_date, manager, rca_accompanied, client_code, address")
        .eq("id", feedback.visit_form_id)
        .single();

      if (error || !visitData) throw error || new Error("Visita não encontrada");

      await generateFeedbackPDF(feedback, visitData);
      toast.success("PDF do feedback gerado com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao gerar PDF: " + error.message);
    } finally {
      setGeneratingPdfId(null);
    }
  };

  const contextualKPIs = useMemo(() => {
    const periodDays = selectedMonths.length > 0
      ? [...new Set(filteredFeedbacks.map(f => f.created_at?.substring(0, 10)))].length
      : 30;

    return {
      totalVisits: 0,
      totalFeedbacks: filteredFeedbacks.length,
      activeManagers: availableOptions.supervisors.length,
      periodDays
    };
  }, [filteredFeedbacks, availableOptions.supervisors, selectedMonths]);

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, "ellipsis", totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, "ellipsis", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", totalPages);
      }
    }
    return pages;
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto p-4 space-y-6">
          <div>
            <div className="h-8 w-32 bg-muted rounded animate-pulse mb-2" />
            <div className="h-4 w-64 bg-muted rounded animate-pulse" />
          </div>
          <FiltersSkeleton />
          <FeedbackListSkeleton count={4} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-4 space-y-6">
        <PageHeader
          icon={MessageSquare}
          title="Feedbacks"
          description="Visualize feedbacks dados às rotas"
          actions={
            <Button onClick={handleOpenCreate} className="gap-2 bg-hero-gradient text-primary-foreground border-0 shadow-md hover:opacity-95">
              <Plus className="h-4 w-4" />
              Novo Feedback
            </Button>
          }
        />

        {/* ===================== SEÇÃO 1: FILTROS ===================== */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
            <CardDescription>Filtre os feedbacks por período, supervisor e vendedor</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <DateTreeFilter
                availableDates={availableOptions.dates}
                selectedYears={selectedYears}
                selectedMonths={selectedMonths}
                onSelectionChange={handleDateSelectionChange}
              />
              <div>
                <label className="text-sm font-medium mb-2 block">Supervisor</label>
                <Combobox
                  options={availableOptions.supervisors.map(s => ({ value: s, label: s }))}
                  value={filterSupervisor}
                  onValueChange={setFilterSupervisor}
                  placeholder="Selecione..."
                  searchPlaceholder="Buscar supervisor..."
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Vendedor (COD)</label>
                <Combobox
                  options={availableOptions.vendors.map(v => ({ value: v, label: v }))}
                  value={filterVendor}
                  onValueChange={setFilterVendor}
                  placeholder="Selecione..."
                  searchPlaceholder="Buscar vendedor..."
                />
              </div>
            </div>

            <Button onClick={clearFilters} variant="outline" className="w-full">
              Limpar Filtros
            </Button>
          </CardContent>
        </Card>

        {/* Barra de filtros ativos */}
        <ActiveFiltersBar
          filters={activeFilters}
          onClearAll={clearFilters}
        />

        {/* ===================== SEÇÃO 2: LISTA DE FEEDBACKS (cards + paginação + ações Ver/PDF) ===================== */}
        {filteredFeedbacks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground text-lg">Nenhum feedback encontrado</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                Exibindo {startIndex}-{endIndex} de {totalItems} feedbacks
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => exportFeedbacksToCSV(filteredFeedbacks, "", "")}
                className="gap-2 w-full sm:w-auto"
              >
                <FileDown className="h-4 w-4" />
                Exportar CSV
              </Button>
            </div>
            <div className="space-y-4">
              {paginatedItems.map((feedback) => (
                <Card key={feedback.id}>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                      <div className="min-w-0">
                        <CardTitle className="text-lg sm:text-2xl break-words">COD Vendedor: {feedback.vendor_code}</CardTitle>
                        <CardDescription className="break-words">
                          Supervisor: {feedback.supervisor} • {new Date(feedback.created_at).toLocaleDateString("pt-BR")}
                        </CardDescription>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedVisitId(feedback.visit_form_id)}
                          className="gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="hidden sm:inline">Ver</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleGeneratePDF(feedback)}
                          disabled={generatingPdfId === feedback.id}
                          className="gap-2"
                        >
                          {generatingPdfId === feedback.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                          <span className="hidden sm:inline">
                            {generatingPdfId === feedback.id ? "Gerando..." : "Gerar PDF"}
                          </span>
                        </Button>
                        {role === "admin" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(feedback)}
                              className="gap-2"
                            >
                              <Pencil className="h-4 w-4" />
                              <span className="hidden sm:inline">Editar</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setDeleteId(feedback.id)}
                              className="gap-2"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="hidden sm:inline">Excluir</span>
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2">Crítica Construtiva:</h3>
                      <p className="text-muted-foreground whitespace-pre-wrap">{feedback.constructive_criticism}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Plano de Ação:</h3>
                      <p className="text-muted-foreground whitespace-pre-wrap">{feedback.action_plan}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination className="mt-6">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => goToPage(currentPage - 1)}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {getPageNumbers().map((page, index) => (
                    <PaginationItem key={index}>
                      {page === "ellipsis" ? (
                        <PaginationEllipsis />
                      ) : (
                        <PaginationLink
                          onClick={() => goToPage(page)}
                          isActive={currentPage === page}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ))}
                  
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => goToPage(currentPage + 1)}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </>
        )}

        {/* ===================== SEÇÃO 3: PAINEL DE IA (sempre por último) ===================== */}
        <AIInsightsPanel
          filters={{
            startDate: undefined,
            endDate: undefined,
            manager: filterSupervisor || undefined,
            rca: filterVendor || undefined
          }}
          contextualKPIs={contextualKPIs}
          availableTeams={availableTeams}
          onVendorClick={(vendorCode) => setFilterVendor(vendorCode)}
          defaultAnalysisType="feedback_analysis"
          feedbacksOnly
        />
      </div>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este feedback? Esta ação não pode ser desfeita.
              O formulário de visita associado NÃO será excluído.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Edição */}
      <Dialog open={!!editingFeedback} onOpenChange={() => setEditingFeedback(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Feedback</DialogTitle>
            <DialogDescription>
              Altere os dados do feedback abaixo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="supervisor">Supervisor</Label>
              <Input
                id="supervisor"
                value={editForm.supervisor}
                onChange={(e) => setEditForm({ ...editForm, supervisor: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="criticism">Crítica Construtiva</Label>
              <Textarea
                id="criticism"
                value={editForm.constructive_criticism}
                onChange={(e) => setEditForm({ ...editForm, constructive_criticism: e.target.value })}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="action_plan">Plano de Ação</Label>
              <Textarea
                id="action_plan"
                value={editForm.action_plan}
                onChange={(e) => setEditForm({ ...editForm, action_plan: e.target.value })}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingFeedback(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Criação */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Novo Feedback</DialogTitle>
            <DialogDescription>
              Crie um feedback associado a uma visita existente
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="visit_select">Visita *</Label>
              {loadingVisits ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando visitas...
                </div>
              ) : (
                <Select value={createForm.visit_form_id} onValueChange={(val) => setCreateForm({ ...createForm, visit_form_id: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma visita..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {availableVisits.map(v => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.visit_date} — {v.manager} — Vend: {v.rca_accompanied} — Cli: {v.client_code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create_supervisor">Supervisor *</Label>
              <Input
                id="create_supervisor"
                value={createForm.supervisor}
                onChange={(e) => setCreateForm({ ...createForm, supervisor: e.target.value })}
                placeholder="Nome do supervisor"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create_criticism">Crítica Construtiva *</Label>
              <Textarea
                id="create_criticism"
                value={createForm.constructive_criticism}
                onChange={(e) => setCreateForm({ ...createForm, constructive_criticism: e.target.value })}
                rows={4}
                placeholder="Descreva os pontos de melhoria..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create_action_plan">Plano de Ação *</Label>
              <Textarea
                id="create_action_plan"
                value={createForm.action_plan}
                onChange={(e) => setCreateForm({ ...createForm, action_plan: e.target.value })}
                rows={4}
                placeholder="Descreva as ações que o vendedor deve tomar..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={creating}>
              Cancelar
            </Button>
            <Button onClick={handleCreateFeedback} disabled={creating}>
              {creating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando...</> : "Criar Feedback"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <VisitDetailsDialog
        visitId={selectedVisitId}
        onClose={() => setSelectedVisitId(null)}
      />
    </Layout>
  );
}
