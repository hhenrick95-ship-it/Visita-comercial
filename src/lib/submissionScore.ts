/** % de respostas "Sim" entre as perguntas Sim/Não de um registro (null se nenhuma). */
export function yesScore(answers: { value: unknown; yesNo: boolean }[]): number | null {
  const yn = answers.filter(a => a.yesNo && ["sim", "nao", "não"].includes(String(a.value ?? "").trim().toLowerCase()));
  if (!yn.length) return null;
  const yes = yn.filter(a => String(a.value).trim().toLowerCase() === "sim").length;
  return Math.round((yes / yn.length) * 100);
}

/** Faixa de cor do resultado: verde >= 80, amarelo >= 50, vermelho abaixo. */
export function scoreTone(score: number | null): "success" | "warning" | "destructive" | "muted" {
  if (score === null) return "muted";
  if (score >= 80) return "success";
  if (score >= 50) return "warning";
  return "destructive";
}
