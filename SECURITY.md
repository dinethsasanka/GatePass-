# Security Notice

## Important: Environment Variables

This repository does NOT include the actual `.env` files as they contain sensitive information. You must create your own `.env` files based on the provided `.env.example` templates.

### Setting Up Environment Variables

#### Backend (.env)

1. Copy `backend/.env.example` to `backend/.env`
2. Fill in your actual credentials:
   - **MongoDB**: Connection string with username and password
   - **JWT Secret**: Use a secure random string (see generation below)
   - **Supabase**: URL and API key from your Supabase project
   - **Email**: Gmail address and App Password (see setup below)
   - **Azure AD**: Client ID, Tenant ID, and Client Secret from Azure Portal
   - **ERP API**: Base URL, username, and password
   - **Employee API**: Base URL for employee data
   - **Intranet API**: Internal network base URL

#### Frontend (.env)

1. Copy `frontend/.env.example` to `frontend/.env`
2. Fill in your actual credentials:
   - **Backend API URL**: Usually `http://localhost:5000/api` for development
   - **Azure AD**: Client ID, Tenant ID, Authority URL, and Redirect URI
   - **Supabase**: URL and anonymous key (if needed in frontend)

### Environment Variables Reference

#### Backend Environment Variables

| Variable                  | Description                      | Example                                          |
| ------------------------- | -------------------------------- | ------------------------------------------------ |
| `MONGO_URI`               | MongoDB connection string        | `mongodb+srv://user:pass@cluster.mongodb.net/db` |
| `JWT_SECRET`              | Secret key for JWT tokens        | Random 64-character hex string                   |
| `SUPABASE_URL`            | Supabase project URL             | `https://xxx.supabase.co`                        |
| `SUPABASE_KEY`            | Supabase anonymous key           | JWT token from Supabase                          |
| `PORT`                    | Backend server port              | `5000`                                           |
| `FRONTEND_URL`            | Frontend application URL         | `http://localhost:5173`                          |
| `EMAIL_USER`              | Gmail address for sending emails | `your-app@gmail.com`                             |
| `EMAIL_PASS`              | Gmail App Password               | 16-character app password                        |
| `AZURE_CLIENT_ID`         | Azure AD application ID          | GUID from Azure Portal                           |
| `AZURE_TENANT_ID`         | Azure AD tenant ID               | GUID from Azure Portal                           |
| `AZURE_CLIENT_SECRET`     | Azure AD client secret           | Secret from Azure Portal                         |
| `AZURE_REDIRECT_URI`      | OAuth redirect URI               | `http://localhost:5173/callback`                 |
| `AZURE_AUTHORITY`         | Azure AD authority URL           | `https://login.microsoftonline.com/common`       |
| `EMPLOYEE_API_BASE_URL`   | Employee data API endpoint       | Full API URL                                     |
| `ERP_BASE_URL`            | ERP system API endpoint          | Full API URL                                     |
| `ERP_USERNAME`            | ERP API username                 | Your ERP username                                |
| `ERP_PASSWORD`            | ERP API password                 | Your ERP password                                |
| `INTRANET_BASE_URL`       | Internal network API             | `http://internal-ip:port`                        |
| `MICROSOFT_GRAPH_API_URL` | Microsoft Graph API base         | `https://graph.microsoft.com/v1.0`               |

#### Frontend Environment Variables

| Variable                  | Description             | Example                                    |
| ------------------------- | ----------------------- | ------------------------------------------ |
| `VITE_API_URL`            | Backend API endpoint    | `http://localhost:5000/api`                |
| `VITE_AZURE_CLIENT_ID`    | Azure AD application ID | Same as backend                            |
| `VITE_AZURE_TENANT_ID`    | Azure AD tenant ID      | Same as backend                            |
| `VITE_AZURE_AUTHORITY`    | Azure AD authority URL  | `https://login.microsoftonline.com/common` |
| `VITE_AZURE_REDIRECT_URI` | OAuth redirect URI      | `http://localhost:5173/callback`           |
| `VITE_SUPABASE_URL`       | Supabase project URL    | Same as backend                            |
| `VITE_SUPABASE_ANON_KEY`  | Supabase anonymous key  | Same as backend SUPABASE_KEY               |

### Never Commit Sensitive Data

