import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, Upload, Download, Users, User, Briefcase, ChevronDown, ChevronRight, UsersRound } from "lucide-react";
import { 
  exportTeamsToXLSX, 
  importTeamsFromXLSX, 
  validateXLSXFile, 
  rollbackImport, 
  saveImportToHistory,
  fetchImportHistory,
  getImportDetails,
  markImportAsRolledBack,
  type ImportResult, 
  type ValidationResult,
  type ImportHistoryRecord 
} from "@/lib/exportTeamsXLSX";
import { Undo2, AlertTriangle, History, Clock, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { planNewRoutes, createNewRoutes, type NewRoutesPlan } from "@/lib/syncNewRoutes";
import { PageHeader } from "@/components/PageHeader";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";

type TeamRole = "coordenador" | "gerente" | "supervisor" | "vendedor";

interface TeamVendor {
  id: string;
  cod_equipe: string;
  nome_equipe: string;
  nome_rca: string | null;
  cod_rca_lopes: string;
  cargo: TeamRole;
  supervisor_id: string | null;
}

interface GroupedTeam {
  cod_equipe: string;
  nome_equipe: string;
  coordenadores: TeamVendor[];
  gerentes: TeamVendor[];
  supervisores: TeamVendor[];
  vendedores: TeamVendor[];
}

const cargoLabels: Record<TeamRole, string> = {
  coordenador: "Coordenador",
  gerente: "Gerente",
  supervisor: "Supervisor",
  vendedor: "Vendedor",
};

const cargoColors: Record<TeamRole, string> = {
  coordenador: "bg-amber-500/20 text-amber-700 border-amber-500/30",
  gerente: "bg-purple-500/20 text-purple-700 border-purple-500/30",
  supervisor: "bg-blue-500/20 text-blue-700 border-blue-500/30",
  vendedor: "bg-green-500/20 text-green-700 border-green-500/30",
};

const cargoIcons: Record<TeamRole, React.ReactNode> = {
  coordenador: <Briefcase className="h-4 w-4" />,
  gerente: <Briefcase className="h-4 w-4" />,
  supervisor: <Users className="h-4 w-4" />,
  vendedor: <User className="h-4 w-4" />,
};

export default function TeamManagement() {
  const [teams, setTeams] = useState<TeamVendor[]>([]);
  const [groupedTeams, setGroupedTeams] = useState<GroupedTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCargo, setFilterCargo] = useState<TeamRole | "all">("all");
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  
  // Form state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    cod_equipe: "",
    nome_equipe: "",
    nome_rca: "",
    cod_rca_lopes: "",
    cargo: "vendedor" as TeamRole,
    supervisor_id: null as string | null,
  });

  const loadTeams = async () => {
    try {
      const { data, error } = await supabase
        .from("teams_vendors")
        .select("*")
        .order("nome_equipe")
        .order("cargo")
        .order("nome_rca");

      if (error) throw error;
      
      const teamsData = (data || []).map(item => ({
        ...item,
        cargo: (item.cargo || "vendedor") as TeamRole
      }));
      
      setTeams(teamsData);
    } catch (error: any) {
      toast.error("Erro ao carregar equipes: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();
  }, []);

  // Group teams by cod_equipe and filter
  useEffect(() => {
    let filtered = teams;
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (team) =>
          team.nome_equipe.toLowerCase().includes(searchTerm.toLowerCase()) ||
          team.cod_equipe.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (team.nome_rca?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
          team.cod_rca_lopes.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply cargo filter
    if (filterCargo !== "all") {
      filtered = filtered.filter(team => team.cargo === filterCargo);
    }
    
    // Group by team
    const grouped = filtered.reduce((acc, team) => {
      const existing = acc.find(g => g.cod_equipe === team.cod_equipe);
      if (existing) {
        if (team.cargo === "coordenador") {
          existing.coordenadores.push(team);
        } else if (team.cargo === "gerente") {
          existing.gerentes.push(team);
        } else if (team.cargo === "supervisor") {
          existing.supervisores.push(team);
        } else {
          existing.vendedores.push(team);
        }
      } else {
        acc.push({
          cod_equipe: team.cod_equipe,
          nome_equipe: team.nome_equipe,
          coordenadores: team.cargo === "coordenador" ? [team] : [],
          gerentes: team.cargo === "gerente" ? [team] : [],
          supervisores: team.cargo === "supervisor" ? [team] : [],
          vendedores: team.cargo === "vendedor" ? [team] : [],
        });
      }
      return acc;
    }, [] as GroupedTeam[]);
    
    setGroupedTeams(grouped);
    
    // Expand all teams by default if searching
    if (searchTerm) {
      setExpandedTeams(new Set(grouped.map(g => g.cod_equipe)));
    }
  }, [searchTerm, filterCargo, teams]);

  // Get available supervisors for vendor assignment
  const getAvailableSupervisors = () => {
    return teams.filter(t => 
      t.cargo === "supervisor" && 
      t.cod_equipe === formData.cod_equipe
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const submitData = {
        cod_equipe: formData.cod_equipe,
        nome_equipe: formData.nome_equipe,
        nome_rca: formData.nome_rca || null,
        cod_rca_lopes: formData.cod_rca_lopes,
        cargo: formData.cargo,
        supervisor_id: formData.cargo === "vendedor" ? formData.supervisor_id : null,
      };

      if (editingId) {
        const { error } = await supabase
          .from("teams_vendors")
          .update(submitData)
          .eq("id", editingId);

        if (error) throw error;
        toast.success("Registro atualizado com sucesso!");
      } else {
        const { error } = await supabase
          .from("teams_vendors")
          .insert(submitData);

        if (error) throw error;
        toast.success("Registro adicionado com sucesso!");
      }

      setDialogOpen(false);
      resetForm();
      loadTeams();
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    }
  };

  const handleEdit = (team: TeamVendor) => {
    setEditingId(team.id);
    setFormData({
      cod_equipe: team.cod_equipe,
      nome_equipe: team.nome_equipe,
      nome_rca: team.nome_rca || "",
      cod_rca_lopes: team.cod_rca_lopes,
      cargo: team.cargo,
      supervisor_id: team.supervisor_id,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este registro?")) return;

    try {
      const { error } = await supabase
        .from("teams_vendors")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Registro excluído com sucesso!");
      loadTeams();
    } catch (error: any) {
      toast.error("Erro ao excluir: " + error.message);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      cod_equipe: "",
      nome_equipe: "",
      nome_rca: "",
      cod_rca_lopes: "",
      cargo: "vendedor",
      supervisor_id: null,
    });
  };

  // Import state
  const [importProgress, setImportProgress] = useState<number | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [showErrorsDialog, setShowErrorsDialog] = useState(false);
  
  // Validation state
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  
  // Rollback state
  const [lastImportResult, setLastImportResult] = useState<ImportResult | null>(null);
  const [showRollbackDialog, setShowRollbackDialog] = useState(false);
  const [rollbackProgress, setRollbackProgress] = useState<number | null>(null);
  
  // Import history state
  const [importHistory, setImportHistory] = useState<ImportHistoryRecord[]>([]);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [selectedImportForRollback, setSelectedImportForRollback] = useState<ImportHistoryRecord | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadImportHistory = async () => {
    setLoadingHistory(true);
    const history = await fetchImportHistory();
    setImportHistory(history);
    setLoadingHistory(false);
  };

  // Sincronização de rotas novas a partir da base de clientes
  const [syncPlan, setSyncPlan] = useState<NewRoutesPlan | null>(null);
  const [syncing, setSyncing] = useState(false);

  const handleCheckNewRoutes = async () => {
    setSyncing(true);
    try {
      const plan = await planNewRoutes(teams);
      if (plan.toCreate.length === 0 && plan.skipped.length === 0) {
        toast.success("Nenhuma rota nova encontrada: todas as rotas da base de clientes já estão cadastradas.");
        return;
      }
      setSyncPlan(plan);
    } catch (error: any) {
      toast.error("Erro ao buscar rotas novas: " + error.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleConfirmNewRoutes = async () => {
    if (!syncPlan || syncPlan.toCreate.length === 0) return;
    setSyncing(true);
    try {
      await createNewRoutes(syncPlan.toCreate);
      toast.success(`${syncPlan.toCreate.length} rota(s) cadastrada(s) com sucesso!`);
      setSyncPlan(null);
      loadTeams();
    } catch (error: any) {
      toast.error("Erro ao cadastrar rotas: " + error.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleExportXLSX = () => {
    if (teams.length === 0) {
      toast.error("Não há dados para exportar");
      return;
    }
    exportTeamsToXLSX(teams);
    toast.success("Arquivo exportado com sucesso!");
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset file input immediately
    e.target.value = "";

    try {
      // Validate file first
      const validation = await validateXLSXFile(file);
      setValidationResult(validation);
      setPendingFile(file);
      setShowValidationDialog(true);
    } catch (error: any) {
      toast.error("Erro ao validar arquivo: " + error.message);
    }
  };

  const handleConfirmImport = async () => {
    if (!pendingFile) return;

    setShowValidationDialog(false);
    setImportProgress(0);
    setImportErrors([]);

    try {
      const result = await importTeamsFromXLSX(pendingFile, (progress) => {
        setImportProgress(progress);
      });

      setImportProgress(null);
      setLastImportResult(result);
      
      // Save to database history
      const historyId = await saveImportToHistory(result);
      if (historyId) {
        // Refresh history
        loadImportHistory();
      }

      if (result.errors.length > 0) {
        setImportErrors(result.errors);
        setShowErrorsDialog(true);
      }

      const messages: string[] = [];
      if (result.created > 0) messages.push(`${result.created} criados`);
      if (result.updated > 0) messages.push(`${result.updated} atualizados`);
      if (result.errors.length > 0) messages.push(`${result.errors.length} erros`);

      if (result.errors.length > 0) {
        toast.warning(`Importação concluída: ${messages.join(", ")}`);
      } else {
        toast.success(`Importação concluída: ${messages.join(", ")}`);
      }

      loadTeams();
    } catch (error: any) {
      setImportProgress(null);
      toast.error("Erro ao importar: " + error.message);
    }

    setPendingFile(null);
    setValidationResult(null);
  };

  const handleCancelImport = () => {
    setShowValidationDialog(false);
    setPendingFile(null);
    setValidationResult(null);
  };

  const handleRollback = async () => {
    if (!lastImportResult) return;

    setShowRollbackDialog(false);
    setRollbackProgress(0);

    try {
      const result = await rollbackImport(
        lastImportResult.createdIds,
        lastImportResult.updatedRecords,
        (progress) => setRollbackProgress(progress)
      );

      setRollbackProgress(null);

      if (result.success) {
        toast.success(`Importação desfeita: ${result.deletedCount} excluídos, ${result.restoredCount} restaurados`);
        setLastImportResult(null);
        loadTeams();
      } else {
        toast.warning(`Desfazer parcial: ${result.deletedCount} excluídos, ${result.restoredCount} restaurados, ${result.errors.length} erros`);
      }
    } catch (error: any) {
      setRollbackProgress(null);
      toast.error("Erro ao desfazer: " + error.message);
    }
  };

  const handleHistoryRollback = async (importRecord: ImportHistoryRecord) => {
    setSelectedImportForRollback(importRecord);
    setShowHistoryDialog(false);
  };

  const confirmHistoryRollback = async () => {
    if (!selectedImportForRollback) return;

    setRollbackProgress(0);

    try {
      const details = await getImportDetails(selectedImportForRollback.id);
      if (!details) {
        toast.error("Não foi possível obter os detalhes da importação");
        setRollbackProgress(null);
        setSelectedImportForRollback(null);
        return;
      }

      const result = await rollbackImport(
        details.createdIds,
        details.updatedRecords,
        (progress) => setRollbackProgress(progress)
      );

      setRollbackProgress(null);

      if (result.success) {
        await markImportAsRolledBack(selectedImportForRollback.id);
        toast.success(`Importação desfeita: ${result.deletedCount} excluídos, ${result.restoredCount} restaurados`);
        loadImportHistory();
        loadTeams();
      } else {
        toast.warning(`Desfazer parcial: ${result.deletedCount} excluídos, ${result.restoredCount} restaurados, ${result.errors.length} erros`);
      }
    } catch (error: any) {
      setRollbackProgress(null);
      toast.error("Erro ao desfazer: " + error.message);
    }

    setSelectedImportForRollback(null);
  };

  const openHistoryDialog = async () => {
    await loadImportHistory();
    setShowHistoryDialog(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const toggleTeamExpanded = (codEquipe: string) => {
    const newExpanded = new Set(expandedTeams);
    if (newExpanded.has(codEquipe)) {
      newExpanded.delete(codEquipe);
    } else {
      newExpanded.add(codEquipe);
    }
    setExpandedTeams(newExpanded);
  };

  const getNameLabel = () => {
    switch (formData.cargo) {
      case "coordenador":
        return "Nome do Coordenador";
      case "gerente":
        return "Nome do Gerente";
      case "supervisor":
        return "Nome do Supervisor";
      default:
        return "Nome do RCA/Vendedor";
    }
  };

  const renderMember = (member: TeamVendor, indent: number = 0) => (
    <div
      key={member.id}
      className="flex items-center justify-between py-2 px-3 hover:bg-muted/50 rounded-md"
      style={{ marginLeft: `${indent}rem` }}
    >
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground">{cargoIcons[member.cargo]}</span>
        <div>
          <span className="font-medium">{member.nome_rca || member.nome_equipe}</span>
          <span className="text-muted-foreground text-sm ml-2">({member.cod_rca_lopes})</span>
        </div>
        <Badge variant="outline" className={cargoColors[member.cargo]}>
          {cargoLabels[member.cargo]}
        </Badge>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => handleEdit(member)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="destructive" onClick={() => handleDelete(member.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto p-4">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-4 space-y-6">
        <PageHeader
          icon={UsersRound}
          title="Gestão de Equipes"
          description="Gerencie coordenadores, supervisores e vendedores"
          actions={
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                className="gap-2 glass-card border-0"
                onClick={handleCheckNewRoutes}
                disabled={syncing || loading}
              >
                <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                Sincronizar rotas novas
              </Button>
              <Button variant="outline" className="gap-2 glass-card border-0" onClick={handleExportXLSX}>
                <Download className="h-4 w-4" />
                Exportar XLSX
              </Button>
              <label htmlFor="xlsx-upload">
                <Button
                  variant="outline"
                  className="gap-2 glass-card border-0"
                  asChild
                  disabled={importProgress !== null || rollbackProgress !== null}
                >
                  <span>
                    <Upload className="h-4 w-4" />
                    {importProgress !== null ? `Importando ${importProgress}%` : "Importar XLSX"}
                  </span>
                </Button>
              </label>
              <input
                id="xlsx-upload"
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileSelect}
                disabled={importProgress !== null || rollbackProgress !== null}
              />
              <Button
                variant="outline"
                className="gap-2 glass-card border-0"
                onClick={openHistoryDialog}
                disabled={rollbackProgress !== null}
              >
                <History className="h-4 w-4" />
                Histórico
              </Button>
              {lastImportResult && (lastImportResult.createdIds.length > 0 || lastImportResult.updatedRecords.length > 0) && (
                <Button
                  variant="outline"
                  className="gap-2 text-amber-600 border-amber-500/50 hover:bg-amber-500/10"
                  onClick={() => setShowRollbackDialog(true)}
                  disabled={rollbackProgress !== null}
                >
                  <Undo2 className="h-4 w-4" />
                  Desfazer Última
                </Button>
              )}
              <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="gap-2 bg-hero-gradient text-primary-foreground border-0 shadow-md hover:opacity-95">
                <Plus className="h-4 w-4" />
                Adicionar
              </Button>
            </div>
          }
        />

        {/* Dialog de adicionar/editar — controlado pelo botão acima */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
            <span className="hidden" aria-hidden />
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingId ? "Editar" : "Adicionar"} Membro da Equipe
                  </DialogTitle>
                  <DialogDescription>
                    Preencha os dados do membro
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cargo">Cargo</Label>
                    <Select
                      value={formData.cargo}
                      onValueChange={(value: TeamRole) =>
                        setFormData({ ...formData, cargo: value, supervisor_id: null })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o cargo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="coordenador">
                          <div className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4" />
                            Coordenador
                          </div>
                        </SelectItem>
                        <SelectItem value="gerente">
                          <div className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4" />
                            Gerente
                          </div>
                        </SelectItem>
                        <SelectItem value="supervisor">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Supervisor
                          </div>
                        </SelectItem>
                        <SelectItem value="vendedor">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Vendedor
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="nome_equipe">Nome da Equipe</Label>
                    <Input
                      id="nome_equipe"
                      value={formData.nome_equipe}
                      onChange={(e) =>
                        setFormData({ ...formData, nome_equipe: e.target.value })
                      }
                      required
                      placeholder="EQUIPE H - JUBCE RIBEIRO"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="cod_equipe">Código da Equipe</Label>
                    <Input
                      id="cod_equipe"
                      value={formData.cod_equipe}
                      onChange={(e) =>
                        setFormData({ ...formData, cod_equipe: e.target.value })
                      }
                      required
                      placeholder="3700"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="nome_rca">{getNameLabel()}</Label>
                    <Input
                      id="nome_rca"
                      value={formData.nome_rca}
                      onChange={(e) =>
                        setFormData({ ...formData, nome_rca: e.target.value })
                      }
                      placeholder={
                        formData.cargo === "vendedor" 
                          ? "H01 - ROGERIO IAMAMOTO" 
                          : formData.cargo === "supervisor"
                          ? "RICARDO LIMA"
                          : "JUBCE RIBEIRO"
                      }
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="cod_rca_lopes">Código</Label>
                    <Input
                      id="cod_rca_lopes"
                      value={formData.cod_rca_lopes}
                      onChange={(e) =>
                        setFormData({ ...formData, cod_rca_lopes: e.target.value })
                      }
                      required
                      placeholder="3701"
                    />
                  </div>
                  
                  {formData.cargo === "vendedor" && formData.cod_equipe && (
                    <div className="space-y-2">
                      <Label htmlFor="supervisor_id">Supervisor Responsável (opcional)</Label>
                      <Select
                        value={formData.supervisor_id || "none"}
                        onValueChange={(value) =>
                          setFormData({ ...formData, supervisor_id: value === "none" ? null : value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o supervisor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          {getAvailableSupervisors().map((sup) => (
                            <SelectItem key={sup.id} value={sup.id}>
                              {sup.nome_rca || sup.nome_equipe} ({sup.cod_rca_lopes})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <Button type="submit" className="w-full">
                    {editingId ? "Atualizar" : "Adicionar"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={filterCargo}
                onValueChange={(value) => setFilterCargo(value as TeamRole | "all")}
              >
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filtrar por cargo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os cargos</SelectItem>
                  <SelectItem value="coordenador">Coordenadores</SelectItem>
                  <SelectItem value="gerente">Gerentes</SelectItem>
                  <SelectItem value="supervisor">Supervisores</SelectItem>
                  <SelectItem value="vendedor">Vendedores</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Hierarchical Team List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{groupedTeams.length} Equipe(s)</span>
              <span className="text-sm font-normal text-muted-foreground">
                {teams.length} membros no total
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {groupedTeams.map((group) => {
                const isExpanded = expandedTeams.has(group.cod_equipe);
                const totalMembers = group.coordenadores.length + group.gerentes.length + group.supervisores.length + group.vendedores.length;
                
                return (
                  <Collapsible
                    key={group.cod_equipe}
                    open={isExpanded}
                    onOpenChange={() => toggleTeamExpanded(group.cod_equipe)}
                  >
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          )}
                          <div>
                            <span className="font-semibold">{group.nome_equipe}</span>
                            <span className="text-muted-foreground ml-2">({group.cod_equipe})</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{totalMembers} membros</Badge>
                          {group.coordenadores.length > 0 && (
                            <Badge className={cargoColors.coordenador}>{group.coordenadores.length} coord</Badge>
                          )}
                          {group.gerentes.length > 0 && (
                            <Badge className={cargoColors.gerente}>{group.gerentes.length} ger</Badge>
                          )}
                          {group.supervisores.length > 0 && (
                            <Badge className={cargoColors.supervisor}>{group.supervisores.length} sup</Badge>
                          )}
                          {group.vendedores.length > 0 && (
                            <Badge className={cargoColors.vendedor}>{group.vendedores.length} vend</Badge>
                          )}
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="ml-4 mt-2 space-y-1 border-l-2 border-muted pl-4">
                        {/* Coordenadores */}
                        {group.coordenadores.map((coord) => renderMember(coord, 0))}
                        
                        {/* Gerentes */}
                        {group.gerentes.map((ger) => renderMember(ger, 0))}
                        
                        {/* Supervisores */}
                        {group.supervisores.map((sup) => (
                          <div key={sup.id}>
                            {renderMember(sup, 0)}
                            {/* Vendedores deste supervisor */}
                            {group.vendedores
                              .filter(v => v.supervisor_id === sup.id)
                              .map((vend) => renderMember(vend, 1.5))}
                          </div>
                        ))}
                        
                        {/* Vendedores sem supervisor específico */}
                        {group.vendedores
                          .filter(v => !v.supervisor_id || !group.supervisores.find(s => s.id === v.supervisor_id))
                          .map((vend) => renderMember(vend, 0))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
              
              {groupedTeams.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma equipe encontrada
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Import Progress Overlay */}
        {importProgress !== null && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
            <Card className="w-80">
              <CardContent className="pt-6 space-y-4">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
                  <p className="font-medium">Importando planilha...</p>
                  <p className="text-sm text-muted-foreground">{importProgress}% concluído</p>
                </div>
                <Progress value={importProgress} className="w-full" />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Import Errors Dialog */}
        <AlertDialog open={showErrorsDialog} onOpenChange={setShowErrorsDialog}>
          <AlertDialogContent className="max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle>Erros na Importação</AlertDialogTitle>
              <AlertDialogDescription>
                Alguns registros não puderam ser processados:
              </AlertDialogDescription>
            </AlertDialogHeader>
            <ScrollArea className="max-h-60">
              <div className="space-y-2 pr-4">
                {importErrors.map((error, index) => (
                  <div
                    key={index}
                    className="text-sm text-destructive bg-destructive/10 p-2 rounded border border-destructive/20"
                  >
                    {error}
                  </div>
                ))}
              </div>
            </ScrollArea>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setShowErrorsDialog(false)}>
                Entendi
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Validation Dialog */}
        <AlertDialog open={showValidationDialog} onOpenChange={setShowValidationDialog}>
          <AlertDialogContent className="max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                {validationResult?.isValid ? (
                  "Confirmar Importação"
                ) : (
                  <>
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Códigos Duplicados Encontrados
                  </>
                )}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {validationResult?.isValid ? (
                  `${validationResult.validRows} registros serão importados.`
                ) : (
                  `Foram encontrados ${validationResult?.duplicates.length} códigos RCA duplicados na planilha. Corrija antes de importar.`
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            {!validationResult?.isValid && validationResult?.duplicates && (
              <ScrollArea className="max-h-60">
                <div className="space-y-2 pr-4">
                  {validationResult.duplicates.map((dup, index) => (
                    <div
                      key={index}
                      className="text-sm bg-destructive/10 p-3 rounded border border-destructive/20"
                    >
                      <span className="font-medium text-destructive">
                        Código: {dup.cod_rca_lopes}
                      </span>
                      <p className="text-muted-foreground mt-1">
                        Aparece nas linhas: {dup.rows.join(", ")}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
            
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCancelImport}>
                Cancelar
              </AlertDialogCancel>
              {validationResult?.isValid && (
                <AlertDialogAction onClick={handleConfirmImport}>
                  Confirmar Importação
                </AlertDialogAction>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Rollback Confirmation Dialog */}
        <AlertDialog open={showRollbackDialog} onOpenChange={setShowRollbackDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Undo2 className="h-5 w-5 text-amber-600" />
                Desfazer Última Importação
              </AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação irá:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  {lastImportResult && lastImportResult.createdIds.length > 0 && (
                    <li>Excluir {lastImportResult.createdIds.length} registro(s) criado(s)</li>
                  )}
                  {lastImportResult && lastImportResult.updatedRecords.length > 0 && (
                    <li>Restaurar {lastImportResult.updatedRecords.length} registro(s) modificado(s)</li>
                  )}
                </ul>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleRollback}
                className="bg-amber-600 hover:bg-amber-700"
              >
                Confirmar Desfazer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Import History Dialog */}
        <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Histórico de Importações
              </DialogTitle>
              <DialogDescription>
                Visualize e desfaça importações anteriores
              </DialogDescription>
            </DialogHeader>
            
            {loadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : importHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma importação encontrada
              </div>
            ) : (
              <ScrollArea className="max-h-96">
                <div className="space-y-3 pr-4">
                  {importHistory.map((record) => (
                    <div
                      key={record.id}
                      className={`p-4 rounded-lg border ${
                        record.status === "rolled_back"
                          ? "bg-muted/30 border-muted"
                          : "bg-card border-border"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {record.status === "rolled_back" ? (
                            <XCircle className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{formatDate(record.created_at)}</span>
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {record.total_created > 0 && (
                                <span className="mr-3">
                                  <Badge variant="secondary" className="mr-1">{record.total_created}</Badge>
                                  criados
                                </span>
                              )}
                              {record.total_updated > 0 && (
                                <span>
                                  <Badge variant="secondary" className="mr-1">{record.total_updated}</Badge>
                                  atualizados
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {record.status === "rolled_back" ? (
                            <Badge variant="outline" className="text-muted-foreground">
                              Desfeita em {formatDate(record.rolled_back_at!)}
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 text-amber-600 border-amber-500/50 hover:bg-amber-500/10"
                              onClick={() => handleHistoryRollback(record)}
                            >
                              <Undo2 className="h-4 w-4" />
                              Desfazer
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </DialogContent>
        </Dialog>

        {/* History Rollback Confirmation Dialog */}
        <AlertDialog open={!!selectedImportForRollback} onOpenChange={() => setSelectedImportForRollback(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Undo2 className="h-5 w-5 text-amber-600" />
                Desfazer Importação
              </AlertDialogTitle>
              <AlertDialogDescription>
                {selectedImportForRollback && (
                  <>
                    Esta ação irá desfazer a importação de{" "}
                    <strong>{formatDate(selectedImportForRollback.created_at)}</strong>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      {selectedImportForRollback.total_created > 0 && (
                        <li>Excluir {selectedImportForRollback.total_created} registro(s) criado(s)</li>
                      )}
                      {selectedImportForRollback.total_updated > 0 && (
                        <li>Restaurar {selectedImportForRollback.total_updated} registro(s) modificado(s)</li>
                      )}
                    </ul>
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSelectedImportForRollback(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmHistoryRollback}
                className="bg-amber-600 hover:bg-amber-700"
              >
                Confirmar Desfazer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Confirmação de rotas novas */}
        <AlertDialog open={syncPlan !== null} onOpenChange={(open) => !open && !syncing && setSyncPlan(null)}>
          <AlertDialogContent className="max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle>Rotas novas encontradas</AlertDialogTitle>
              <AlertDialogDescription>
                {syncPlan && syncPlan.toCreate.length > 0
                  ? "Estas rotas estão na base de clientes mas não em Gestão de Equipes. Cada uma será cadastrada como Vendedor, com a equipe e o supervisor da rota vizinha."
                  : "Nenhuma rota pôde ser cadastrada automaticamente."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {syncPlan && (
              <ScrollArea className="max-h-72 pr-3">
                <div className="space-y-2 text-sm">
                  {syncPlan.toCreate.map((r) => (
                    <div key={r.cod_rca_lopes} className="rounded-md border p-2">
                      <p className="font-medium">{r.nome_rca} ({r.cod_rca_lopes})</p>
                      <p className="text-muted-foreground">
                        {r.nome_equipe} • igual a {r.baseadoEm}
                      </p>
                    </div>
                  ))}
                  {syncPlan.skipped.length > 0 && (
                    <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2">
                      <p className="font-medium">Cadastre manualmente (sem rota vizinha):</p>
                      {syncPlan.skipped.map((s) => (
                        <p key={s.cod_rca} className="text-muted-foreground">
                          {s.nome_rca || "Sem nome"} ({s.cod_rca})
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={syncing}>Cancelar</AlertDialogCancel>
              {syncPlan && syncPlan.toCreate.length > 0 && (
                <AlertDialogAction
                  disabled={syncing}
                  onClick={(e) => {
                    e.preventDefault();
                    handleConfirmNewRoutes();
                  }}
                >
                  {syncing ? "Cadastrando..." : `Cadastrar ${syncPlan.toCreate.length} rota(s)`}
                </AlertDialogAction>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Rollback Progress Overlay */}
        {rollbackProgress !== null && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
            <Card className="w-80">
              <CardContent className="pt-6 space-y-4">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
                  <p className="font-medium">Desfazendo importação...</p>
                  <p className="text-sm text-muted-foreground">{rollbackProgress}% concluído</p>
                </div>
                <Progress value={rollbackProgress} className="w-full" />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}