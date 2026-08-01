import { MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { normalizeManagerName, TeamMember } from "@/lib/normalizeManager";
import { formatDateOnlyPtBR } from "@/lib/utils";

interface VisitData {
  id: string;
  visit_date: string;
  manager: string;
  rca_accompanied: string;
  client_code: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface VisitsListProps {
  visits: VisitData[];
  selectedVisit: VisitData | null;
  onVisitClick: (visit: VisitData) => void;
  teamMembers?: TeamMember[];
}

export const VisitsList = ({ visits, selectedVisit, onVisitClick, teamMembers = [] }: VisitsListProps) => {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Visitas Registradas ({visits.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {visits.map((visit) => (
              <div
                key={visit.id}
                onClick={() => onVisitClick(visit)}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedVisit?.id === visit.id
                    ? "bg-primary/10 border-primary shadow-md scale-[1.02]"
                    : "hover:bg-muted/50 hover:border-border"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium">Cliente: {visit.client_code}</p>
                    <p className="text-sm text-muted-foreground">
                      Gestor: {normalizeManagerName(visit.manager, teamMembers)}
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatDateOnlyPtBR(visit.visit_date)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Vendedor: {visit.rca_accompanied}
                </p>
                {visit.address && (
                  <p className="text-sm text-muted-foreground flex items-start gap-1 mt-1">
                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    {visit.address}
                  </p>
                )}
              </div>
            ))}
            {visits.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma visita encontrada com os filtros aplicados
              </p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
