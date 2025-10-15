# SunnySeat Frontend Deployment Setup Guide

This guide provides step-by-step instructions for completing the production deployment configuration for Story 4.5.

## Prerequisites

- Azure subscription with permissions to create resources
- GitHub repository admin access
- SunnySeat brand assets (logo files for PWA icons)

## 1. Generate PWA Icons (REQUIRED for PWA functionality)

### Overview

PWA icons are required for the Progressive Web App to be installable on mobile devices. Without these, users cannot add SunnySeat to their home screens.

### Required Icons

- `icon-192.png` - 192x192px (Android Chrome minimum)
- `icon-512.png` - 512x512px (Android Chrome splash screen)
- `apple-touch-icon.png` - 180x180px (iOS home screen)

### Generation Steps

**Option A: Using RealFaviconGenerator (Recommended)**

1. Visit https://realfavicongenerator.net
2. Upload your SunnySeat logo (preferably SVG or high-res PNG ≥512px)
3. Configure settings:
   - **iOS**: Enable "Add a solid background color" (use `#0EA5E9` - SunnySeat theme color)
   - **Android Chrome**: Select "Use a solid color" (use `#0EA5E9`)
   - **Favicon**: Generate standard favicon.ico
4. Download the generated package
5. Extract and copy these files to `src/frontend/admin/public/icons/`:
   - `android-chrome-192x192.png` → rename to `icon-192.png`
   - `android-chrome-512x512.png` → rename to `icon-512.png`
   - `apple-touch-icon.png` (keep as-is)
   - Optional: Copy `favicon.ico` to `public/` root

**Option B: Using PWA Asset Generator (CLI)**

```bash
# Install globally
npm install -g pwa-asset-generator

# Navigate to frontend directory
cd src/frontend/admin

# Generate icons from your logo
pwa-asset-generator path/to/logo.svg public/icons \
  --icon-only \
  --type png \
  --background "#0EA5E9" \
  --padding "10%"

# This generates all required sizes automatically
```

**Option C: Manual Creation (Photoshop/GIMP/Figma)**

1. Open your SunnySeat logo in your preferred editor
2. Create 3 artboards/canvases:
   - 192x192px
   - 512x512px
   - 180x180px (for Apple)
3. Center the logo with appropriate padding (10-15%)
4. Add background color: `#0EA5E9` (SunnySeat theme)
5. Export as PNG with transparency disabled
6. Save to `src/frontend/admin/public/icons/`

### Verification

After generating icons:

1. Check that files exist:

   ```bash
   ls -la src/frontend/admin/public/icons/
   # Should show:
   # icon-192.png
   # icon-512.png
   # apple-touch-icon.png
   ```

2. Remove the placeholder README:

   ```bash
   rm src/frontend/admin/public/icons/README.md
   ```

3. Rebuild the app and test PWA installation:
   ```bash
   npm run build
   npm run preview
   # Visit http://localhost:4173 and check for install prompt
   ```

## 2. Configure Azure Static Web Apps

### Create Azure Resource

**Via Azure Portal:**

