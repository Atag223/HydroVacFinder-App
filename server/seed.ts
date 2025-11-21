import { db } from "./db";
import { companies, disposalSites, partners, coverageTiers } from "@shared/schema";

async function seed() {
  console.log("🌱 Seeding database...");

  // Seed companies
  const sampleCompanies = [
    {
      name: "ABC Hydro-Vac Services",
      address: "1234 Industrial Blvd, Houston, TX 77001",
      phone: "(713) 555-0100",
      email: "contact@abchydrovac.com",
      website: "https://abchydrovac.com",
      description: "Professional hydro-vac excavation services for commercial and residential projects",
      services: "Hydro excavation, Potholing, Utility locating, Slot trenching",
      coverageArea: "Greater Houston area",
      lat: "29.7604",
      lng: "-95.3698",
      tier: "featured",
    },
    {
      name: "Precision Vac Services",
      address: "567 Commerce Dr, Dallas, TX 75201",
      phone: "(214) 555-0200",
      email: "info@precisionvac.com",
      website: "https://precisionvac.com",
      description: "Reliable hydro-vac services with 24/7 emergency response",
      services: "Emergency services, Hydro excavation, Daylighting, Debris removal",
      coverageArea: "Dallas-Fort Worth metroplex",
      lat: "32.7767",
      lng: "-96.7970",
      tier: "verified",
    },
    {
      name: "Midwest Hydro Excavation",
      address: "890 Main St, Chicago, IL 60601",
      phone: "(312) 555-0300",
      email: "service@midwesthydro.com",
      description: "Serving the Midwest with professional hydro-vac solutions",
      services: "Hydro excavation, Utility exposure, Trenching",
      coverageArea: "Chicago and surrounding areas",
      lat: "41.8781",
      lng: "-87.6298",
      tier: "verified",
    },
    {
      name: "Coast to Coast Vac Services",
      address: "345 Harbor Rd, Los Angeles, CA 90001",
      phone: "(213) 555-0400",
      email: "contact@coastvac.com",
      website: "https://coastvac.com",
      description: "Premier hydro-vac services for Southern California",
      services: "Hydro excavation, Vacuum services, Industrial cleaning",
      coverageArea: "Los Angeles County",
      lat: "34.0522",
      lng: "-118.2437",
      tier: "featured",
    },
    {
      name: "Northeast Excavation Group",
      address: "123 Liberty Ave, New York, NY 10001",
      phone: "(212) 555-0500",
      email: "info@northeastexcavation.com",
      description: "Professional excavation and hydro-vac services",
      services: "Hydro excavation, Potholing, Site cleanup",
      coverageArea: "New York City metro area",
      lat: "40.7128",
      lng: "-74.0060",
      tier: "free",
    },
  ];

  await db.insert(companies).values(sampleCompanies);
  console.log(`✅ Inserted ${sampleCompanies.length} companies`);

  // Seed disposal sites
  const sampleDisposalSites = [
    {
      name: "Houston Material Recovery Facility",
      address: "2500 Disposal Rd, Houston, TX 77020",
      phone: "(713) 555-0600",
      materialsAccepted: "Excavated soil, Concrete, Asphalt, Clean fill",
      hours: "Mon-Fri: 6AM-6PM, Sat: 7AM-3PM",
      lat: "29.7752",
      lng: "-95.2920",
    },
    {
      name: "Dallas Waste Management Center",
      address: "1800 Landfill Way, Dallas, TX 75220",
      phone: "(214) 555-0700",
      materialsAccepted: "Soil, Rocks, Construction debris, Yard waste",
      hours: "Mon-Sat: 7AM-5PM",
      lat: "32.8497",
      lng: "-96.8503",
    },
    {
      name: "Chicago Environmental Services",
      address: "4200 Recycling Blvd, Chicago, IL 60609",
      phone: "(312) 555-0800",
      materialsAccepted: "Clean soil, Gravel, Concrete, Asphalt millings",
      hours: "Mon-Fri: 6AM-5PM",
      lat: "41.8119",
      lng: "-87.6873",
    },
    {
      name: "LA County Disposal Facility",
      address: "5600 Waste Management Dr, Los Angeles, CA 90058",
      phone: "(213) 555-0900",
      materialsAccepted: "Excavated materials, Construction waste, Contaminated soil (with permit)",
      hours: "Mon-Sat: 6AM-6PM",
      lat: "34.0195",
      lng: "-118.2064",
    },
  ];

  await db.insert(disposalSites).values(sampleDisposalSites);
  console.log(`✅ Inserted ${sampleDisposalSites.length} disposal sites`);

  // Seed partners
  const samplePartners = [
    {
      name: "National Contractors Association",
      logoUrl: "",
      websiteUrl: "https://example.com",
      featured: "yes",
    },
    {
      name: "US Excavation Council",
      logoUrl: "",
      websiteUrl: "https://example.com",
      featured: "yes",
    },
    {
      name: "Professional Vac Services Alliance",
      logoUrl: "",
      websiteUrl: "https://example.com",
      featured: "yes",
    },
  ];

  await db.insert(partners).values(samplePartners);
  console.log(`✅ Inserted ${samplePartners.length} partners`);

  // Seed coverage tiers for multi-state pricing
  const coverageTiersData = [
    {
      id: "2to4",
      name: "2-4 States",
      minStates: 2,
      maxStates: 4,
      multiplier: "1.75",
      displayOrder: 1,
    },
    {
      id: "5to10",
      name: "5-10 States",
      minStates: 5,
      maxStates: 10,
      multiplier: "2.50",
      displayOrder: 2,
    },
    {
      id: "11to25",
      name: "11-25 States",
      minStates: 11,
      maxStates: 25,
      multiplier: "3.50",
      displayOrder: 3,
    },
    {
      id: "nationwide",
      name: "Nationwide (All 50 States)",
      minStates: 26,
      maxStates: null,
      multiplier: "4.00",
      displayOrder: 4,
    },
  ];

  await db.insert(coverageTiers).values(coverageTiersData);
  console.log(`✅ Inserted ${coverageTiersData.length} coverage tiers`);

  console.log("🎉 Database seeding completed!");
}

seed()
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
