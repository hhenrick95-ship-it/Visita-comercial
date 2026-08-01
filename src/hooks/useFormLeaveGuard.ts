import { useEffect, useState, useCallback } from "react";

interface UseFormLeaveGuardOptions {
  isDirty: boolean;
  message?: string;
}

export function useFormLeaveGuard({
  isDirty,
  message = "Você tem alterações não salvas. Tem certeza que deseja sair?"
}: UseFormLeaveGuardOptions) {
  const [showDialog, setShowDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

  // Handle browser close/reload with native dialog
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty, message]);

  // Function to check before navigating
  const checkBeforeNavigate = useCallback((navigateFn: () => void) => {
    if (isDirty) {
      setPendingNavigation(() => navigateFn);
      setShowDialog(true);
      return false;
    }
    navigateFn();
    return true;
  }, [isDirty]);

  const confirmNavigation = useCallback(() => {
    if (pendingNavigation) {
      pendingNavigation();
    }
    setPendingNavigation(null);
    setShowDialog(false);
  }, [pendingNavigation]);

  const cancelNavigation = useCallback(() => {
    setPendingNavigation(null);
    setShowDialog(false);
  }, []);

  return {
    showDialog,
    confirmNavigation,
    cancelNavigation,
    checkBeforeNavigate,
    message,
  };
}
