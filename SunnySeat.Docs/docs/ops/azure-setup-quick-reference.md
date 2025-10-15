# Azure Setup - Quick Reference Card

## Story 1.3: Authentication Security - Production Setup

**⏱️ Estimated Time**: 30-45 minutes  
**💰 Estimated Monthly Cost**: ~$50-100 USD (Basic tier resources)

---

## 📋 **What You'll Create in Azure**

| Resource                 | Purpose               | Tier/SKU            |
| ------------------------ | --------------------- | ------------------- |
| **Azure Key Vault**      | Secure secret storage | Standard            |
| **App Service**          | API hosting           | B1 Basic            |
| **PostgreSQL Database**  | Production data       | Burstable B1ms      |
| **Application Insights** | Monitoring (optional) | Free tier available |

---

## 🎯 **Azure Portal - Step-by-Step Checklist**

### **Step 1: Key Vault (5 min)**

```
☑️ Portal → Create Resource → Key Vault
☑️ Name: sunnyseat-keyvault-prod
☑️ Region: [Your preferred region]
☑️ Pricing: Standard
☑️ Access: Azure RBAC
☑️ Click: Create
```

**🎫 Save This Info:**

- Key Vault Name: **********\_\_**********
- Key Vault URI: **********\_\_**********

---

### **Step 2: Generate JWT Secret (2 min)**

**Run this PowerShell command:**

```powershell
$bytes = New-Object byte[] 64
[Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
$secret = [Convert]::ToBase64String($bytes)
Write-Host "Your JWT Secret:" $secret
```

**Copy the output, you'll need it in Step 3!**

---

### **Step 3: Store Secret in Key Vault (3 min)**

```
☑️ Open your Key Vault
☑️ Go to: Secrets → Generate/Import
☑️ Name: JwtSecretKey
☑️ Value: [Paste from Step 2]
☑️ Click: Create
```

**🎫 Save This Info:**

- Secret stored: [✓] Yes

---

### **Step 4: Create App Service (10 min)**

```
☑️ Portal → Create Resource → App Service
☑️ Name: sunnyseat-api-prod
☑️ Runtime: .NET 8
☑️ OS: Linux
☑️ Region: [Same as Key Vault]
☑️ Plan: B1 Basic
☑️ Click: Create

After creation:
☑️ Go to: App Service → Identity
☑️ System assigned: ON
☑️ Save
☑️ Copy the Object ID
```

**🎫 Save This Info:**

- App Service Name: **********\_\_**********
- App Service URL: **********\_\_**********
- Managed Identity ID: **********\_\_**********

---

### **Step 5: Grant Key Vault Access (5 min)**

```
☑️ Go to: Key Vault → Access control (IAM)
☑️ Click: Add → Add role assignment
☑️ Role: Key Vault Secrets User
☑️ Type: Managed identity
☑️ Select: [Your App Service]
☑️ Click: Review + assign
```

**✅ Verification:**

- Role assigned: [✓] Yes

---

### **Step 6: Create PostgreSQL Database (15 min)**

```
☑️ Portal → Create Resource → PostgreSQL Flexible Server
☑️ Name: sunnyseat-db-prod
☑️ Version: PostgreSQL 14+
☑️ Compute: Burstable B1ms
☑️ Region: [Same as others]
☑️ Authentication: PostgreSQL authentication
☑️ Admin username: sunnyseataadmin
☑️ Password: [Generate strong password]
☑️ Networking: Allow Azure services
☑️ Click: Create

After creation:
☑️ Go to: Databases → Add
☑️ Name: sunnyseat_production
☑️ Click: Save
```

**🎫 Save This Info:**

- Server: **********\_\_**********.postgres.database.azure.com
- Database: sunnyseat_production
- Username: sunnyseataadmin
- Password: **********\_\_**********

---

## 📝 **Information Collection Sheet**

**Fill this out and provide back for configuration:**

```yaml
azure_resources:
  key_vault:
    name: "sunnyseat-keyvault-prod"
    uri: "https://[VAULT-NAME].vault.azure.net/"

  app_service:
    name: "sunnyseat-api-prod"
    url: "https://[APP-NAME].azurewebsites.net"
    managed_identity_id: "[OBJECT-ID-FROM-PORTAL]"

  database:
    server: "[SERVER-NAME].postgres.database.azure.com"
    database: "sunnyseat_production"
    username: "sunnyseataadmin"
    password: "[YOUR-SECURE-PASSWORD]"

  frontend_domain: "https://[YOUR-FRONTEND-URL]" # For CORS
```

---

## 🚀 **After Azure Setup - Return to Me With:**

1. ✅ **Key Vault URI** (from Step 1)
2. ✅ **App Service URL** (from Step 4)
3. ✅ **Managed Identity Object ID** (from Step 4)
4. ✅ **Database Connection Details** (from Step 6)
5. ✅ **Frontend Domain** (if you have it)

**Then I'll:**

- Generate `appsettings.Production.json` with Key Vault references
- Create deployment scripts
- Help configure App Service settings
- Guide you through first deployment

---

## 💡 **Quick Tips**

**Choose Same Region for All Resources**

- Reduces latency
- Reduces costs (no cross-region data transfer)

**Use Resource Groups**

- Create: `sunnyseat-prod-rg`
- Makes cleanup easier
- Better cost tracking

**Enable Application Insights**

- Free tier available
- Essential for production monitoring
- Easy to add later if skipped now

**Database Sizing**

- B1ms (Burstable) is perfect for MVP
- Can scale up later without downtime
- Costs ~$15/month

**Cost Optimization**

- Use B1 App Service tier for MVP (~$55/month)
- Upgrade to S1 when you need auto-scaling
- PostgreSQL can auto-pause when idle (saves money)

---

## 🔐 **Security Best Practices**

✅ **Never store secrets in code**
✅ **Use Managed Identities** (no passwords needed)
✅ **Enable HTTPS only** (App Service → TLS/SSL settings)
✅ **Restrict database firewall** (Only allow Azure services)
✅ **Use strong passwords** (20+ characters, mixed case, symbols)
✅ **Enable audit logging** (Track all Key Vault access)

---

## 📞 **Need Help?**

**Common Questions:**

Q: "Can I use free tier resources?"  
A: Azure doesn't offer free App Service for production. B1 is minimum recommended.

Q: "What if I don't have a frontend domain yet?"  
A: You can configure CORS later. Use `*` for testing (not production!)

Q: "How long does Azure setup take?"  
A: 30-45 minutes if you follow this guide step-by-step.

Q: "Can I automate this with Terraform/ARM?"  
A: Yes! But manual setup is easier for first time. I can help with IaC later.

---

## ✅ **Success Criteria**

You've completed Azure setup successfully when:

- [✓] All 4 Azure resources created
- [✓] Managed Identity has Key Vault access
- [✓] JWT secret is in Key Vault (not in code)
- [✓] Database is accessible from Azure services
- [✓] You have all the connection info saved

**Next**: Provide me the information and I'll generate production configs! 🚀

---

**Document**: Quick Reference v1.0  
**Last Updated**: 2025-10-09
