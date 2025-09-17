# TableServe Backend Setup Guide

## Prerequisites

1. **Node.js** (v16 or higher)
2. **npm** (v8 or higher)
3. **MongoDB Atlas account**
4. **Cloudinary account**

## 1. MongoDB Atlas Setup

### Step 1: Create MongoDB Atlas Account
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for a free account
3. Create a new organization and project

### Step 2: Create Cluster
1. Click "Build a Database"
2. Choose "M0 Sandbox" (Free tier)
3. Select your preferred cloud provider and region
4. Name your cluster (e.g., "TableServe-Cluster")
5. Click "Create Cluster"

### Step 3: Configure Database Access
1. Go to "Database Access" in the left sidebar
2. Click "Add New Database User"
3. Choose "Password" authentication method
4. Create username and password (save these!)
5. Set database user privileges to "Read and write to any database"
6. Click "Add User"

### Step 4: Configure Network Access
1. Go to "Network Access" in the left sidebar
2. Click "Add IP Address"
3. For development: Click "Allow Access from Anywhere" (0.0.0.0/0)
4. For production: Add your server's specific IP address
5. Click "Confirm"

### Step 5: Get Connection String
1. Go to "Clusters" and click "Connect" on your cluster
2. Choose "Connect your application"
3. Select "Node.js" as driver and version "4.1 or later"
4. Copy the connection string
5. Replace `<username>`, `<password>`, and `<database>` with your values

Example connection string:
```
mongodb+srv://tableserve-user:your-password@tableserve-cluster.abc123.mongodb.net/tableserve?retryWrites=true&w=majority
```

## 2. Cloudinary Setup

### Step 1: Create Cloudinary Account
1. Go to [Cloudinary](https://cloudinary.com/)
2. Sign up for a free account
3. Verify your email address

### Step 2: Get API Credentials
1. Go to your Cloudinary Dashboard
2. In the "Account Details" section, you'll find:
   - **Cloud Name**
   - **API Key**
   - **API Secret**
3. Copy these values (keep API Secret secure!)

### Step 3: Configure Upload Presets (Optional)
1. Go to Settings → Upload
2. Add upload presets for different image types:
   - `tableserve_logo` (200x200, auto quality)
   - `tableserve_menu` (400x300, auto quality)
   - `tableserve_banner` (1200x400, auto quality)

## 3. Environment Configuration

### Update .env file
Replace the placeholder values in `/backend/.env`:

```env
# Server Configuration
NODE_ENV=development
PORT=5000
API_VERSION=v1

# MongoDB Atlas Configuration
MONGODB_URI=mongodb+srv://your-username:your-password@your-cluster.mongodb.net/tableserve?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-very-long-and-secure
JWT_REFRESH_SECRET=your-refresh-token-secret-change-this-in-production-very-long-and-secure
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Email Configuration (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@tableserve.com

# Security Configuration
BCRYPT_SALT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload Configuration
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/webp

# Frontend URLs (for CORS)
FRONTEND_URL=http://localhost:5173
ADMIN_PANEL_URL=http://localhost:3000
```

## 4. Testing the Setup

### Start the Backend Server
```bash
cd backend
npm run dev
```

### Test Endpoints

1. **Health Check**
   ```bash
   curl http://localhost:8080/health
   ```

2. **Auth Test**
   ```bash
   curl http://localhost:8080/api/v1/auth/test
   ```

3. **Cloudinary Test**
   ```bash
   curl http://localhost:5000/api/v1/images/test
   ```

4. **Image Presets**
   ```bash
   curl http://localhost:5000/api/v1/images/presets
   ```

### Expected Responses

All endpoints should return JSON with `"success": true`.

## 5. Enable Database Connection

Once you have valid MongoDB Atlas credentials:

1. Update the `MONGODB_URI` in `.env`
2. Uncomment the database connection in `server.js`:
   ```javascript
   // Change this line in server.js:
   // await connectDatabase();
   // To:
   await connectDatabase();
   ```

## 6. Security Considerations

### Development
- Use `.env` file for local development
- Never commit `.env` to version control
- Use strong, unique passwords

### Production
- Use environment variables from your hosting platform
- Enable IP whitelisting in MongoDB Atlas
- Use secure JWT secrets (at least 64 characters)
- Enable SSL/TLS for all connections
- Regular security audits

## 7. Troubleshooting

### MongoDB Connection Issues
- Check if IP address is whitelisted
- Verify username/password in connection string
- Ensure cluster is running (not paused)
- Check network connectivity

### Cloudinary Issues
- Verify API credentials
- Check file size limits
- Ensure file types are supported
- Monitor usage quotas

### General Issues
- Check environment variables are loaded
- Verify all dependencies are installed
- Check server logs for detailed errors
- Ensure ports are not in use

## Next Steps

1. Implement JWT authentication system
2. Create Mongoose models for database collections
3. Build REST API endpoints
4. Add Socket.io for real-time features
5. Implement comprehensive testing
6. Deploy to production environment

## Support

For issues with:
- **MongoDB Atlas**: [MongoDB Support](https://support.mongodb.com/)
- **Cloudinary**: [Cloudinary Support](https://support.cloudinary.com/)
- **TableServe Backend**: Check the logs and error messages