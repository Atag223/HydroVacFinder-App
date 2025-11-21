import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Star, TrendingUp, Loader2, MapPin, Map } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { PricingTier, CoverageTier } from "@shared/schema";

const iconMap: Record<string, any> = {
  verified: Check,
  featured: Star,
  premium: TrendingUp,
  state_landing: MapPin,
  disposal_site_landing: MapPin,
};

export default function Advertise() {
  const [billingCycles, setBillingCycles] = useState<Record<string, "monthly" | "annual">>({});
  const [coverage, setCoverage] = useState<string>("single");
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Helper to get billing cycle for a specific tier (defaults to monthly)
  const getBillingCycle = (tierId: string) => billingCycles[tierId] || "monthly";
  
  // Helper to set billing cycle for a specific tier
  const setBillingCycle = (tierId: string, cycle: "monthly" | "annual") => {
    setBillingCycles(prev => ({ ...prev, [tierId]: cycle }));
  };

  const { data: allTiers = [], isLoading } = useQuery<PricingTier[]>({
    queryKey: ["/api/pricing-tiers"],
  });

  const { data: coverageTiers = [], isLoading: coverageTiersLoading } = useQuery<CoverageTier[]>({
    queryKey: ["/api/coverage-tiers"],
  });

  // Separate regular subscription tiers from state landing pages
  const tiers = allTiers.filter(tier => tier.id !== "state_landing" && tier.id !== "disposal_site_landing");
  const stateLandingTier = allTiers.find(tier => tier.id === "state_landing");
  const disposalSiteLandingTier = allTiers.find(tier => tier.id === "disposal_site_landing");

  // Get current coverage multiplier (convert from string to number)
  const selectedCoverageTier = coverageTiers.find(tier => tier.id === coverage);
  const coverageMultiplier = selectedCoverageTier?.multiplier ? parseFloat(String(selectedCoverageTier.multiplier)) : 1;

  const handleSubscribe = async (tierId: string, forcedBilling?: "monthly" | "annual") => {
    // State landing pages require consultation - redirect to contact page
    if (tierId === "state_landing" || tierId === "disposal_site_landing") {
      window.location.href = "/contact?subject=" + encodeURIComponent(
        tierId === "state_landing" ? "State Landing Page Inquiry" : "Disposal Site Landing Page Inquiry"
      );
      return;
    }

    setLoading(tierId);
    try {
      const billing = forcedBilling || getBillingCycle(tierId);
      
      const response = await apiRequest("POST", "/api/create-checkout-session", {
        tier: tierId,
        billing,
        coverage: coverage !== "single" ? coverage : undefined,
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to initiate checkout. Please try again.",
        variant: "destructive",
      });
      setLoading(null);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-accent/10 py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-8 text-center">
          <Badge className="mb-4" variant="secondary">
            For Businesses
          </Badge>
          <h1 className="font-heading text-4xl md:text-5xl font-bold mb-4">
            Get More Jobs. Grow Your Hydro Vac or Disposal Facility Business
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
            Join hundreds of hydro-vac companies and disposal facilities reaching contractors and clients nationwide. Choose the plan that fits your business needs.
          </p>

          {/* Why Contractors Choose HydroVacFinder */}
          <div className="flex flex-col gap-5 max-w-5xl mx-auto text-center mb-12">
            <h2 className="font-heading text-2xl md:text-3xl font-bold">
              Why Contractors Choose HydroVacFinder
            </h2>
            <p className="text-base text-muted-foreground">
              HydroVacFinder is the industry's most trusted hydro vac directory—helping contractors, project managers, utilities, and pipeline crews quickly locate the right hydro-excavation company or disposal facility with zero downtime.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-4">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-3">
                  <Check className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Nationwide Hydro Vac Directory</h3>
                <p className="text-sm text-muted-foreground">
                  Search hydro-excavation companies and disposal facilities across all 50 states.
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-3">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Fast, Accurate Search Results</h3>
                <p className="text-sm text-muted-foreground">
                  Find companies, offload sites, and contacts in seconds with clean, reliable data.
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-3">
                  <Map className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">State-by-State Organization</h3>
                <p className="text-sm text-muted-foreground">
                  Every listing is organized by state and service type to eliminate job delays.
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-3">
                  <Star className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Built for Contractors & Field Teams</h3>
                <p className="text-sm text-muted-foreground">
                  Designed specifically for operators, dispatchers, foremen, and project supervisors.
                </p>
              </div>
            </div>

            <h3 className="font-heading text-xl md:text-2xl font-bold mt-8">
              Why Advertise with HydroVacFinder?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-4">
              <div className="flex flex-col items-start text-left">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 mb-3">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-semibold mb-2">Reach Your Target Market</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Connect directly with contractors, construction companies, and property managers actively searching for hydro-vac services.
                </p>
              </div>
              <div className="flex flex-col items-start text-left">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 mb-3">
                  <Star className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-semibold mb-2">Build Trust & Credibility</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Verification badges and customer reviews help establish your company as a trusted industry leader.
                </p>
              </div>
              <div className="flex flex-col items-start text-left">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 mb-3">
                  <Check className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-semibold mb-2">Simple & Transparent Pricing</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  No hidden fees or long-term contracts. Cancel anytime with just a few clicks.
                </p>
              </div>
              <div className="flex flex-col items-start text-left">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 mb-3">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-semibold mb-2">Track Your Results</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Monitor profile views, lead submissions, and conversion metrics with detailed analytics.
                </p>
              </div>
            </div>
          </div>

          {/* Coverage Selector */}
          <div className="max-w-md mx-auto mb-2">
            <div className="flex items-center justify-center gap-3 mb-3">
              <Map className="h-5 w-5 text-primary" />
              <label className="text-sm font-medium text-foreground">
                Multi-State Coverage
              </label>
              <Badge variant="secondary" className="text-xs">
                Preview
              </Badge>
            </div>
            <Select value={coverage} onValueChange={setCoverage}>
              <SelectTrigger className="w-full" data-testid="select-coverage">
                <SelectValue placeholder="Select coverage area" />
              </SelectTrigger>
              <SelectContent className="z-[100]">
                <SelectItem value="single" data-testid="option-coverage-single">
                  Single State (Standard Pricing)
                </SelectItem>
                {coverageTiers.map((tier) => (
                  <SelectItem 
                    key={tier.id} 
                    value={tier.id}
                    data-testid={`option-coverage-${tier.id}`}
                  >
                    {tier.name} ({tier.multiplier}× price)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {coverage !== "single" && selectedCoverageTier && (
              <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="text-sm text-foreground text-center mb-2">
                  <strong>{selectedCoverageTier.name}:</strong> Estimated pricing is {selectedCoverageTier.multiplier}× the base rate
                </p>
                <p className="text-xs text-muted-foreground text-center">
                  Multi-state coverage requires custom setup. Contact our sales team for details.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section id="pricing-tiers" className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4 md:px-8">
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {tiers.map((tier) => {
                const Icon = iconMap[tier.id] || Check;
                const tierBillingCycle = getBillingCycle(tier.id);
                const isPopular = tier.popular === "yes";

                return (
                  <Card
                    key={tier.id}
                    className={`relative flex flex-col ${
                      isPopular ? "border-primary shadow-lg" : ""
                    }`}
                    data-testid={`card-pricing-${tier.id}`}
                  >
                    {isPopular && (
                      <Badge
                        className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary"
                        data-testid="badge-popular"
                      >
                        Most Popular
                      </Badge>
                    )}

                    <CardHeader className="text-center pb-8">
                      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                        <Icon className="h-7 w-7 text-primary" />
                      </div>
                      <CardTitle className="text-2xl font-bold" data-testid={`text-tier-name-${tier.id}`}>
                        {tier.name}
                      </CardTitle>
                      <CardDescription className="mt-2" data-testid={`text-tier-description-${tier.id}`}>
                        {tier.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="flex-1 space-y-6">
                      {/* Pricing */}
                      <div className="text-center space-y-3">
                        <div className="space-y-2">
                          <button
                            onClick={() => setBillingCycle(tier.id, "monthly")}
                            className={`w-full min-h-[76px] p-3 rounded-lg border-2 transition-all hover-elevate ${
                              tierBillingCycle === "monthly" 
                                ? "border-primary bg-primary/5" 
                                : "border-border bg-muted/30"
                            }`}
                            data-testid={`button-select-monthly-${tier.id}`}
                          >
                            <div className="flex items-baseline justify-center gap-1">
                              <span className={`text-3xl font-bold ${
                                tierBillingCycle === "monthly" ? "text-primary" : "text-foreground"
                              }`} data-testid={`text-price-monthly-${tier.id}`}>
                                ${(parseFloat(tier.monthlyPrice || "0") * coverageMultiplier).toFixed(0)}
                              </span>
                              <span className="text-muted-foreground text-sm">/month</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Billed monthly</p>
                          </button>
                          
                          <button
                            onClick={() => setBillingCycle(tier.id, "annual")}
                            className={`w-full min-h-[92px] p-3 rounded-lg border-2 transition-all hover-elevate ${
                              tierBillingCycle === "annual" 
                                ? "border-primary bg-primary/5" 
                                : "border-border bg-muted/30"
                            }`}
                            data-testid={`button-select-annual-${tier.id}`}
                          >
                            <div className="flex items-baseline justify-center gap-1">
                              <span className={`text-3xl font-bold ${
                                tierBillingCycle === "annual" ? "text-primary" : "text-foreground"
                              }`} data-testid={`text-price-annual-${tier.id}`}>
                                ${(parseFloat(tier.annualPrice || "0") * coverageMultiplier).toFixed(0)}
                              </span>
                              <span className="text-muted-foreground text-sm">/year</span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1 flex-wrap">
                              <span>That's only ${((parseFloat(tier.annualPrice || "0") * coverageMultiplier) / 12).toFixed(0)}/month</span>
                              <Badge className="bg-green-500 text-white text-xs px-1.5 py-0">
                                Save ${(parseFloat(tier.monthlyPrice || "0") * 12 * coverageMultiplier - parseFloat(tier.annualPrice || "0") * coverageMultiplier).toFixed(0)}
                              </Badge>
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* Features */}
                      <ul className="space-y-3">
                        {tier.features?.map((feature, i) => (
                          <li key={i} className="flex items-start gap-3" data-testid={`feature-${tier.id}-${i}`}>
                            <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                            <span className="text-sm leading-relaxed">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>

                    <CardFooter className="flex flex-col gap-2">
                      <Button
                        className="w-full"
                        variant="default"
                        size="lg"
                        onClick={() => handleSubscribe(tier.id)}
                        disabled={loading === tier.id}
                        data-testid={`button-subscribe-${tier.id}`}
                      >
                        {loading === tier.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          "Get Started"
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* State Landing Page - Premium Add-On */}
      {stateLandingTier && (
        <section className="py-16 md:py-24 bg-gradient-to-br from-purple-50 via-background to-blue-50 dark:from-purple-950/20 dark:via-background dark:to-blue-950/20">
          <div className="container mx-auto px-4 md:px-8">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <Badge className="mb-4 bg-purple-500 text-white">Premium Feature</Badge>
                <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
                  Own an Entire State
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                  Dominate your market with exclusive state-wide branding and priority placement
                </p>
              </div>

              <Card className="border-2 border-purple-500/20 shadow-xl">
                <CardHeader className="text-center pb-6">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-500/10">
                    <MapPin className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  <CardTitle className="text-3xl font-bold">{stateLandingTier.name}</CardTitle>
                  <CardDescription className="mt-2 text-base">
                    {stateLandingTier.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-8">
                  {/* Pricing */}
                  <div className="text-center p-6 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-lg">
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-5xl font-bold text-purple-600 dark:text-purple-400">
                        ${parseFloat(stateLandingTier.annualPrice || "0").toLocaleString()}
                      </span>
                      <span className="text-xl text-muted-foreground">/year</span>
                    </div>
                  </div>

                  {/* Features in 2 columns */}
                  <div className="grid md:grid-cols-2 gap-x-8 gap-y-3">
                    {stateLandingTier.features?.map((feature, i) => (
                      <div key={i} className="flex items-start gap-3" data-testid={`feature-state-landing-${i}`}>
                        <Check className="h-5 w-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                        <span className="text-sm leading-relaxed">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Example Preview */}
                  <div className="p-4 bg-muted/50 rounded-lg border border-border">
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Example</p>
                    <p className="text-sm">
                      Your company will own <span className="font-semibold text-purple-600 dark:text-purple-400">/state/TX</span> with your custom branding, hero image, and priority placement for all Texas searches.
                    </p>
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-2">
                  <Button
                    className="w-full bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600"
                    size="lg"
                    onClick={() => window.location.href = '/contact'}
                    data-testid="button-subscribe-state-landing"
                  >
                    <MapPin className="mr-2 h-4 w-4" />
                    Contact Sales
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    State landing pages require custom setup. Contact us to discuss your needs.
                  </p>
                </CardFooter>
              </Card>
            </div>
          </div>
        </section>
      )}

      {/* Disposal Site State Landing Page - Premium Add-On */}
      {disposalSiteLandingTier && (
        <section className="py-16 md:py-24 bg-gradient-to-br from-blue-50 via-background to-green-50 dark:from-blue-950/20 dark:via-background dark:to-green-950/20">
          <div className="container mx-auto px-4 md:px-8">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <Badge className="mb-4 bg-blue-500 text-white">Premium Feature</Badge>
                <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
                  Own an Entire State - Disposal Sites
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                  Dominate disposal site searches with exclusive state-wide branding and priority placement
                </p>
              </div>

              <Card className="border-2 border-blue-500/20 shadow-xl">
                <CardHeader className="text-center pb-6">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10">
                    <MapPin className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <CardTitle className="text-3xl font-bold">{disposalSiteLandingTier.name}</CardTitle>
                  <CardDescription className="mt-2 text-base">
                    {disposalSiteLandingTier.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-8">
                  {/* Pricing */}
                  <div className="text-center p-6 bg-gradient-to-br from-blue-500/10 to-green-500/10 rounded-lg">
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-5xl font-bold text-blue-600 dark:text-blue-400">
                        ${parseFloat(disposalSiteLandingTier.annualPrice || "0").toLocaleString()}
                      </span>
                      <span className="text-xl text-muted-foreground">/year</span>
                    </div>
                  </div>

                  {/* Features in 2 columns */}
                  <div className="grid md:grid-cols-2 gap-x-8 gap-y-3">
                    {disposalSiteLandingTier.features?.map((feature, i) => (
                      <div key={i} className="flex items-start gap-3" data-testid={`feature-disposal-site-landing-${i}`}>
                        <Check className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                        <span className="text-sm leading-relaxed">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Example Preview */}
                  <div className="p-4 bg-muted/50 rounded-lg border border-border">
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Example</p>
                    <p className="text-sm">
                      Your disposal facility will own <span className="font-semibold text-blue-600 dark:text-blue-400">/disposal-sites/CA</span> with your custom branding, facility images, and priority placement for all California disposal site searches.
                    </p>
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-2">
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                    size="lg"
                    onClick={() => window.location.href = '/contact'}
                    data-testid="button-subscribe-disposal-site-landing"
                  >
                    <MapPin className="mr-2 h-4 w-4" />
                    Contact Sales
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Disposal site landing pages require custom setup. Contact us to discuss your needs.
                  </p>
                </CardFooter>
              </Card>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 md:px-8 text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
            Ready to Grow Your Business?
          </h2>
          <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto mb-8 leading-relaxed">
            Join the leading hydro-vac service directory and start connecting with customers today.
          </p>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => {
              const pricingSection = document.getElementById("pricing-tiers");
              if (pricingSection) {
                pricingSection.scrollIntoView({ behavior: "smooth", block: "start" });
              }
            }}
            data-testid="button-cta-scroll-pricing"
          >
            View All Pricing Options
          </Button>
        </div>
      </section>
    </div>
  );
}
