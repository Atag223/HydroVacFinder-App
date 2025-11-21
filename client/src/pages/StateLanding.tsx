import { useEffect, useState } from "react";
import { useRoute, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { StateLandingPage, Company } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail, Globe, MapPin, CheckCircle, ExternalLink, Star, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import CompanyMap from "@/components/CompanyMap";

export default function StateLanding() {
  const [, params] = useRoute("/state/:stateCode");
  const searchParams = new URLSearchParams(useSearch());
  const stateCode = params?.stateCode?.toUpperCase();
  
  // Extract search parameters
  const searchLat = searchParams.get("lat");
  const searchLng = searchParams.get("lng");
  const searchRadius = searchParams.get("radius");
  const searchAddress = searchParams.get("address") || ""; // Default to empty string
  
  // Only require lat/lng/radius for search context (address is optional but helpful)
  const hasSearchContext = !!(searchLat && searchLng && searchRadius);
  const userLocation = hasSearchContext 
    ? { lat: parseFloat(searchLat), lng: parseFloat(searchLng) }
    : null;

  const { data: landingPage, isLoading: pageLoading } = useQuery<StateLandingPage>({
    queryKey: ["/api/state-landing-pages", stateCode],
    enabled: !!stateCode,
  });

  // Use backend search when search context exists (lat/lng/radius), pass address even if empty
  const { data: searchResults } = useQuery({
    queryKey: ["/api/search", searchAddress, searchLat, searchLng, searchRadius],
    queryFn: async () => {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: searchAddress || searchLat + "," + searchLng, // Fallback to coordinates
          radiusMiles: parseFloat(searchRadius!)
        }),
      });
      if (!res.ok) throw new Error("Failed to search");
      return res.json();
    },
    enabled: hasSearchContext,
  });

  const { data: allCompanies } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
    enabled: !hasSearchContext, // Only fetch all companies if not searching
  });

  // Get companies AND disposal sites from search results or all companies
  const companiesFromSearch = searchResults?.companies || [];
  const disposalSitesFromSearch = searchResults?.disposalSites || [];
  const filteredCompanies = hasSearchContext ? companiesFromSearch : [];
  const filteredDisposalSites = hasSearchContext ? disposalSitesFromSearch : [];

  // Get the premium company associated with this landing page
  const premiumCompany = hasSearchContext
    ? companiesFromSearch.find((c: Company) => c.id === landingPage?.companyId)
    : allCompanies?.find(c => c.id === landingPage?.companyId);

  // Separate premium company from others
  const otherCompanies = filteredCompanies.filter((c: Company) => c.id !== premiumCompany?.id);
  const displayCompanies = premiumCompany 
    ? [premiumCompany, ...otherCompanies]
    : otherCompanies;

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
          <h1 className="font-heading text-4xl font-bold">State Landing Page Not Available</h1>
          <p className="text-muted-foreground">
            This state landing page is not currently active or does not exist.
          </p>
          <Button onClick={() => window.location.href = "/"}>
            Return to Home
          </Button>
        </div>
      </div>
    );
  }

  const backgroundImage = landingPage.backgroundImageUrl || "https://images.unsplash.com/photo-1581094271901-8022df4466f9?w=1600";

  // Company card component with tier-based interactions
  const CompanyCard = ({ company, isPremium = false }: { company: Company; isPremium?: boolean }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const tierLevel = company.tier === "basic" ? 1 : company.tier === "verified" ? 2 : 3;
    const canInteract = tierLevel >= 2; // Tier 2 (Featured) and 3 (Premium) are interactive

    return (
      <Card 
        className={`${canInteract ? 'hover-elevate cursor-pointer' : ''} ${isPremium ? 'border-2 border-primary' : ''}`}
        onClick={() => canInteract && setIsExpanded(!isExpanded)}
        data-testid={`card-company-${company.id}`}
      >
        <CardHeader>
          {company.logoUrl && (
            <div className="mb-3">
              <img 
                src={company.logoUrl} 
                alt={`${company.name} logo`} 
                className="h-20 w-full object-contain rounded-md" 
                data-testid={`company-logo-${company.id}`}
              />
            </div>
          )}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">{company.name}</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                {isPremium && (
                  <Badge variant="default" data-testid="badge-premium">
                    <Star className="h-3 w-3 mr-1" />
                    {landingPage.stateName}'s Preferred Partner
                  </Badge>
                )}
                {company.tier === "premium" && (
                  <Badge className="bg-purple-500">Premium</Badge>
                )}
                {company.tier === "featured" && (
                  <Badge className="bg-yellow-500">Featured</Badge>
                )}
                {company.tier === "verified" && (
                  <Badge variant="secondary">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                )}
                {tierLevel === 1 && (
                  <Badge variant="outline">Basic Listing</Badge>
                )}
              </div>
            </div>
            {canInteract && (
              <div className="text-sm text-muted-foreground">
                {isExpanded ? "Click to collapse" : "Click for details"}
              </div>
            )}
          </div>
        </CardHeader>
        
        {(isExpanded || isPremium) && (
          <CardContent className="space-y-4">
            {company.description && (
              <p className="text-muted-foreground">{company.description}</p>
            )}
            
            <div className="grid sm:grid-cols-2 gap-3">
              {company.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
                  <span className="text-sm">{company.address}</span>
                </div>
              )}
              
              {company.phone && canInteract && (
                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
                  <a 
                    href={`tel:${company.phone}`}
                    className="text-sm text-primary hover:underline"
                    data-testid={`link-phone-${company.id}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {company.phone}
                  </a>
                </div>
              )}
              
              {company.email && canInteract && (
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
                  <a 
                    href={`mailto:${company.email}`}
                    className="text-sm text-primary hover:underline"
                    data-testid={`link-email-${company.id}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {company.email}
                  </a>
                </div>
              )}
              
              {company.website && tierLevel >= 3 && (
                <div className="flex items-start gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
                  <a 
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                    data-testid={`link-website-${company.id}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    Visit Website
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>

            {company.services && (
              <div>
                <h4 className="font-semibold text-sm mb-1">Services</h4>
                <p className="text-sm text-muted-foreground">{company.services}</p>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section with Company Background */}
      <section className="relative h-[500px] md:h-[600px] flex flex-col overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.4)), url(${backgroundImage})`,
          }}
        />
        {/* Headline at top */}
        <div className="relative z-10 container mx-auto px-4 md:px-8 pt-8 md:pt-12 text-center text-white">
          <h1 className="font-heading text-4xl md:text-6xl font-bold mb-4" data-testid="heading-state-title">
            {landingPage.headline}
          </h1>
          {landingPage.subheadline && (
            <p className="text-lg md:text-xl mb-6 max-w-3xl mx-auto leading-relaxed">
              {landingPage.subheadline}
            </p>
          )}
          {premiumCompany && (
            <Button 
              size="lg" 
              className="text-lg px-8 gap-2"
              onClick={() => {
                if (premiumCompany.phone) {
                  window.location.href = `tel:${premiumCompany.phone}`;
                }
              }}
              data-testid="button-cta"
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
            companies={displayCompanies}
            disposalSites={filteredDisposalSites}
            userLocation={userLocation}
            selectedType="companies"
            className="w-full h-full"
          />
        </section>
      )}

      {/* Companies List (only show if search context exists) */}
      {hasSearchContext && (
        <section className="py-12 bg-background">
          <div className="container mx-auto px-4 md:px-8">
            <div className="mb-8">
              <h2 className="font-heading text-3xl md:text-4xl font-bold mb-2">
                Companies in Your Area
              </h2>
              <p className="text-muted-foreground">
                Found {displayCompanies.length} companies within {searchRadius} miles
              </p>
            </div>

            <div className="grid gap-4 max-w-4xl mx-auto">
              {displayCompanies.map((company: Company) => (
                <CompanyCard 
                  key={company.id}
                  company={company}
                  isPremium={company.id === premiumCompany?.id}
                />
              ))}
            </div>

            {displayCompanies.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  No companies found in this area. Try expanding your search radius.
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Premium Company Info (only show if no search context and has premium company) */}
      {!hasSearchContext && premiumCompany && (
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4 md:px-8">
            <div className="max-w-4xl mx-auto">
              <CompanyCard company={premiumCompany} isPremium={true} />

              <div className="text-center mt-8">
                <Button 
                  size="lg" 
                  className="text-lg px-8 gap-2"
                  onClick={() => {
                    if (premiumCompany.phone) {
                      window.location.href = `tel:${premiumCompany.phone}`;
                    }
                  }}
                  data-testid="button-contact-bottom"
                >
                  <Phone className="h-5 w-5" />
                  {landingPage.ctaText}
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* No Premium Company - Encourage Search (only show if no search context and no premium company) */}
      {!hasSearchContext && !premiumCompany && (
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4 md:px-8">
            <div className="max-w-2xl mx-auto text-center">
              <Card>
                <CardContent className="py-12">
                  <MapPin className="h-16 w-16 mx-auto mb-6 text-muted-foreground" />
                  <h2 className="font-heading text-2xl md:text-3xl font-bold mb-4">
                    Find Hydro-Vac Companies in {landingPage.stateName}
                  </h2>
                  <p className="text-lg text-muted-foreground mb-8">
                    Search for your specific location to discover hydro excavation companies and disposal sites in your area.
                  </p>
                  <Button 
                    size="lg"
                    onClick={() => window.location.href = "/"}
                    data-testid="button-search-redirect"
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

      {/* Contact Section */}
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <h3 className="font-heading text-2xl font-semibold mb-6">
              Questions About HydroVacFinder?
            </h3>
            <Card>
              <CardContent className="py-8">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Phone className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm text-muted-foreground">Call us</p>
                      <a
                        href="tel:+15743396004"
                        className="text-lg font-semibold hover:text-primary transition-colors"
                        data-testid="link-contact-phone"
                      >
                        (574) 339-6004
                      </a>
                    </div>
                  </div>

                  <div className="hidden sm:block h-12 w-px bg-border" />

                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm text-muted-foreground">Email us</p>
                      <a
                        href="mailto:info@hydrovacfinder.com"
                        className="text-lg font-semibold hover:text-primary transition-colors"
                        data-testid="link-contact-email"
                      >
                        info@hydrovacfinder.com
                      </a>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
