import {
  companies,
  disposalSites,
  partners,
  pricingTiers,
  coverageTiers,
  tierCoveragePricing,
  subscriptions,
  companyAnalytics,
  stateLandingPages,
  disposalSiteLandingPages,
  type Company,
  type DisposalSite,
  type Partner,
  type PricingTier,
  type CoverageTier,
  type TierCoveragePricing,
  type Subscription,
  type CompanyAnalytics,
  type StateLandingPage,
  type DisposalSiteLandingPage,
  type InsertCompany,
  type InsertDisposalSite,
  type InsertPartner,
  type InsertPricingTier,
  type InsertCoverageTier,
  type InsertSubscription,
  type InsertCompanyAnalytics,
  type InsertStateLandingPage,
  type InsertDisposalSiteLandingPage,
} from "@shared/schema";
import { db } from "./db";
import { eq, asc, sql, count, desc } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // Company operations
  getAllCompanies(): Promise<Company[]>;
  getCompany(id: number): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: number, company: Partial<InsertCompany>): Promise<Company | undefined>;
  deleteCompany(id: number): Promise<void>;

  // Disposal site operations
  getAllDisposalSites(): Promise<DisposalSite[]>;
  getDisposalSite(id: number): Promise<DisposalSite | undefined>;
  createDisposalSite(site: InsertDisposalSite): Promise<DisposalSite>;
  updateDisposalSite(id: number, site: Partial<InsertDisposalSite>): Promise<DisposalSite | undefined>;
  deleteDisposalSite(id: number): Promise<void>;

  // Partner operations
  getAllPartners(): Promise<Partner[]>;
  getPartner(id: number): Promise<Partner | undefined>;
  createPartner(partner: InsertPartner): Promise<Partner>;

  // Pricing tier operations
  getAllPricingTiers(): Promise<PricingTier[]>;
  getPricingTier(id: string): Promise<PricingTier | undefined>;
  createPricingTier(tier: InsertPricingTier): Promise<PricingTier>;

  // Coverage tier operations (for multi-state pricing)
  getAllCoverageTiers(): Promise<CoverageTier[]>;
  getCoverageTier(id: string): Promise<CoverageTier | undefined>;
  
  // Tier coverage pricing operations (Stripe price IDs for tier + coverage combinations)
  getTierCoveragePricing(tierId: string, coverageId: string, billingCycle: string): Promise<TierCoveragePricing | undefined>;

  // Subscription operations
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: number, subscription: Partial<InsertSubscription>): Promise<Subscription | undefined>;
  getSubscriptionByStripeId(stripeSubscriptionId: string): Promise<Subscription | undefined>;
  getActiveSubscriptionByEmail(email: string): Promise<Subscription | undefined>;
  getUnmatchedSubscriptions(): Promise<Subscription[]>;

  // Analytics operations
  trackAnalytics(data: InsertCompanyAnalytics): Promise<CompanyAnalytics>;
  getCompanyAnalytics(companyId: number): Promise<{ total: number; byEventType: Record<string, number>; bySource: Record<string, number> }>;
  getAllCompanyAnalyticsSummary(): Promise<Array<{ companyId: number; companyName: string; totalClicks: number; tier: string }>>;

  // State landing page operations
  getAllStateLandingPages(): Promise<StateLandingPage[]>;
  getStateLandingPageByStateCode(stateCode: string): Promise<StateLandingPage | undefined>;
  createStateLandingPage(page: InsertStateLandingPage): Promise<StateLandingPage>;
  updateStateLandingPage(id: number, page: Partial<InsertStateLandingPage>): Promise<StateLandingPage | undefined>;

  // Disposal site landing page operations
  getAllDisposalSiteLandingPages(): Promise<DisposalSiteLandingPage[]>;
  getDisposalSiteLandingPageByStateCode(stateCode: string): Promise<DisposalSiteLandingPage | undefined>;
  createDisposalSiteLandingPage(page: InsertDisposalSiteLandingPage): Promise<DisposalSiteLandingPage>;
  updateDisposalSiteLandingPage(id: number, page: Partial<InsertDisposalSiteLandingPage>): Promise<DisposalSiteLandingPage | undefined>;

  // Location-based search operations
  getCompaniesByRadius(lat: number, lng: number, radiusMiles: number, searchAddress?: string): Promise<Company[]>;
  getDisposalSitesByRadius(lat: number, lng: number, radiusMiles: number, searchAddress?: string): Promise<DisposalSite[]>;
}

export class DatabaseStorage implements IStorage {
  // ────────────────────────────────────────────────
  // Company operations
  // ────────────────────────────────────────────────
  
