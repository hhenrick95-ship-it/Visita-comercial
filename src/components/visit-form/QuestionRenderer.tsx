import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { ImageUploader } from "@/components/ImageUploader";
import { Combobox } from "@/components/ui/combobox";
import { UseFormReturn } from "react-hook-form";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { resolveQuestionImage } from "@/lib/questionImages";

interface FormQuestion {
  id: string;
  section_id: string;
  question_type: string;
  label: string;
  description: string | null;
  placeholder: string | null;
  options: any;
  slider_config: any;
  is_required: boolean;
  display_order: number;
  conditional_logic: any;
  image_url?: string | null;
}

interface QuestionRendererProps {
  question: FormQuestion;
  form: UseFormReturn<any>;
  /**
   * Lista de perguntas da MESMA seção, em ordem. Usada como fallback para
   * resolver automaticamente o vínculo entre vendor_select (RCA) e o
   * team_select anterior (gerente/supervisor) quando o template não tem
   * conditional_logic.team_question_id configurado explicitamente.
   */
  sectionQuestions?: FormQuestion[];
}

type TeamRole = "coordenador" | "gerente" | "supervisor" | "vendedor";

interface TeamMember {
  id: string;
  cod_equipe: string;
  nome_equipe: string;
  nome_rca: string | null;
  cod_rca_lopes: string;
  cargo: TeamRole;
  supervisor_id: string | null;
}

