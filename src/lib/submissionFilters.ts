export interface SubmissionFilterRecord {
  visit_date: string;
  created_by: string | null;
  address: string | null;
  metadata: Record<string, unknown>;
}

export function matchesSubmissionFilters(
  record: SubmissionFilterRecord,
  filters: { years: string[]; months: string[]; collaborators: string[]; start: string; end: string; search: string },
  collaboratorName = "",
  collaboratorKey = record.created_by || "unknown",
) {
  const date = record.visit_date;
  if (filters.months.length && !filters.months.includes(date.slice(0, 7))) return false;
  if (!filters.months.length && filters.years.length && !filters.years.includes(date.slice(0, 4))) return false;
  if (filters.start && date < filters.start) return false;
  if (filters.end && date > filters.end) return false;
  if (filters.collaborators.length && !filters.collaborators.includes(collaboratorKey)) return false;
  const search = filters.search.trim().toLocaleLowerCase("pt-BR");
  return !search || [record.address, collaboratorName, ...Object.values(record.metadata)].some(
    value => String(value ?? "").toLocaleLowerCase("pt-BR").includes(search),
  );
}
