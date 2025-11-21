import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "leaflet/dist/leaflet.css";

createRoot(document.getElementById("root")!).render(<App />);

// FORCE UNREGISTER ALL SERVICE WORKERS AND CLEAR CACHES
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach(reg => {
      reg.unregister();
      console.log('[CLEANUP] Unregistered service worker:', reg.scope);
    });
  });
}

if ('caches' in window) {
  caches.keys().then((names) => {
    names.forEach(name => {
      caches.delete(name);
      console.log('[CLEANUP] Deleted cache:', name);
    });
  });
}
