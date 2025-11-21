import { apiRequest } from "./queryClient";

// Generate a session ID for deduplication (stored in sessionStorage)
const getSessionId = (): string => {
  const key = "hvf_session_id";
  let sessionId = sessionStorage.getItem(key);
  
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem(key, sessionId);
  }
  
  return sessionId;
};

// Track an analytics event (using sendBeacon for reliability during navigation)
export const trackAnalytics = (
  companyId: number,
  eventType: "view" | "click" | "phone_click" | "email_click" | "website_click",
  source: "map" | "search_results" | "company_card" | "state_landing" | "map_popup"
): void => {
  try {
    const data = JSON.stringify({
      companyId,
      eventType,
      source,
      sessionId: getSessionId(),
    });

    // Use sendBeacon if available (won't be cancelled by navigation)
    if (navigator.sendBeacon) {
      const blob = new Blob([data], { type: 'application/json' });
      navigator.sendBeacon("/api/analytics/track", blob);
    } else {
      // Fallback to regular fetch for older browsers
      fetch("/api/analytics/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: data,
        keepalive: true, // Keep request alive during navigation
      }).catch(() => {
        // Silently fail
      });
    }
  } catch (error) {
    // Silently fail - don't disrupt user experience if analytics fail
    console.error("Analytics tracking failed:", error);
  }
};
