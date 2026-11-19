import { useEffect, useMemo, useState } from "react";
import * as XLSX from "@e965/xlsx";
import jsPDF from "jspdf";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Loader2, TrendingUp, AlertTriangle, Store, PackageX, Map as MapIcon, FileSpreadsheet, FileDown, Lightbulb, GitCompareArrows } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDateOnlyPtBR } from "@/lib/utils";
import { yesScore } from "@/lib/submissionScore";
import { SubmissionsResultsMap, type MapPoint } from "@/components/SubmissionsResultsMap";
import { getCurrentRouteName } from "@/data/winthorRouteDirectory";
import { FOTOS_AJINOMOTO_SLUG } from "@/lib/restrictedFormAccess";

interface Question { id: string; label: string; question_type: string; options: any; section: string; order: number }
export interface DashSubmission { id: string; visit_date: string; submitted_at?: string; created_by: string | null; latitude: number | null; longitude: number | null; address: string | null; metadata: any }
export interface Drill { label: string; ids: string[] }
interface Props { templateId: string; templateName: string; submissions: DashSubmission[]; names: Record<string, string>; onDrill: (d: Drill | null) => void; onResponsiblesChange?: (responsibles: Record<string, string>) => void }

const CHOICE = ["radio", "select", "multi_select", "checkbox"];
const NUMERIC = ["slider", "scale", "rating", "number"];
const norm = (v: unknown) => String(v ?? "").trim().toLowerCase();
const asList = (v: any) => (Array.isArray(v) ? v : [v]).map(norm);

type PexNetwork = "all" | "DB" | "Baratão";
type NetworkLeader = "db" | "tie" | "baratao";

const normalizeText = (value: unknown) => String(value ?? "")
  .trim()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("pt-BR");

const identifyPexNetwork = (value: unknown): Exclude<PexNetwork, "all"> | "Outras" => {
  const normalized = normalizeText(value);
  if (/(^|\W)db(\W|$)/i.test(normalized)) return "DB";
  if (normalized.includes("baratao")) return "Baratão";
  return "Outras";
};

const pexAnswerScore = (value: unknown): number | null => {
  const normalized = normalizeText(value);
  if (normalized === "nao") return 0;
  if (normalized === "parcial") return 1;
  if (normalized === "sim") return 2;
  return null;
};

