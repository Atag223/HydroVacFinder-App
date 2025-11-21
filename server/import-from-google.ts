import { db } from "./db";
import { companies, disposalSites } from "@shared/schema";

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

if (!GOOGLE_MAPS_API_KEY) {
  console.error("❌ GOOGLE_MAPS_API_KEY is not set");
  process.exit(1);
}

// Major US cities to search for hydro-vac services
const SEARCH_LOCATIONS = [
  { city: "Houston", state: "TX", lat: 29.7604, lng: -95.3698 },
  { city: "Dallas", state: "TX", lat: 32.7767, lng: -96.7970 },
  { city: "Austin", state: "TX", lat: 30.2672, lng: -97.7431 },
  { city: "Phoenix", state: "AZ", lat: 33.4484, lng: -112.0740 },
  { city: "Los Angeles", state: "CA", lat: 34.0522, lng: -118.2437 },
  { city: "San Francisco", state: "CA", lat: 37.7749, lng: -122.4194 },
  { city: "Denver", state: "CO", lat: 39.7392, lng: -104.9903 },
  { city: "Chicago", state: "IL", lat: 41.8781, lng: -87.6298 },
  { city: "New York", state: "NY", lat: 40.7128, lng: -74.0060 },
  { city: "Atlanta", state: "GA", lat: 33.7490, lng: -84.3880 },
  { city: "Miami", state: "FL", lat: 25.7617, lng: -80.1918 },
  { city: "Seattle", state: "WA", lat: 47.6062, lng: -122.3321 },
  { city: "Boston", state: "MA", lat: 42.3601, lng: -71.0589 },
  { city: "Philadelphia", state: "PA", lat: 39.9526, lng: -75.1652 },
  { city: "Las Vegas", state: "NV", lat: 36.1699, lng: -115.1398 },
];

interface NewPlaceResult {
  id: string;
  displayName?: {
    text: string;
  };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

async function searchNearbyPlaces(
  lat: number,
  lng: number,
  query: string,
  radius: number = 50000
): Promise<NewPlaceResult[]> {
  const url = "https://places.googleapis.com/v1/places:searchText";
  
  const requestBody = {
    textQuery: query,
    locationBias: {
      circle: {
        center: {
          latitude: lat,
          longitude: lng
        },
        radius: radius
      }
    },
    maxResultCount: 20
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY!,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.location"
    },
    body: JSON.stringify(requestBody)
  });

  const data = await response.json();

  if (!response.ok) {
    console.error(`⚠️  Google Places API error:`, data.error?.message || data);
    return [];
  }

  return data.places || [];
}

async function importHydroVacCompanies() {
  console.log("\n🔍 Searching for hydro-vac companies across the US...\n");

  const allCompanies: any[] = [];
  const seenPlaceIds = new Set<string>();
  const companiesPerCity = Math.ceil(48 / SEARCH_LOCATIONS.length); // ~3-4 per city

  for (const location of SEARCH_LOCATIONS) {
    console.log(`  📍 Searching ${location.city}, ${location.state}...`);
    let cityCompaniesCount = 0;

    const queries = [
      "hydro excavation service",
      "hydrovac service",
      "vacuum excavation",
    ];

    for (const query of queries) {
      const places = await searchNearbyPlaces(location.lat, location.lng, query);
      
      for (const place of places) {
        if (seenPlaceIds.has(place.id)) continue;
        seenPlaceIds.add(place.id);

        if (!place.location || !place.displayName) continue;

        const tier = Math.random() < 0.3 ? "featured" : Math.random() < 0.6 ? "verified" : "free";

        allCompanies.push({
          name: place.displayName.text,
          address: place.formattedAddress || "",
          phone: place.nationalPhoneNumber || "",
          email: "",
          website: place.websiteUri || "",
          description: `Professional hydro-vac and vacuum excavation services in ${location.city}, ${location.state}`,
          services: "Hydro excavation, Vacuum services, Potholing, Utility locating",
          coverageArea: `${location.city} and surrounding areas`,
          lat: place.location.latitude.toString(),
          lng: place.location.longitude.toString(),
          tier,
        });

        cityCompaniesCount++;
        if (cityCompaniesCount >= companiesPerCity) break;
      }

      if (cityCompaniesCount >= companiesPerCity) break;
      
      // Rate limiting: wait 200ms between requests
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  console.log(`\n✅ Found ${allCompanies.length} hydro-vac companies`);

  if (allCompanies.length > 0) {
    console.log("💾 Clearing existing companies and inserting new data...");
    await db.delete(companies);
    await db.insert(companies).values(allCompanies);
    console.log(`✅ Inserted ${allCompanies.length} companies into database`);
  }
}

async function importDisposalSites() {
  console.log("\n🔍 Searching for disposal/offload sites across the US...\n");

  const allSites: any[] = [];
  const seenPlaceIds = new Set<string>();
  const sitesPerCity = Math.ceil(37 / SEARCH_LOCATIONS.length); // ~2-3 per city

  for (const location of SEARCH_LOCATIONS) {
    console.log(`  📍 Searching ${location.city}, ${location.state}...`);
    let citySitesCount = 0;

    const queries = [
      "waste disposal facility",
      "landfill",
      "liquid waste disposal",
      "wastewater treatment facility",
    ];

    for (const query of queries) {
      const places = await searchNearbyPlaces(location.lat, location.lng, query, 50000);
      
      for (const place of places) {
        if (seenPlaceIds.has(place.id)) continue;
        seenPlaceIds.add(place.id);

        if (!place.location || !place.displayName) continue;

        allSites.push({
          name: place.displayName.text,
          address: place.formattedAddress || "",
          phone: place.nationalPhoneNumber || "",
          materialsAccepted: "Liquid waste, Solid waste, Slurry, Contaminated soil",
          hours: "Monday-Friday: 7:00 AM - 5:00 PM",
          lat: place.location.latitude.toString(),
          lng: place.location.longitude.toString(),
        });

        citySitesCount++;
        if (citySitesCount >= sitesPerCity) break;
      }

      if (citySitesCount >= sitesPerCity) break;
      
      // Rate limiting: wait 200ms between requests
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  console.log(`\n✅ Found ${allSites.length} disposal sites`);

  if (allSites.length > 0) {
    console.log("💾 Clearing existing disposal sites and inserting new data...");
    await db.delete(disposalSites);
    await db.insert(disposalSites).values(allSites);
    console.log(`✅ Inserted ${allSites.length} disposal sites into database`);
  }
}

async function main() {
  try {
    console.log("🚀 Starting Google Maps API import...\n");
    console.log("⏳ This may take several minutes due to API rate limiting...\n");

    await importHydroVacCompanies();
    await importDisposalSites();

    console.log("\n✅ Import completed successfully!");
    console.log("\n📊 Summary:");
    
    const companiesCount = await db.select().from(companies);
    const sitesCount = await db.select().from(disposalSites);
    
    console.log(`   - Companies: ${companiesCount.length}`);
    console.log(`   - Disposal Sites: ${sitesCount.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Import failed:", error);
    process.exit(1);
  }
}

main();
