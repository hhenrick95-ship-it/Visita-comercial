import { useEffect, useRef, useMemo, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { normalizeManagerName, TeamMember } from "@/lib/normalizeManager";
import { formatDateOnlyPtBR } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";

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

interface VisitMapProps {
  visits: VisitData[];
  selectedVisit: VisitData | null;
  onVisitClick: (visit: VisitData) => void;
  teamMembers?: TeamMember[];
}

// Cores disponíveis para marcadores (vermelho reservado para selecionado)
const MARKER_COLORS = [
  'blue', 'green', 'gold', 'orange', 'violet', 'grey', 'black', 'yellow'
];

// Mapa de cores para hex (para a legenda)
const COLOR_HEX_MAP: Record<string, string> = {
  blue: '#2A81CB',
  green: '#2AAD27',
  gold: '#FFD326',
  orange: '#CB8427',
  violet: '#9C2BCB',
  grey: '#7B7B7B',
  black: '#3D3D3D',
  yellow: '#CAC428',
  red: '#CB2B3E',
};

// Fix para o ícone padrão do Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Função para criar ícone colorido
const getColoredIcon = (color: string) => L.icon({
  iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Ícone vermelho para marcador selecionado
const highlightedIcon = getColoredIcon('red');

export const VisitMap = ({ visits, selectedVisit, onVisitClick, teamMembers = [] }: VisitMapProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const mapContainerRef = useRef<HTMLDivElement>(null);
  
  // Estado para gestores visíveis (todos visíveis por padrão)
  const [hiddenManagers, setHiddenManagers] = useState<Set<string>>(new Set());

  // Mapear gestores para cores (deduplicado por nome normalizado)
  const managerColorMap = useMemo(() => {
    const colorMap = new Map<string, string>();
    visits.forEach(v => {
      const normalized = normalizeManagerName(v.manager, teamMembers);
      if (normalized && !colorMap.has(normalized)) {
        colorMap.set(normalized, MARKER_COLORS[colorMap.size % MARKER_COLORS.length]);
      }
    });
    return colorMap;
  }, [visits, teamMembers]);

  // Toggle visibilidade do gestor
  const toggleManagerVisibility = (manager: string) => {
    setHiddenManagers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(manager)) {
        newSet.delete(manager);
      } else {
        newSet.add(manager);
      }
      return newSet;
    });
  };

  // Inicializar mapa
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current).setView([-23.5505, -46.6333], 12);
    
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Atualizar marcadores quando as visitas ou filtros mudarem
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    const validVisits = visits.filter((v) => v.latitude && v.longitude);

    // Remover marcadores antigos
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    // Filtrar visitas por gestores visíveis
    const visibleVisits = validVisits.filter(v => !hiddenManagers.has(normalizeManagerName(v.manager, teamMembers)));

    if (visibleVisits.length === 0) {
      map.setView([-23.5505, -46.6333], 12);
      return;
    }

    // Adicionar novos marcadores apenas para gestores visíveis
    visibleVisits.forEach((visit) => {
      const color = managerColorMap.get(normalizeManagerName(visit.manager, teamMembers)) || 'blue';
      const marker = L.marker([visit.latitude!, visit.longitude!], {
        icon: getColoredIcon(color),
      })
        .bindPopup(
          `<div style="min-width: 200px;">
            <strong>Cliente:</strong> ${visit.client_code}<br/>
            <strong>Gestor:</strong> ${normalizeManagerName(visit.manager, teamMembers)}<br/>
            <strong>Vendedor:</strong> ${visit.rca_accompanied}<br/>
            <strong>Data:</strong> ${formatDateOnlyPtBR(visit.visit_date)}<br/>
            ${visit.address ? `<strong>Endereço:</strong> ${visit.address}` : ""}
          </div>`
        )
        .on("click", () => onVisitClick(visit))
        .addTo(map);

      markersRef.current.set(visit.id, marker);
    });

    // Ajustar bounds para mostrar todos os marcadores visíveis
    const bounds = L.latLngBounds(visibleVisits.map((v) => [v.latitude!, v.longitude!]));
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [visits, onVisitClick, managerColorMap, teamMembers, hiddenManagers]);

  // Destacar marcador selecionado
  useEffect(() => {
    markersRef.current.forEach((marker, id) => {
      const visit = visits.find(v => v.id === id);
      const color = visit ? managerColorMap.get(normalizeManagerName(visit.manager, teamMembers)) || 'blue' : 'blue';
      
      if (id === selectedVisit?.id) {
        marker.setIcon(highlightedIcon);
        marker.openPopup();
        mapRef.current?.panTo(marker.getLatLng(), { animate: true });
      } else {
        marker.setIcon(getColoredIcon(color));
        marker.closePopup();
      }
    });
  }, [selectedVisit, visits, managerColorMap]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full rounded-lg" />
      
      {/* Legenda de cores por gestor com filtro */}
      {managerColorMap.size > 0 && (
        <div className="absolute top-4 left-4 z-[1000] bg-white/95 dark:bg-gray-800/95 rounded-lg shadow-lg p-3 max-h-[300px] overflow-y-auto border border-border">
          <h4 className="font-semibold text-sm mb-2 text-foreground">Gestores</h4>
          <div className="space-y-1">
            {Array.from(managerColorMap.entries()).map(([manager, color]) => {
              const visitCount = visits.filter(v => normalizeManagerName(v.manager, teamMembers) === manager && v.latitude && v.longitude).length;
              const isHidden = hiddenManagers.has(manager);
              
              return (
                <div 
                  key={manager} 
                  className={`flex items-center gap-2 text-xs py-1.5 px-1 rounded cursor-pointer transition-all hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    isHidden ? 'opacity-50' : ''
                  }`}
                  onClick={() => toggleManagerVisibility(manager)}
                  title={isHidden ? 'Clique para mostrar' : 'Clique para ocultar'}
                >
                  <div 
                    className={`w-4 h-4 rounded-full flex-shrink-0 border border-gray-300 transition-all ${
                      isHidden ? 'opacity-40' : ''
                    }`}
                    style={{ backgroundColor: COLOR_HEX_MAP[color] || '#2A81CB' }} 
                  />
                  <span className={`text-foreground truncate max-w-[100px] ${isHidden ? 'line-through' : ''}`}>
                    {normalizeManagerName(manager, teamMembers)}
                  </span>
                  <span className="text-muted-foreground font-medium">
                    ({visitCount})
                  </span>
                  <span className="ml-auto">
                    {isHidden ? (
                      <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                    ) : (
                      <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