const formatPersonName = (value: unknown) => {
  const clean = String(value ?? "")
    .replace(/^(?:GERENTE|SUPERVISOR|COORDENADOR|[A-Z]\d*)\s*-\s*/i, "")
    .trim();
  if (!clean) return "";
  return clean.toLocaleLowerCase("pt-BR").replace(/(^|[\s'-])\p{L}/gu, letter => letter.toLocaleUpperCase("pt-BR"));
};

const networkLeaderLabel: Record<NetworkLeader, string> = {
  db: "DB à frente",
  tie: "Empate",
  baratao: "Baratão à frente",
};

function Bar({ label, value, total, tone = "primary", onClick }: { label: string; value: number; total: number; tone?: "primary" | "destructive" | "success"; onClick?: () => void }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  const color = tone === "destructive" ? "bg-destructive" : tone === "success" ? "bg-success" : "bg-primary";
  const body = (
    <>
      <div className="flex justify-between gap-2 text-sm"><span className="truncate text-left">{label}</span><span className="font-semibold shrink-0">{pct}% <span className="text-muted-foreground font-normal">({value})</span></span></div>
      <div className="h-2 rounded-full bg-muted overflow-hidden"><div className={`h-full ${color}`} style={{ width: `${pct}%` }} /></div>
    </>
  );
  return onClick
    ? <button type="button" onClick={onClick} className="w-full space-y-1 rounded-md p-1 -m-1 hover:bg-muted/50 transition-colors min-h-11">{body}</button>
    : <div className="space-y-1">{body}</div>;
}

export function SubmissionsDashboard({ templateId, templateName, submissions, names, onDrill, onResponsiblesChange }: Props) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<{ submission_id: string; question_id: string; response_value: any }[]>([]);
  const [loading, setLoading] = useState(true);
  const [pexNetwork, setPexNetwork] = useState<PexNetwork>("all");
  const [teamMemberNames, setTeamMemberNames] = useState<Record<string, string>>({});
  const allSubmissionIds = useMemo(() => submissions.map(s => s.id), [submissions]);
  const isPexJbp = /pex.*j(?:bp|pb)/i.test(templateName);
  const isFotosAjinomoto = normalizeText(templateName) === "fotos ajinomoto";
  const usesRouteResponsible = /pex.*visita.*(gerente|supervisor)/i.test(normalizeText(templateName));

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.from("form_sections")
        .select("title, display_order, form_questions(id,label,question_type,options,display_order,is_active)")
        .eq("template_id", templateId).order("display_order");
      if (!active) return;
      const qs: Question[] = [];
      (data || []).forEach((s: any) => (s.form_questions || []).filter((q: any) => q.is_active !== false)
        .forEach((q: any) => qs.push({ ...q, section: s.title, order: s.display_order * 1000 + q.display_order })));
      setQuestions(qs.sort((a, b) => a.order - b.order));
    })();
    return () => { active = false; };
  }, [templateId]);

  const key = allSubmissionIds.join(",");
  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      const all: any[] = [];
      for (let i = 0; i < allSubmissionIds.length; i += 100) {
        const { data } = await supabase.from("form_responses").select("submission_id, question_id, response_value")
          .in("submission_id", allSubmissionIds.slice(i, i + 100));
        all.push(...(data || []));
      }
      if (active) { setResponses(all); setLoading(false); }
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const qMap = useMemo(() => new Map(questions.map(q => [q.id, q])), [questions]);
  const isYesNo = (q?: Question) => !!q && Array.isArray(q.options) && q.options.some((o: any) => norm(o.value ?? o) === "sim") && q.options.some((o: any) => norm(o.value ?? o) === "nao");

  /** respostas por registro */
  const bySub = useMemo(() => {
    const m = new Map<string, Map<string, any>>();
    responses.forEach(r => { if (!m.has(r.submission_id)) m.set(r.submission_id, new Map()); m.get(r.submission_id)!.set(r.question_id, r.response_value); });
    return m;
  }, [responses]);

  const clientQ = useMemo(() => questions.find(q => /rede|cliente/i.test(q.label) && !CHOICE.includes(q.question_type) && !NUMERIC.includes(q.question_type)), [questions]);
  const storeQ = useMemo(() => questions.find(q => normalizeText(q.label) === "loja"), [questions]);
  const responsibleQuestions = useMemo(() => questions.filter(q =>
    q.question_type === "team_select" && /(gerente|supervisor)/i.test(normalizeText(q.label))
  ), [questions]);

  const allPerSub = useMemo(() => submissions.map(s => {
    const ans = bySub.get(s.id) || new Map();
    const score = yesScore([...ans.entries()].map(([qid, v]) => ({ value: v, yesNo: isYesNo(qMap.get(qid)) })));
    const noCount = [...ans.entries()].filter(([qid, v]) => isYesNo(qMap.get(qid)) && norm(v) === "nao").length;
    const md = s.metadata || {};
    const rawClient = (clientQ && ans.get(clientQ.id)) || md.client_data?.nome_fantasia || md.client || md.cliente || "";
    const client = String(typeof rawClient === "object" ? JSON.stringify(rawClient) : rawClient).trim() || "Não informado";
    const rawStore = (storeQ && ans.get(storeQ.id)) || md.store || md.loja || "";
    const store = String(typeof rawStore === "object" ? JSON.stringify(rawStore) : rawStore).trim() || client;
    const selectedResponsibles = responsibleQuestions.flatMap(question => {
      const code = String(ans.get(question.id) ?? "").trim();
      if (!code) return [];
      const role = normalizeText(question.label).includes("supervisor") ? "Supervisor" : "Gerente";
      const selectedName = formatPersonName(teamMemberNames[code] || code);
      return selectedName ? [`${selectedName} (${role})`] : [];
    });
    const metadataResponsibles = [
      { value: md.manager ?? md.gerente ?? md.manager_name, role: "Gerente" },
      { value: md.supervisor ?? md.supervisor_rota ?? md.supervisor_name, role: "Supervisor" },
    ].flatMap(({ value, role }) => {
      if (value === undefined || value === null || value === "" || typeof value === "object") return [];
      const codeOrName = String(value).trim();
      const selectedName = formatPersonName(teamMemberNames[codeOrName] || codeOrName);
      return selectedName ? [`${selectedName} (${role})`] : [];
    });
    const selectedResponsible = [...new Set([...selectedResponsibles, ...metadataResponsibles])].join(" • ");
    return {
      s,
      score,
      noCount,
      client,
      store,
      network: identifyPexNetwork(client),
      who: selectedResponsible || (usesRouteResponsible ? "Responsável da rota não informado" : names[s.created_by || ""] || "Sem responsável identificado"),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [submissions, bySub, qMap, clientQ, storeQ, responsibleQuestions, teamMemberNames, names, usesRouteResponsible]);

  useEffect(() => {
    if (!onResponsiblesChange) return;
    onResponsiblesChange(Object.fromEntries(allPerSub.map(item => [item.s.id, item.who])));
  }, [allPerSub, onResponsiblesChange]);

  const perSub = useMemo(
    () => !isPexJbp || pexNetwork === "all" ? allPerSub : allPerSub.filter(p => p.network === pexNetwork),
    [allPerSub, isPexJbp, pexNetwork],
  );
  const submissionIds = useMemo(() => perSub.map(p => p.s.id), [perSub]);
  const filteredKey = submissionIds.join(",");
  const networkCounts = useMemo(() => ({
    DB: allPerSub.filter(p => p.network === "DB").length,
    Baratão: allPerSub.filter(p => p.network === "Baratão").length,
  }), [allPerSub]);

  useEffect(() => {
    if (!isPexJbp) return;
    if (pexNetwork === "all") onDrill(null);
    else onDrill({ label: `Rede: ${pexNetwork}`, ids: filteredKey ? filteredKey.split(",") : [] });
  }, [filteredKey, isPexJbp, onDrill, pexNetwork]);

  const stats = useMemo(() => questions.map(q => {
    const entries = submissionIds.map(id => [id, bySub.get(id)?.get(q.id)] as const).filter(([, v]) => v !== undefined && v !== null && v !== "");
    if (CHOICE.includes(q.question_type) && Array.isArray(q.options)) {
      const opts = q.options.map((o: any) => {
        const value = norm(o.value ?? o);
        const ids = entries.filter(([, v]) => asList(v).includes(value)).map(([id]) => id);
        return { label: o.label ?? String(o), value, count: ids.length, ids };
      });
      return { q, kind: "choice" as const, answered: entries.length, opts, yesNo: isYesNo(q), multi: q.question_type === "multi_select" };
    }
    if (NUMERIC.includes(q.question_type)) {
      const nums = entries.map(([, v]) => Number(v)).filter(n => !isNaN(n));
      return { q, kind: "num" as const, answered: nums.length, avg: nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0 };
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }).filter(Boolean) as any[], [questions, bySub, filteredKey]);

  const ranking = useMemo(() => {
    const c = new Map<string, string[]>();
    perSub.forEach(p => c.set(p.who, [...(c.get(p.who) || []), p.s.id]));
    return [...c.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [perSub]);

  const clients = useMemo(() => {
    const c = new Map<string, { ids: string[]; no: number; scores: number[] }>();
    perSub.forEach(p => {
      const e = c.get(p.client) || { ids: [], no: 0, scores: [] };
      e.ids.push(p.s.id); e.no += p.noCount; if (p.score !== null) e.scores.push(p.score);
      c.set(p.client, e);
    });
    return [...c.entries()].map(([name, e]) => ({ name, ...e, avg: e.scores.length ? Math.round(e.scores.reduce((a, b) => a + b, 0) / e.scores.length) : null }))
      .sort((a, b) => b.no - a.no || (a.avg ?? 101) - (b.avg ?? 101)).slice(0, 10);
  }, [perSub]);

  const missing = useMemo(() => stats.filter(s => s.kind === "choice" && s.multi && s.answered > 0).map(s => ({
    s, items: [...s.opts].map((o: any) => ({ ...o, missing: s.answered - o.count, missIds: submissionIds.filter(id => { const v = bySub.get(id)?.get(s.q.id); return v != null && !asList(v).includes(o.value); }) }))
      .filter((o: any) => o.missing > 0).sort((a: any, b: any) => b.missing - a.missing).slice(0, 8),
  })).filter(m => m.items.length), [stats, bySub, submissionIds]);

  const [rcaNames, setRcaNames] = useState<Record<string, string>>({});
  useEffect(() => {
    supabase.from("teams_vendors").select("cod_rca_lopes, nome_rca, cargo").then(({ data }) => {
      const vendorMap: Record<string, string> = {};
      const memberMap: Record<string, string> = {};
      (data || []).forEach((row: any) => {
        if (!row.nome_rca) return;
        const code = String(row.cod_rca_lopes);
        vendorMap[code] = row.nome_rca;
        if (row.cargo !== "vendedor") memberMap[code] = row.nome_rca;
      });
      setRcaNames(vendorMap);
      setTeamMemberNames(memberMap);
    });
  }, []);
  const opportunities = useMemo(() => {
    const rcaQ = questions.find(q => q.question_type === "vendor_select") || questions.find(q => /\brca\b/i.test(q.label));
    const oppQs = questions.filter(q => /oportunidade/i.test(q.label));
    const noQs = questions.filter(q => isYesNo(q) && !/oportunidade/i.test(q.label));
    if (!oppQs.length && !noQs.length) return null;
    const rcaOf = (id: string) => {
      const v = rcaQ ? bySub.get(id)?.get(rcaQ.id) : null;
      if (v == null || v === "") return "Sem RCA";
      const cod = String(v).trim();
      return rcaNames[cod] ? `${cod} - ${rcaNames[cod]}` : cod;
    };
    const byWho = new Map<string, { ids: Set<string>; total: number; items: Map<string, number> }>();
    const overall = new Map<string, { label: string; count: number; ids: string[] }>();
    const add = (id: string, items: string[]) => {
      if (!items.length) return;
      const who = rcaOf(id);
      const e = byWho.get(who) || { ids: new Set<string>(), total: 0, items: new Map<string, number>() };
      e.ids.add(id);
      items.forEach(label => {
        e.total += 1; e.items.set(label, (e.items.get(label) || 0) + 1);
        const g = overall.get(label) || { label, count: 0, ids: [] as string[] };
        g.count += 1; g.ids.push(id); overall.set(label, g);
      });
      byWho.set(who, e);
    };
    submissionIds.forEach(id => {
      oppQs.forEach(q => {
        const v = bySub.get(id)?.get(q.id);
        if (v == null || v === "") return;
        if (isYesNo(q)) { if (norm(v) === "sim") add(id, [q.label]); }
        else if (CHOICE.includes(q.question_type) && Array.isArray(q.options)) add(id, q.options.filter((o: any) => asList(v).includes(norm(o.value ?? o))).map((o: any) => o.label ?? String(o)));
        else if (String(v).trim()) add(id, [q.label]);
      });
      noQs.forEach(q => { const v = bySub.get(id)?.get(q.id); if (v != null && norm(v) === "nao") add(id, [`Melhorar: ${q.label}`]); });
    });
    if (!byWho.size) return null;
    const rankingWho = [...byWho.entries()]
      .map(([who, e]) => ({ who, ids: [...e.ids], total: e.total, items: [...e.items.entries()].sort((a, b) => b[1] - a[1]) }))
      .sort((a, b) => b.total - a.total);
    const top = [...overall.values()].sort((a, b) => b.count - a.count).slice(0, 10);
    return { rankingWho, top };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions, bySub, rcaNames, filteredKey]);

  const pexAssessmentQuestions = useMemo(() => questions.filter(q => {
    if (!isPexJbp || !Array.isArray(q.options)) return false;
    const values = q.options.map((option: any) => normalizeText(option.value ?? option));
    return values.includes("sim") && values.includes("parcial") && values.includes("nao");
  }), [isPexJbp, questions]);

  const networkComparisonRows = useMemo(() => {
    if (!isPexJbp || !pexAssessmentQuestions.length) return [];
    const dbVisits = allPerSub.filter(item => item.network === "DB");
    const barataoVisits = allPerSub.filter(item => item.network === "Baratão");

    return pexAssessmentQuestions.flatMap(question => {
      const scoresFor = (visits: typeof allPerSub) => visits.flatMap(item => {
        const score = pexAnswerScore(bySub.get(item.s.id)?.get(question.id));
        return score === null ? [] : [score];
      });
      const dbScores = scoresFor(dbVisits);
      const barataoScores = scoresFor(barataoVisits);
      if (!dbScores.length || !barataoScores.length) return [];

      const averagePercent = (scores: number[]) => Math.round(
        (scores.reduce((sum, score) => sum + score, 0) / scores.length / 2) * 100,
      );
      const dbPercent = averagePercent(dbScores);
      const barataoPercent = averagePercent(barataoScores);
      const difference = dbPercent - barataoPercent;
      const leader: NetworkLeader = difference > 0 ? "db" : difference < 0 ? "baratao" : "tie";

      return [{
        question: question.label,
        section: question.section,
        dbPercent,
        dbAnswers: dbScores.length,
        barataoPercent,
        barataoAnswers: barataoScores.length,
        difference: Math.abs(difference),
        leader,
      }];
    }).sort((a, b) =>
      b.difference - a.difference || a.question.localeCompare(b.question, "pt-BR"),
    );
  }, [allPerSub, bySub, isPexJbp, pexAssessmentQuestions]);

  const networkComparisonCounts = useMemo(() => ({
    db: networkComparisonRows.filter(row => row.leader === "db").length,
    tie: networkComparisonRows.filter(row => row.leader === "tie").length,
    baratao: networkComparisonRows.filter(row => row.leader === "baratao").length,
  }), [networkComparisonRows]);
  const networkComparisonReady = networkCounts.DB > 0 && networkCounts.Baratão > 0;

  const yesNoStats = stats.filter(s => s.kind === "choice" && s.yesNo && s.answered > 0)
    .map(s => { const o = s.opts.find((x: any) => x.value === "sim"); const n = s.opts.find((x: any) => x.value === "nao"); return { label: s.q.label, pct: Math.round((o.count / s.answered) * 100), yesIds: o.ids, noIds: n?.ids || [] }; });
  const best = [...yesNoStats].sort((a, b) => b.pct - a.pct).slice(0, 3);
  const worst = [...yesNoStats].sort((a, b) => a.pct - b.pct).slice(0, 3);

  const points: MapPoint[] = useMemo(() => perSub.filter(p => p.s.latitude && p.s.longitude).map(p => ({
    id: p.s.id, lat: Number(p.s.latitude), lng: Number(p.s.longitude), score: p.score,
    title: p.client, subtitle: `${p.who} · ${formatDateOnlyPtBR(p.s.visit_date)}`,
  })), [perSub]);

  const drill = (label: string, ids: string[]) => { onDrill({ label, ids }); setTimeout(() => document.getElementById("lista-registros")?.scrollIntoView({ behavior: "smooth" }), 50); };
  const handlePexNetworkChange = (network: PexNetwork) => {
    setPexNetwork(network);
    if (network === "all") onDrill(null);
    else onDrill({ label: `Rede: ${network}`, ids: allPerSub.filter(item => item.network === network).map(item => item.s.id) });
  };

  const exportExcel = async () => {
    if (isFotosAjinomoto) {
      const rcaQuestion = questions.find((question) => question.question_type === "vendor_select");
      const clientQuestion = questions.find((question) => question.question_type === "client_select");
      const materialQuestion = questions.find((question) => normalizeText(question.label) === "material da campanha");
      const photoQuestion = questions.find((question) => question.question_type === "image_upload");

      const clientCodes = [...new Set(perSub.flatMap(({ s }) => {
        const raw = clientQuestion ? bySub.get(s.id)?.get(clientQuestion.id) : "";
        const match = String(raw || "").match(/^\s*(\d+)/);
        return match ? [Number(match[1])] : [];
      }))];
      const clientRows: any[] = [];
      for (let index = 0; index < clientCodes.length; index += 500) {
        const { data, error } = await supabase
          .from("clientes_cadastro")
          .select("codcli, cnpj, razao_social")
          .in("codcli", clientCodes.slice(index, index + 500));
        if (error) throw error;
        clientRows.push(...(data || []));
      }
      const clientsByCode = new Map(clientRows.map((client) => [String(client.codcli), client]));

      const rows = perSub.map(({ s }) => {
        const answers = bySub.get(s.id) || new Map<string, any>();
        const rcaCode = String(rcaQuestion ? answers.get(rcaQuestion.id) || "" : "").trim();
        const clientRaw = String(clientQuestion ? answers.get(clientQuestion.id) || "" : "");
        const clientCode = clientRaw.match(/^\s*(\d+)/)?.[1] || "";
        const client = clientsByCode.get(clientCode);
        const materials = materialQuestion ? asList(answers.get(materialQuestion.id)) : [];
        const hasPhoto = Boolean(photoQuestion && asList(answers.get(photoQuestion.id)).filter(Boolean).length);
        const submittedAt = s.submitted_at ? new Date(s.submitted_at) : new Date(`${s.visit_date}T12:00:00`);
        return {
          "Data e hora": submittedAt.toLocaleString("pt-BR"),
          "Código RCA": rcaCode,
          "Nome RCA": rcaCode ? getCurrentRouteName(rcaCode, rcaNames[rcaCode] || rcaCode) : "",
          "Código Cliente": clientCode,
          CNPJ: client?.cnpj || "",
          "Razão Social": client?.razao_social || clientRaw.replace(/^\s*\d+\s*-\s*/, "").replace(/\s*-\s*CNPJ.*$/i, ""),
          Wobbler: materials.includes("wobbler") ? "Sim" : "Não",
          "Take One": materials.includes("take_one") ? "Sim" : "Não",
          Selo: materials.includes("selo") ? "Sim" : "Não",
          "Link da foto": hasPhoto ? "Baixar foto" : "Sem foto",
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      rows.forEach((row, rowIndex) => {
        if (row["Link da foto"] !== "Baixar foto") return;
        const cell = XLSX.utils.encode_cell({ r: rowIndex + 1, c: 9 });
        worksheet[cell].l = {
          Target: `${window.location.origin}/form/${FOTOS_AJINOMOTO_SLUG}/foto/${perSub[rowIndex].s.id}`,
          Tooltip: "Abrir e baixar a foto do espaço",
        };
      });
      worksheet["!cols"] = [
        { wch: 20 }, { wch: 12 }, { wch: 38 }, { wch: 16 }, { wch: 20 },
        { wch: 48 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 18 },
      ];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Registros Ajinomoto");
      XLSX.writeFile(workbook, "fotos-ajinomoto.xlsx");
      return;
    }

    const wb = XLSX.utils.book_new();
    const resumo: any[] = [];
    stats.forEach(s => s.kind === "num"
      ? resumo.push({ Seção: s.q.section, Pergunta: s.q.label, Resposta: "Média", Quantidade: s.answered, Percentual: Number(s.avg.toFixed(2)) })
      : s.opts.forEach((o: any) => resumo.push({ Seção: s.q.section, Pergunta: s.q.label, Resposta: o.label, Quantidade: o.count, Percentual: s.answered ? Math.round(o.count / s.answered * 100) : 0 })));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumo), "Resumo por pergunta");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(perSub.map(p => ({ "ID do envio": p.s.id, Data: formatDateOnlyPtBR(p.s.visit_date), "Responsável selecionado": p.who, Rede: p.network, Loja: p.store, "Rede/Cliente": p.client, "Resultado (% Sim)": p.score ?? "", "Respostas Não": p.noCount, Latitude: p.s.latitude ?? "", Longitude: p.s.longitude ?? "", Endereço: p.s.address || "" }))), "Registros");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(clients.map(c => ({ "Rede/Cliente": c.name, Visitas: c.ids.length, "Respostas Não": c.no, "Resultado médio (% Sim)": c.avg ?? "" }))), "Clientes com atenção");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ranking.map(([n, ids]) => ({ "Responsável selecionado": n, Registros: ids.length }))), "Por responsável");
    if (opportunities) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(opportunities.rankingWho.map(r => ({ RCA: r.who, "Oportunidades registradas": r.total, "Visitas com oportunidade": r.ids.length, "Quais": r.items.map(([l, n]) => n > 1 ? `${l} (${n})` : l).join("; ") }))), "Oportunidades");
    }
    if (isPexJbp && networkComparisonRows.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(networkComparisonRows.map(row => ({
        Seção: row.section,
        "Ponto avaliado": row.question,
        "DB - resultado médio (%)": row.dbPercent,
        "DB - respostas": row.dbAnswers,
        "Baratão - resultado médio (%)": row.barataoPercent,
        "Baratão - respostas": row.barataoAnswers,
        "Diferença (p.p.)": row.difference,
        Resultado: networkLeaderLabel[row.leader],
      }))), "Comparativo DB x Baratão");
    }
    XLSX.writeFile(wb, `painel-${templateName.replace(/[^\w]+/g, "-").toLowerCase()}.xlsx`);
  };

  const exportPdf = () => {
    const doc = new jsPDF();
    let y = 15;
    const line = (t: string, size = 10, bold = false) => {
      doc.setFontSize(size); doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.splitTextToSize(t, 180).forEach((l: string) => { if (y > 280) { doc.addPage(); y = 15; } doc.text(l, 15, y); y += size * 0.5; });
    };
    line("LOPES DISTRIBUIDORA", 14, true); line(`Painel de resultados - ${templateName}`, 12, true);
    line(`${submissionIds.length} registro(s) no filtro · gerado em ${new Date().toLocaleString("pt-BR")}`); y += 4;
    if (isPexJbp) {
      line(`Rede: ${pexNetwork === "all" ? "Todas" : pexNetwork}`, 10, true);
      line(`Comparativo DB x Baratão: DB lidera em ${networkComparisonCounts.db} ponto(s), há ${networkComparisonCounts.tie} empate(s) e Baratão lidera em ${networkComparisonCounts.baratao} ponto(s).`);
      networkComparisonRows.forEach(row => line(`- ${row.question}: DB ${row.dbPercent}% x Baratão ${row.barataoPercent}% (${networkLeaderLabel[row.leader]})`, 8));
      y += 3;
    }
    if (best.length) { line("Pontos fortes", 11, true); best.forEach(b => line(`- ${b.label}: ${b.pct}% Sim`)); y += 3; }
    if (worst.length) { line("Pontos de atenção", 11, true); worst.forEach(b => line(`- ${b.label}: ${b.pct}% Sim`)); y += 3; }
    line("Registros por responsável selecionado", 11, true); ranking.forEach(([n, ids]) => line(`- ${n}: ${ids.length}`)); y += 3;
    if (clients.length) { line("Clientes com mais pontos de atenção", 11, true); clients.forEach(c => line(`- ${c.name}: ${c.no} resposta(s) Não em ${c.ids.length} visita(s)${c.avg !== null ? ` · ${c.avg}% Sim` : ""}`)); y += 3; }
    missing.forEach(m => { line(`Itens mais ausentes - ${m.s.q.label}`, 11, true); m.items.forEach((o: any) => line(`- ${o.label}: ausente em ${o.missing} de ${m.s.answered}`)); y += 3; });
    if (opportunities) {
      line("Ranking de oportunidades", 11, true);
      opportunities.rankingWho.forEach((r, i) => line(`- ${i + 1}o ${r.who}: ${r.total} oportunidade(s) em ${r.ids.length} visita(s) · ${r.items.map(([l, n]) => n > 1 ? `${l} (${n})` : l).join(", ")}`, 9));
      y += 3;
    }
    line("Resultado por pergunta", 11, true);
    stats.forEach(s => line(s.kind === "num" ? `- ${s.q.label}: média ${s.avg.toFixed(1)}` : `- ${s.q.label}: ${s.opts.map((o: any) => `${o.label} ${s.answered ? Math.round(o.count / s.answered * 100) : 0}%`).join(" · ")}`, 9));
    doc.save(`painel-${templateName.replace(/[^\w]+/g, "-").toLowerCase()}.pdf`);
  };

  if (!allSubmissionIds.length) return null;

  return (
    <section aria-label="Painel de resultados" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" />Painel de resultados</h2>
        {!loading && (
          <div className="flex gap-2">
            <Button variant="outline" className="min-h-11 gap-2" onClick={() => void exportExcel()}><FileSpreadsheet className="h-4 w-4" />Excel</Button>
            {!isFotosAjinomoto && <Button variant="outline" className="min-h-11 gap-2" onClick={exportPdf}><FileDown className="h-4 w-4" />PDF</Button>}
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">Dica: clique em qualquer barra para ver só os registros com aquela resposta.</p>
      {isPexJbp && (
        <Card className="glass-card border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filtro por rede</CardTitle>
            <CardDescription>O filtro afeta os demais indicadores, o mapa, as exportações e a lista de registros. O comparativo DB × Baratão permanece visível com as duas redes.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {([
              { value: "all" as const, label: "Todas", count: allPerSub.length },
              { value: "DB" as const, label: "DB", count: networkCounts.DB },
              { value: "Baratão" as const, label: "Baratão", count: networkCounts.Baratão },
            ]).map(option => (
              <Button
                key={option.value}
                type="button"
                variant={pexNetwork === option.value ? "default" : "outline"}
                className="min-h-11"
                onClick={() => handlePexNetworkChange(option.value)}
              >
                {option.label} ({option.count})
              </Button>
            ))}
          </CardContent>
        </Card>
      )}
      {loading ? (
        <Card className="glass-card border-0"><CardContent className="py-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></CardContent></Card>
      ) : (
        <>
          {isPexJbp && (
            <Card className="glass-card border-0">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><GitCompareArrows className="h-5 w-5 text-primary" />Comparativo entre redes — DB × Baratão</CardTitle>
                <CardDescription>
                  Compara o resultado médio de todas as visitas de cada rede, ponto por ponto. Não vale 0%, Parcial vale 50% e Sim vale 100%.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
                    <p className="text-sm text-muted-foreground">Pontos em que DB lidera</p>
                    <p className="mt-1 text-2xl font-bold text-blue-700 dark:text-blue-400">{networkComparisonCounts.db}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/30">
                    <p className="text-sm text-muted-foreground">Pontos empatados</p>
                    <p className="mt-1 text-2xl font-bold text-slate-700 dark:text-slate-300">{networkComparisonCounts.tie}</p>
                  </div>
                  <div className="rounded-lg border border-violet-200 bg-violet-50 p-4 dark:border-violet-900 dark:bg-violet-950/30">
                    <p className="text-sm text-muted-foreground">Pontos em que Baratão lidera</p>
                    <p className="mt-1 text-2xl font-bold text-violet-700 dark:text-violet-400">{networkComparisonCounts.baratao}</p>
                  </div>
                </div>

                {networkComparisonRows.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    {networkComparisonReady
                      ? "As duas redes possuem visitas, mas ainda não há pontos avaliados em comum para comparar."
                      : "Para comparar as redes, precisamos de pelo menos uma visita identificada da DB e uma do Baratão neste filtro."}
                  </div>
                ) : (
                  <div className="max-h-[34rem] overflow-auto rounded-lg border">
                    <table className="w-full min-w-[760px] text-sm">
                      <thead className="sticky top-0 bg-muted/95 backdrop-blur">
                        <tr className="border-b text-left">
                          <th className="p-3 font-medium">Ponto avaliado</th>
                          <th className="p-3 font-medium">DB</th>
                          <th className="p-3 font-medium">Baratão</th>
                          <th className="p-3 font-medium">Comparação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {networkComparisonRows.map(row => (
                          <tr key={row.question} className="border-b last:border-0 align-top">
                            <td className="p-3"><span className="font-medium">{row.question}</span><span className="mt-1 block text-xs text-muted-foreground">{row.section}</span></td>
                            <td className="p-3"><span className="font-semibold">{row.dbPercent}%</span><span className="mt-1 block text-xs text-muted-foreground">{row.dbAnswers} resposta(s)</span></td>
                            <td className="p-3"><span className="font-semibold">{row.barataoPercent}%</span><span className="mt-1 block text-xs text-muted-foreground">{row.barataoAnswers} resposta(s)</span></td>
                            <td className="p-3">
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                row.leader === "db" ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" :
                                row.leader === "baratao" ? "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300" :
                                "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300"
                              }`}>{networkLeaderLabel[row.leader]}{row.difference > 0 ? ` por ${row.difference} p.p.` : ""}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {yesNoStats.length > 0 && (
            <div className="grid gap-3 md:grid-cols-2">
              <Card className="glass-card border-0"><CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" />Pontos fortes</CardTitle><CardDescription>Maior % de "Sim"</CardDescription></CardHeader>
                <CardContent className="space-y-2">{best.map(b => <Bar key={b.label} label={b.label} value={b.pct} total={100} tone="success" onClick={() => drill(`${b.label}: Sim`, b.yesIds)} />)}</CardContent></Card>
              <Card className="glass-card border-0"><CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" />Pontos de atenção</CardTitle><CardDescription>Menor % de "Sim" · clique para ver os "Não"</CardDescription></CardHeader>
                <CardContent className="space-y-2">{worst.map(b => <Bar key={b.label} label={b.label} value={b.pct} total={100} tone="destructive" onClick={() => drill(`${b.label}: Não`, b.noIds)} />)}</CardContent></Card>
            </div>
          )}

          {points.length > 0 && (
            <Card className="glass-card border-0">
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><MapIcon className="h-4 w-4 text-primary" />Mapa dos resultados</CardTitle>
                <CardDescription className="flex flex-wrap gap-3">
                  <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-success" />80% ou mais de Sim</span>
                  <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-[hsl(var(--warning))]" />50% a 79%</span>
                  <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-destructive" />Abaixo de 50%</span>
                </CardDescription></CardHeader>
              <CardContent><SubmissionsResultsMap points={points} /></CardContent>
            </Card>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            {clients.length > 0 && (
              <Card className="glass-card border-0"><CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Store className="h-4 w-4 text-destructive" />Clientes com mais pontos de atenção</CardTitle><CardDescription>Respostas "Não" somadas por Rede/Cliente</CardDescription></CardHeader>
                <CardContent className="space-y-1">
                  {clients.map(c => (
                    <button key={c.name} type="button" onClick={() => drill(`Rede/Cliente: ${c.name}`, c.ids)} className="w-full flex justify-between gap-2 text-sm rounded-md px-2 py-2 hover:bg-muted/50 min-h-11 text-left">
                      <span className="truncate">{c.name}</span>
                      <span className="shrink-0"><b className="text-destructive">{c.no} Não</b> <span className="text-muted-foreground">· {c.ids.length} visita(s){c.avg !== null ? ` · ${c.avg}% Sim` : ""}</span></span>
                    </button>
                  ))}
                </CardContent></Card>
            )}
            <Card className="glass-card border-0"><CardHeader className="pb-2"><CardTitle className="text-base">Registros por responsável selecionado</CardTitle><CardDescription>{submissionIds.length} no filtro</CardDescription></CardHeader>
              <CardContent className="space-y-2">{ranking.map(([n, ids]) => <Bar key={n} label={n} value={ids.length} total={submissionIds.length} onClick={() => drill(`Responsável: ${n}`, ids)} />)}</CardContent></Card>
          </div>

          {missing.length > 0 && (
            <div className="grid gap-3 md:grid-cols-2">
              {missing.map(m => (
                <Card key={m.s.q.id} className="glass-card border-0"><CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><PackageX className="h-4 w-4 text-destructive" />Itens mais ausentes</CardTitle><CardDescription>{m.s.q.label} · não marcados</CardDescription></CardHeader>
                  <CardContent className="space-y-2">{m.items.map((o: any) => <Bar key={o.value} label={o.label} value={o.missing} total={m.s.answered} tone="destructive" onClick={() => drill(`${m.s.q.label}: sem ${o.label}`, o.missIds)} />)}</CardContent></Card>
              ))}
            </div>
          )}

          {opportunities && (
            <div className="grid gap-3 md:grid-cols-2">
              <Card className="glass-card border-0">
                <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Lightbulb className="h-4 w-4 text-primary" />Ranking de oportunidades por RCA</CardTitle><CardDescription>RCAs acompanhados com mais oportunidades (inclui respostas "Não") · clique para ver os registros</CardDescription></CardHeader>
                <CardContent className="space-y-1">
                  {opportunities.rankingWho.map((r, i) => (
                    <button key={r.who} type="button" onClick={() => drill(`Oportunidades de ${r.who}`, r.ids)} className="w-full rounded-md px-2 py-2 hover:bg-muted/50 min-h-11 text-left">
                      <div className="flex justify-between gap-2 text-sm">
                        <span className="truncate"><span className="font-semibold text-muted-foreground mr-1">{i + 1}º</span>{r.who}</span>
                        <span className="shrink-0 font-semibold text-primary">{r.total} <span className="text-muted-foreground font-normal">em {r.ids.length} visita(s)</span></span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {r.items.map(([label, n]) => (
                          <span key={label} className="text-xs rounded-full bg-muted px-2 py-0.5">{label}{n > 1 ? ` (${n})` : ""}</span>
                        ))}
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>
              <Card className="glass-card border-0">
                <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Lightbulb className="h-4 w-4 text-primary" />Oportunidades mais citadas</CardTitle><CardDescription>Tipos de oportunidade registrados no período</CardDescription></CardHeader>
                <CardContent className="space-y-2">
                  {opportunities.top.map(o => <Bar key={o.label} label={o.label} value={o.count} total={submissionIds.length} onClick={() => drill(`Oportunidade: ${o.label}`, o.ids)} />)}
                </CardContent>
              </Card>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {stats.map(s => (
              <Card key={s.q.id} className="glass-card border-0">
                <CardHeader className="pb-2"><CardDescription className="text-xs uppercase">{s.q.section}</CardDescription><CardTitle className="text-base">{s.q.label}</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {s.kind === "num" ? (
                    <p className="text-3xl font-bold text-primary">{s.answered ? s.avg.toFixed(1) : "—"}<span className="text-sm font-normal text-muted-foreground"> média · {s.answered} resp.</span></p>
                  ) : (
                    <>
                      {[...s.opts].sort((a: any, b: any) => s.multi ? b.count - a.count : 0).map((o: any) => (
                        <Bar key={o.value} label={o.label} value={o.count} total={s.answered} onClick={o.count ? () => drill(`${s.q.label}: ${o.label}`, o.ids) : undefined}
                          tone={o.value === "sim" ? "success" : o.value === "nao" ? "destructive" : "primary"} />
                      ))}
                      <p className="text-xs text-muted-foreground">{s.answered} resposta(s){s.multi ? " · % de registros que marcaram" : ""}</p>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
