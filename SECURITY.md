# Security Notice

## Important: Environment Variables

This repository does NOT include the actual `.env` files as they contain sensitive information. You must create your own `.env` files based on the provided `.env.example` templates.

### Setting Up Environment Variables

#### Backend (.env)

1. Copy `backend/.env.example` to `backend/.env`
2. Fill in your actual credentials:
   - MongoDB connection string
   - JWT secret key
   - Supabase URL and API key
   - Email credentials (Gmail App Password)
   - Azure AD credentials

#### Frontend (.env)

1. Copy `frontend/.env.example` to `frontend/.env`
2. Fill in your actual credentials:
   - Backend API URL
   - Azure AD Client ID and Tenant ID
   - Supabase credentials (if needed)

### Never Commit Sensitive Data

- ❌ Never commit `.env` files
- ❌ Never commit credentials or API keys
- ❌ Never commit database connection strings
- ✅ Always use `.env.example` files as templates
- ✅ Keep sensitive data in local `.env` files only
- ✅ Use environment variables for all secrets

### Generating Secure Secrets

**JWT Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Gmail App Password:**
1. Enable 2-Factor Authentication on your Gmail account
2. Go to: https://myaccount.google.com/apppasswords
3. Generate a new App Password for "Mail"

### Azure AD Setup

1. Register your application in Azure Portal
2. Note down the Client ID, Tenant ID, and Client Secret
3. Configure redirect URIs in Azure AD settings
