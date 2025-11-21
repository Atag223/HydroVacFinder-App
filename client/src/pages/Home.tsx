import { useEffect, useRef, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { Company, DisposalSite } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Phone, Mail, Globe, Search, CheckCircle, Star, Navigation, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PartnerSection from "@/components/PartnerSection";
import CompanyMap from "@/components/CompanyMap";
import heroImage from "@assets/generated_images/Hydrovac_truck_in_action_4717631d.png";
import truckImage from "@assets/generated_images/Hydro_vac_truck_branded_626db47b.png";
import mapImage from "@assets/generated_images/USA_map_with_branding_d15617a9.png";
import facilityImage from "@assets/generated_images/Disposal_facility_branded_7c278416.png";
import searchImage from "@assets/generated_images/Location_search_branded_icon_9dca474e.png";
import { trackAnalytics } from "@/lib/analytics";

export default function Home() {
  const [, navigate] = useLocation();
  const [searchLocation, setSearchLocation] = useState("");
  const [searchRadius, setSearchRadius] = useState("50");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[] | null>(null);
  const [filteredDisposalSites, setFilteredDisposalSites] = useState<DisposalSite[] | null>(null);
  const [selectedType, setSelectedType] = useState<"all" | "companies" | "disposal">("all");
  const [isSearching, setIsSearching] = useState(false);
  const [selectedState, setSelectedState] = useState<string>("all");
  const { toast } = useToast();

  const { data: companies, isLoading: companiesLoading } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const { data: disposalSites, isLoading: sitesLoading } = useQuery<DisposalSite[]>({
    queryKey: ["/api/disposal-sites"],
  });

  // Calculate distance between two coordinates (Haversine formula)
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

  // Handle location search
  const handleSearch = async () => {
    if (!searchLocation.trim()) {
      toast({
        title: "Location Required",
        description: "Please enter a city, state, or ZIP code to search.",
        variant: "destructive"
      });
      return;
    }

    setIsSearching(true);
    
    try {
      // Use enhanced search endpoint
      const response = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          address: searchLocation,
          radiusMiles: parseFloat(searchRadius)
        }),
      });
      
      const data = await response.json();

      if (!response.ok) {
        toast({
          title: "API Error",
          description: data.error || "Failed to search location.",
          variant: "destructive"
        });
        setIsSearching(false);
        return;
      }

      // Redirect to state landing pages if premium landing page exists (regardless of search type)
      if (data.state) {
        const searchParams = new URLSearchParams({
          lat: data.location.lat.toString(),
          lng: data.location.lng.toString(),
          radius: searchRadius,
          address: data.location.formattedAddress // Include original search address
        }).toString();
        
        // For companies filter, redirect to company state landing page
        if (selectedType === "companies" && data.premiumLandingPage) {
          navigate(`/state/${data.state.code}?${searchParams}`);
          return;
        }
        
        // For disposal sites filter, redirect to disposal site state landing page
        if (selectedType === "disposal" && data.disposalSiteLandingPage) {
          navigate(`/disposal-sites/${data.state.code}?${searchParams}`);
          return;
        }
        
        // For "all" filter, prefer company landing page if available
        if (selectedType === "all" && data.premiumLandingPage) {
          navigate(`/state/${data.state.code}?${searchParams}`);
          return;
        }
      }

      // Otherwise, show results on home page
      setUserLocation({ lat: data.location.lat, lng: data.location.lng });
      setFilteredCompanies(data.companies);
      setFilteredDisposalSites(data.disposalSites);

      // Show appropriate message based on results
      const totalResults = data.companies.length + data.disposalSites.length;
      if (totalResults === 0) {
        toast({
          title: "No Results Found",
          description: `No companies or disposal sites found within ${searchRadius} miles of ${data.location.formattedAddress}. Try increasing your search radius or searching for ${data.state?.name || "the state"}.`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Search Complete",
          description: `Found ${data.companies.length} companies and ${data.disposalSites.length} disposal sites within ${searchRadius} miles.`
        });
      }
    } catch (error) {
      console.error("Search error:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast({
        title: "Search Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Clear search filters
  const handleClearSearch = () => {
    setSearchLocation("");
    setUserLocation(null);
    setFilteredCompanies(null);
    setFilteredDisposalSites(null);
  };

  // Use filtered data if available, otherwise use all data
  // Memoize to prevent unnecessary re-renders of CompanyMap
  const displayCompanies = useMemo(() => 
    filteredCompanies !== null ? filteredCompanies : companies,
    [filteredCompanies, companies]
  );
  const displayDisposalSites = useMemo(() =>
    filteredDisposalSites !== null ? filteredDisposalSites : disposalSites,
    [filteredDisposalSites, disposalSites]
  );

  // Extract state from address
  const extractState = (address: string | null | undefined): string => {
    if (!address) return "Unknown";
    
    // Try to match state abbreviation anywhere in the address
    // Match ", ST " or ", ST," or ", ST 12345" patterns
    const abbrevMatch = address.match(/,\s*([A-Z]{2})(?:\s|,|$|\d)/);
    if (abbrevMatch) return abbrevMatch[1];
    
    // Fallback: try to match state name at end of address
    const stateNameMatch = address.match(/,\s*([A-Za-z\s]+?)(?:\s*\d{5}|,|$)/);
    if (stateNameMatch) {
      const stateName = stateNameMatch[1].trim();
      // Only return if it looks like a state (short, no numbers)
      if (stateName.length <= 20 && !/\d/.test(stateName)) {
        return stateName;
      }
    }
    
    return "Unknown";
  };

  // Get unique states based on selected type
  const states = Array.from(
    new Set(
      selectedType === "disposal"
        ? (displayDisposalSites || []).map(s => extractState(s.address))
        : (displayCompanies || []).map(c => extractState(c.address))
    )
  ).sort();

  // Group companies by state
  const companiesByState = (displayCompanies || []).reduce((acc, company) => {
    const state = extractState(company.address);
    if (!acc[state]) acc[state] = [];
    acc[state].push(company);
    return acc;
  }, {} as Record<string, Company[]>);

  // Group disposal sites by state
  const disposalSitesByState = (displayDisposalSites || []).reduce((acc, site) => {
    const state = extractState(site.address);
    if (!acc[state]) acc[state] = [];
    acc[state].push(site);
    return acc;
  }, {} as Record<string, DisposalSite[]>);


  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[600px] md:h-[700px] flex items-center justify-center overflow-hidden">
        <img
          src={heroImage}
          alt="hydro vac truck directory - nationwide hydro excavation services"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-black/30" />
        <div className="relative z-10 container mx-auto px-4 md:px-8 text-center text-white">
          <h1 className="font-heading text-4xl md:text-6xl font-bold mb-4 md:mb-6">
            Find Hydro-Vac Services Nationwide
          </h1>
          <p className="text-lg md:text-xl mb-8 max-w-3xl mx-auto leading-relaxed">
            Connect with verified hydro-vac companies and disposal sites across the country. Search by location, compare services, and find the right professionals for your excavation needs.
          </p>
          
          {/* Search Bar */}
          <div className="max-w-3xl mx-auto backdrop-blur-md bg-white/90 rounded-lg p-3 shadow-lg">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Enter city, state, or ZIP code"
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-10 border-0 bg-transparent focus-visible:ring-0 text-foreground placeholder:text-muted-foreground"
                  data-testid="input-search-location"
                />
              </div>
              <div className="w-full sm:w-32">
                <Select value={searchRadius} onValueChange={setSearchRadius}>
                  <SelectTrigger className="border-0 bg-transparent focus:ring-0 text-foreground" data-testid="select-radius">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 miles</SelectItem>
                    <SelectItem value="25">25 miles</SelectItem>
                    <SelectItem value="50">50 miles</SelectItem>
                    <SelectItem value="100">100 miles</SelectItem>
                    <SelectItem value="250">250 miles</SelectItem>
                    <SelectItem value="500">500 miles</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                size="default" 
                className="gap-2" 
                onClick={handleSearch}
                disabled={isSearching}
                data-testid="button-search"
              >
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline">{isSearching ? "Searching..." : "Find Services"}</span>
                <span className="sm:hidden">{isSearching ? "..." : "Search"}</span>
              </Button>
              {filteredCompanies !== null && (
                <Button 
                  variant="outline" 
                  size="default"
                  onClick={handleClearSearch}
                  data-testid="button-clear-search"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose HydroVacFinder - SEO Features Section */}
      <section className="py-12 md:py-16 bg-background">
        <div className="container mx-auto px-4 md:px-8">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-center mb-12">
            Why Choose HydroVacFinder?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            <div className="text-center">
              <div className="mb-4 mx-auto w-full max-w-[280px] aspect-[4/3] overflow-hidden rounded-lg">
                <img
                  src={mapImage}
                  alt="hydro vac directory nationwide coverage all 50 states"
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-xl font-semibold mb-2">Nationwide Coverage</h3>
              <p className="text-sm text-muted-foreground">
                Search hydro-vac companies and disposal facilities across all 50 states
              </p>
            </div>
            <div className="text-center">
              <div className="mb-4 mx-auto w-full max-w-[280px] aspect-[4/3] overflow-hidden rounded-lg">
                <img
                  src={truckImage}
                  alt="hydro excavation directory verified hydrovac truck companies"
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-xl font-semibold mb-2">Verified Companies</h3>
              <p className="text-sm text-muted-foreground">
                Connect with trusted, verified hydro excavation professionals
              </p>
            </div>
            <div className="text-center">
              <div className="mb-4 mx-auto w-full max-w-[280px] aspect-[4/3] overflow-hidden rounded-lg">
                <img
                  src={facilityImage}
                  alt="disposal facility directory hydrovac waste management services"
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-xl font-semibold mb-2">Disposal Facilities</h3>
              <p className="text-sm text-muted-foreground">
                Locate nearby disposal sites for efficient waste management
              </p>
            </div>
            <div className="text-center">
              <div className="mb-4 mx-auto w-full max-w-[280px] aspect-[4/3] overflow-hidden rounded-lg">
                <img
                  src={searchImage}
                  alt="hydro vac companies near me vacuum excavation directory search"
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-xl font-semibold mb-2">Find Near You</h3>
              <p className="text-sm text-muted-foreground">
                Quickly search and locate hydro-vac services in your area
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Filter Tabs */}
      <section className="border-b bg-background sticky top-16 md:top-20 z-40">
        <div className="container mx-auto px-4 md:px-8 py-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedType === "all" ? "default" : "outline"}
              onClick={() => {
                setSelectedType("all");
                setSelectedState("all");
                handleClearSearch();
              }}
              data-testid="filter-all"
            >
              All Locations
            </Button>
            <Button
              variant={selectedType === "companies" ? "default" : "outline"}
              onClick={() => {
                setSelectedType("companies");
                setSelectedState("all");
              }}
              data-testid="filter-companies"
            >
              Hydro-Vac Companies
            </Button>
            <Button
              variant={selectedType === "disposal" ? "default" : "outline"}
              onClick={() => {
                setSelectedType("disposal");
                setSelectedState("all");
              }}
              data-testid="filter-disposal"
            >
              Disposal Sites
            </Button>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="flex-1 min-h-[500px] md:min-h-[600px] relative">
        <div className="absolute inset-0 w-full h-full">
          <CompanyMap
            companies={displayCompanies || []}
            disposalSites={displayDisposalSites || []}
            userLocation={userLocation}
            selectedType={selectedType}
            className="w-full h-full"
          />
        </div>
      </section>

      {/* All Companies by State Section / Search Results */}
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4 md:px-8">
          {filteredCompanies !== null ? (
            /* Show search results */
            <div className="mb-8">
              <h2 className="font-heading text-3xl md:text-4xl font-semibold mb-2">
                Search Results
              </h2>
              <p className="text-muted-foreground">
                {selectedType === "disposal" 
                  ? `Found ${filteredDisposalSites?.length || 0} disposal sites within ${searchRadius} miles of ${searchLocation}`
                  : `Found ${filteredCompanies.length} companies within ${searchRadius} miles of ${searchLocation}`
                }
              </p>
            </div>
          ) : (
            /* Show all companies/disposal sites header with state filter */
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <h2 className="font-heading text-3xl md:text-4xl font-semibold">
                {selectedType === "disposal" ? "All Disposal Sites" : "All Companies"}
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Filter by state:</span>
                <Select value={selectedState} onValueChange={setSelectedState}>
                  <SelectTrigger className="w-40" data-testid="select-state">
                    <SelectValue placeholder="All States" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="max-h-[300px] overflow-y-auto" sideOffset={5}>
                    <SelectItem value="all">All States</SelectItem>
                    {states.map(state => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          {/* Show disposal sites when filter is "disposal" */}
          {selectedType === "disposal" ? (
            sitesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-3/4" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredDisposalSites !== null ? (
              // Show search results
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(filteredDisposalSites || []).map((site) => (
                  <Card key={site.id} className="hover-elevate" data-testid={`disposal-card-${site.id}`}>
                    <CardHeader>
                      {site.logoUrl && (
                        <div className="mb-3">
                          <img 
                            src={site.logoUrl} 
                            alt={`${site.name} logo`} 
                            className="h-20 w-full object-contain rounded-md" 
                            data-testid={`disposal-logo-${site.id}`}
                          />
                        </div>
                      )}
                      <CardTitle className="text-xl flex items-center gap-2">
                        {!site.logoUrl && <span className="text-green-600">🗑️</span>}
                        {site.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {site.address && (
                        <p className="text-sm text-muted-foreground flex items-start gap-2">
                          <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                          <span>{site.address}</span>
                        </p>
                      )}
                      {site.additionalLocations && site.additionalLocations.length > 0 && (
                        <div className="text-sm text-muted-foreground">
                          <p className="font-medium text-foreground mb-1">Additional Facilities:</p>
                          <div className="pl-6 space-y-0.5">
                            {site.additionalLocations.map((location: any, idx: number) => (
                              <p key={idx} className="text-sm flex items-start gap-2">
                                <MapPin className="h-3 w-3 mt-0.5 shrink-0 opacity-60" />
                                <span>{location.city}{location.address ? ` - ${location.address}` : ''}</span>
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                      {site.materialsAccepted && (
                        <p className="text-sm">
                          <strong>Materials:</strong> {site.materialsAccepted}
                        </p>
                      )}
                      {site.phone && (
                        <p className="text-sm flex items-center gap-2">
                          <Phone className="h-4 w-4 shrink-0" />
                          <a href={`tel:${site.phone}`} className="hover:underline">
                            {site.phone}
                          </a>
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : selectedState === "all" ? (
              // Show all disposal sites
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(displayDisposalSites || []).map((site) => (
                  <Card key={site.id} className="hover-elevate" data-testid={`disposal-card-${site.id}`}>
                    <CardHeader>
                      {site.logoUrl && (
                        <div className="mb-3">
                          <img 
                            src={site.logoUrl} 
                            alt={`${site.name} logo`} 
                            className="h-20 w-full object-contain rounded-md" 
                            data-testid={`disposal-logo-${site.id}`}
                          />
                        </div>
                      )}
                      <CardTitle className="text-xl flex items-center gap-2">
                        {!site.logoUrl && <span className="text-green-600">🗑️</span>}
                        {site.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {site.address && (
                        <p className="text-sm text-muted-foreground flex items-start gap-2">
                          <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                          <span>{site.address}</span>
                        </p>
                      )}
                      {site.additionalLocations && site.additionalLocations.length > 0 && (
                        <div className="text-sm text-muted-foreground">
                          <p className="font-medium text-foreground mb-1">Additional Facilities:</p>
                          <div className="pl-6 space-y-0.5">
                            {site.additionalLocations.map((location: any, idx: number) => (
                              <p key={idx} className="text-sm flex items-start gap-2">
                                <MapPin className="h-3 w-3 mt-0.5 shrink-0 opacity-60" />
                                <span>{location.city}{location.address ? ` - ${location.address}` : ''}</span>
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                      {site.materialsAccepted && (
                        <p className="text-sm">
                          <strong>Materials:</strong> {site.materialsAccepted}
                        </p>
                      )}
                      {site.phone && (
                        <p className="text-sm flex items-center gap-2">
                          <Phone className="h-4 w-4 shrink-0" />
                          <a href={`tel:${site.phone}`} className="hover:underline">
                            {site.phone}
                          </a>
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              // Show disposal sites filtered by selected state
              <div>
                <h3 className="font-heading text-2xl font-semibold mb-6">
                  {selectedState} ({disposalSitesByState[selectedState]?.length || 0})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(disposalSitesByState[selectedState] || []).map((site) => (
                    <Card key={site.id} className="hover-elevate" data-testid={`disposal-card-${site.id}`}>
                      <CardHeader>
                        {site.logoUrl && (
                          <div className="mb-3">
                            <img 
                              src={site.logoUrl} 
                              alt={`${site.name} logo`} 
                              className="h-20 w-full object-contain rounded-md" 
                              data-testid={`disposal-logo-${site.id}`}
                            />
                          </div>
                        )}
                        <CardTitle className="text-xl flex items-center gap-2">
                          {!site.logoUrl && <span className="text-green-600">🗑️</span>}
                          {site.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {site.address && (
                          <p className="text-sm text-muted-foreground flex items-start gap-2">
                            <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                            <span>{site.address}</span>
                          </p>
                        )}
                        {site.additionalLocations && site.additionalLocations.length > 0 && (
                          <div className="text-sm text-muted-foreground">
                            <p className="font-medium text-foreground mb-1">Additional Facilities:</p>
                            <div className="pl-6 space-y-0.5">
                              {site.additionalLocations.map((location: any, idx: number) => (
                                <p key={idx} className="text-sm flex items-start gap-2">
                                  <MapPin className="h-3 w-3 mt-0.5 shrink-0 opacity-60" />
                                  <span>{location.city}{location.address ? ` - ${location.address}` : ''}</span>
                                </p>
                              ))}
                            </div>
                          </div>
                        )}
                        {site.materialsAccepted && (
                          <p className="text-sm">
                            <strong>Materials:</strong> {site.materialsAccepted}
                          </p>
                        )}
                        {site.phone && (
                          <p className="text-sm flex items-center gap-2">
                            <Phone className="h-4 w-4 shrink-0" />
                            <a href={`tel:${site.phone}`} className="hover:underline">
                              {site.phone}
                            </a>
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
          ) : companiesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredCompanies !== null ? (
            // Show search results in simple list
            <div>
              {filteredCompanies.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    No companies found within {searchRadius} miles. Try expanding your search radius.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCompanies.map((company) => (
                    <Card key={company.id} className="hover-elevate" data-testid={`company-card-${company.id}`}>
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
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-xl">{company.name}</CardTitle>
                          {company.tier === "premium" && (
                            <Badge className="bg-purple-500">Premium</Badge>
                          )}
                          {company.tier === "featured" && (
                            <Badge className="bg-yellow-500 text-white gap-1">
                              <Star className="h-3 w-3" />
                              Featured
                            </Badge>
                          )}
                          {company.tier === "verified" && (
                            <Badge variant="secondary" className="gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Verified
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {company.address && (
                          <p className="text-sm text-muted-foreground flex items-start gap-2">
                            <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                            <span>{company.address}</span>
                          </p>
                        )}
                        {company.additionalLocations && company.additionalLocations.length > 0 && (
                          <div className="text-sm text-muted-foreground">
                            <p className="font-medium text-foreground mb-1">Additional Offices:</p>
                            <div className="pl-6 space-y-0.5">
                              {company.additionalLocations.map((location: any, idx: number) => (
                                <p key={idx} className="text-sm flex items-start gap-2">
                                  <MapPin className="h-3 w-3 mt-0.5 shrink-0 opacity-60" />
                                  <span>{location.city}{location.address ? ` - ${location.address}` : ''}</span>
                                </p>
                              ))}
                            </div>
                          </div>
                        )}
                        {company.phone && (
                          <p className="text-sm flex items-center gap-2">
                            <Phone className="h-4 w-4 shrink-0" />
                            <a 
                              href={`tel:${company.phone}`} 
                              className="hover:underline"
                              onClick={() => trackAnalytics(company.id, "phone_click", "search_results")}
                            >
                              {company.phone}
                            </a>
                          </p>
                        )}
                        {company.email && (
                          <p className="text-sm flex items-center gap-2">
                            <Mail className="h-4 w-4 shrink-0" />
                            <a 
                              href={`mailto:${company.email}`} 
                              className="hover:underline"
                              onClick={() => trackAnalytics(company.id, "email_click", "search_results")}
                            >
                              {company.email}
                            </a>
                          </p>
                        )}
                        {company.website && (
                          <p className="text-sm flex items-center gap-2">
                            <Globe className="h-4 w-4 shrink-0" />
                            <a
                              href={company.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline text-primary"
                              onClick={() => trackAnalytics(company.id, "website_click", "search_results")}
                            >
                              Visit Website
                            </a>
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ) : selectedState === "all" ? (
            // Show grouped by state
            <div className="space-y-8">
              {Object.keys(companiesByState).sort().map(state => (
                <div key={state}>
                  <h3 className="font-heading text-2xl font-semibold mb-4 flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    {state} ({companiesByState[state].length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {companiesByState[state].map((company) => (
                      <Card key={company.id} className="hover-elevate" data-testid={`company-card-${company.id}`}>
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
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-xl">{company.name}</CardTitle>
                            {company.tier === "featured" && (
                              <Badge className="bg-yellow-500 text-white gap-1">
                                <Star className="h-3 w-3" />
                                Featured
                              </Badge>
                            )}
                            {company.tier === "verified" && (
                              <Badge variant="secondary" className="gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Verified
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {company.address && (
                            <p className="text-sm text-muted-foreground flex items-start gap-2">
                              <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                              <span>{company.address}</span>
                            </p>
                          )}
                          {company.additionalLocations && company.additionalLocations.length > 0 && (
                            <div className="text-sm text-muted-foreground">
                              <p className="font-medium text-foreground mb-1">Additional Offices:</p>
                              <div className="pl-6 space-y-0.5">
                                {company.additionalLocations.map((location: any, idx: number) => (
                                  <p key={idx} className="text-sm flex items-start gap-2">
                                    <MapPin className="h-3 w-3 mt-0.5 shrink-0 opacity-60" />
                                    <span>{location.city}{location.address ? ` - ${location.address}` : ''}</span>
                                  </p>
                                ))}
                              </div>
                            </div>
                          )}
                          {company.phone && (
                            <p className="text-sm flex items-center gap-2">
                              <Phone className="h-4 w-4 shrink-0" />
                              <a 
                                href={`tel:${company.phone}`} 
                                className="hover:underline"
                                onClick={() => trackAnalytics(company.id, "phone_click", "company_card")}
                              >
                                {company.phone}
                              </a>
                            </p>
                          )}
                          {company.email && (
                            <p className="text-sm flex items-center gap-2">
                              <Mail className="h-4 w-4 shrink-0" />
                              <a 
                                href={`mailto:${company.email}`} 
                                className="hover:underline"
                                onClick={() => trackAnalytics(company.id, "email_click", "company_card")}
                              >
                                {company.email}
                              </a>
                            </p>
                          )}
                          {company.website && (
                            <p className="text-sm flex items-center gap-2">
                              <Globe className="h-4 w-4 shrink-0" />
                              <a
                                href={company.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline text-primary"
                                onClick={() => trackAnalytics(company.id, "website_click", "company_card")}
                              >
                                Visit Website
                              </a>
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Show filtered by selected state
            <div>
              <h3 className="font-heading text-2xl font-semibold mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                {selectedState} ({companiesByState[selectedState]?.length || 0})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(companiesByState[selectedState] || []).map((company) => (
                  <Card key={company.id} className="hover-elevate" data-testid={`company-card-${company.id}`}>
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
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-xl">{company.name}</CardTitle>
                        {company.tier === "featured" && (
                          <Badge className="bg-yellow-500 text-white gap-1">
                            <Star className="h-3 w-3" />
                            Featured
                          </Badge>
                        )}
                        {company.tier === "verified" && (
                          <Badge variant="secondary" className="gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Verified
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {company.address && (
                        <p className="text-sm text-muted-foreground flex items-start gap-2">
                          <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                          <span>{company.address}</span>
                        </p>
                      )}
                      {company.additionalLocations && company.additionalLocations.length > 0 && (
                        <div className="text-sm text-muted-foreground">
                          <p className="font-medium text-foreground mb-1">Additional Offices:</p>
                          <div className="pl-6 space-y-0.5">
                            {company.additionalLocations.map((location: any, idx: number) => (
                              <p key={idx} className="text-sm flex items-start gap-2">
                                <MapPin className="h-3 w-3 mt-0.5 shrink-0 opacity-60" />
                                <span>{location.city}{location.address ? ` - ${location.address}` : ''}</span>
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                      {company.phone && (
                        <p className="text-sm flex items-center gap-2">
                          <Phone className="h-4 w-4 shrink-0" />
                          <a 
                            href={`tel:${company.phone}`} 
                            className="hover:underline"
                            onClick={() => trackAnalytics(company.id, "phone_click", "company_card")}
                          >
                            {company.phone}
                          </a>
                        </p>
                      )}
                      {company.email && (
                        <p className="text-sm flex items-center gap-2">
                          <Mail className="h-4 w-4 shrink-0" />
                          <a 
                            href={`mailto:${company.email}`} 
                            className="hover:underline"
                            onClick={() => trackAnalytics(company.id, "email_click", "company_card")}
                          >
                            {company.email}
                          </a>
                        </p>
                      )}
                      {company.website && (
                        <p className="text-sm flex items-center gap-2">
                          <Globe className="h-4 w-4 shrink-0" />
                          <a
                            href={company.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline text-primary"
                            onClick={() => trackAnalytics(company.id, "website_click", "company_card")}
                          >
                            Visit Website
                          </a>
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
          
          {!companiesLoading && (!displayCompanies || displayCompanies.length === 0) && (
            <p className="text-center text-muted-foreground py-12">No companies found.</p>
          )}
        </div>
      </section>

      {/* SEO Content Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 md:px-8 max-w-6xl">
          <div className="space-y-8">
            <div>
              <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
                About the Hydro Vac Directory
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                HydroVacFinder.com provides the most complete <strong>hydro vac directory</strong> for locating hydro-excavation companies and disposal facilities across all 50 states. Our directory helps contractors, utility crews, municipalities, pipeline teams, and project managers quickly find available hydro vac services anywhere in the country.
              </p>
            </div>

            <div>
              <h3 className="font-heading text-2xl font-semibold mb-4">
                Search Hydro Vac Companies by State
              </h3>
              <p className="text-muted-foreground mb-4">
                Use our directory to browse hydro vac companies by state, service area, equipment type, or listing level. Access detailed information including service coverage, contact details, and verified business credentials.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {["TX", "CA", "FL", "NY", "PA", "IL", "OH", "GA"].map((state) => (
                  <Button
                    key={state}
                    variant="outline"
                    className="justify-start"
                    onClick={() => navigate(`/state/${state}`)}
                    data-testid={`link-state-${state}`}
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    {state}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-heading text-2xl font-semibold mb-4">
                Why Use the Hydro Vac Directory?
              </h3>
              <ul className="grid md:grid-cols-2 gap-3">
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <span>Nationwide hydro-excavation company listings</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <span>Verified disposal and offload site directory</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <span>Updated daily with new providers and contact details</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <span>Multi-state and premium visibility options for businesses</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <span>Free for operators, dispatchers, and contractors</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <span>Interactive map-based search with radius filtering</span>
                </li>
              </ul>
            </div>

            <div className="bg-card border rounded-lg p-6 md:p-8">
              <h3 className="font-heading text-2xl font-semibold mb-3">
                Get Listed in the Hydro Vac Directory
              </h3>
              <p className="text-muted-foreground mb-6">
                Hydro vac companies and disposal facilities can purchase Verified, Featured, or Premium listings to boost visibility and appear higher in state searches. Increase your reach and connect with contractors actively searching for your services.
              </p>
              <Button 
                size="lg" 
                onClick={() => navigate("/advertise")}
                className="gap-2"
                data-testid="button-list-business-cta"
              >
                <Building2 className="h-5 w-5" />
                List Your Business
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Partner Section */}
      <PartnerSection />
    </div>
  );
}
