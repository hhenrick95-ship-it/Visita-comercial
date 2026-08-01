import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Download, FileText, Search, Trash2, Eye, FileDown, Loader2, Camera } from "lucide-react";
import { exportVisitsToCSV } from "@/lib/exportToCSV";
import { useAuth } from "@/contexts/AuthContext";
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
import { generateVisitPDF } from "@/lib/generateVisitPDF";
import { VisitDetailsDialog } from "@/components/VisitDetailsDialog";
import { normalizeManagerName, TeamMember } from "@/lib/normalizeManager";
import { usePagination } from "@/hooks/usePagination";
import { useVisitFilters } from "@/hooks/useVisitFilters";
import { formatDateOnlyPtBR } from "@/lib/utils";
import { DashboardFilters } from "@/components/DashboardFilters";
import { ActiveFiltersBar, ActiveFilter } from "@/components/ActiveFiltersBar";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { VisitListSkeleton } from "@/components/skeletons";
import { PageHeader } from "@/components/PageHeader";
import { ListChecks } from "lucide-react";
import { TemplateSelector } from "@/components/TemplateSelector";
import { SubmissionsList } from "@/components/SubmissionsList";
import { useFormTemplates, type FormTemplate } from "@/hooks/useFormTemplates";

interface VisitRecord {
  id: string;
  visit_date: string;
  client_code: string;
  manager: string;
  rca_accompanied: string;
  address: string | null;
  pdf_path: string | null;
  created_at: string;
  photo_count?: number;
}

