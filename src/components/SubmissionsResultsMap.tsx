import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { scoreTone } from "@/lib/submissionScore";

export interface MapPoint { id: string; lat: number; lng: number; score: number | null; title: string; subtitle: string }

const cssColor = (name: string) => `hsl(${getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim()})`;

export function SubmissionsResultsMap({ points, onSelect }: { points: MapPoint[]; onSelect?: (id: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!ref.current || map.current) return;
    map.current = L.map(ref.current).setView([-3.1, -60.0], 6);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap" }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    return () => { map.current?.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    if (!map.current || !layer.current) return;
    layer.current.clearLayers();
    points.forEach(p => {
      const c = cssColor(scoreTone(p.score) === "muted" ? "muted-foreground" : scoreTone(p.score));
      L.circleMarker([p.lat, p.lng], { radius: 9, color: c, fillColor: c, fillOpacity: 0.8, weight: 2 })
        .bindPopup(`<b>${p.title}</b><br/>${p.subtitle}<br/>Resultado: ${p.score === null ? "—" : p.score + "% Sim"}`)
        .on("click", () => onSelect?.(p.id)).addTo(layer.current!);
    });
    if (points.length) map.current.fitBounds(L.latLngBounds(points.map(p => [p.lat, p.lng])), { padding: [30, 30], maxZoom: 13 });
  }, [points, onSelect]);

  return <div ref={ref} className="h-80 w-full rounded-lg overflow-hidden z-0" />;
}
