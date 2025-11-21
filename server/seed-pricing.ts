import { db } from "./db";
import { pricingTiers } from "@shared/schema";
import { eq } from "drizzle-orm";

async function updatePricingTiers() {
  console.log("Updating pricing tiers...");

  const tiers = [
    {
      id: "verified",
      name: "Verified Listing",
      description: "Small-to-mid-size hydro-vac contractors or offload sites wanting more visibility",
      monthlyPrice: "100.00",
      annualPrice: "1000.00",
      stripeMonthlyPriceId: "price_1SOgpR74tBoG6aobPKF3eeR4",
      stripeAnnualPriceId: "price_1SOhaZ74tBoG6aobbyvAN6jh",
      features: [
        "Verified badge beside your company name",
        "Company logo, phone number, and website",
        "Priority placement in local search results",
        "Link to Google Maps + click-to-call integration",
        "Inclusion in disposal site locator (if applicable)"
      ],
      popular: "no",
      displayOrder: 1,
    },
    {
      id: "featured",
      name: "Featured Listing",
      description: "Regional companies seeking steady leads and higher visibility in multiple markets",
      monthlyPrice: "125.00",
      annualPrice: "1250.00",
      stripeMonthlyPriceId: "price_1SOhcp74tBoG6aobhP9J3eYS",
      stripeAnnualPriceId: "price_1SOhdK74tBoG6aobRypLD2jL",
      features: [
        "Top-of-search placement with blue highlight box",
        "Company logo, website, and clickable phone number",
        "Verified badge + Featured pin on map",
        "Rotating homepage \"Featured Company\" spot",
        "Direct contact form link"
      ],
      popular: "yes",
      displayOrder: 2,
    },
    {
      id: "premium",
      name: "Premium Partner",
      description: "Established hydro-vac fleets or disposal networks with multiple service areas",
      monthlyPrice: "150.00",
      annualPrice: "1500.00",
      stripeMonthlyPriceId: "price_1SOheU74tBoG6aoblHKxy8PL",
      stripeAnnualPriceId: "price_1SOheo74tBoG6aoba8XDZP31",
      features: [
        "Statewide visibility across all searches",
        "Banner ad placement on homepage",
        "Featured map pin and priority listing",
        "Company logo in website footer carousel",
        "Quarterly analytics report (views, leads, click-throughs)",
        "Optional featured post on HydroVacFinder social media"
      ],
      popular: "no",
      displayOrder: 3,
    }
  ];

  for (const tier of tiers) {
    // Update or insert each tier
    const existing = await db.select().from(pricingTiers).where(eq(pricingTiers.id, tier.id));
    
    if (existing.length > 0) {
      await db.update(pricingTiers)
        .set({
          name: tier.name,
          description: tier.description,
          monthlyPrice: tier.monthlyPrice,
          annualPrice: tier.annualPrice,
          stripeMonthlyPriceId: tier.stripeMonthlyPriceId,
          stripeAnnualPriceId: tier.stripeAnnualPriceId,
          features: tier.features,
          popular: tier.popular,
          displayOrder: tier.displayOrder,
        })
        .where(eq(pricingTiers.id, tier.id));
      console.log(`✓ Updated ${tier.id}`);
    } else {
      await db.insert(pricingTiers).values(tier);
      console.log(`✓ Inserted ${tier.id}`);
    }
  }

  console.log("✅ Pricing tiers updated successfully");
}

updatePricingTiers()
  .catch((error) => {
    console.error("Error updating pricing tiers:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
