import { db } from "./db";
import { companies, disposalSites, partners, stateLandingPages, disposalSiteLandingPages } from "@shared/schema";
import * as fs from "fs";
import * as path from "path";

async function migrateToProduction() {
  console.log("🚀 Starting production database migration...");
  console.log("⚠️  This will replace ALL existing data in production!");
  
  try {
    // Read exported data
    const companiesData = JSON.parse(
      fs.readFileSync(path.join("/tmp", "companies_export.json"), "utf-8")
    );
    const disposalSitesData = JSON.parse(
      fs.readFileSync(path.join("/tmp", "disposal_sites_export.json"), "utf-8")
    );
    const partnersData = JSON.parse(
      fs.readFileSync(path.join("/tmp", "partners_export.json"), "utf-8")
    );
    const stateLandingPagesData = JSON.parse(
      fs.readFileSync(path.join("/tmp", "state_landing_pages_export.json"), "utf-8")
    );
    const disposalSiteLandingPagesData = JSON.parse(
      fs.readFileSync(path.join("/tmp", "disposal_site_landing_pages_export.json"), "utf-8")
    );

    console.log(`📊 Data loaded:`);
    console.log(`   - ${companiesData?.length || 0} companies`);
    console.log(`   - ${disposalSitesData?.length || 0} disposal sites`);
    console.log(`   - ${partnersData?.length || 0} partners`);
    console.log(`   - ${stateLandingPagesData?.length || 0} state landing pages`);
    console.log(`   - ${disposalSiteLandingPagesData?.length || 0} disposal site landing pages`);

    // Clear existing data (in reverse order to respect foreign keys)
    console.log("\n🗑️  Clearing existing production data...");
    await db.delete(companies);
    await db.delete(disposalSites);
    await db.delete(partners);
    await db.delete(stateLandingPages);
    await db.delete(disposalSiteLandingPages);
    console.log("✅ Existing data cleared");

    // Insert companies
    if (companiesData && companiesData.length > 0) {
      console.log("\n📍 Importing companies...");
      
      // Process in batches to avoid overwhelming the database
      const batchSize = 50;
      for (let i = 0; i < companiesData.length; i += batchSize) {
        const batch = companiesData.slice(i, i + batchSize);
        const processedBatch = batch.map((company: any) => ({
          ...company,
          id: undefined, // Let database auto-generate new IDs
          createdAt: company.created_at ? new Date(company.created_at) : new Date(),
          updatedAt: company.updated_at ? new Date(company.updated_at) : new Date(),
        }));
        
        await db.insert(companies).values(processedBatch);
        console.log(`   ✓ Imported ${Math.min(i + batchSize, companiesData.length)}/${companiesData.length} companies`);
      }
      console.log(`✅ All ${companiesData.length} companies imported`);
    }

    // Insert disposal sites
    if (disposalSitesData && disposalSitesData.length > 0) {
      console.log("\n🏭 Importing disposal sites...");
      const processedSites = disposalSitesData.map((site: any) => ({
        ...site,
        id: undefined, // Let database auto-generate new IDs
        createdAt: site.created_at ? new Date(site.created_at) : new Date(),
        updatedAt: site.updated_at ? new Date(site.updated_at) : new Date(),
      }));
      
      await db.insert(disposalSites).values(processedSites);
      console.log(`✅ All ${disposalSitesData.length} disposal sites imported`);
    }

    // Insert partners
    if (partnersData && partnersData.length > 0) {
      console.log("\n🤝 Importing partners...");
      const processedPartners = partnersData.map((partner: any) => ({
        ...partner,
        id: undefined, // Let database auto-generate new IDs
        createdAt: partner.created_at ? new Date(partner.created_at) : new Date(),
        updatedAt: partner.updated_at ? new Date(partner.updated_at) : new Date(),
      }));
      
      await db.insert(partners).values(processedPartners);
      console.log(`✅ All ${partnersData.length} partners imported`);
    }

    // Insert state landing pages
    if (stateLandingPagesData && stateLandingPagesData.length > 0) {
      console.log("\n📄 Importing state landing pages...");
      const processedPages = stateLandingPagesData.map((page: any) => ({
        ...page,
        id: undefined, // Let database auto-generate new IDs
        createdAt: page.created_at ? new Date(page.created_at) : new Date(),
        updatedAt: page.updated_at ? new Date(page.updated_at) : new Date(),
      }));
      
      await db.insert(stateLandingPages).values(processedPages);
      console.log(`✅ All ${stateLandingPagesData.length} state landing pages imported`);
    }

    // Insert disposal site landing pages
    if (disposalSiteLandingPagesData && disposalSiteLandingPagesData.length > 0) {
      console.log("\n📄 Importing disposal site landing pages...");
      const processedPages = disposalSiteLandingPagesData.map((page: any) => ({
        ...page,
        id: undefined, // Let database auto-generate new IDs
        createdAt: page.created_at ? new Date(page.created_at) : new Date(),
        updatedAt: page.updated_at ? new Date(page.updated_at) : new Date(),
      }));
      
      await db.insert(disposalSiteLandingPages).values(processedPages);
      console.log(`✅ All ${disposalSiteLandingPagesData.length} disposal site landing pages imported`);
    }

    console.log("\n🎉 Migration completed successfully!");
    console.log("\n📊 Final counts:");
    console.log(`   - ${companiesData?.length || 0} companies migrated`);
    console.log(`   - ${disposalSitesData?.length || 0} disposal sites migrated`);
    console.log(`   - ${partnersData?.length || 0} partners migrated`);
    console.log(`   - ${stateLandingPagesData?.length || 0} state landing pages migrated`);
    console.log(`   - ${disposalSiteLandingPagesData?.length || 0} disposal site landing pages migrated`);
    console.log("\n✅ Your production database is now populated with real data!");
    console.log("🌐 Visit https://hydrovacfinder.com to see your live site!");

  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

migrateToProduction()
  .then(() => {
    console.log("Migration script finished");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration script failed:", error);
    process.exit(1);
  });
