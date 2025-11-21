import EmbeddableMap from "@/components/EmbeddableMap";
import { useLocation } from "wouter";

export default function Widget() {
  const [location] = useLocation();
  const params = new URLSearchParams(location.split('?')[1] || '');
  
  const center: [number, number] = [
    parseFloat(params.get('lat') || '39.8283'),
    parseFloat(params.get('lng') || '-98.5795')
  ];
  const zoom = parseInt(params.get('zoom') || '4', 10);
  const showCompanies = params.get('companies') !== 'false';
  const showDisposalSites = params.get('disposal') !== 'false';
  const tier = params.get('tier') || undefined;
  const state = params.get('state') || undefined;

  return (
    <div className="w-screen h-screen">
      <EmbeddableMap
        width="100%"
        height="100%"
        center={center}
        zoom={zoom}
        showCompanies={showCompanies}
        showDisposalSites={showDisposalSites}
        tier={tier}
        state={state}
      />
    </div>
  );
}
