import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import Stripe from "stripe";
import nodemailer from "nodemailer";
import multer from "multer";
import path from "path";
import fs from "fs";
import { insertCompanySchema, insertDisposalSiteSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { db, pool } from "./db";

// Initialize Stripe (optional - only if API key is provided)
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  const key = process.env.STRIPE_SECRET_KEY;
  
  // Validate that it's a secret key (should start with sk_)
  if (!key.startsWith('sk_')) {
    console.error('⚠️ STRIPE_SECRET_KEY appears to be invalid - must start with sk_');
    console.error(`Key starts with: ${key.substring(0, 3)}...`);
  } else {
    console.log('✓ Stripe initialized with valid secret key');
  }
  
  stripe = new Stripe(key, {
    apiVersion: "2025-10-29.clover",
  });
}

// No longer using hardcoded price IDs - will load from database

// Email transporter setup
const emailTransporter = process.env.CONTACT_EMAIL_USER ? nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.CONTACT_EMAIL_USER,
    pass: process.env.CONTACT_EMAIL_PASS,
  },
}) : null;

export async function registerRoutes(app: Express): Promise<Server> {
  
  // ────────────────────────────────────────────────
  // 🗄️ SESSION MIDDLEWARE
  // ────────────────────────────────────────────────
  
  const PgStore = connectPgSimple(session);
  
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET environment variable must be set for admin authentication");
  }
  
  app.use(session({
    store: new PgStore({
      pool: pool,
      tableName: 'sessions',
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    }
  }));
  
  // Trust proxy in production for secure cookies behind TLS
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }
  
  // ────────────────────────────────────────────────
  // 🔐 ADMIN MIDDLEWARE
  // ────────────────────────────────────────────────
  
  // Admin middleware - checks for API key (defined early so it can be used throughout)
  const isAdmin = (req: Request, res: Response, next: Function) => {
    // CRITICAL: Fail closed if ADMIN_API_KEY is not configured
    if (!process.env.ADMIN_API_KEY) {
      console.error("[SECURITY] ADMIN_API_KEY environment variable is not set - admin endpoints are disabled");
      return res.status(500).json({ error: "Admin functionality is not configured" });
    }
    
    // Require the header to be present
    const apiKey = req.headers['x-admin-api-key'];
    if (!apiKey) {
      return res.status(401).json({ error: "Admin API key required" });
    }
    
    // Check if the key matches
    if (apiKey !== process.env.ADMIN_API_KEY) {
      return res.status(403).json({ error: "Unauthorized - Invalid admin API key" });
    }
    
    next();
  };

  // Admin session authentication - checks if user is logged into admin panel
  const isAdminAuthenticated = (req: Request, res: Response, next: Function) => {
    console.log("🔐 [AUTH] Checking admin session for", req.method, req.path);
    console.log("🔐 [AUTH] Session exists:", !!req.session);
    console.log("🔐 [AUTH] isAdmin:", !!(req.session as any)?.isAdmin);
    
    if (!(req.session as any)?.isAdmin) {
      console.log("🔐 [AUTH] REJECTED: Not authenticated");
      return res.status(401).json({ error: "Not authenticated" });
    }
    console.log("🔐 [AUTH] ACCEPTED: User is authenticated");
    next();
  };

  // Combined admin auth - accepts EITHER session OR API key
  const requireAdmin = (req: Request, res: Response, next: Function) => {
    // CRITICAL: Fail closed if ADMIN_API_KEY is not configured
    if (!process.env.ADMIN_API_KEY) {
      console.error("[SECURITY] ADMIN_API_KEY not set - admin endpoints disabled");
      return res.status(500).json({ error: "Admin functionality is not configured" });
    }
    
    // Check session auth first
    if ((req.session as any)?.isAdmin) {
      console.log("🔐 [AUTH] Authenticated via session");
      return next();
    }
    
    // Fall back to API key auth
    const apiKey = req.headers['x-admin-api-key'];
    if (apiKey && apiKey === process.env.ADMIN_API_KEY) {
      console.log("🔐 [AUTH] Authenticated via API key");
      return next();
    }
    
    // Both failed
    console.log("🔐 [AUTH] REJECTED: Neither session nor API key valid");
    return res.status(401).json({ error: "Admin authentication required" });
  };

  // ────────────────────────────────────────────────
  // 📁 FILE UPLOAD CONFIGURATION
  // ────────────────────────────────────────────────

  // Ensure uploads directory exists
  const uploadsDir = path.join(process.cwd(), 'client', 'public', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Configure multer for file uploads
  const storage_multer = multer.diskStorage({
    destination: function (_req, _file, cb) {
      cb(null, uploadsDir);
    },
    filename: function (_req, file, cb) {
      // Generate unique filename: timestamp-originalname
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  });

  const upload = multer({
    storage: storage_multer,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB max file size
    },
    fileFilter: (_req, file, cb) => {
      // Accept images only
      if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
        return cb(new Error('Only image files are allowed!'));
      }
      cb(null, true);
    }
  });

  // ────────────────────────────────────────────────
  // 🔐 ADMIN AUTHENTICATION ROUTES
  // ────────────────────────────────────────────────

  // Login to admin panel (creates secure session)
  app.post("/api/admin/login", async (req: Request, res: Response) => {
    try {
      const { password } = req.body;
      
      if (!process.env.ADMIN_API_KEY) {
        return res.status(500).json({ error: "Admin functionality is not configured" });
      }
      
      if (!password || password !== process.env.ADMIN_API_KEY) {
        return res.status(401).json({ error: "Invalid password" });
      }
      
      // Set admin session
      (req.session as any).isAdmin = true;
      res.json({ success: true });
    } catch (err: any) {
      console.error("Admin login error:", err);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Check if admin is authenticated
  app.get("/api/admin/check", async (req: Request, res: Response) => {
    const isAuth = !!(req.session as any)?.isAdmin;
    res.json({ authenticated: isAuth });
  });

  // Logout from admin panel
  app.post("/api/admin/logout", async (req: Request, res: Response) => {
    (req.session as any).isAdmin = false;
    req.session.destroy((err) => {
      if (err) {
        console.error("Session destroy error:", err);
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ success: true });
    });
  });

  // ────────────────────────────────────────────────
  // 📤 IMAGE UPLOAD ROUTES
  // ────────────────────────────────────────────────

  // Upload image (for state landing pages, company logos, etc.)
  app.post("/api/upload-image", requireAdmin, upload.single('image'), async (req: Request, res: Response) => {
    console.log("📤 [UPLOAD] Image upload request received");
    console.log("📤 [UPLOAD] API Key header:", !!req.headers['x-admin-api-key']);
    console.log("📤 [UPLOAD] File received:", !!req.file);
    
    try {
      if (!req.file) {
        console.log("📤 [UPLOAD] ERROR: No file in request");
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Return the public URL path for the uploaded file
      const imageUrl = `/uploads/${req.file.filename}`;
      console.log("📤 [UPLOAD] SUCCESS: Image uploaded to", imageUrl);
      res.json({ imageUrl });
    } catch (err: any) {
      console.error("📤 [UPLOAD] ERROR:", err);
      res.status(500).json({ error: err.message || "Failed to upload image" });
    }
  });
  
  // ────────────────────────────────────────────────
  // 🌎 DATA ROUTES
  // ────────────────────────────────────────────────
  
  // Get all companies
  app.get("/api/companies", async (_req: Request, res: Response) => {
    try {
      const data = await storage.getAllCompanies();
      res.json(data);
    } catch (err) {
      console.error("Error fetching companies:", err);
      res.status(500).json({ error: "Failed to fetch companies" });
    }
  });

  // Get disposal sites
  app.get("/api/disposal-sites", async (_req: Request, res: Response) => {
    try {
      const data = await storage.getAllDisposalSites();
      res.json(data);
    } catch (err) {
      console.error("Error fetching disposal sites:", err);
      res.status(500).json({ error: "Failed to fetch disposal sites" });
    }
  });

  // Get partners
  app.get("/api/partners", async (_req: Request, res: Response) => {
    try {
      const data = await storage.getAllPartners();
      res.json(data);
    } catch (err) {
      console.error("Error fetching partners:", err);
      res.status(500).json({ error: "Failed to fetch partners" });
    }
  });

  // Get pricing tiers
  app.get("/api/pricing-tiers", async (_req: Request, res: Response) => {
    try {
      const data = await storage.getAllPricingTiers();
      res.json(data);
    } catch (err) {
      console.error("Error fetching pricing tiers:", err);
      res.status(500).json({ error: "Failed to fetch pricing tiers" });
    }
  });

  // Get coverage tiers (for multi-state pricing)
  app.get("/api/coverage-tiers", async (_req: Request, res: Response) => {
    try {
      const data = await storage.getAllCoverageTiers();
      res.json(data);
    } catch (err) {
      console.error("Error fetching coverage tiers:", err);
      res.status(500).json({ error: "Failed to fetch coverage tiers" });
    }
  });

  // Get all state landing pages
  app.get("/api/state-landing-pages", async (_req: Request, res: Response) => {
    try {
      const data = await storage.getAllStateLandingPages();
      res.json(data);
    } catch (err) {
      console.error("Error fetching state landing pages:", err);
      res.status(500).json({ error: "Failed to fetch state landing pages" });
    }
  });

  // Get state landing page by state code
  app.get("/api/state-landing-pages/:stateCode", async (req: Request, res: Response) => {
    try {
      const { stateCode } = req.params;
      console.log("🔍 [ROUTE] Fetching state landing page for:", stateCode);
      const page = await storage.getStateLandingPageByStateCode(stateCode);
      console.log("🔍 [ROUTE] Storage returned:", JSON.stringify(page, null, 2));
      if (!page) {
        return res.status(404).json({ error: "State landing page not found" });
      }
      console.log("🔍 [ROUTE] Sending response:", JSON.stringify(page, null, 2));
      res.json(page);
    } catch (err) {
      console.error("Error fetching state landing page:", err);
      res.status(500).json({ error: "Failed to fetch state landing page" });
    }
  });

  // Get all disposal site landing pages
  app.get("/api/disposal-site-landing-pages", async (_req: Request, res: Response) => {
    try {
      const data = await storage.getAllDisposalSiteLandingPages();
      res.json(data);
    } catch (err) {
      console.error("Error fetching disposal site landing pages:", err);
      res.status(500).json({ error: "Failed to fetch disposal site landing pages" });
    }
  });

  // Get disposal site landing page by state code
  app.get("/api/disposal-site-landing-pages/:stateCode", async (req: Request, res: Response) => {
    try {
      const { stateCode } = req.params;
      const page = await storage.getDisposalSiteLandingPageByStateCode(stateCode);
      if (!page) {
        return res.status(404).json({ error: "Disposal site landing page not found" });
      }
      res.json(page);
    } catch (err) {
      console.error("Error fetching disposal site landing page:", err);
      res.status(500).json({ error: "Failed to fetch disposal site landing page" });
    }
  });

  // ────────────────────────────────────────────────
  // 🌐 PUBLIC API ENDPOINTS (for external integration)
  // ────────────────────────────────────────────────

  // Public API: Get all companies with optional filtering
  app.get("/api/public/v1/companies", async (req: Request, res: Response) => {
    try {
      const { tier, state, limit } = req.query;
      
      let data = await storage.getAllCompanies();
      
      // Apply filters
      if (tier && typeof tier === 'string') {
        data = data.filter(c => c.tier === tier);
      }
      
      if (state && typeof state === 'string') {
        data = data.filter(c => 
          c.address?.toLowerCase().includes(state.toLowerCase())
        );
      }
      
      if (limit && typeof limit === 'string') {
        const limitNum = parseInt(limit, 10);
        if (!isNaN(limitNum) && limitNum > 0) {
          data = data.slice(0, limitNum);
        }
      }
      
      // Normalize data for API consumers
      const normalizedData = data.map(company => ({
        id: company.id,
        name: company.name,
        address: company.address,
        phone: company.phone,
        email: company.email,
        website: company.website,
        description: company.description,
        services: company.services?.split(',').map(s => s.trim()) || [],
        coverageArea: company.coverageArea,
        location: {
          lat: company.lat ? parseFloat(company.lat) : null,
          lng: company.lng ? parseFloat(company.lng) : null,
        },
        tier: company.tier,
        logoUrl: company.logoUrl,
      }));
      
      res.json({
        success: true,
        count: normalizedData.length,
        data: normalizedData,
      });
    } catch (err) {
      console.error("Error fetching companies (public API):", err);
      res.status(500).json({ 
        success: false,
        error: "Failed to fetch companies" 
      });
    }
  });

  // Public API: Get all disposal sites with optional filtering
  app.get("/api/public/v1/disposal-sites", async (req: Request, res: Response) => {
    try {
      const { state, limit } = req.query;
      
      let data = await storage.getAllDisposalSites();
      
      // Apply filters
      if (state && typeof state === 'string') {
        data = data.filter(site => 
          site.address?.toLowerCase().includes(state.toLowerCase())
        );
      }
      
      if (limit && typeof limit === 'string') {
        const limitNum = parseInt(limit, 10);
        if (!isNaN(limitNum) && limitNum > 0) {
          data = data.slice(0, limitNum);
        }
      }
      
      // Normalize data for API consumers
      const normalizedData = data.map(site => ({
        id: site.id,
        name: site.name,
        address: site.address,
        phone: site.phone,
        materialsAccepted: site.materialsAccepted?.split(',').map(m => m.trim()) || [],
        hours: site.hours,
        location: {
          lat: site.lat ? parseFloat(site.lat) : null,
          lng: site.lng ? parseFloat(site.lng) : null,
        },
      }));
      
      res.json({
        success: true,
        count: normalizedData.length,
        data: normalizedData,
      });
    } catch (err) {
      console.error("Error fetching disposal sites (public API):", err);
      res.status(500).json({ 
        success: false,
        error: "Failed to fetch disposal sites" 
      });
    }
  });

  // ────────────────────────────────────────────────
  // 🔔 STRIPE WEBHOOK
  // ────────────────────────────────────────────────
  
  app.post("/api/stripe-webhook", async (req: Request, res: Response) => {
    if (!stripe) {
      return res.status(503).json({ error: "Stripe not configured" });
    }

    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig) {
      console.error('[Webhook] No signature header found');
      return res.status(400).json({ error: "No signature header" });
    }

    if (!webhookSecret) {
      console.error('[Webhook] STRIPE_WEBHOOK_SECRET not configured');
      return res.status(500).json({ error: "Webhook secret not configured" });
    }

    let event: Stripe.Event;

    try {
      // Verify the webhook signature using rawBody
      event = stripe.webhooks.constructEvent(
        req.rawBody as Buffer,
        sig,
        webhookSecret
      );
    } catch (err: any) {
      console.error(`[Webhook] Signature verification failed: ${err.message}`);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    console.log(`[Webhook] Received event: ${event.type}`);

    // Handle the event
    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          console.log('[Webhook] Checkout session completed:', session.id);

          // Extract metadata and customer info
          const tier = session.metadata?.tier;
          const coverage = session.metadata?.coverage || 'single';
          const billingCycle = session.metadata?.billingCycle;
          const customerEmail = session.customer_details?.email;

          if (!tier || !billingCycle) {
            console.error('[Webhook] CRITICAL: Missing required metadata:', { tier, billingCycle, sessionId: session.id });
            // Return 400 so Stripe retries - this is a critical error that needs attention
            return res.status(400).json({ error: 'Missing tier or billing cycle in metadata' });
          }

          if (!customerEmail) {
            console.error('[Webhook] CRITICAL: No customer email in session:', session.id);
            // Return 400 so Stripe retries - we need email for tier assignment
            return res.status(400).json({ error: 'Missing customer email' });
          }

          // Get subscription ID from the session
          const subscriptionId = session.subscription as string;

          if (!subscriptionId) {
            console.error('[Webhook] No subscription ID in session');
            break;
          }

          console.log('[Webhook] Creating subscription record:', {
            email: customerEmail,
            tier,
            coverage,
            billingCycle,
            stripeSubscriptionId: subscriptionId
          });

          // Check if subscription already exists (idempotency)
          const existingSubscription = await storage.getSubscriptionByStripeId(subscriptionId);

          if (existingSubscription) {
            console.log('[Webhook] Subscription already exists, updating:', existingSubscription.id);
            await storage.updateSubscription(existingSubscription.id, {
              status: 'active',
              customerEmail,
            });
          } else {
            // Create new subscription record
            await storage.createSubscription({
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: subscriptionId,
              stripeCheckoutSessionId: session.id,
              customerEmail,
              tier,
              coverage,
              billingCycle,
              status: 'active',
            });
            console.log('[Webhook] ✓ Subscription record created successfully');
          }
          break;
        }

        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          console.log('[Webhook] Subscription updated:', subscription.id);

          const existingSubscription = await storage.getSubscriptionByStripeId(subscription.id);
          if (existingSubscription) {
            // Fetch full subscription from Stripe to ensure we have latest metadata
            const fullSubscription = await stripe.subscriptions.retrieve(subscription.id);
            
            await storage.updateSubscription(existingSubscription.id, {
              status: fullSubscription.status,
            });
            console.log('[Webhook] Subscription status updated to:', fullSubscription.status);
          } else {
            console.warn('[Webhook] Received update for unknown subscription:', subscription.id);
          }
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          console.log('[Webhook] Subscription deleted:', subscription.id);

          const existingSubscription = await storage.getSubscriptionByStripeId(subscription.id);
          if (existingSubscription) {
            await storage.updateSubscription(existingSubscription.id, {
              status: 'canceled',
            });
            console.log('[Webhook] Subscription marked as canceled');
          }
          break;
        }

        default:
          console.log(`[Webhook] Unhandled event type: ${event.type}`);
      }

      // Always respond with 200 to acknowledge receipt
      res.json({ received: true });
    } catch (err: any) {
      console.error('[Webhook] Error processing event:', err);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // ────────────────────────────────────────────────
  // 💳 STRIPE CHECKOUT SESSION
  // ────────────────────────────────────────────────
  
  app.post("/api/create-checkout-session", async (req: Request, res: Response) => {
    const { tier, billing, coverage } = req.body;
    
    console.log(`[Checkout] Request for tier: ${tier}, billing: ${billing}, coverage: ${coverage || 'single-state'}`);
    
    if (!stripe) {
      console.error("Stripe not configured - missing STRIPE_SECRET_KEY");
      return res.status(503).json({ 
        error: "Payment processing is not configured. Please contact support." 
      });
    }
    
    if (!tier || !billing) {
      return res.status(400).json({ error: "Tier and billing cycle are required" });
    }

    // State landing pages require consultation - reject automated checkout
    if (tier === "state_landing" || tier === "disposal_site_landing") {
      return res.status(400).json({ 
        error: "State landing pages require consultation. Please contact sales to discuss your needs." 
      });
    }

    if (!["verified", "featured", "premium"].includes(tier)) {
      return res.status(400).json({ error: "Invalid tier" });
    }


    if (!["monthly", "annual"].includes(billing)) {
      return res.status(400).json({ error: "Invalid billing cycle" });
    }

    try {
      // Get pricing tier from database to retrieve Stripe price ID
      const pricingTier = await storage.getPricingTier(tier);
      
      if (!pricingTier) {
        console.error(`Pricing tier not found in database: ${tier}`);
        return res.status(404).json({ error: "Invalid pricing tier" });
      }

      let priceId: string | null | undefined;
      let pricingDescription = `${tier} - ${billing}`;

      // If coverage is specified (multi-state pricing)
      if (coverage && coverage !== "single") {
        // Validate coverage tier exists
        const coverageTier = await storage.getCoverageTier(coverage);
        if (!coverageTier) {
          return res.status(400).json({ error: "Invalid coverage tier" });
        }

        console.log(`[Checkout] Multi-state pricing requested: ${coverage} (${coverageTier.multiplier}x multiplier)`);
        pricingDescription += ` (${coverageTier.name})`;
        
        // Get the correct Stripe Price ID for this tier + coverage + billing combination
        const tierCoveragePricing = await storage.getTierCoveragePricing(tier, coverage, billing);
        
        if (!tierCoveragePricing || !tierCoveragePricing.stripePriceId) {
          console.error(`No Stripe price ID found for tier: ${tier}, coverage: ${coverage}, billing: ${billing}`);
          return res.status(500).json({ 
            error: `This pricing combination is not yet configured. Please contact support.`
          });
        }
        
        priceId = tierCoveragePricing.stripePriceId;
        console.log(`[Checkout] Using multi-state price ID: ${priceId}`);
      } else {
        // Single-state pricing - use standard price IDs
        priceId = billing === "monthly" 
          ? pricingTier.stripeMonthlyPriceId 
          : pricingTier.stripeAnnualPriceId;
      }
      
      console.log(`[Checkout] Using Stripe Price ID: ${priceId}`);
      
      if (!priceId) {
        console.error(`Missing Stripe price ID for: ${pricingDescription}`);
        return res.status(500).json({ 
          error: "This pricing tier is not yet configured for payments. Please contact support." 
        });
      }

      console.log(`[Checkout] Creating Stripe session with price: ${priceId}`);
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [
          { price: priceId, quantity: 1 },
        ],
        success_url: `${req.protocol}://${req.get("host")}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.protocol}://${req.get("host")}/advertise`,
        metadata: {
          tier: tier,
          coverage: coverage || "single",
          billingCycle: billing,
        },
      });
      
      console.log(`[Checkout] Session created successfully: ${session.id}`);
      res.json({ url: session.url });
    } catch (err: any) {
      console.error("Stripe checkout error details:", {
        message: err.message,
        type: err.type,
        code: err.code,
        statusCode: err.statusCode,
      });
      res.status(500).json({ error: "Failed to create checkout session. Please try again or contact support." });
    }
  });

  // ────────────────────────────────────────────────
  // 📊 ANALYTICS API
  // ────────────────────────────────────────────────

  // Track analytics event
  app.post("/api/analytics/track", async (req: Request, res: Response) => {
    try {
      const { companyId, eventType, source, sessionId } = req.body;

      if (!companyId || !eventType || !source) {
        return res.status(400).json({ error: "companyId, eventType, and source are required" });
      }

      await storage.trackAnalytics({
        companyId,
        eventType,
        source,
        sessionId: sessionId || undefined,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Analytics tracking error:", error);
      res.status(500).json({ error: "Failed to track analytics" });
    }
  });

  // Get analytics for a specific company
  app.get("/api/analytics/company/:id", async (req: Request, res: Response) => {
    try {
      const companyId = parseInt(req.params.id);
      if (isNaN(companyId)) {
        return res.status(400).json({ error: "Invalid company ID" });
      }

      const analytics = await storage.getCompanyAnalytics(companyId);
      res.json(analytics);
    } catch (error) {
      console.error("Analytics retrieval error:", error);
      res.status(500).json({ error: "Failed to retrieve analytics" });
    }
  });

  // Get analytics summary for all companies (admin)
  app.get("/api/analytics/summary", async (req: Request, res: Response) => {
    try {
      const summary = await storage.getAllCompanyAnalyticsSummary();
      res.json(summary);
    } catch (error) {
      console.error("Analytics summary error:", error);
      res.status(500).json({ error: "Failed to retrieve analytics summary" });
    }
  });

  // ────────────────────────────────────────────────
  // 🌍 GEOCODING API (LOCATION SEARCH)
  // ────────────────────────────────────────────────
  
  app.post("/api/geocode", async (req: Request, res: Response) => {
    const { address } = req.body;
    
    if (!address) {
      return res.status(400).json({ error: "Address is required" });
    }
    
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ 
        error: "Google API key not configured" 
      });
    }
    
    try {
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
      const response = await fetch(geocodeUrl);
      const data = await response.json();
      
      res.json(data);
    } catch (error: any) {
      console.error("Geocoding error:", error);
      res.status(500).json({ 
        error: "Failed to geocode address",
        details: error.message 
      });
    }
  });

  // Enhanced search endpoint with state detection and premium landing pages
  app.post("/api/search", async (req: Request, res: Response) => {
    const { address, radiusMiles = 50 } = req.body;
    
    if (!address) {
      return res.status(400).json({ error: "Address is required" });
    }
    
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: "Google API key not configured" });
    }
    
    try {
      // Step 1: Geocode the address
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
      const geocodeResponse = await fetch(geocodeUrl);
      const geocodeData = await geocodeResponse.json();
      
      if (geocodeData.status !== "OK" || !geocodeData.results || geocodeData.results.length === 0) {
        return res.status(400).json({ error: "Unable to geocode address" });
      }
      
      const result = geocodeData.results[0];
      const location = result.geometry.location;
      
      // Step 2: Extract state from address components and detect search type
      let stateCode = null;
      let stateName = null;
      let searchType: "state" | "local" = "local"; // Default to local search
      
      // Check if this is a state-level search (vs city/zipcode/address)
      const resultTypes = result.types || [];
      if (resultTypes.includes("administrative_area_level_1")) {
        searchType = "state"; // User searched for state name like "Indiana"
      }
      
      for (const component of result.address_components || []) {
        if (component.types.includes("administrative_area_level_1")) {
          stateCode = component.short_name; // e.g., "IN", "CO"
          stateName = component.long_name; // e.g., "Indiana", "Colorado"
          break;
        }
      }
      
      // Step 3: Check for premium state landing pages (both companies and disposal sites)
      let premiumLandingPage = null;
      let premiumCompany = null;
      let disposalSiteLandingPage = null;
      let premiumDisposalSite = null;
      
      if (stateCode) {
        // Check for company landing page
        premiumLandingPage = await storage.getStateLandingPageByStateCode(stateCode);
        if (premiumLandingPage && premiumLandingPage.active === "yes" && premiumLandingPage.companyId) {
          premiumCompany = await storage.getCompany(premiumLandingPage.companyId);
        }
        
        // Check for disposal site landing page
        disposalSiteLandingPage = await storage.getDisposalSiteLandingPageByStateCode(stateCode);
        if (disposalSiteLandingPage && disposalSiteLandingPage.active === "yes" && disposalSiteLandingPage.disposalSiteId) {
          premiumDisposalSite = await storage.getDisposalSite(disposalSiteLandingPage.disposalSiteId);
        }
      }
      
      // Step 4: Get companies within radius (also check additional locations)
      console.log(`🌍 [API SEARCH] Received search: "${address}" at (${location.lat}, ${location.lng}), radius: ${radiusMiles} miles`);
      const companiesInRadius = await storage.getCompaniesByRadius(
        location.lat,
        location.lng,
        radiusMiles,
        address // Pass search address to match additional locations
      );
      console.log(`📋 [API SEARCH] Returning ${companiesInRadius.length} companies to client`);
      
      // Step 5: Get disposal sites within radius (also check additional locations)
      const disposalSitesInRadius = await storage.getDisposalSitesByRadius(
        location.lat,
        location.lng,
        radiusMiles,
        address // Pass search address to match additional locations
      );
      
      // Step 6: Separate premium company from other companies
      let otherCompanies = companiesInRadius;
      
      if (premiumCompany) {
        otherCompanies = companiesInRadius.filter(c => c.id !== premiumCompany.id);
      }
      
      // Step 6a: Sort companies to prioritize state landing page company (INSERV for Indiana)
      if (premiumLandingPage && premiumLandingPage.companyId) {
        otherCompanies.sort((a, b) => {
          // Put landing page company (INSERV) at the top
          if (a.id === premiumLandingPage.companyId) return -1;
          if (b.id === premiumLandingPage.companyId) return 1;
          // Then sort by tier (premium > featured > verified > basic)
          const tierOrder = { premium: 3, featured: 2, verified: 1, basic: 0 };
          return (tierOrder[b.tier as keyof typeof tierOrder] || 0) - (tierOrder[a.tier as keyof typeof tierOrder] || 0);
        });
      }
      
      // Check if radius search found any results
      const hasRadiusResults = otherCompanies.length > 0 || disposalSitesInRadius.length > 0;
      
      // Return comprehensive search results
      res.json({
        location: {
          lat: location.lat,
          lng: location.lng,
          formattedAddress: result.formatted_address,
        },
        state: stateCode ? {
          code: stateCode,
          name: stateName,
        } : null,
        searchType, // "state" or "local"
        hasRadiusResults, // true if companies/sites found within radius
        premiumLandingPage: premiumLandingPage ? {
          ...premiumLandingPage,
          company: premiumCompany,
        } : null,
        disposalSiteLandingPage: disposalSiteLandingPage ? {
          ...disposalSiteLandingPage,
          disposalSite: premiumDisposalSite,
        } : null,
        companies: otherCompanies,
        disposalSites: disposalSitesInRadius,
        radius: radiusMiles,
      });
    } catch (error: any) {
      console.error("Search error:", error);
      res.status(500).json({ 
        error: "Failed to perform search",
        details: error.message 
      });
    }
  });
  
  // ────────────────────────────────────────────────
  // 🔍 GOOGLE PLACES IMPORT (ADMIN ONLY)
  // ────────────────────────────────────────────────
  
  app.post("/api/import/search-google", isAdmin, async (req: Request, res: Response) => {
    const { query, location, type } = req.body;
    
    if (!query || !location || !type) {
      return res.status(400).json({ error: "Query, location, and type are required" });
    }

    if (!["company", "disposal"].includes(type)) {
      return res.status(400).json({ error: "Type must be 'company' or 'disposal'" });
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: "Google API key not configured" });
    }

    try {
      // First, geocode the location to get coordinates
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${apiKey}`;
      const geocodeResponse = await fetch(geocodeUrl);
      const geocodeData = await geocodeResponse.json();

      if (geocodeData.status !== "OK" || !geocodeData.results || geocodeData.results.length === 0) {
        return res.status(400).json({ error: "Unable to geocode location" });
      }

      const locationCoords = geocodeData.results[0].geometry.location;
      
      // Search for places using Google Places API (Text Search)
      const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&location=${locationCoords.lat},${locationCoords.lng}&radius=50000&key=${apiKey}`;
      const searchResponse = await fetch(searchUrl);
      const searchData = await searchResponse.json();

      if (searchData.status !== "OK" || !searchData.results) {
        return res.status(400).json({ 
          error: "No results found",
          details: searchData.status 
        });
      }

      const imported = [];
      const skipped = [];
      const failed = [];

      // Get existing data for deduplication
      const existingCompanies = type === "company" ? await storage.getAllCompanies() : [];
      const existingDisposalSites = type === "disposal" ? await storage.getAllDisposalSites() : [];

      // Track items added in this batch for deduplication
      const batchAdded = new Set<string>();

      // Process each result
      for (const place of searchData.results.slice(0, 20)) {
        try {
          // Get place details for more information
          const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,formatted_phone_number,website,geometry&key=${apiKey}`;
          const detailsResponse = await fetch(detailsUrl);
          const detailsData = await detailsResponse.json();

          if (detailsData.status !== "OK" || !detailsData.result) {
            failed.push({ 
              name: place.name || "Unknown",
              reason: `Failed to fetch details: ${detailsData.status}` 
            });
            continue;
          }

          const details = detailsData.result;
          
          // Create a unique key for deduplication
          const dedupeKey = `${details.name.toLowerCase()}|${details.formatted_address?.toLowerCase() || ''}`;

          // Check for duplicates in existing database
          const isDuplicateInDb = type === "company" 
            ? existingCompanies.some(c => 
                c.name.toLowerCase() === details.name.toLowerCase() && 
                c.address?.toLowerCase() === details.formatted_address?.toLowerCase()
              )
            : existingDisposalSites.some(s => 
                s.name.toLowerCase() === details.name.toLowerCase() && 
                s.address?.toLowerCase() === details.formatted_address?.toLowerCase()
              );

          // Check for duplicates in current batch
          const isDuplicateInBatch = batchAdded.has(dedupeKey);

          if (isDuplicateInDb || isDuplicateInBatch) {
            skipped.push({ 
              name: details.name,
              reason: isDuplicateInDb 
                ? "Duplicate entry (already exists in database)" 
                : "Duplicate entry (found multiple times in search results)"
            });
            continue;
          }
          
          // Mark as added in this batch
          batchAdded.add(dedupeKey);

          if (type === "company") {
            // Create company entry
            const companyData = {
              name: details.name,
              address: details.formatted_address || "",
              phone: details.formatted_phone_number || "",
              email: "",
              website: details.website || "",
              description: "",
              services: "Hydro Excavation",
              coverageArea: "",
              lat: details.geometry?.location?.lat?.toString() || "",
              lng: details.geometry?.location?.lng?.toString() || "",
              tier: "free",
              logoUrl: "",
            };

            const created = await storage.createCompany(companyData);
            imported.push({ name: created.name, address: created.address });
          } else if (type === "disposal") {
            // Create disposal site entry
            const siteData = {
              name: details.name,
              address: details.formatted_address || "",
              phone: details.formatted_phone_number || "",
              materialsAccepted: "",
              hours: "",
              lat: details.geometry?.location?.lat?.toString() || "",
              lng: details.geometry?.location?.lng?.toString() || "",
            };

            const created = await storage.createDisposalSite(siteData);
            imported.push({ name: created.name, address: created.address });
          }
        } catch (error) {
          console.error("Error processing place:", error);
          failed.push({ 
            name: place.name || "Unknown",
            reason: error instanceof Error ? error.message : "Unknown error" 
          });
        }
      }

      res.json({
        success: true,
        found: searchData.results.length,
        imported: imported.length,
        skipped: skipped.length,
        failed: failed.length,
        details: {
          imported,
          skipped,
          failed,
        },
      });
    } catch (err: any) {
      console.error("Google Places import error:", err);
      res.status(500).json({ 
        error: "Failed to import from Google Places",
        details: err.message 
      });
    }
  });

  // ────────────────────────────────────────────────
  // 🚀 PRODUCTION MIGRATION
  // ────────────────────────────────────────────────
  
  // Import the migration handler
  const { handleProductionMigration } = await import("./migrate-prod-endpoint");
  
  // Migration endpoint (protected by secret key)
  app.post("/api/migrate-production", handleProductionMigration);

  // ────────────────────────────────────────────────
  // 🔐 ADMIN ROUTES
  // ────────────────────────────────────────────────

  // Create a new company (admin only)
  app.post("/api/admin/companies", isAdmin, async (req: Request, res: Response) => {
    try {
      let companyData = req.body;
      
      // Convert isUnion from "yes"/"no" string to boolean before validation
      if (companyData.isUnion === "yes") {
        companyData.isUnion = true;
      } else if (companyData.isUnion === "no") {
        companyData.isUnion = false;
      }
      
      // Validate using Zod schema
      const validationSchema = insertCompanySchema.refine(
        (data) => {
          if (data.isUnion === true && (!data.unionName || data.unionName.trim() === '')) {
            return false;
          }
          return true;
        },
        {
          message: "Union name is required when company is marked as union",
          path: ["unionName"],
        }
      );
      
      const validationResult = validationSchema.safeParse(companyData);
      
      if (!validationResult.success) {
        const error = fromZodError(validationResult.error);
        console.error("[Admin Company Create] Validation error:", error.message);
        return res.status(400).json({ error: error.message });
      }
      
      const company = await storage.createCompany(validationResult.data);
      console.log(`[Admin] Created company: ${company.name}`);
      res.json(company);
    } catch (err: any) {
      console.error("Error creating company:", err);
      res.status(500).json({ error: err.message || "Failed to create company" });
    }
  });

  // Create a new disposal site (admin only)
  app.post("/api/admin/disposal-sites", isAdmin, async (req: Request, res: Response) => {
    try {
      const validationResult = insertDisposalSiteSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const error = fromZodError(validationResult.error);
        console.error("[Admin Disposal Site Create] Validation error:", error.message);
        return res.status(400).json({ error: error.message });
      }
      
      const site = await storage.createDisposalSite(validationResult.data);
      console.log(`[Admin] Created disposal site: ${site.name}`);
      res.json(site);
    } catch (err: any) {
      console.error("Error creating disposal site:", err);
      res.status(500).json({ error: err.message || "Failed to create disposal site" });
    }
  });

  // Update a company
  app.put("/api/admin/companies/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      console.log(`[Admin] Updating company ID ${id}`);
      console.log("[Admin] Update data:", JSON.stringify(updateData, null, 2));
      
      // Convert isUnion string to boolean if needed
      if (updateData.isUnion === "yes") updateData.isUnion = true;
      else if (updateData.isUnion === "no") updateData.isUnion = false;
      
      const company = await storage.updateCompany(id, updateData);
      console.log("[Admin] Updated company:", JSON.stringify(company, null, 2));
      res.json(company);
    } catch (err: any) {
      console.error("Error updating company:", err);
      res.status(500).json({ error: err.message || "Failed to update company" });
    }
  });

  // Delete a company
  app.delete("/api/admin/companies/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCompany(id);
      res.json({ success: true, message: "Company deleted successfully" });
    } catch (err: any) {
      console.error("Error deleting company:", err);
      res.status(500).json({ error: err.message || "Failed to delete company" });
    }
  });

  // Update a disposal site
  app.put("/api/admin/disposal-sites/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      const site = await storage.updateDisposalSite(id, updateData);
      res.json(site);
    } catch (err: any) {
      console.error("Error updating disposal site:", err);
      res.status(500).json({ error: err.message || "Failed to update disposal site" });
    }
  });

  // Delete a disposal site
  app.delete("/api/admin/disposal-sites/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteDisposalSite(id);
      res.json({ success: true, message: "Disposal site deleted successfully" });
    } catch (err: any) {
      console.error("Error deleting disposal site:", err);
      res.status(500).json({ error: err.message || "Failed to delete disposal site" });
    }
  });

  // Update a state landing page (admin only)
  app.put("/api/admin/state-landing-pages/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      console.log(`[Admin] Updating state landing page ID ${id}`);
      console.log("[Admin] Update data:", JSON.stringify(updateData, null, 2));
      
      const page = await storage.updateStateLandingPage(id, updateData);
      console.log("[Admin] Updated state landing page:", JSON.stringify(page, null, 2));
      res.json(page);
    } catch (err: any) {
      console.error("Error updating state landing page:", err);
      res.status(500).json({ error: err.message || "Failed to update state landing page" });
    }
  });

  // ────────────────────────────────────────────────
  // 🏥 HEALTH CHECK
  // ────────────────────────────────────────────────
  
  app.get("/health", (_req: Request, res: Response) => {
    res.send("HydroVacFinder backend running ✅");
  });

  const httpServer = createServer(app);
  return httpServer;
}