export default function Visitas() {
  const { role } = useAuth();
  const { templates: allTemplates } = useFormTemplates({ activeOnly: true });
  const [selectedTemplateSlug, setSelectedTemplateSlug] = useState<string>("visita");
  const selectedTemplate = useMemo<FormTemplate | null>(
    () => allTemplates.find((t) => t.slug === selectedTemplateSlug) || null,
    [allTemplates, selectedTemplateSlug],
  );
  const isVisitaTemplate = selectedTemplateSlug === "visita";
  const [records, setRecords] = useState<VisitRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Normalize managers in records for filtering
  const normalizedRecords = useMemo(() => {
    return records.map(r => ({
      ...r,
      _normalizedManager: normalizeManagerName(r.manager, teamMembers),
    }));
  }, [records, teamMembers]);

  // Use the same filter hook as the Dashboard
  const {
    filters,
    setFilterClient,
    setFilterVendor,
    setFilterAddress,
    setFilterManagers,
    handleDateSelectionChange,
    clearFilters,
    filteredVisits: hookFilteredVisits,
    availableOptions,
    hasActiveFilters,
  } = useVisitFilters({
    visits: normalizedRecords,
    getVisitDate: (v) => v.visit_date,
    getClientCode: (v) => v.client_code,
    getVendor: (v) => v.rca_accompanied,
    getAddress: (v) => v.address,
    getManager: (v) => v._normalizedManager,
  });

  // Apply text search on top of hook-filtered visits
  const finalFiltered = useMemo(() => {
    if (!searchTerm) return hookFilteredVisits;
    const term = searchTerm.toLowerCase();
    return hookFilteredVisits.filter(
      (r) =>
        r.client_code?.toLowerCase().includes(term) ||
        r.rca_accompanied?.toLowerCase().includes(term) ||
        r._normalizedManager?.toLowerCase().includes(term) ||
        r.address?.toLowerCase().includes(term)
    );
  }, [hookFilteredVisits, searchTerm]);

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
  } = usePagination(finalFiltered, { itemsPerPage: 10 });

  // Build active filters for the bar
  const activeFilters = useMemo<ActiveFilter[]>(() => {
    const list: ActiveFilter[] = [];
    if (filters.selectedMonths.length > 0) {
      list.push({
        key: "dates",
        label: "Período",
        value: `${filters.selectedMonths.length} mês(es)`,
        onRemove: () => handleDateSelectionChange([], []),
      });
    } else if (filters.selectedYears.length > 0) {
      list.push({
        key: "dates",
        label: "Período",
        value: filters.selectedYears.join(", "),
        onRemove: () => handleDateSelectionChange([], []),
      });
    }
    if (filters.filterManagers.length > 0) {
      list.push({
        key: "manager",
        label: "Gestor",
        value: filters.filterManagers.join(", "),
        onRemove: () => setFilterManagers([]),
      });
    }
    if (filters.filterClient) {
      list.push({
        key: "client",
        label: "Cliente",
        value: filters.filterClient,
        onRemove: () => setFilterClient(""),
      });
    }
    if (filters.filterVendor) {
      list.push({
        key: "vendor",
        label: "Vendedor",
        value: filters.filterVendor,
        onRemove: () => setFilterVendor(""),
      });
    }
    if (filters.filterAddress) {
      list.push({
        key: "address",
        label: "Endereço",
        value: filters.filterAddress,
        onRemove: () => setFilterAddress(""),
      });
    }
    if (searchTerm) {
      list.push({
        key: "search",
        label: "Busca",
        value: searchTerm,
        onRemove: () => setSearchTerm(""),
      });
    }
    return list;
  }, [filters, searchTerm, handleDateSelectionChange, setFilterManagers, setFilterClient, setFilterVendor, setFilterAddress]);

  const handleClearAll = useCallback(() => {
    clearFilters();
    setSearchTerm("");
    resetPage();
  }, [clearFilters, resetPage]);

  const loadTeamMembers = async () => {
    const { data } = await supabase
      .from("teams_vendors")
      .select("cod_rca_lopes, nome_rca, nome_equipe, cargo")
      .in("cargo", ["supervisor", "coordenador", "gerente"]);
    setTeamMembers(data || []);
  };

  const loadRecords = async () => {
    try {
      const { data: visits, error: visitsError } = await supabase
        .from("visit_forms")
        .select("id, visit_date, client_code, manager, rca_accompanied, address, pdf_path, created_at")
        .order("created_at", { ascending: false });

      if (visitsError) throw visitsError;

      // Fetch photo counts per visit
      const { data: photoCounts } = await supabase
        .from("form_responses")
        .select("visit_form_id, response_value, question_id")
        .in("visit_form_id", (visits || []).map(v => v.id));

      const { data: imageQuestions } = await supabase
        .from("form_questions")
        .select("id")
        .eq("question_type", "image_upload");

      const imageQuestionIds = new Set((imageQuestions || []).map(q => q.id));

      const countMap: Record<string, number> = {};
      (photoCounts || []).forEach(r => {
        if (r.visit_form_id && imageQuestionIds.has(r.question_id)) {
          const val = r.response_value;
          if (Array.isArray(val)) {
            countMap[r.visit_form_id] = (countMap[r.visit_form_id] || 0) + val.length;
          }
        }
      });

      const enriched = (visits || []).map(v => ({
        ...v,
        photo_count: countMap[v.id] || 0,
      }));

      setRecords(enriched);
    } catch (error: any) {
      toast.error("Erro ao carregar visitas: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role === null) return;

    setLoading(true);
    loadRecords();
    loadTeamMembers();
  }, [role]);

  // Refetch quando a aba volta ao foco (garante dados atualizados após registrar visita)
  useEffect(() => {
    const onFocus = () => loadRecords();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // Reset page when filters change
  useEffect(() => {
    resetPage();
  }, [filters, searchTerm]);

  const handleDownload = async (record: VisitRecord) => {
    setGeneratingPdfId(record.id);
    try {
      await generateVisitPDF(record.id);
      toast.success("PDF gerado com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao gerar PDF: " + error.message);
    } finally {
      setGeneratingPdfId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    setDeleting(true);
    try {
      await supabase
        .from("form_responses")
        .delete()
        .eq("visit_form_id", deleteId);

      const { error } = await supabase
        .from("visit_forms")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      setRecords((prev) => prev.filter((r) => r.id !== deleteId));
      toast.success("Visita excluída com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao excluir visita: " + error.message);
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

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
            <div className="h-8 w-48 bg-muted rounded animate-pulse mb-2" />
            <div className="h-4 w-80 bg-muted rounded animate-pulse" />
          </div>
          <Card>
            <CardContent className="pt-6">
              <VisitListSkeleton count={6} />
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-4 space-y-6">
        <PageHeader
          icon={ListChecks}
          title="Visitas Registradas"
          description="Consulte todas as visitas realizadas, gere PDFs ou exclua registros"
        />

        {/* Seletor de formulário (só aparece com mais de 1 template) */}
        <TemplateSelector
          value={selectedTemplateSlug}
          onValueChange={(slug) => setSelectedTemplateSlug(slug)}
        />

        {/* Visão genérica para templates não-visita */}
        {!isVisitaTemplate && selectedTemplate && (
          <SubmissionsList template={selectedTemplate} />
        )}

        {isVisitaTemplate && (
        <>
        {/* Busca por texto */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, gestor, vendedor ou endereço..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filtros do Dashboard */}
        <DashboardFilters
          filters={filters}
          availableDates={availableOptions.dates}
          availableClients={availableOptions.clients}
          availableVendors={availableOptions.vendors}
          availableManagers={availableOptions.managers}
          onDateSelectionChange={handleDateSelectionChange}
          onClientChange={setFilterClient}
          onVendorChange={setFilterVendor}
          onAddressChange={setFilterAddress}
          onManagerChange={setFilterManagers}
          onClearFilters={handleClearAll}
        />

        {/* Barra de filtros ativos */}
        <ActiveFiltersBar
          filters={activeFilters}
          onClearAll={handleClearAll}
        />

        {/* Lista de Visitas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span>{finalFiltered.length} Visita(s)</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => exportVisitsToCSV(finalFiltered as any, "", "")}
                  className="gap-2"
                >
                  <FileDown className="h-4 w-4" />
                  Exportar CSV
                </Button>
              </div>
              {totalItems > 0 && (
                <span className="text-sm font-normal text-muted-foreground">
                  Exibindo {startIndex}-{endIndex} de {totalItems}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {paginatedItems.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma visita encontrada
                </p>
              ) : (
                paginatedItems.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">
                          Cliente: {record.client_code}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Gestor: {record._normalizedManager} • Vendedor: {record.rca_accompanied}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-2">
                          <span>
                            {formatDateOnlyPtBR(record.visit_date)}
                            {record.address && ` • ${record.address}`}
                          </span>
                          {(record.photo_count ?? 0) > 0 && (
                            <span className="inline-flex items-center gap-1 text-primary font-medium">
                              <Camera className="h-3.5 w-3.5" />
                              {record.photo_count}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedVisitId(record.id)}
                        className="gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        <span className="hidden sm:inline">Ver</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(record)}
                        disabled={generatingPdfId === record.id}
                        className="gap-2"
                      >
                        {generatingPdfId === record.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                        <span className="hidden sm:inline">
                          {generatingPdfId === record.id
                            ? "Gerando..."
                            : record.pdf_path ? "Baixar PDF" : "Gerar PDF"}
                        </span>
                      </Button>
                      {role === "admin" && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeleteId(record.id)}
                          className="gap-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="hidden sm:inline">Excluir</span>
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
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
          </CardContent>
        </Card>
        </>
        )}
      </div>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta visita? Esta ação não pode ser desfeita.
              Todos os feedbacks e respostas associados também serão excluídos.
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

      <VisitDetailsDialog
        visitId={selectedVisitId}
        onClose={() => setSelectedVisitId(null)}
      />
    </Layout>
  );
}