- ❌ Never commit `.env` files
- ❌ Never commit credentials or API keys
- ❌ Never commit database connection strings
- ❌ Never hardcode sensitive values in source code
- ✅ Always use `.env.example` files as templates
- ✅ Keep sensitive data in local `.env` files only
- ✅ Use environment variables for all secrets
- ✅ Commit `.env.example` files with placeholder values

### Generating Secure Secrets

**JWT Secret:**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Alternative (OpenSSL):**

```bash
openssl rand -hex 32
```

### Gmail App Password Setup

1. Enable 2-Factor Authentication on your Gmail account
2. Go to: https://myaccount.google.com/apppasswords
3. Select "Mail" as the app and "Other" as the device
4. Name it "Gate Pass System" or similar
5. Copy the 16-character password (remove spaces)
6. Use this password in `EMAIL_PASS` environment variable

**Important:** Regular Gmail passwords won't work; you must use App Passwords.

### Azure AD Setup

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Fill in:
   - Name: "SLT Gate Pass System"
   - Supported account types: Choose based on your needs
   - Redirect URI: `http://localhost:5173/callback` (for development)
5. After registration, note down:
   - **Application (client) ID** → `AZURE_CLIENT_ID`
   - **Directory (tenant) ID** → `AZURE_TENANT_ID`
6. Go to **Certificates & secrets** > **New client secret**
   - Description: "Gate Pass Secret"
   - Expiry: Choose appropriate duration
   - Copy the **Value** → `AZURE_CLIENT_SECRET`
7. Go to **API permissions**
   - Add **Microsoft Graph** > **Delegated permissions**
   - Add `User.Read` permission
   - Grant admin consent if required
8. Go to **Authentication**
   - Add redirect URIs for production: `https://your-domain.com/callback`
   - Enable "Access tokens" and "ID tokens"

### Supabase Setup

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create a new project or select existing one
3. Go to **Settings** > **API**
4. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_KEY` / `VITE_SUPABASE_ANON_KEY`

### MongoDB Setup

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Create a cluster or use existing one
3. Click **Connect** > **Connect your application**
4. Copy the connection string
5. Replace `<username>`, `<password>`, and database name
6. Use in `MONGO_URI`

### Production Deployment

When deploying to production:

1. **Never use development credentials in production**
2. Update all URLs to production domains:
   - `FRONTEND_URL` → `https://gatepass.slt.lk`
   - `VITE_API_URL` → `https://gatepass.slt.lk/api`
   - `AZURE_REDIRECT_URI` → `https://gatepass.slt.lk/callback`
   - `VITE_AZURE_REDIRECT_URI` → `https://gatepass.slt.lk/callback`
3. Generate new JWT secret for production
4. Use production database connection
5. Update Azure AD redirect URIs in Azure Portal
6. Use environment variables in your hosting platform
7. Enable HTTPS/SSL certificates
8. Review and update CORS settings

### Security Best Practices

1. **Rotate secrets regularly** (especially JWT secrets and API keys)
2. **Use strong passwords** for all services
3. **Enable 2FA** where available
4. **Monitor access logs** for unusual activity
5. **Keep dependencies updated** (run `npm audit` regularly)
6. **Use HTTPS** in production
7. **Limit API permissions** to minimum required
8. **Don't share .env files** via email, chat, or any communication channel
9. **Use secret management tools** for production (AWS Secrets Manager, Azure Key Vault, etc.)
10. **Review git history** to ensure no secrets were committed

### Troubleshooting

**Environment variables not loading?**

- Ensure `.env` file is in the correct directory (backend or frontend root)
- Restart your development server after changing `.env`
- Check for typos in variable names
- For Vite (frontend), variables must start with `VITE_`

**Azure login not working?**

- Verify all Azure AD credentials are correct
- Check redirect URI matches exactly (including http/https)
- Ensure client secret hasn't expired
- Verify API permissions are granted

**Email not sending?**

- Confirm 2FA is enabled on Gmail account
- Use App Password, not regular password
- Check for typos in EMAIL_USER and EMAIL_PASS
- Verify Gmail hasn't blocked the app

### Getting Help

For security issues or questions about environment setup:

1. Check this documentation first
2. Review the `.env.example` files
3. Contact the development team
4. **Never share actual credentials** when asking for help

---

**Last Updated:** February 2026  
**Maintained by:** SLT Development Team