export function QuestionRenderer({ question, form, sectionQuestions }: QuestionRendererProps) {
  const fieldKey = `q_${question.id}`;
  const [gestores, setGestores] = useState<{ value: string; label: string }[]>([]);
  const [vendors, setVendors] = useState<{ value: string; label: string }[]>([]);
  const [allTeamMembers, setAllTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<{ value: string; label: string }[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [loadingClients, setLoadingClients] = useState(false);

  // Resolve qual pergunta vendor_select (RCA) alimenta este client_select.
  // 1) usa conditional_logic.vendor_question_id se existir
  // 2) senão, encontra o vendor_select anterior na mesma seção
  const resolvedVendorQuestionId: string | null = (() => {
    const explicit = question.conditional_logic?.vendor_question_id as string | undefined;
    if (explicit) return explicit;
    if (question.question_type !== "client_select" || !sectionQuestions) return null;
    const idx = sectionQuestions.findIndex((q) => q.id === question.id);
    if (idx < 0) return null;
    for (let i = idx - 1; i >= 0; i--) {
      if (sectionQuestions[i].question_type === "vendor_select") {
        return sectionQuestions[i].id;
      }
    }
    return null;
  })();
  const vendorFieldKey = resolvedVendorQuestionId ? `q_${resolvedVendorQuestionId}` : "";
  const watchedVendorValue = form.watch(vendorFieldKey || "__noop_client__");

  // Carrega clientes da base cadastral (busca no servidor, até 500 resultados por consulta).
  // Quando há um RCA (vendor_select) antes na mesma seção, a lista é restrita
  // aos clientes vinculados a esse RCA (direto em clientes_cadastro.cod_rca
  // ou via clientes_cadastro_rcas, que guarda vínculos adicionais).
  useEffect(() => {
    if (question.question_type !== "client_select") return;
    if (vendorFieldKey && !watchedVendorValue) {
      setClients([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoadingClients(true);
      try {
        let allowedCodcli: number[] | null = null;
        if (vendorFieldKey && watchedVendorValue) {
          const [{ data: direct, error: directErr }, { data: linked, error: linkedErr }] = await Promise.all([
            supabase.from("clientes_cadastro").select("codcli").eq("cod_rca", watchedVendorValue),
            supabase.from("clientes_cadastro_rcas").select("codcli").eq("cod_rca", watchedVendorValue),
          ]);
          if (directErr) throw directErr;
          if (linkedErr) throw linkedErr;
          const ids = new Set<number>();
          (direct || []).forEach((c: any) => ids.add(c.codcli));
          (linked || []).forEach((c: any) => ids.add(c.codcli));
          allowedCodcli = Array.from(ids);
          if (allowedCodcli.length === 0) {
            if (!cancelled) setClients([]);
            return;
          }
        }

        const term = clientSearch.trim();
        let query = supabase
          .from("clientes_cadastro")
          .select("codcli, razao_social, nome_fantasia, cidade, uf, cnpj")
          .order("razao_social")
          .limit(500);

        if (allowedCodcli) {
          query = query.in("codcli", allowedCodcli);
        }

        if (term) {
          const digits = term.replace(/\D/g, "");
          const filters = [
            `razao_social.ilike.%${term}%`,
            `nome_fantasia.ilike.%${term}%`,
          ];
          if (digits) {
            filters.push(`cnpj.ilike.%${digits}%`);
            if (digits.length <= 9) filters.push(`codcli.eq.${digits}`);
          }
          query = query.or(filters.join(","));
        }

        const { data, error } = await query;
        if (error) throw error;
        if (cancelled) return;
        setClients(
          (data || []).map((c) => {
            const nome = c.nome_fantasia?.trim() || c.razao_social;
            const local = [c.cidade, c.uf].filter(Boolean).join("/");
            const label = `${c.codcli} - ${nome}${local ? ` - ${local}` : ""}`;
            // Guarda o texto completo para aparecer legível no PDF e nos relatórios
            return { value: label, label };
          })
        );
      } catch (err) {
        console.error("Erro ao carregar clientes:", err);
        if (!cancelled) setClients([]);
      } finally {
        if (!cancelled) setLoadingClients(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [question.question_type, clientSearch, vendorFieldKey, watchedVendorValue]);

  // Resolve qual pergunta team_select alimenta este vendor_select.
  // 1) usa conditional_logic.team_question_id se existir
  // 2) senão, encontra o team_select anterior na mesma seção
  const resolvedTeamQuestionId: string | null = (() => {
    const explicit = question.conditional_logic?.team_question_id as string | undefined;
    if (explicit) return explicit;
    if (question.question_type !== "vendor_select" || !sectionQuestions) return null;
    const idx = sectionQuestions.findIndex((q) => q.id === question.id);
    if (idx < 0) return null;
    for (let i = idx - 1; i >= 0; i--) {
      if (sectionQuestions[i].question_type === "team_select") {
        return sectionQuestions[i].id;
      }
    }
    return null;
  })();
  const teamFieldKey = resolvedTeamQuestionId ? `q_${resolvedTeamQuestionId}` : "";
  const watchedTeamValue = form.watch(teamFieldKey || "__noop__");
  
  // Load gestores (coordenadores e supervisores) for team_select question type
  useEffect(() => {
    if (question.question_type === "team_select") {
      loadGestores();
    }
  }, [question.question_type, question.conditional_logic?.role_filter]);
  
  // Load vendors based on selected gestor for vendor_select question type
  useEffect(() => {
    if (question.question_type !== "vendor_select") return;
    if (!teamFieldKey) {
      setVendors([]);
      return;
    }
    if (watchedTeamValue) {
      loadVendors(watchedTeamValue);
    } else {
      setVendors([]);
    }
  }, [question.question_type, teamFieldKey, watchedTeamValue]);
  
  const loadGestores = async () => {
    setLoading(true);
    try {
      // Determinar quais cargos buscar baseado no filtro configurado
      const roleFilter = question.conditional_logic?.role_filter as string | undefined;
      const allowedRoles = roleFilter && roleFilter !== "all"
        ? roleFilter.split(",").map(r => r.trim()).filter(Boolean)
        : ["coordenador", "gerente", "supervisor"];

      const orFilter = allowedRoles.map(r => `cargo.eq.${r}`).join(",");

      const { data, error } = await supabase
        .from("teams_vendors")
        .select("id, cod_equipe, nome_equipe, nome_rca, cod_rca_lopes, cargo, supervisor_id")
        .or(orFilter)
        .order("nome_equipe")
        .order("cargo");
      
      if (error) {
        console.error("Erro na query de gestores:", error);
        throw error;
      }
      
      console.log("Gestores carregados:", data?.length);
      
      const teamMembers = (data || []).map(item => ({
        ...item,
        cargo: (item.cargo || "vendedor") as TeamRole
      }));
      
      setAllTeamMembers(teamMembers);
      
      // Format options: "EQUIPE H - JUBCE RIBEIRO (Coordenador)"
      // nome_rca contém prefixo tipo "A - NOME COMPLETO", extrair apenas o nome
      const options = teamMembers.map(member => {
        const nomeRca = member.nome_rca || member.cod_rca_lopes;
        // Remover prefixo de letra de equipe (ex: "A - ", "B02 - ", "K - ")
        const nomeClean = nomeRca.replace(/^[A-Z]\d*\s*-\s*/i, '').trim();
        const cargoLabel = member.cargo === "coordenador" ? "Coordenador" : member.cargo === "gerente" ? "Gerente" : "Supervisor";
        const equipeName = (member.nome_equipe || 'Equipe').trim().split(' - ')[0].trim(); // Apenas "EQUIPE X"
        return {
          value: member.cod_rca_lopes,
          label: `${equipeName} - ${nomeClean} (${cargoLabel})`
        };
      });
      
      console.log("Opções de gestores:", options.length);
      setGestores(options);
    } catch (error) {
      console.error("Erro ao carregar gestores:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const loadVendors = async (gestorCode: string) => {
    setLoading(true);
    try {
      // Find the selected gestor to get their team code
      const selectedGestor = allTeamMembers.find(m => m.cod_rca_lopes === gestorCode);
      
      if (!selectedGestor) {
        // If not found in cache, fetch from DB
        const { data: gestorData } = await supabase
          .from("teams_vendors")
          .select("*")
          .eq("cod_rca_lopes", gestorCode)
          .single();
        
        if (gestorData) {
          await loadVendorsForTeam(gestorData.cod_equipe, gestorData.id, gestorData.cargo as TeamRole);
        }
      } else {
        await loadVendorsForTeam(selectedGestor.cod_equipe, selectedGestor.id, selectedGestor.cargo);
      }
    } catch (error) {
      console.error("Erro ao carregar RCAs:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const loadVendorsForTeam = async (teamCode: string, gestorId: string, gestorCargo: TeamRole) => {
    try {
      let data: any[] = [];
      
      // Se for supervisor, primeiro tentar buscar vendedores vinculados
      if (gestorCargo === "supervisor" || gestorCargo === "gerente") {
        const { data: linkedVendors, error } = await supabase
          .from("teams_vendors")
          .select("nome_rca, cod_rca_lopes, supervisor_id")
          .eq("cod_equipe", teamCode)
          .eq("cargo", "vendedor")
          .eq("supervisor_id", gestorId)
          .order("nome_rca");
        
        if (error) throw error;
        
        // Se não houver vendedores vinculados, buscar todos da equipe (fallback)
        if (!linkedVendors || linkedVendors.length === 0) {
          const { data: allVendors, error: allError } = await supabase
            .from("teams_vendors")
            .select("nome_rca, cod_rca_lopes, supervisor_id")
            .eq("cod_equipe", teamCode)
            .eq("cargo", "vendedor")
            .order("nome_rca");
          
          if (allError) throw allError;
          data = allVendors || [];
        } else {
          data = linkedVendors;
        }
      } else {
        // Coordenador vê todos os vendedores da equipe
        const { data: allVendors, error } = await supabase
          .from("teams_vendors")
          .select("nome_rca, cod_rca_lopes, supervisor_id")
          .eq("cod_equipe", teamCode)
          .eq("cargo", "vendedor")
          .order("nome_rca");
        
        if (error) throw error;
        data = allVendors || [];
      }
      
      setVendors(data.map(vendor => ({
        value: vendor.cod_rca_lopes,
        label: `${vendor.nome_rca || vendor.cod_rca_lopes} (${vendor.cod_rca_lopes})`
      })));
    } catch (error) {
      console.error("Erro ao carregar vendedores da equipe:", error);
      setVendors([]);
    }
  };
  
  // Check conditional logic
  if (question.conditional_logic) {
    const condition = question.conditional_logic as { show_when?: { question_id: string; value: any } };
    if (condition.show_when) {
      const dependentValue = form.watch(`q_${condition.show_when.question_id}`);
      if (dependentValue !== condition.show_when.value) {
        return null;
      }
    }
  }

  const renderField = () => {
    switch (question.question_type) {
    case "text":
      return (
        <FormField
          key={question.id}
          control={form.control}
          name={fieldKey}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {question.label}
                {question.is_required && <span className="text-destructive ml-1">*</span>}
              </FormLabel>
              {question.description && <FormDescription>{question.description}</FormDescription>}
              <FormControl>
                <Input
                  placeholder={question.placeholder || ""}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      );
      
    case "textarea":
      return (
        <FormField
          key={question.id}
          control={form.control}
          name={fieldKey}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {question.label}
                {question.is_required && <span className="text-destructive ml-1">*</span>}
              </FormLabel>
              {question.description && <FormDescription>{question.description}</FormDescription>}
              <FormControl>
                <Textarea
                  placeholder={question.placeholder || ""}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      );
      
    case "radio":
      return (
        <FormField
          key={question.id}
          control={form.control}
          name={fieldKey}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {question.label}
                {question.is_required && <span className="text-destructive ml-1">*</span>}
              </FormLabel>
              {question.description && <FormDescription>{question.description}</FormDescription>}
              <FormControl>
                <RadioGroup
                  onValueChange={(val) => {
                    field.onChange(val);
                    form.trigger(fieldKey);
                  }}
                  value={field.value}
                  className="flex flex-col space-y-2"
                >
                  {question.options?.map((option: any) => (
                    <label
                      key={option.value}
                      htmlFor={`${fieldKey}_${option.value}`}
                      className="flex items-center gap-3 min-h-[44px] px-3 py-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <RadioGroupItem value={option.value} id={`${fieldKey}_${option.value}`} />
                      <span className="text-sm leading-snug">{option.label}</span>
                    </label>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      );
      
    case "select":
      return (
        <FormField
          key={question.id}
          control={form.control}
          name={fieldKey}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {question.label}
                {question.is_required && <span className="text-destructive ml-1">*</span>}
              </FormLabel>
              {question.description && <FormDescription>{question.description}</FormDescription>}
              <Select
                onValueChange={(val) => {
                  field.onChange(val);
                  form.trigger(fieldKey);
                }}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma opção" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {question.options?.map((option: any) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      );
      
    case "slider":
      const config = (question.slider_config as { min: number; max: number; step: number }) || { min: 1, max: 5, step: 1 };
      return (
        <FormField
          key={question.id}
          control={form.control}
          name={fieldKey}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {question.label}
                {question.is_required && <span className="text-destructive ml-1">*</span>}
              </FormLabel>
              {question.description && <FormDescription>{question.description}</FormDescription>}
              <FormControl>
                <div className="space-y-4">
                  <Slider
                    min={config.min}
                    max={config.max}
                    step={config.step}
                    value={[field.value || config.min]}
                    onValueChange={(vals) => {
                      field.onChange(vals[0]);
                      form.trigger(fieldKey);
                    }}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{config.min}</span>
                    <span className="font-semibold text-primary">{field.value || config.min}</span>
                    <span>{config.max}</span>
                  </div>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      );
      
    case "date":
      return (
        <FormField
          key={question.id}
          control={form.control}
          name={fieldKey}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {question.label}
                {question.is_required && <span className="text-destructive ml-1">*</span>}
              </FormLabel>
              {question.description && <FormDescription>{question.description}</FormDescription>}
              <FormControl>
                <Input
                  type="date"
                  {...field}
                  value={field.value || ""}
                  onChange={(e) => {
                    field.onChange(e);
                    form.trigger(fieldKey);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      );
      
    case "checkbox":
      return (
        <FormField
          key={question.id}
          control={form.control}
          name={fieldKey}
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    field.onChange(checked);
                    form.trigger(fieldKey);
                  }}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  {question.label}
                  {question.is_required && <span className="text-destructive ml-1">*</span>}
                </FormLabel>
                {question.description && <FormDescription>{question.description}</FormDescription>}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      );

    case "multi_select":
      return (
        <FormField
          key={question.id}
          control={form.control}
          name={fieldKey}
          render={({ field }) => {
            // Compatibilidade: valores antigos (radio) podem vir como string
            const current: string[] = Array.isArray(field.value)
              ? field.value
              : field.value
                ? [String(field.value)]
                : [];
            const toggle = (val: string, checked: boolean) => {
              const next = checked
                ? Array.from(new Set([...current, val]))
                : current.filter((v) => v !== val);
              field.onChange(next);
              form.trigger(fieldKey);
            };
            return (
              <FormItem>
                <FormLabel>
                  {question.label}
                  {question.is_required && <span className="text-destructive ml-1">*</span>}
                </FormLabel>
                {question.description && <FormDescription>{question.description}</FormDescription>}
                <FormControl>
                  <div className="flex flex-col space-y-2">
                    {question.options?.map((option: any) => {
                      const checked = current.includes(option.value);
                      return (
                        <label
                          key={option.value}
                          htmlFor={`${fieldKey}_${option.value}`}
                          className="flex items-center gap-3 min-h-[44px] px-3 py-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors"
                        >
                          <Checkbox
                            id={`${fieldKey}_${option.value}`}
                            checked={checked}
                            onCheckedChange={(c) => toggle(option.value, !!c)}
                          />
                          <span className="text-sm leading-snug">{option.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />
      );
      
    case "image_upload":
      return (
        <FormField
          key={question.id}
          control={form.control}
          name={fieldKey}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {question.label}
                {question.is_required && <span className="text-destructive ml-1">*</span>}
              </FormLabel>
              {question.description && <FormDescription>{question.description}</FormDescription>}
              <FormControl>
                <ImageUploader
                  value={field.value || []}
                  onChange={(val) => {
                    field.onChange(val);
                    form.trigger(fieldKey);
                  }}
                  maxImages={(question.slider_config as any)?.maxImages ?? 10}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      );
      
    case "team_select":
      return (
        <FormField
          key={question.id}
          control={form.control}
          name={fieldKey}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {question.label}
                {question.is_required && <span className="text-destructive ml-1">*</span>}
              </FormLabel>
              {question.description && <FormDescription>{question.description}</FormDescription>}
              <FormControl>
                <Combobox
                  options={gestores}
                  value={field.value || ""}
                  onValueChange={(val) => {
                    field.onChange(val);
                    form.trigger(fieldKey);
                  }}
                  placeholder={question.placeholder || "Selecione o gestor..."}
                  searchPlaceholder="Buscar gestor..."
                  emptyMessage={loading ? "Carregando..." : "Nenhum gestor encontrado."}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      );
      
    case "vendor_select":
      return (
        <FormField
          key={question.id}
          control={form.control}
          name={fieldKey}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {question.label}
                {question.is_required && <span className="text-destructive ml-1">*</span>}
              </FormLabel>
              {question.description && <FormDescription>{question.description}</FormDescription>}
              <FormControl>
                <Combobox
                  options={vendors}
                  value={field.value || ""}
                  onValueChange={(val) => {
                    field.onChange(val);
                    form.trigger(fieldKey);
                  }}
                  placeholder={question.placeholder || "Selecione um RCA..."}
                  searchPlaceholder="Buscar RCA..."
                  emptyMessage={
                    loading
                      ? "Carregando..."
                      : !teamFieldKey
                        ? "Configuração inválida: defina o gestor vinculado a este RCA."
                        : vendors.length === 0
                          ? "Selecione um gestor primeiro"
                          : "Nenhum RCA encontrado."
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      );

    case "client_select":
      return (
        <FormField
          key={question.id}
          control={form.control}
          name={fieldKey}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {question.label}
                {question.is_required && <span className="text-destructive ml-1">*</span>}
              </FormLabel>
              {question.description && <FormDescription>{question.description}</FormDescription>}
              <FormControl>
                <Combobox
                  options={clients}
                  value={field.value || ""}
                  onValueChange={(val) => {
                    field.onChange(val);
                    form.trigger(fieldKey);
                  }}
                  onSearchChange={setClientSearch}
                  placeholder={question.placeholder || "Selecione o cliente..."}
                  searchPlaceholder="Buscar por nome, CNPJ ou código..."
                  emptyMessage={
                    loadingClients
                      ? "Carregando..."
                      : vendorFieldKey && !watchedVendorValue
                        ? "Selecione um RCA primeiro"
                        : vendorFieldKey
                          ? "Nenhum cliente encontrado para este RCA."
                          : "Nenhum cliente encontrado."
                  }
                />
              </FormControl>
              <FormDescription>
                {vendorFieldKey
                  ? "Lista restrita aos clientes do RCA selecionado. Digite parte do nome, CNPJ ou código para filtrar."
                  : "Digite parte do nome, CNPJ ou código para buscar em toda a base de clientes."}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      );
      
    default:
      return null;
    }
  };

  const field = renderField();
  if (!field) return null;
  const imageSrc = resolveQuestionImage(question.image_url);

  return (
    <div data-question-id={question.id}>
      {imageSrc && (
        <div className="mb-3 flex items-center justify-center rounded-lg border bg-muted/30 p-3">
          <img
            src={imageSrc}
            alt={question.label}
            loading="lazy"
            className="max-h-40 w-auto object-contain"
          />
        </div>
      )}
      {field}
    </div>
  );
}