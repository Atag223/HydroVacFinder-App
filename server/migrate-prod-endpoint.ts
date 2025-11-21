// PRODUCTION MIGRATION ENDPOINT
// This file creates a special endpoint to migrate data to production
// Only use this ONCE to populate your production database

import { Request, Response } from "express";
import { db } from "./db";
import { companies, disposalSites, partners, stateLandingPages, disposalSiteLandingPages } from "@shared/schema";
import * as fs from "fs";
import * as path from "path";

// Check if we have the migration data files
const hasExportedData = () => {
  try {
    const dataDir = path.join(process.cwd(), "server", "migration-data");
    return fs.existsSync(path.join(dataDir, "companies_export.json")) && 
           fs.existsSync(path.join(dataDir, "disposal_sites_export.json"));
  } catch {
    return false;
  }
};

export async function handleProductionMigration(req: Request, res: Response) {
  // Security: Check for secret key to prevent unauthorized access
  const { secretKey } = req.body;
  
  if (secretKey !== process.env.ADMIN_MIGRATION_KEY) {
    return res.status(403).json({ error: "Unauthorized - invalid migration key" });
  }

  // Check if data files exist
  if (!hasExportedData()) {
    return res.status(400).json({ 
      error: "Migration data files not found. Please export data first.",
      instructions: "Run the export commands in your development environment first."
    });
  }

  try {
    console.log("🚀 Starting production migration...");
    
    // Read exported data from codebase
    const dataDir = path.join(process.cwd(), "server", "migration-data");
    const companiesData = JSON.parse(fs.readFileSync(path.join(dataDir, "companies_export.json"), "utf-8"));
    const disposalSitesData = JSON.parse(fs.readFileSync(path.join(dataDir, "disposal_sites_export.json"), "utf-8"));
    const partnersData = JSON.parse(fs.readFileSync(path.join(dataDir, "partners_export.json"), "utf-8"));
    const stateLandingPagesData = JSON.parse(fs.readFileSync(path.join(dataDir, "state_landing_pages_export.json"), "utf-8"));
    const disposalSiteLandingPagesData = JSON.parse(fs.readFileSync(path.join(dataDir, "disposal_site_landing_pages_export.json"), "utf-8"));

    console.log(`Data counts: ${companiesData?.length || 0} companies, ${disposalSitesData?.length || 0} sites`);

    // Clear existing data
    await db.delete(companies);
    await db.delete(disposalSites);
    await db.delete(partners);
    await db.delete(stateLandingPages);
    await db.delete(disposalSiteLandingPages);

    // Import companies in batches
    let importedCompanies = 0;
    if (companiesData && companiesData.length > 0) {
      const batchSize = 50;
      for (let i = 0; i < companiesData.length; i += batchSize) {
        const batch = companiesData.slice(i, i + batchSize);
        const processedBatch = batch.map((company: any) => ({
          name: company.name,
          address: company.address,
          phone: company.phone,
          email: company.email || null,
          website: company.website || null,
          description: company.description || null,
          services: company.services || null,
          coverageArea: company.coverage_area || company.coverageArea || null,
          lat: company.lat,
          lng: company.lng,
          tier: company.tier || "free",
          googlePlaceId: company.google_place_id || company.googlePlaceId || null,
          dataSource: company.data_source || company.dataSource || "manual",
          unionAffiliated: company.union_affiliated || company.unionAffiliated || false,
        }));
        
        await db.insert(companies).values(processedBatch);
        importedCompanies += processedBatch.length;
      }
    }

    // Import disposal sites
    let importedSites = 0;
    if (disposalSitesData && disposalSitesData.length > 0) {
      const processedSites = disposalSitesData.map((site: any) => ({
        name: site.name,
        address: site.address,
        phone: site.phone || null,
        email: site.email || null,
        website: site.website || null,
        description: site.description || null,
        materialsAccepted: site.materials_accepted || site.materialsAccepted || null,
        hours: site.hours || null,
        lat: site.lat,
        lng: site.lng,
        googlePlaceId: site.google_place_id || site.googlePlaceId || null,
        dataSource: site.data_source || site.dataSource || "manual",
      }));
      
      await db.insert(disposalSites).values(processedSites);
      importedSites = processedSites.length;
    }

    // Import partners
    let importedPartners = 0;
    if (partnersData && partnersData.length > 0) {
      const processedPartners = partnersData.map((partner: any) => ({
        name: partner.name,
        logoUrl: partner.logo_url || partner.logoUrl,
        websiteUrl: partner.website_url || partner.websiteUrl || null,
        description: partner.description || null,
      }));
      
      await db.insert(partners).values(processedPartners);
      importedPartners = processedPartners.length;
    }

    // Import state landing pages
    let importedStatePages = 0;
    if (stateLandingPagesData && stateLandingPagesData.length > 0) {
      const processedPages = stateLandingPagesData.map((page: any) => ({
        stateCode: page.state_code || page.stateCode,
        stateName: page.state_name || page.stateName,
        companyId: page.company_id || page.companyId || null,
        metaTitle: page.meta_title || page.metaTitle || null,
        metaDescription: page.meta_description || page.metaDescription || null,
        content: page.content || null,
      }));
      
      await db.insert(stateLandingPages).values(processedPages);
      importedStatePages = processedPages.length;
    }

    // Import disposal site landing pages
    let importedDisposalPages = 0;
    if (disposalSiteLandingPagesData && disposalSiteLandingPagesData.length > 0) {
      const processedPages = disposalSiteLandingPagesData.map((page: any) => ({
        stateCode: page.state_code || page.stateCode,
        stateName: page.state_name || page.stateName,
        disposalSiteId: page.disposal_site_id || page.disposalSiteId || null,
        metaTitle: page.meta_title || page.metaTitle || null,
        metaDescription: page.meta_description || page.metaDescription || null,
        content: page.content || null,
      }));
      
      await db.insert(disposalSiteLandingPages).values(processedPages);
      importedDisposalPages = processedPages.length;
    }

    console.log("✅ Migration completed successfully!");
    
    res.json({
      success: true,
      message: "Production database migrated successfully!",
      imported: {
        companies: importedCompanies,
        disposalSites: importedSites,
        partners: importedPartners,
        stateLandingPages: importedStatePages,
        disposalSiteLandingPages: importedDisposalPages,
      }
    });

  } catch (error: any) {
    console.error("Migration error:", error);
    res.status(500).json({ 
      error: "Migration failed", 
      details: error.message 
    });
  }
}