  async getAllCompanies(): Promise<Company[]> {
    return await db.select().from(companies);
  }

  async getCompany(id: number): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company;
  }

  async createCompany(insertCompany: InsertCompany): Promise<Company> {
    const [company] = await db.insert(companies).values(insertCompany as typeof companies.$inferInsert).returning();
    return company;
  }

  async updateCompany(id: number, updateData: Partial<InsertCompany>): Promise<Company | undefined> {
    const [company] = await db
      .update(companies)
      .set(updateData as any)
      .where(eq(companies.id, id))
      .returning();
    return company;
  }

  async deleteCompany(id: number): Promise<void> {
    // Start a transaction to ensure all cleanup happens atomically
    await db.transaction(async (tx) => {
      // 1. Null out subscription links (so they can be re-matched to future companies)
      await tx
        .update(subscriptions)
        .set({ companyId: null })
        .where(eq(subscriptions.companyId, id));
      
      // 2. Delete company analytics
      await tx
        .delete(companyAnalytics)
        .where(eq(companyAnalytics.companyId, id));
      
      // 3. Delete state landing pages linked to this company
      await tx
        .delete(stateLandingPages)
        .where(eq(stateLandingPages.companyId, id));
      
      // 4. Finally, delete the company itself
      await tx.delete(companies).where(eq(companies.id, id));
    });
  }

  // ────────────────────────────────────────────────
  // Disposal site operations
  // ────────────────────────────────────────────────
  
  async getAllDisposalSites(): Promise<DisposalSite[]> {
    return await db.select().from(disposalSites);
  }

  async getDisposalSite(id: number): Promise<DisposalSite | undefined> {
    const [site] = await db.select().from(disposalSites).where(eq(disposalSites.id, id));
    return site;
  }

  async createDisposalSite(insertSite: InsertDisposalSite): Promise<DisposalSite> {
    const [site] = await db.insert(disposalSites).values(insertSite as typeof disposalSites.$inferInsert).returning();
    return site;
  }

  async updateDisposalSite(id: number, updateData: Partial<InsertDisposalSite>): Promise<DisposalSite | undefined> {
    const [site] = await db
      .update(disposalSites)
      .set(updateData as any)
      .where(eq(disposalSites.id, id))
      .returning();
    return site;
  }

  async deleteDisposalSite(id: number): Promise<void> {
    // Start a transaction to ensure all cleanup happens atomically
    await db.transaction(async (tx) => {
      // 1. Null out subscription links (so they can be re-matched to future disposal sites)
      await tx
        .update(subscriptions)
        .set({ disposalSiteId: null })
        .where(eq(subscriptions.disposalSiteId, id));
      
      // 2. Delete disposal site landing pages linked to this site
      await tx
        .delete(disposalSiteLandingPages)
        .where(eq(disposalSiteLandingPages.disposalSiteId, id));
      
      // 3. Finally, delete the disposal site itself
      await tx.delete(disposalSites).where(eq(disposalSites.id, id));
    });
  }

  // ────────────────────────────────────────────────
  // Partner operations
  // ────────────────────────────────────────────────
  
  async getAllPartners(): Promise<Partner[]> {
    return await db.select().from(partners);
  }

  async getPartner(id: number): Promise<Partner | undefined> {
    const [partner] = await db.select().from(partners).where(eq(partners.id, id));
    return partner;
  }

  async createPartner(insertPartner: InsertPartner): Promise<Partner> {
    const [partner] = await db.insert(partners).values(insertPartner).returning();
    return partner;
  }

  // ────────────────────────────────────────────────
  // Pricing tier operations
  // ────────────────────────────────────────────────
  
  async getAllPricingTiers(): Promise<PricingTier[]> {
    return await db.select().from(pricingTiers).orderBy(asc(pricingTiers.displayOrder));
  }

  async getPricingTier(id: string): Promise<PricingTier | undefined> {
    const [tier] = await db.select().from(pricingTiers).where(eq(pricingTiers.id, id));
    return tier;
  }

  async createPricingTier(insertTier: InsertPricingTier): Promise<PricingTier> {
    const [tier] = await db.insert(pricingTiers).values(insertTier).returning();
    return tier;
  }

  // ────────────────────────────────────────────────
  // Coverage tier operations (for multi-state pricing)
  // ────────────────────────────────────────────────

  async getAllCoverageTiers(): Promise<CoverageTier[]> {
    return await db.select().from(coverageTiers).orderBy(asc(coverageTiers.displayOrder));
  }

  async getCoverageTier(id: string): Promise<CoverageTier | undefined> {
    const [tier] = await db.select().from(coverageTiers).where(eq(coverageTiers.id, id));
    return tier;
  }

  async getTierCoveragePricing(tierId: string, coverageId: string, billingCycle: string): Promise<TierCoveragePricing | undefined> {
    const [pricing] = await db.select().from(tierCoveragePricing)
      .where(sql`${tierCoveragePricing.tierId} = ${tierId} AND ${tierCoveragePricing.coverageId} = ${coverageId} AND ${tierCoveragePricing.billingCycle} = ${billingCycle}`);
    return pricing;
  }

  // ────────────────────────────────────────────────
  // Subscription operations
  // ────────────────────────────────────────────────

  async createSubscription(subscription: InsertSubscription): Promise<Subscription> {
    const [sub] = await db.insert(subscriptions).values(subscription).returning();
    return sub;
  }

  async updateSubscription(id: number, subscription: Partial<InsertSubscription>): Promise<Subscription | undefined> {
    const [updated] = await db.update(subscriptions)
      .set({ ...subscription, updatedAt: new Date() })
      .where(eq(subscriptions.id, id))
      .returning();
    return updated;
  }

  async getSubscriptionByStripeId(stripeSubscriptionId: string): Promise<Subscription | undefined> {
    const [sub] = await db.select().from(subscriptions)
      .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId));
    return sub;
  }

  async getActiveSubscriptionByEmail(email: string): Promise<Subscription | undefined> {
    const normalizedEmail = email.toLowerCase().trim();
    const [sub] = await db.select().from(subscriptions)
      .where(sql`LOWER(TRIM(${subscriptions.customerEmail})) = ${normalizedEmail} AND ${subscriptions.status} = 'active' AND ${subscriptions.companyId} IS NULL AND ${subscriptions.disposalSiteId} IS NULL`)
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);
    return sub;
  }

  async getUnmatchedSubscriptions(): Promise<Subscription[]> {
    return await db.select().from(subscriptions)
      .where(sql`${subscriptions.status} = 'active' AND ${subscriptions.companyId} IS NULL AND ${subscriptions.disposalSiteId} IS NULL`)
      .orderBy(desc(subscriptions.createdAt));
  }

  // ────────────────────────────────────────────────
  // Analytics operations
  // ────────────────────────────────────────────────

  async trackAnalytics(data: InsertCompanyAnalytics): Promise<CompanyAnalytics> {
    const [analytics] = await db.insert(companyAnalytics).values(data).returning();
    return analytics;
  }

  async getCompanyAnalytics(companyId: number): Promise<{ total: number; byEventType: Record<string, number>; bySource: Record<string, number> }> {
    const allEvents = await db
      .select()
      .from(companyAnalytics)
      .where(eq(companyAnalytics.companyId, companyId));

    const total = allEvents.length;
    const byEventType: Record<string, number> = {};
    const bySource: Record<string, number> = {};

    allEvents.forEach((event) => {
      byEventType[event.eventType] = (byEventType[event.eventType] || 0) + 1;
      bySource[event.source] = (bySource[event.source] || 0) + 1;
    });

    return { total, byEventType, bySource };
  }

  async getAllCompanyAnalyticsSummary(): Promise<Array<{ companyId: number; companyName: string; totalClicks: number; tier: string }>> {
    const results = await db
      .select({
        companyId: companyAnalytics.companyId,
        companyName: companies.name,
        tier: companies.tier,
        totalClicks: count(companyAnalytics.id),
      })
      .from(companyAnalytics)
      .innerJoin(companies, eq(companyAnalytics.companyId, companies.id))
      .groupBy(companyAnalytics.companyId, companies.name, companies.tier)
      .orderBy(desc(count(companyAnalytics.id)));

    return results.map(r => ({
      companyId: r.companyId,
      companyName: r.companyName,
      totalClicks: Number(r.totalClicks),
      tier: r.tier || "free",
    }));
  }

  // ────────────────────────────────────────────────
  // State landing page operations
  // ────────────────────────────────────────────────
  
  async getAllStateLandingPages(): Promise<StateLandingPage[]> {
    return await db.select().from(stateLandingPages);
  }

  async getStateLandingPageByStateCode(stateCode: string): Promise<StateLandingPage | undefined> {
    const result = await db
      .select()
      .from(stateLandingPages)
      .where(eq(stateLandingPages.stateCode, stateCode.toUpperCase()));
    
    return result[0];
  }

  async createStateLandingPage(insertPage: InsertStateLandingPage): Promise<StateLandingPage> {
    const [page] = await db.insert(stateLandingPages).values(insertPage).returning();
    return page;
  }

  async updateStateLandingPage(id: number, updateData: Partial<InsertStateLandingPage>): Promise<StateLandingPage | undefined> {
    const [page] = await db
      .update(stateLandingPages)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(stateLandingPages.id, id))
      .returning();
    return page;
  }

  // ────────────────────────────────────────────────
  // Disposal site landing page operations
  // ────────────────────────────────────────────────
  
  async getAllDisposalSiteLandingPages(): Promise<DisposalSiteLandingPage[]> {
    return await db.select().from(disposalSiteLandingPages);
  }

  async getDisposalSiteLandingPageByStateCode(stateCode: string): Promise<DisposalSiteLandingPage | undefined> {
    const [page] = await db
      .select()
      .from(disposalSiteLandingPages)
      .where(eq(disposalSiteLandingPages.stateCode, stateCode.toUpperCase()));
    return page;
  }

  async createDisposalSiteLandingPage(insertPage: InsertDisposalSiteLandingPage): Promise<DisposalSiteLandingPage> {
    const [page] = await db.insert(disposalSiteLandingPages).values(insertPage).returning();
    return page;
  }

  async updateDisposalSiteLandingPage(id: number, updateData: Partial<InsertDisposalSiteLandingPage>): Promise<DisposalSiteLandingPage | undefined> {
    const [page] = await db
      .update(disposalSiteLandingPages)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(disposalSiteLandingPages.id, id))
      .returning();
    return page;
  }

  // ────────────────────────────────────────────────
  // Location-based search operations
  // ────────────────────────────────────────────────

  async getCompaniesByRadius(lat: number, lng: number, radiusMiles: number, searchAddress?: string): Promise<Company[]> {
    const allCompanies = await this.getAllCompanies();
    
    const matched = allCompanies.filter(company => {
      // Check main location radius
      if (company.lat && company.lng) {
        const companyLat = parseFloat(company.lat);
        const companyLng = parseFloat(company.lng);
        const distance = this.calculateDistance(lat, lng, companyLat, companyLng);
        
        if (distance <= radiusMiles) {
          return true; // Main location is within radius
        }
      }
      
      // Check if any additional locations are within radius
      if (company.additionalLocations) {
        try {
          const locations = typeof company.additionalLocations === 'string'
            ? JSON.parse(company.additionalLocations)
            : company.additionalLocations;
          
          if (Array.isArray(locations) && locations.length > 0) {
            // Check if any additional location is within radius using its coordinates
            const matchesAdditionalLocation = locations.some((loc: any) => {
              if (loc.lat && loc.lng) {
                const locDistance = this.calculateDistance(lat, lng, loc.lat, loc.lng);
                if (locDistance <= radiusMiles) {
                  return true;
                }
              }
              return false;
            });
            
            if (matchesAdditionalLocation) {
              return true;
            }
          }
        } catch (e) {
          // Skip locations with parsing errors
        }
      }
      
      return false;
    });
    
    return matched;
  }

  async getDisposalSitesByRadius(lat: number, lng: number, radiusMiles: number, searchAddress?: string): Promise<DisposalSite[]> {
    const allSites = await this.getAllDisposalSites();
    
    return allSites.filter(site => {
      // Check main location radius
      if (site.lat && site.lng) {
        const siteLat = parseFloat(site.lat);
        const siteLng = parseFloat(site.lng);
        const distance = this.calculateDistance(lat, lng, siteLat, siteLng);
        
        if (distance <= radiusMiles) {
          return true; // Main location is within radius
        }
      }
      
      // Also check if search address matches any additional locations
      if (searchAddress && site.additionalLocations) {
        try {
          const locations = typeof site.additionalLocations === 'string'
            ? JSON.parse(site.additionalLocations)
            : site.additionalLocations;
          
          if (Array.isArray(locations)) {
            const searchLower = searchAddress.toLowerCase();
            const matchesAdditionalLocation = locations.some((loc: any) => {
              const cityMatch = loc.city && searchLower.includes(loc.city.toLowerCase());
              const addressMatch = loc.address && searchLower.includes(loc.address.toLowerCase());
              return cityMatch || addressMatch;
            });
            
            if (matchesAdditionalLocation) {
              return true; // Additional location matches search
            }
          }
        } catch (e) {
          // If parsing fails, skip additional locations
        }
      }
      
      return false;
    });
  }

  // Haversine formula to calculate distance between two points in miles
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

export const storage = new DatabaseStorage();
