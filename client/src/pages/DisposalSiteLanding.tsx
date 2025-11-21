import { useState } from "react";
import { useRoute, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { DisposalSiteLandingPage, DisposalSite } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, MapPin, Clock, Search, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import CompanyMap from "@/components/CompanyMap";

export default function DisposalSiteLanding() {
  const [, params] = useRoute("/disposal-sites/:stateCode");
  const searchParams = new URLSearchParams(useSearch());
  const stateCode = params?.stateCode?.toUpperCase();
  
  // Extract search parameters
  const searchLat = searchParams.get("lat");
  const searchLng = searchParams.get("lng");
  const searchRadius = searchParams.get("radius");
  
  const hasSearchContext = searchLat && searchLng && searchRadius;
  const userLocation = hasSearchContext 
    ? { lat: parseFloat(searchLat), lng: parseFloat(searchLng) }
    : null;

  const { data: landingPage, isLoading: pageLoading } = useQuery<DisposalSiteLandingPage>({
    queryKey: ["/api/disposal-site-landing-pages", stateCode],
    queryFn: async () => {
      const res = await fetch(`/api/disposal-site-landing-pages/${stateCode}`);
      if (!res.ok) throw new Error("Failed to fetch landing page");
      return res.json();
    },
    enabled: !!stateCode,
  });

  const { data: allDisposalSites } = useQuery<DisposalSite[]>({
    queryKey: ["/api/disposal-sites"],
  });

  // Get the premium disposal site associated with this landing page
  const premiumDisposalSite = allDisposalSites?.find(s => s.id === landingPage?.disposalSiteId);

  // Calculate distance between two points
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Filter disposal sites by radius if search context exists
  const filteredDisposalSites = hasSearchContext && userLocation && allDisposalSites
    ? allDisposalSites.filter(site => {
        if (!site.lat || !site.lng) return false;
        const distance = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          parseFloat(site.lat),
          parseFloat(site.lng)
        );
        return distance <= parseFloat(searchRadius);
      })
    : [];

  // Separate premium site from others
  const otherSites = filteredDisposalSites.filter(s => s.id !== premiumDisposalSite?.id);
  const displaySites = premiumDisposalSite 
    ? [premiumDisposalSite, ...otherSites]
    : otherSites;

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Skeleton className="h-12 w-64 mx-auto" />
          <Skeleton className="h-6 w-96 mx-auto" />
        </div>
      </div>
    );
  }

  if (!landingPage || landingPage.active !== "yes") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="font-heading text-4xl font-bold">Disposal Site Landing Page Not Available</h1>
          <p className="text-muted-foreground">
            This disposal site landing page is not currently active or does not exist.
          </p>
          <Button onClick={() => window.location.href = "/"}>
            Return to Home
          </Button>
        </div>
      </div>
    );
  }

  const backgroundImage = landingPage.backgroundImageUrl || "https://images.unsplash.com/photo-1621269852414-e17d5c8bcef7?w=1600";

  // Disposal site card component
  const DisposalSiteCard = ({ site, isPremium = false }: { site: DisposalSite; isPremium?: boolean }) => {
    return (
      <Card 
        className={`${isPremium ? 'border-2 border-primary' : ''}`}
        data-testid={`card-disposal-site-${site.id}`}
      >
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">{site.name}</CardTitle>
              {isPremium && (
                <div className="mb-2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-primary text-primary-foreground" data-testid="badge-premium-disposal">
                    {landingPage.stateName}'s Preferred Partner
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {site.address && (
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
              <p className="text-sm text-muted-foreground" data-testid={`text-address-${site.id}`}>
                {site.address}
              </p>
            </div>
          )}
          
          {site.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <a 
                href={`tel:${site.phone}`}
                className="text-sm text-primary hover:underline"
                data-testid={`link-phone-${site.id}`}
              >
                {site.phone}
              </a>
            </div>
          )}

          {site.hours && (
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
              <p className="text-sm text-muted-foreground" data-testid={`text-hours-${site.id}`}>
                {site.hours}
              </p>
            </div>
          )}

          {site.materialsAccepted && (
            <div className="flex items-start gap-2">
              <FileText className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
              <div>
                <h4 className="font-semibold text-sm mb-1">Materials Accepted</h4>
                <p className="text-sm text-muted-foreground">{site.materialsAccepted}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[500px] md:h-[600px] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.4)), url(${backgroundImage})`,
          }}
        />
        <div className="relative z-10 container mx-auto px-4 md:px-8 text-center text-white">
          <h1 className="font-heading text-4xl md:text-6xl font-bold mb-4" data-testid="heading-disposal-state-title">
            {landingPage.headline}
          </h1>
          {landingPage.subheadline && (
            <p className="text-lg md:text-xl mb-6 max-w-3xl mx-auto leading-relaxed">
              {landingPage.subheadline}
            </p>
          )}
          {premiumDisposalSite && (
            <Button 
              size="lg" 
              className="text-lg px-8 gap-2"
              onClick={() => {
                if (premiumDisposalSite.phone) {
                  window.location.href = `tel:${premiumDisposalSite.phone}`;
                }
              }}
              data-testid="button-disposal-cta"
            >
              <Phone className="h-5 w-5" />
              {landingPage.ctaText}
            </Button>
          )}
        </div>
      </section>

      {/* Map Section (only show if search context exists) */}
      {hasSearchContext && userLocation && (
        <section className="h-[500px] md:h-[600px] relative">
          <CompanyMap
            companies={[]}
            disposalSites={displaySites}
            userLocation={userLocation}
            selectedType="disposal"
            className="w-full h-full"
            data-testid="disposal-map"
          />
        </section>
      )}

      {/* Disposal Sites List (only show if search context exists) */}
      {hasSearchContext && (
        <section className="py-12 bg-background">
          <div className="container mx-auto px-4 md:px-8">
            <div className="mb-8">
              <h2 className="font-heading text-3xl md:text-4xl font-bold mb-2">
                Disposal Sites in Your Area
              </h2>
              <p className="text-muted-foreground">
                Found {displaySites.length} disposal sites within {searchRadius} miles
              </p>
            </div>

            <div className="grid gap-4 max-w-4xl mx-auto">
              {displaySites.map((site) => (
                <DisposalSiteCard 
                  key={site.id}
                  site={site}
                  isPremium={site.id === premiumDisposalSite?.id}
                />
              ))}
            </div>

            {displaySites.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  No disposal sites found in this area. Try expanding your search radius.
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Premium Disposal Site Info (only show if no search context and has premium site) */}
      {!hasSearchContext && premiumDisposalSite && (
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4 md:px-8">
            <div className="max-w-4xl mx-auto">
              <DisposalSiteCard site={premiumDisposalSite} isPremium={true} />

              <div className="text-center mt-8">
                <Button 
                  size="lg" 
                  className="text-lg px-8 gap-2"
                  onClick={() => {
                    if (premiumDisposalSite.phone) {
                      window.location.href = `tel:${premiumDisposalSite.phone}`;
                    }
                  }}
                  data-testid="button-disposal-contact-bottom"
                >
                  <Phone className="h-5 w-5" />
                  {landingPage.ctaText}
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* No Premium Disposal Site - Encourage Search (only show if no search context and no premium site) */}
      {!hasSearchContext && !premiumDisposalSite && (
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4 md:px-8">
            <div className="max-w-2xl mx-auto text-center">
              <Card>
                <CardContent className="py-12">
                  <MapPin className="h-16 w-16 mx-auto mb-6 text-muted-foreground" />
                  <h2 className="font-heading text-2xl md:text-3xl font-bold mb-4">
                    Find Disposal Sites in {landingPage.stateName}
                  </h2>
                  <p className="text-lg text-muted-foreground mb-8">
                    Search for your specific location to discover disposal sites in your area for hydro excavation waste.
                  </p>
                  <Button 
                    size="lg"
                    onClick={() => window.location.href = "/"}
                    data-testid="button-disposal-search-redirect"
                  >
                    <Search className="h-5 w-5 mr-2" />
                    Search Your Location
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
