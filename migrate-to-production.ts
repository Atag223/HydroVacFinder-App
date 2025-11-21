/**
 * Production Database Migration Script
 * 
 * This script migrates all data from the development database export files
 * directly to the production database.
 * 
 * Run with: npm run migrate-production
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import * as schema from "./shared/schema";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrateToProduction() {
  console.log("\n🚀 Starting Production Database Migration...\n");

  // Check if we're targeting production
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("❌ ERROR: DATABASE_URL not found in environment variables");
    process.exit(1);
  }

  console.log("📊 Database URL found (production)");
  console.log("⚠️  WARNING: This will REPLACE all data in the production database!");
  console.log("\nStarting in 3 seconds...\n");
  
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Connect to production database
  const sql = neon(databaseUrl);
  const db = drizzle(sql, { schema });

  try {
    // Load migration data files
    const dataDir = path.join(__dirname, "server", "migration-data");
    
    console.log("📁 Loading migration data files...");
    
    const companiesData = JSON.parse(
      fs.readFileSync(path.join(dataDir, "companies_export.json"), "utf-8")
    );
    const disposalSitesData = JSON.parse(
      fs.readFileSync(path.join(dataDir, "disposal_sites_export.json"), "utf-8")
    );
    const partnersData = JSON.parse(
      fs.readFileSync(path.join(dataDir, "partners_export.json"), "utf-8")
    );
    const stateLandingPagesData = JSON.parse(
      fs.readFileSync(path.join(dataDir, "state_landing_pages_export.json"), "utf-8")
    );
    const disposalSiteLandingPagesData = JSON.parse(
      fs.readFileSync(path.join(dataDir, "disposal_site_landing_pages_export.json"), "utf-8")
    );

    console.log(`✅ Loaded ${companiesData.length} companies`);
    console.log(`✅ Loaded ${disposalSitesData.length} disposal sites`);
    console.log(`✅ Loaded ${partnersData.length} partners`);
    console.log(`✅ Loaded ${stateLandingPagesData.length} state landing pages`);
    console.log(`✅ Loaded ${disposalSiteLandingPagesData.length} disposal site landing pages\n`);

    // Transform snake_case keys to camelCase for Drizzle ORM
    console.log("🔄 Transforming data format...");
    const transformKeys = (obj: any) => {
      const transformed: any = {};
      for (const key in obj) {
        const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        let value = obj[key];
        
        // Convert timestamp strings to Date objects
        if (key.includes('_at') && typeof value === 'string') {
          value = new Date(value);
        }
        
        transformed[camelKey] = value;
      }
      return transformed;
    };

    const companiesTransformed = companiesData.map(transformKeys);
    const disposalSitesTransformed = disposalSitesData.map(transformKeys);
    const partnersTransformed = partnersData.map(transformKeys);
    const stateLandingPagesTransformed = stateLandingPagesData.map(transformKeys);
    const disposalSiteLandingPagesTransformed = disposalSiteLandingPagesData.map(transformKeys);
    console.log("✅ Data transformed\n");

    // Clear existing data
    console.log("🗑️  Clearing existing production data...");
    await db.delete(schema.companies);
    await db.delete(schema.disposalSites);
    await db.delete(schema.partners);
    await db.delete(schema.stateLandingPages);
    await db.delete(schema.disposalSiteLandingPages);
    console.log("✅ Existing data cleared\n");

    // Import new data
    console.log("📥 Importing new data...");
    
    if (companiesTransformed.length > 0) {
      await db.insert(schema.companies).values(companiesTransformed);
      console.log(`✅ Imported ${companiesTransformed.length} companies`);
    }
    
    if (disposalSitesTransformed.length > 0) {
      await db.insert(schema.disposalSites).values(disposalSitesTransformed);
      console.log(`✅ Imported ${disposalSitesTransformed.length} disposal sites`);
    }
    
    if (partnersTransformed.length > 0) {
      await db.insert(schema.partners).values(partnersTransformed);
      console.log(`✅ Imported ${partnersTransformed.length} partners`);
    }
    
    if (stateLandingPagesTransformed.length > 0) {
      await db.insert(schema.stateLandingPages).values(stateLandingPagesTransformed);
      console.log(`✅ Imported ${stateLandingPagesTransformed.length} state landing pages`);
    }
    
    if (disposalSiteLandingPagesTransformed.length > 0) {
      await db.insert(schema.disposalSiteLandingPages).values(disposalSiteLandingPagesTransformed);
      console.log(`✅ Imported ${disposalSiteLandingPagesTransformed.length} disposal site landing pages`);
    }

    console.log("\n✨ Migration completed successfully!");
    console.log("\n📊 Summary:");
    console.log(`   • ${companiesTransformed.length} companies migrated`);
    console.log(`   • ${disposalSitesTransformed.length} disposal sites migrated`);
    console.log(`   • ${partnersTransformed.length} partners migrated`);
    console.log(`   • ${stateLandingPagesTransformed.length} state landing pages migrated`);
    console.log(`   • ${disposalSiteLandingPagesTransformed.length} disposal site landing pages migrated`);
    console.log("\n🎉 Your production database is now populated!");
    console.log("🌐 Visit https://hydrovacfinder.com to see your data live!\n");

  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run the migration
migrateToProduction();
