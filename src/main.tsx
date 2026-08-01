import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// ============================================================
// BLINDAGEM ANTI-PWA: Limpeza definitiva de Service Workers
// e caches legados para evitar regressão de versão.
// ============================================================
const APP_VERSION = "2026-04-27-v4";

// Detecta upgrade entre versões e força reload limpo no mobile.
try {
  const stored = localStorage.getItem("app_version");
  if (stored && stored !== APP_VERSION) {
    console.info(`[App] Versão atualizada: ${stored} -> ${APP_VERSION}. Forçando reload.`);
    localStorage.setItem("app_version", APP_VERSION);
    // Pequeno timeout para garantir que o setItem persistiu antes de recarregar.
    setTimeout(() => window.location.reload(), 50);
  } else {
    localStorage.setItem("app_version", APP_VERSION);
  }
} catch {
  // ignore (storage indisponível)
}

if ("serviceWorker" in navigator) {
  // 1. Desregistrar TODOS os SWs existentes
  navigator.serviceWorker
    .getRegistrations()
    .then((regs) => {
      regs.forEach((r) => r.unregister());
      if (regs.length > 0) {
        console.info(`[SW-cleanup] ${regs.length} SW(s) desregistrado(s)`);
      }
    })
    .catch(() => {});

  // 2. Limpar TODOS os caches (resiliente)
  caches
    .keys()
    .then((keys) => Promise.allSettled(keys.map((k) => caches.delete(k))))
    .then((results) => {
      const deleted = results.filter((r) => r.status === "fulfilled").length;
      if (deleted > 0) {
        console.info(`[SW-cleanup] ${deleted} cache(s) removido(s)`);
      }
    })
    .catch(() => {});

  // 3. Ouvir mensagem do SW killer para recarregar
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type === "SW_KILLED") {
      window.location.reload();
    }
  });
}

// Limpa flags antigas de versionamento legadas (PWA / cache buster antigo)
try {
  const legacyKeys = ["__pwa_version", "pwa_app_version", "sw_version"];
  legacyKeys.forEach((k) => localStorage.removeItem(k));
} catch {
  // ignore
}

// Detecta execução em modo "standalone" herdado de PWA antiga (Android: app instalado).
// Aviso visual leve para o usuário trocar para o navegador.
try {
  const isStandalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS legacy
    (navigator as any).standalone === true;
  if (isStandalone) {
    console.warn(
      "[App] Detectado modo standalone (app instalado antigo). Recomende abrir pelo navegador."
    );
  }
} catch {
  // ignore
}

console.info(`[App] Versão carregada: ${APP_VERSION}`);

createRoot(document.getElementById("root")!).render(<App />);
