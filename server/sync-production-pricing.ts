import pg from "pg";
import fs from "fs";
import readline from "readline";

const { Client } = pg;

// This script syncs Stripe Price IDs from development to production database
// Run with: tsx server/sync-production-pricing.ts

async function getProductionDatabaseUrl(): Promise<string> {
  // First, check if user provided DATABASE_URL via environment variable
  if (process.env.PROD_DATABASE_URL) {
    return process.env.PROD_DATABASE_URL;
  }

  // If not, prompt user for production DATABASE_URL
  console.log("\n⚠️  Production DATABASE_URL needed!");
  console.log("Please provide your production database URL:");
  console.log("(Find it in: Replit Database tab → Production → Connection string)\n");
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('Production DATABASE_URL: ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function syncPricingToProduction() {
  const dbUrl = await getProductionDatabaseUrl();
  
  if (!dbUrl || dbUrl.length < 10) {
    console.error("❌ ERROR: No valid database URL provided");
    process.exit(1);
  }

  console.log("🔌 Connecting to production database...");
  console.log(`   Using: ${dbUrl.substring(0, 50)}...`);

  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  console.log("✅ Connected successfully!");

  try {
    // Update pricing_tiers table
    console.log("\n📊 Updating pricing_tiers...");
    
    const tierUpdates = [
      {
        id: 'verified',
        stripe_monthly_price_id: 'price_1SS2kY7bcI10G6CmP9XxWFId',
        stripe_annual_price_id: 'price_1SS2kY7bcI10G6Cm1TiCDURS'
      },
      {
        id: 'featured',
        stripe_monthly_price_id: 'price_1SS39T7bcI10G6CmQDawczRP',
        stripe_annual_price_id: 'price_1SS39v7bcI10G6CmRN9t0SEX'
      },
      {
        id: 'premium',
        stripe_monthly_price_id: 'price_1SS3Ka7bcI10G6Cmq9Bk5Sw8',
        stripe_annual_price_id: 'price_1SS3M87bcI10G6CmRC1LcmmU'
      },
      {
        id: 'state_landing',
        stripe_monthly_price_id: null,
        stripe_annual_price_id: 'price_1SS3iS7bcI10G6Cm6M0Guqc1'
      },
      {
        id: 'disposal_site_landing',
        stripe_monthly_price_id: null,
        stripe_annual_price_id: 'price_1SS3k17bcI10G6CmrGPvB80e'
      }
    ];

    for (const tier of tierUpdates) {
      await client.query(
        `UPDATE pricing_tiers 
         SET stripe_monthly_price_id = $1, stripe_annual_price_id = $2 
         WHERE id = $3`,
        [tier.stripe_monthly_price_id, tier.stripe_annual_price_id, tier.id]
      );
      console.log(`✓ Updated ${tier.id}`);
    }

    // Update tier_coverage_pricing table
    console.log("\n📊 Updating tier_coverage_pricing...");
    
    const coveragePricing = [
      // Verified tier
      { tier_id: 'verified', coverage_id: '2to4', billing_cycle: 'monthly', stripe_price_id: 'price_1SS3287bcI10G6CmLjRJUdvz' },
      { tier_id: 'verified', coverage_id: '2to4', billing_cycle: 'annual', stripe_price_id: 'price_1SS32r7bcI10G6CmNmjHTJqE' },
      { tier_id: 'verified', coverage_id: '5to10', billing_cycle: 'monthly', stripe_price_id: 'price_1SS34H7bcI10G6CmyrVwNfFL' },
      { tier_id: 'verified', coverage_id: '5to10', billing_cycle: 'annual', stripe_price_id: 'price_1SS3557bcI10G6CmgDD6zTZQ' },
      { tier_id: 'verified', coverage_id: '11to25', billing_cycle: 'monthly', stripe_price_id: 'price_1SS3697bcI10G6CmFFxnD0Ci' },
      { tier_id: 'verified', coverage_id: '11to25', billing_cycle: 'annual', stripe_price_id: 'price_1SS36r7bcI10G6CmvwRkKDr6' },
      { tier_id: 'verified', coverage_id: 'nationwide', billing_cycle: 'monthly', stripe_price_id: 'price_1SS37h7bcI10G6CmgIqjQR8A' },
      { tier_id: 'verified', coverage_id: 'nationwide', billing_cycle: 'annual', stripe_price_id: 'price_1SS38I7bcI10G6CmV0nt1u5S' },
      
      // Featured tier
      { tier_id: 'featured', coverage_id: '2to4', billing_cycle: 'monthly', stripe_price_id: 'price_1SS3As7bcI10G6CmW0xdYv5Q' },
      { tier_id: 'featured', coverage_id: '2to4', billing_cycle: 'annual', stripe_price_id: 'price_1SS3BK7bcI10G6CmqBnu18Pg' },
      { tier_id: 'featured', coverage_id: '5to10', billing_cycle: 'monthly', stripe_price_id: 'price_1SS3CG7bcI10G6CmjeCQCS1U' },
      { tier_id: 'featured', coverage_id: '5to10', billing_cycle: 'annual', stripe_price_id: 'price_1SS3Cl7bcI10G6CmIp1GdBL0' },
      { tier_id: 'featured', coverage_id: '11to25', billing_cycle: 'monthly', stripe_price_id: 'price_1SS3GN7bcI10G6Cmnn6ZSNiD' },
      { tier_id: 'featured', coverage_id: '11to25', billing_cycle: 'annual', stripe_price_id: 'price_1SS3H67bcI10G6Cmbu0doYb9' },
      { tier_id: 'featured', coverage_id: 'nationwide', billing_cycle: 'monthly', stripe_price_id: 'price_1SS3I57bcI10G6Cm5lv5o9U8' },
      { tier_id: 'featured', coverage_id: 'nationwide', billing_cycle: 'annual', stripe_price_id: 'price_1SS3IX7bcI10G6Cm7UFL6TtS' },
      
      // Premium tier
      { tier_id: 'premium', coverage_id: '2to4', billing_cycle: 'monthly', stripe_price_id: 'price_1SS3O37bcI10G6Cmgj45EAuF' },
      { tier_id: 'premium', coverage_id: '2to4', billing_cycle: 'annual', stripe_price_id: 'price_1SS3Od7bcI10G6CmRX72kpTw' },
      { tier_id: 'premium', coverage_id: '5to10', billing_cycle: 'monthly', stripe_price_id: 'price_1SS3Py7bcI10G6Cm8fzTN4fC' },
      { tier_id: 'premium', coverage_id: '5to10', billing_cycle: 'annual', stripe_price_id: 'price_1SS3QR7bcI10G6CmFrf7weCU' },
      { tier_id: 'premium', coverage_id: '11to25', billing_cycle: 'monthly', stripe_price_id: 'price_1SS3RN7bcI10G6Cmas4QBw75' },
      { tier_id: 'premium', coverage_id: '11to25', billing_cycle: 'annual', stripe_price_id: 'price_1SS3S67bcI10G6CmNYV1WSiI' },
      { tier_id: 'premium', coverage_id: 'nationwide', billing_cycle: 'monthly', stripe_price_id: 'price_1SS2kY7bcI10G6CmM3dbe9If' },
      { tier_id: 'premium', coverage_id: 'nationwide', billing_cycle: 'annual', stripe_price_id: 'price_1SS2kY7bcI10G6CmTp8JgrEP' },
    ];

    for (const pricing of coveragePricing) {
      // First, try to update existing record
      const updateResult = await client.query(
        `UPDATE tier_coverage_pricing 
         SET stripe_price_id = $1 
         WHERE tier_id = $2 AND coverage_id = $3 AND billing_cycle = $4`,
        [pricing.stripe_price_id, pricing.tier_id, pricing.coverage_id, pricing.billing_cycle]
      );
      
      // If no rows were updated, insert a new record
      if (updateResult.rowCount === 0) {
        await client.query(
          `INSERT INTO tier_coverage_pricing (tier_id, coverage_id, billing_cycle, stripe_price_id)
           VALUES ($1, $2, $3, $4)`,
          [pricing.tier_id, pricing.coverage_id, pricing.billing_cycle, pricing.stripe_price_id]
        );
      }
      console.log(`✓ Synced ${pricing.tier_id} / ${pricing.coverage_id} / ${pricing.billing_cycle}`);
    }

    console.log("\n✅ All Stripe Price IDs synced to production successfully!");
    console.log("\n📝 Summary:");
    console.log("  - Updated 5 pricing tiers");
    console.log("  - Synced 24 multi-state coverage price IDs");
    console.log("\n🧪 Next: Test checkout on production site!");
    
  } catch (error) {
    console.error("❌ Error syncing data:", error);
    throw error;
  } finally {
    await client.end();
  }
}

syncPricingToProduction()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
