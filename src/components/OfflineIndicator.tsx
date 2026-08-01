import { useOfflineSync } from "@/hooks/useOfflineSync";
import { Wifi, WifiOff, RefreshCw, Cloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function OfflineIndicator() {
  const { isOnline, pendingCount, isSyncing, syncPendingOperations, lastSyncTime } = useOfflineSync();

  if (isOnline && pendingCount === 0) {
    return null; // Don't show anything when online and synced
  }

  return (
    <div
      className={cn(
        "fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-full px-4 py-2 shadow-lg transition-all",
        isOnline
          ? "bg-amber-100 text-amber-800 border border-amber-200"
          : "bg-red-100 text-red-800 border border-red-200"
      )}
    >
      {isOnline ? (
        <>
          <Cloud className="h-4 w-4" />
          <span className="text-sm font-medium">
            {pendingCount} pendente{pendingCount !== 1 ? "s" : ""}
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={syncPendingOperations}
                  disabled={isSyncing}
                >
                  <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Sincronizar agora</p>
                {lastSyncTime && (
                  <p className="text-xs text-muted-foreground">
                    Última sync: {lastSyncTime.toLocaleTimeString("pt-BR")}
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4" />
          <span className="text-sm font-medium">Modo Offline</span>
          {pendingCount > 0 && (
            <span className="text-xs">
              ({pendingCount} pendente{pendingCount !== 1 ? "s" : ""})
            </span>
          )}
        </>
      )}
    </div>
  );
}

export function OnlineStatusBadge() {
  const { isOnline } = useOfflineSync();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium",
              isOnline
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            )}
          >
            {isOnline ? (
              <>
                <Wifi className="h-3 w-3" />
                <span className="hidden sm:inline">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3" />
                <span className="hidden sm:inline">Offline</span>
              </>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isOnline ? "Conectado à internet" : "Sem conexão - dados serão salvos localmente"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
