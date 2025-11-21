# Production Database Migration Instructions

## Overview
Your development database has **497 companies** and **75 disposal sites** that need to be migrated to production so they appear on your live site at https://hydrovacfinder.com.

All the migration data has been exported and saved in the codebase at `server/migration-data/`. A secure migration endpoint has been created that will populate your production database.

## Step 1: Verify Your Domain is Working
Before migrating data, make sure your domain is verified:
1. Go to your Publishing tool in Replit
2. Verify that https://hydrovacfinder.com shows "Verified" status
3. The SSL certificate warning you saw earlier should resolve within 48 hours as DNS propagates

## Step 2: Run the Migration

### Option A: Use the Migration Endpoint (Recommended)
This is the safest method and can be done from your browser:

1. **Open your browser's developer console:**
   - Chrome/Edge: Press `F12` or `Ctrl+Shift+J` (Windows) / `Cmd+Option+J` (Mac)
   - Firefox: Press `F12` or `Ctrl+Shift+K` (Windows) / `Cmd+Option+K` (Mac)

2. **Copy and paste this code into the console:**

```javascript
fetch('https://hydrovacfinder.com/api/migrate-production', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    secretKey: 'YOUR_ADMIN_MIGRATION_KEY_HERE'
  })
})
.then(res => res.json())
.then(data => {
  console.log('Migration completed!');
  console.log(data);
  alert('Success! ' + data.imported.companies + ' companies and ' + data.imported.disposalSites + ' disposal sites migrated!');
})
.catch(err => {
  console.error('Migration failed:', err);
  alert('Migration failed. Check console for details.');
});
```

3. **Replace `YOUR_ADMIN_MIGRATION_KEY_HERE` with your actual migration key** (the one you just set in Replit Secrets)

4. **Press Enter** to run the migration

5. **Wait for the confirmation** - You should see a success message with the number of records migrated

6. **Refresh your site** at https://hydrovacfinder.com to see all your companies and disposal sites!

### Option B: Use cURL from Terminal
If you prefer using the command line:

```bash
curl -X POST https://hydrovacfinder.com/api/migrate-production \
  -H "Content-Type: application/json" \
  -d '{"secretKey":"YOUR_ADMIN_MIGRATION_KEY_HERE"}'
```

Replace `YOUR_ADMIN_MIGRATION_KEY_HERE` with your actual key.

## Step 3: Verify the Migration

1. Visit https://hydrovacfinder.com
2. You should now see:
   - **497 companies** on the map and in the listings
   - **75 disposal sites** 
   - All your pricing tiers on the Advertise page
   - State landing pages working

3. Test the search functionality to make sure data loaded correctly

## Step 4: Clean Up (After Successful Migration)

After confirming everything works:

1. **Remove the migration key** from Replit Secrets (for security)
2. The migration endpoint will no longer work without the key
3. All your data is now safely in production!

## What Gets Migrated

The migration includes:
- ✅ 497 hydro-vac companies (with all details: name, address, phone, email, website, services, tier, coordinates)
- ✅ 75 disposal sites (with all details)
- ✅ 3 featured partners
- ✅ All 50 state landing pages for companies
- ✅ All 50 state landing pages for disposal sites

## Troubleshooting

**If you see "Unauthorized - invalid migration key":**
- Double-check that you copied the migration key exactly as it appears in Replit Secrets
- Make sure there are no extra spaces or quotes

**If you see "Migration data files not found":**
- This shouldn't happen as the data is in the codebase, but if it does, contact support

**If the map doesn't show on production:**
- Check that your VITE_GOOGLE_MAPS_API_KEY is set in your production environment
- The Google Maps API key needs to be configured in your Publishing settings under Secrets

**If you see a 404 error:**
- Make sure your app is published and running
- Verify the URL is exactly: https://hydrovacfinder.com/api/migrate-production

## Important Notes

⚠️ **This migration will REPLACE all existing data in production** - Any companies or sites currently in production will be deleted and replaced with the development data.

✅ **The migration is idempotent** - You can run it multiple times if needed. Each time it will clear and repopulate the data.

🔒 **Security** - The migration endpoint is protected by your secret key. After migration, you can safely remove the key from Replit Secrets.

## Next Steps After Migration

Once your data is migrated and visible on your live site:

1. ✅ Set up your social media pages (Facebook, LinkedIn, Instagram, TikTok)
2. ✅ Verify Stripe integration is working correctly
3. ✅ Test the subscription checkout flow
4. ✅ Test the contact form
5. ✅ Review analytics tracking
6. 🚀 Launch marketing campaigns!

---

**Need help?** If you run into any issues, check the browser console for detailed error messages.