1. Log in to [Azure Portal](https://portal.azure.com)
2. Click "Create a resource" → Search for "Static Web App"
3. Configure:
   - **Subscription**: Your subscription
   - **Resource Group**: Create new "sunnyseat-prod" (or use existing)
   - **Name**: `sunnyseat-frontend`
   - **Plan type**: Standard (or Free for MVP testing)
   - **Region**: West Europe (closest to Gothenburg)
   - **Deployment details**:
     - Source: GitHub
     - Organization: Your GitHub org
     - Repository: `sunnyseat`
     - Branch: `main`
     - Build Presets: React
     - App location: `/src/frontend/admin`
     - Output location: `dist`
4. Click "Review + create" → "Create"

**Via Azure CLI:**

```bash
# Install Azure CLI if needed: https://learn.microsoft.com/en-us/cli/azure/install-azure-cli

# Login
az login

# Create resource group
az group create \
  --name sunnyseat-prod \
  --location westeurope

# Create Static Web App
az staticwebapp create \
  --name sunnyseat-frontend \
  --resource-group sunnyseat-prod \
  --source https://github.com/YOUR-ORG/sunnyseat \
  --location westeurope \
  --branch main \
  --app-location "/src/frontend/admin" \
  --output-location "dist" \
  --login-with-github
```

### Get Deployment Token

After creation:

1. Navigate to your Static Web App in Azure Portal
2. Go to **Settings** → **Configuration**
3. Copy the **Deployment token** (you'll need this for GitHub secrets)

### Configure Custom Domain (Optional but Recommended)

1. In Azure Portal, go to your Static Web App
2. Navigate to **Settings** → **Custom domains**
3. Click **+ Add** → **Custom domain on other DNS**
4. Follow instructions to:
   - Add CNAME record at your DNS provider: `www.sunnyseat.com` → `[your-swa-url].azurestaticapps.net`
   - Add TXT record for verification
   - Wait for DNS propagation (can take up to 48 hours)
5. SSL certificate is automatically provisioned by Azure

## 3. Configure GitHub Secrets

### Required Secrets

Navigate to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**.

**Add these secrets:**

#### AZURE_STATIC_WEB_APPS_API_TOKEN

- **Value**: The deployment token from Azure Static Web App (from step 2)
- **Usage**: Required by `.github/workflows/deploy-frontend.yml` for deployment

#### VITE_APPLICATIONINSIGHTS_CONNECTION_STRING

- **Value**: Your Application Insights connection string
- **How to get it**:
  1. Log in to Azure Portal
  2. Navigate to your Application Insights resource (or create one)
  3. Go to **Overview** → Copy **Connection String**
  4. Format: `InstrumentationKey=...;IngestionEndpoint=...`
- **Usage**: Required for error tracking and performance monitoring

### Add Secrets

For each secret:

1. Click **New repository secret**
2. Name: Enter the secret name exactly as shown above
3. Value: Paste the corresponding value
4. Click **Add secret**

### Verify Configuration

Check that secrets are configured:

```bash
# List all secrets (names only, not values)
gh secret list
# Should show:
# AZURE_STATIC_WEB_APPS_API_TOKEN
# VITE_APPLICATIONINSIGHTS_CONNECTION_STRING
```

## 4. Update Sitemap Generation (When API is Ready)

The current sitemap (`public/sitemap.xml`) only includes static routes. Once the backend API is deployed:

### Add API Endpoint to Fetch Venues

Update `scripts/generate-sitemap.ts`:

```typescript
async function fetchVenueSlugs(): Promise<string[]> {
  const API_URL = process.env.VITE_API_URL || "https://api.sunnyseat.com";

  try {
    const response = await fetch(`${API_URL}/api/venues`);
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    const venues = await response.json();
    return venues.map((v: { slug: string }) => v.slug);
  } catch (error) {
    console.error("Failed to fetch venues:", error);
    return [];
  }
}
```

### Add Build Script to package.json

```json
{
  "scripts": {
    "generate:sitemap": "tsx scripts/generate-sitemap.ts",
    "prebuild": "npm run generate:sitemap"
  }
}
```

This will automatically regenerate the sitemap before each build.

### Alternative: Server-Side Sitemap

For dynamic content that changes frequently, consider generating sitemap server-side:

1. Add endpoint to backend API: `GET /sitemap.xml`
2. Remove static `public/sitemap.xml`
3. Update `robots.txt` to point to API endpoint:
   ```
   Sitemap: https://api.sunnyseat.com/sitemap.xml
   ```

## 5. Validate Deployment

After completing steps 1-3:

### Trigger Deployment

```bash
# Commit your icon changes
git add src/frontend/admin/public/icons/
git commit -m "Add PWA icons for installability"
git push origin main
```

### Monitor Deployment

1. Go to GitHub Actions: `https://github.com/YOUR-ORG/sunnyseat/actions`
2. Watch the "Deploy to Production" workflow
3. Verify all steps complete successfully

### Test Deployment

1. Visit your Azure Static Web App URL (or custom domain)
2. Check PWA installability:
   - Chrome DevTools → Application → Manifest (should show no errors)
   - Look for install prompt on mobile devices
3. Validate SEO:
   - View page source and verify meta tags
   - Check `https://sunnyseat.com/sitemap.xml`
   - Validate robots.txt: `https://sunnyseat.com/robots.txt`
4. Test Application Insights:
   - Trigger an error intentionally
   - Check Azure Portal → Application Insights → Failures

### Run Lighthouse Audit

```bash
# Install Lighthouse CLI
npm install -g @lhci/cli

# Run audit on production
lhci autorun --collect.url=https://sunnyseat.com
```

Should achieve:

- Performance: >80
- SEO: >90
- PWA: >80
- Accessibility: >90

## 6. Post-Deployment Checklist

- [ ] PWA icons generated and committed
- [ ] Azure Static Web App created and configured
- [ ] Custom domain configured (if applicable)
- [ ] GitHub secrets added (AZURE_STATIC_WEB_APPS_API_TOKEN, VITE_APPLICATIONINSIGHTS_CONNECTION_STRING)
- [ ] Deployment workflow runs successfully
- [ ] Site accessible at production URL
- [ ] PWA installable on iOS and Android
- [ ] Sitemap.xml accessible
- [ ] Application Insights receiving telemetry
- [ ] Lighthouse scores meet targets
- [ ] Error boundaries tested in production

## Troubleshooting

### PWA Not Installing

**Symptoms**: No install prompt appears on mobile devices

**Fixes**:

1. Verify icons exist: Check DevTools → Application → Manifest
2. Ensure HTTPS is enabled (required for PWA)
3. Check manifest.json includes all required fields
4. Test on actual device (not emulator)

### Deployment Fails

**Symptoms**: GitHub Action workflow fails

**Fixes**:

1. Verify `AZURE_STATIC_WEB_APPS_API_TOKEN` is correct
2. Check build logs for errors
3. Ensure `app_location` and `output_location` in workflow match project structure
4. Verify Azure Static Web App is in "Ready" status

### Application Insights Not Working

**Symptoms**: No telemetry in Azure Portal

**Fixes**:

1. Verify `VITE_APPLICATIONINSIGHTS_CONNECTION_STRING` is correct
2. Check browser console for Application Insights errors
3. Ensure connection string format is correct: `InstrumentationKey=...;IngestionEndpoint=...`
4. Wait 5-10 minutes for telemetry to appear (not real-time)

### Sitemap Not Updating

**Symptoms**: Old venue URLs in sitemap

**Fixes**:

1. Check `prebuild` script runs before deployment
2. Verify API endpoint is accessible from build environment
3. Add environment variable `VITE_API_URL` to GitHub secrets if needed
4. Check build logs for sitemap generation errors

## Support Resources

- [Azure Static Web Apps Documentation](https://learn.microsoft.com/en-us/azure/static-web-apps/)
- [PWA Best Practices](https://web.dev/pwa-checklist/)
- [Application Insights Web Apps](https://learn.microsoft.com/en-us/azure/azure-monitor/app/javascript)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

## Next Steps

After completing this setup:

1. Run full QA validation (Quinn to re-review Story 4.5)
2. Conduct UAT with stakeholders
3. Enable production monitoring alerts in Application Insights
4. Set up automated sitemap regeneration when venue data changes
5. Consider implementing Real User Monitoring (RUM) for ongoing performance tracking
