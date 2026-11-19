export const RESTRICTED_MERCHAN_EMAIL = "merchan@distribuidoralopes.com";
export const FOTOS_AJINOMOTO_SLUG = "fotos-ajinomoto";

const normalizeEmail = (email: string | null | undefined) =>
  String(email || "").trim().toLocaleLowerCase("pt-BR");

export const isRestrictedMerchanUser = (email: string | null | undefined) =>
  normalizeEmail(email) === RESTRICTED_MERCHAN_EMAIL;

export const isRestrictedMerchanPath = (pathname: string) => {
  const cleanPath = pathname.replace(/\/+$/, "") || "/";
  return cleanPath === "/"
    || cleanPath === `/form/${FOTOS_AJINOMOTO_SLUG}`
    || cleanPath === `/form/${FOTOS_AJINOMOTO_SLUG}/resultados`
    || cleanPath.startsWith(`/form/${FOTOS_AJINOMOTO_SLUG}/foto/`);
};
