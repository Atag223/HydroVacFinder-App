import { useQuery } from "@tanstack/react-query";
import type { Partner } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

export default function PartnerSection() {
  const { data: partners, isLoading } = useQuery<Partner[]>({
    queryKey: ["/api/partners"],
  });

  if (isLoading) {
    return (
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4 md:px-8">
          <h2 className="text-center font-heading text-2xl font-semibold mb-8">Trusted by Industry Leaders</h2>
          <div className="flex flex-wrap justify-center items-center gap-8">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-32" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!partners || partners.length === 0) {
    return null;
  }

  const featuredPartners = partners.filter(p => p.featured === "yes");

  return (
    <section className="py-12 bg-muted/30">
      <div className="container mx-auto px-4 md:px-8">
        <h2 className="text-center font-heading text-2xl font-semibold mb-8 text-muted-foreground">
          Trusted by Industry Leaders
        </h2>
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
          {featuredPartners.map((partner) => (
            <a
              key={partner.id}
              href={partner.websiteUrl || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="hover-elevate rounded-lg p-4 transition-all"
              data-testid={`partner-${partner.id}`}
            >
              {partner.logoUrl ? (
                <img
                  src={partner.logoUrl}
                  alt={partner.name}
                  className="h-12 md:h-16 w-auto object-contain grayscale hover:grayscale-0 transition-all opacity-70 hover:opacity-100"
                />
              ) : (
                <div className="h-12 md:h-16 flex items-center px-6">
                  <span className="text-lg font-semibold text-muted-foreground">{partner.name}</span>
                </div>
              )}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
