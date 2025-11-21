import { useEffect, useRef, useState } from "react";
import type { Company, DisposalSite } from "@shared/schema";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface CompanyMapProps {
  companies?: Company[];
  disposalSites?: DisposalSite[];
  userLocation?: { lat: number; lng: number } | null;
  selectedType?: "all" | "companies" | "disposal";
  className?: string;
  onMarkerClick?: (type: "company" | "disposal", item: Company | DisposalSite) => void;
}

// Updated: SVG renderer fix for marker visibility v2024-11-17
export default function CompanyMap({
  companies = [],
  disposalSites = [],
  userLocation = null,
  selectedType = "all",
  className = "h-[500px] w-full rounded-lg overflow-hidden shadow-md",
  onMarkerClick,
}: CompanyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  const [isMapActive, setIsMapActive] = useState(false);

  // Initialize map
  useEffect(() => {
    console.log('[CompanyMap] Initializing map...', { 
      mapRefExists: !!mapRef.current, 
      mapInstanceExists: !!mapInstanceRef.current 
    });
    if (!mapRef.current || mapInstanceRef.current) return;

    console.log('[CompanyMap] Creating map with SVG renderer (divIcon compatible)');
    
    const map = L.map(mapRef.current, {
      scrollWheelZoom: false,
      dragging: true,
      touchZoom: true,
      doubleClickZoom: true,
      boxZoom: true,
      keyboard: true,
      zoomControl: true
    }).setView([39.8283, -98.5795], 4);
    
    console.log('[CompanyMap] Map created with SVG renderer');

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Handle map click to enable scroll zoom
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const handleMapClick = () => {
      if (!isMapActive && mapInstanceRef.current) {
        mapInstanceRef.current.scrollWheelZoom.enable();
        setIsMapActive(true);
      }
    };

    const handleMapBlur = (e: any) => {
      // Re-disable scroll zoom when mouse leaves the map
      if (isMapActive && mapInstanceRef.current && !mapRef.current?.contains(e.relatedTarget)) {
        mapInstanceRef.current.scrollWheelZoom.disable();
        setIsMapActive(false);
      }
    };

    mapInstanceRef.current.on("click", handleMapClick);
    
    if (mapRef.current) {
      mapRef.current.addEventListener("mouseleave", handleMapBlur);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.off("click", handleMapClick);
      }
      if (mapRef.current) {
        mapRef.current.removeEventListener("mouseleave", handleMapBlur);
      }
    };
  }, [isMapActive]);

  // Add/update user location marker
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Remove existing user marker
    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }

    // Add user location marker if provided
    if (userLocation) {
      const icon = L.divIcon({
        html: `<div class="hydrovac-marker hydrovac-marker--user">
          <svg fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"></path>
          </svg>
        </div>`,
        className: "",
        iconSize: [40, 40],
        iconAnchor: [20, 40],
      });

      const marker = L.marker([userLocation.lat, userLocation.lng], { icon })
        .addTo(mapInstanceRef.current)
        .bindTooltip("Your Search Location", {
          permanent: false,
          direction: "top",
          className: "leaflet-custom-tooltip",
        });

      userMarkerRef.current = marker;
    }
  }, [userLocation]);

  // Add markers to map
  useEffect(() => {
    console.log('[CompanyMap] Adding markers...', { 
      mapExists: !!mapInstanceRef.current,
      companiesCount: companies?.length || 0,
      disposalSitesCount: disposalSites?.length || 0,
      selectedType 
    });
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const allMarkers: any[] = [];

    // Add company markers
    if (companies && (selectedType === "all" || selectedType === "companies")) {
      console.log('[CompanyMap] Rendering company markers...', { count: companies.length, selectedType });
      companies.forEach((company, idx) => {
        // Add primary location marker
        if (company.lat && company.lng) {
          const bgColor = company.tier === "premium" ? "#a855f7"
            : company.tier === "featured" ? "#eab308"
            : company.tier === "verified" ? "#3b82f6"
            : "#6b7280";
          
          const borderColor = company.tier === "premium" ? "#9333ea"
            : company.tier === "featured" ? "#ca8a04"
            : company.tier === "verified" ? "#2563eb"
            : "#4b5563";
          
          if (idx < 3) {
            console.log('[CompanyMap] Creating company marker:', { 
              name: company.name, 
              tier: company.tier, 
              bgColor,
              lat: company.lat,
              lng: company.lng
            });
          }
          
          const marker = L.circleMarker([parseFloat(company.lat), parseFloat(company.lng)], {
            radius: 10,
            fillColor: bgColor,
            color: borderColor,
            weight: 2,
            fillOpacity: 1
          })
            .addTo(mapInstanceRef.current)
            .bindTooltip(company.name, {
              permanent: false,
              direction: "top",
              className: "leaflet-custom-tooltip",
            })
            .bindPopup(`
              <div class="p-2" data-testid="map-popup-company-${company.id}">
                <h3 class="font-semibold text-base mb-1">${company.name}</h3>
                ${
                  company.tier === "premium"
                    ? '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 mb-2">👑 Premium</span>'
                    : company.tier === "featured"
                    ? '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 mb-2">⭐ Featured</span>'
                    : company.tier === "verified"
                    ? '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mb-2">✓ Verified</span>'
                    : ""
                }
                <p class="text-sm text-gray-600 mb-2">${company.address || ""}</p>
                ${company.phone ? `<p class="text-sm"><strong>Phone:</strong> ${company.phone}</p>` : ""}
                ${company.website ? `<p class="text-sm"><a href="${company.website}" target="_blank" class="text-blue-600 hover:underline">Visit Website</a></p>` : ""}
              </div>
            `, { maxWidth: 300 });

          if (onMarkerClick) {
            marker.on("click", () => onMarkerClick("company", company));
          }

          allMarkers.push(marker);
        }

        // Add additional location markers (slightly smaller, semi-transparent)
        if (company.additionalLocations && Array.isArray(company.additionalLocations)) {
          company.additionalLocations.forEach((location: any, index: number) => {
            if (location.lat && location.lng) {
              const bgColor = company.tier === "premium" ? "#c084fc"
                : company.tier === "featured" ? "#fbbf24"
                : company.tier === "verified" ? "#60a5fa"
                : "#9ca3af";
              
              const borderColor = company.tier === "premium" ? "#a855f7"
                : company.tier === "featured" ? "#eab308"
                : company.tier === "verified" ? "#3b82f6"
                : "#6b7280";
              
              const additionalMarker = L.circleMarker([parseFloat(location.lat), parseFloat(location.lng)], {
                radius: 7,
                fillColor: bgColor,
                color: borderColor,
                weight: 1,
                fillOpacity: 0.8
              })
                .addTo(mapInstanceRef.current)
                .bindTooltip(`${company.name} - ${location.city}`, {
                  permanent: false,
                  direction: "top",
                  className: "leaflet-custom-tooltip",
                })
                .bindPopup(`
                  <div class="p-2" data-testid="map-popup-company-location-${company.id}-${index}">
                    <h3 class="font-semibold text-base mb-1">${company.name}</h3>
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 mb-2">📍 Additional Office</span>
                    <p class="text-sm text-gray-600 mb-1"><strong>Location:</strong> ${location.city}</p>
                    ${location.address ? `<p class="text-sm text-gray-600 mb-2">${location.address}</p>` : ""}
                    ${company.phone ? `<p class="text-sm"><strong>Phone:</strong> ${company.phone}</p>` : ""}
                    ${company.website ? `<p class="text-sm"><a href="${company.website}" target="_blank" class="text-blue-600 hover:underline">Visit Website</a></p>` : ""}
                  </div>
                `);

              if (onMarkerClick) {
                additionalMarker.on("click", () => onMarkerClick("company", company));
              }

              allMarkers.push(additionalMarker);
            }
          });
        }
      });
    }

    // Add disposal site markers
    if (disposalSites && (selectedType === "all" || selectedType === "disposal")) {
      disposalSites.forEach((site) => {
        // Add primary location marker
        if (site.lat && site.lng) {
          const marker = L.circleMarker([parseFloat(site.lat), parseFloat(site.lng)], {
            radius: 10,
            fillColor: "#22c55e",
            color: "#16a34a",
            weight: 2,
            fillOpacity: 1
          })
            .addTo(mapInstanceRef.current)
            .bindTooltip(site.name, {
              permanent: false,
              direction: "top",
              className: "leaflet-custom-tooltip",
            })
            .bindPopup(`
              <div class="p-2" data-testid="map-popup-disposal-${site.id}">
                <h3 class="font-semibold text-base mb-1">${site.name}</h3>
                <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 mb-2">Disposal Site</span>
                <p class="text-sm text-gray-600 mb-2">${site.address || ""}</p>
                ${site.materialsAccepted ? `<p class="text-sm"><strong>Materials:</strong> ${site.materialsAccepted}</p>` : ""}
                ${site.phone ? `<p class="text-sm"><strong>Phone:</strong> ${site.phone}</p>` : ""}
              </div>
            `, { maxWidth: 300 });

          if (onMarkerClick) {
            marker.on("click", () => onMarkerClick("disposal", site));
          }

          allMarkers.push(marker);
        }

        // Add additional location markers (slightly smaller, semi-transparent)
        if (site.additionalLocations && Array.isArray(site.additionalLocations)) {
          site.additionalLocations.forEach((location: any, index: number) => {
            if (location.lat && location.lng) {
              const additionalMarker = L.circleMarker([parseFloat(location.lat), parseFloat(location.lng)], {
                radius: 7,
                fillColor: "#22c55e",
                color: "#16a34a",
                weight: 1,
                fillOpacity: 0.8
              })
                .addTo(mapInstanceRef.current)
                .bindTooltip(`${site.name} - ${location.city}`, {
                  permanent: false,
                  direction: "top",
                  className: "leaflet-custom-tooltip",
                })
                .bindPopup(`
                  <div class="p-2" data-testid="map-popup-disposal-location-${site.id}-${index}">
                    <h3 class="font-semibold text-base mb-1">${site.name}</h3>
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 mb-2">📍 Additional Facility</span>
                    <p class="text-sm text-gray-600 mb-1"><strong>Location:</strong> ${location.city}</p>
                    ${location.address ? `<p class="text-sm text-gray-600 mb-2">${location.address}</p>` : ""}
                    ${site.materialsAccepted ? `<p class="text-sm"><strong>Materials:</strong> ${site.materialsAccepted}</p>` : ""}
                    ${site.phone ? `<p class="text-sm"><strong>Phone:</strong> ${site.phone}</p>` : ""}
                  </div>
                `);

              if (onMarkerClick) {
                additionalMarker.on("click", () => onMarkerClick("disposal", site));
              }

              allMarkers.push(additionalMarker);
            }
          });
        }
      });
    }

    markersRef.current = allMarkers;
    
    console.log('[CompanyMap] Markers added successfully', { 
      totalMarkers: allMarkers.length 
    });

    // Fit bounds to show all markers (including user location)
    if (allMarkers.length > 0 || userMarkerRef.current) {
      const boundsMarkers = [...allMarkers];
      if (userMarkerRef.current) {
        boundsMarkers.push(userMarkerRef.current);
      }

      if (boundsMarkers.length > 0) {
        const group = L.featureGroup(boundsMarkers);
        mapInstanceRef.current.fitBounds(group.getBounds().pad(0.1));
      }
    }
  }, [companies, disposalSites, selectedType]);

  return (
    <div className={`relative ${className}`}>
      <div ref={mapRef} className="w-full h-full" data-testid="company-map" />
      
      {!isMapActive && (
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none z-[400]"
          data-testid="map-overlay"
        >
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md border border-border">
            <p className="text-xs font-medium text-foreground whitespace-nowrap">Click map to enable zoom</p>
          </div>
        </div>
      )}
    </div>
  );
}
