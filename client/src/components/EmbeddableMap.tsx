import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface EmbeddableMapProps {
  width?: string;
  height?: string;
  center?: [number, number];
  zoom?: number;
  showCompanies?: boolean;
  showDisposalSites?: boolean;
  tier?: string;
  state?: string;
}

export default function EmbeddableMap({
  width = "100%",
  height = "500px",
  center = [39.8283, -98.5795],
  zoom = 4,
  showCompanies = true,
  showDisposalSites = true,
  tier,
  state,
}: EmbeddableMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const { data: companiesData, isLoading: loadingCompanies } = useQuery<{
    success: boolean;
    count: number;
    data: any[];
  }>({
    queryKey: ["/api/public/v1/companies", tier, state],
    enabled: showCompanies,
  });

  const { data: disposalData, isLoading: loadingDisposal } = useQuery<{
    success: boolean;
    count: number;
    data: any[];
  }>({
    queryKey: ["/api/public/v1/disposal-sites", state],
    enabled: showDisposalSites,
  });

  const companies = companiesData?.data || [];
  const disposalSites = disposalData?.data || [];

  useEffect(() => {
    if (!mapRef.current) return;
    
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    setTimeout(() => {
      if (!mapRef.current) return;

      try {
        const map = L.map(mapRef.current).setView(center, zoom);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(map);

        mapInstanceRef.current = map;
      } catch (error) {
        console.error("Error initializing map:", error);
      }
    }, 100);

    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {
          console.error("Error removing map:", e);
        }
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    if (showCompanies && companies.length > 0) {
      companies.forEach((company: any) => {
        if (!company.location.lat || !company.location.lng) return;

        const icon = L.divIcon({
          html: `<div class="w-8 h-8 rounded-full flex items-center justify-center ${
            company.tier === "featured"
              ? "bg-yellow-500 border-2 border-yellow-600"
              : company.tier === "verified"
              ? "bg-blue-500 border-2 border-blue-600"
              : "bg-gray-500 border-2 border-gray-600"
          } text-white shadow-lg"><svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"></path></svg></div>`,
          className: "",
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        });

        const marker = L.marker([company.location.lat, company.location.lng], { icon })
          .bindPopup(`
            <div class="min-w-[200px]">
              <h3 class="font-semibold text-base mb-2">${company.name}</h3>
              ${company.tier !== "free" ? `<span class="inline-block px-2 py-1 text-xs bg-blue-600 text-white rounded mb-2">${company.tier}</span>` : ""}
              ${company.address ? `<p class="text-sm text-gray-600 mb-1">${company.address}</p>` : ""}
              ${company.phone ? `<p class="text-sm mb-1"><a href="tel:${company.phone}" class="hover:underline">${company.phone}</a></p>` : ""}
              ${company.website ? `<p class="text-sm"><a href="${company.website.startsWith('http') ? company.website : 'https://' + company.website}" target="_blank" rel="noopener noreferrer" class="hover:underline text-blue-600">Visit Website</a></p>` : ""}
            </div>
          `)
          .addTo(mapInstanceRef.current);

        markersRef.current.push(marker);
      });
    }

    if (showDisposalSites && disposalSites.length > 0) {
      disposalSites.forEach((site: any) => {
        if (!site.location.lat || !site.location.lng) return;

        const icon = L.divIcon({
          html: `<div class="w-8 h-8 rounded-full flex items-center justify-center bg-green-600 border-2 border-green-700 text-white shadow-lg"><svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"></path></svg></div>`,
          className: "",
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        });

        const marker = L.marker([site.location.lat, site.location.lng], { icon })
          .bindPopup(`
            <div class="min-w-[200px]">
              <h3 class="font-semibold text-base mb-2">${site.name}</h3>
              <span class="inline-block px-2 py-1 text-xs bg-green-600 text-white rounded mb-2">Disposal Site</span>
              ${site.address ? `<p class="text-sm text-gray-600 mb-1">${site.address}</p>` : ""}
              ${site.phone ? `<p class="text-sm mb-1"><a href="tel:${site.phone}" class="hover:underline">${site.phone}</a></p>` : ""}
              ${site.hours ? `<p class="text-sm text-gray-600 mb-1"><strong>Hours:</strong> ${site.hours}</p>` : ""}
              ${site.materialsAccepted && site.materialsAccepted.length > 0 ? `<p class="text-sm text-gray-600"><strong>Accepts:</strong> ${site.materialsAccepted.join(", ")}</p>` : ""}
            </div>
          `)
          .addTo(mapInstanceRef.current);

        markersRef.current.push(marker);
      });
    }
  }, [companies, disposalSites, showCompanies, showDisposalSites]);

  return (
    <div className="relative" style={{ width, height }}>
      {(loadingCompanies || loadingDisposal) && (
        <div className="absolute inset-0 bg-background/80 z-10 flex items-center justify-center">
          <div className="text-center">
            <Skeleton className="w-12 h-12 rounded-full mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading map data...</p>
          </div>
        </div>
      )}
      <div 
        ref={mapRef}
        style={{ width: "100%", height: "100%" }} 
        data-testid="embeddable-map-container"
        className="rounded-md overflow-hidden"
      />
    </div>
  );
}
