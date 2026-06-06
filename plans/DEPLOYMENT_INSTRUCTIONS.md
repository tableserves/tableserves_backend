# TableServe Deployment Instructions

This document provides step-by-step instructions for deploying the TableServe application with proper WebSocket and database connections.

## Prerequisites

1. Node.js (version 16 or higher)
2. npm or yarn package manager
3. MongoDB Atlas account
4. DigitalOcean App Platform account (for production deployment)

## Environment Configuration

### Frontend Environment Variables (.env)

The frontend requires the following environment variables:

```env
# WebSocket connection
VITE_WEBSOCKET_URL=https://tableserves-5hy4f.ondigitalocean.app

# API connection
VITE_API_BASE_URL=https://tableserves-5hy4f.ondigitalocean.app/api/v1
```

### Backend Environment Variables (backend/.env.production)

The backend requires the following environment variables:

```env
# MongoDB connection
MONGODB_URI=mongodb+srv://tableserves02:VGlbikiaK5WTfMGr@tableserves.w4jzk34.mongodb.net/tableserve_production?retryWrites=true&w=majority&appName=TableServes

# Frontend URLs for CORS
FRONTEND_URL=https://tableserves-5hy4f.ondigitalocean.app
ADMIN_PANEL_URL=https://tableserves-5hy4f.ondigitalocean.app
```

## Deployment Steps

### 1. Frontend Deployment

1. Navigate to the frontend directory:
   ```bash
   cd /path/to/tableserve
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the production version:
   ```bash
   npm run build:production
   ```

4. Deploy to your hosting platform (Vercel, Netlify, etc.)

### 2. Backend Deployment

1. Navigate to the backend directory:
   ```bash
   cd /path/to/backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Deploy to your hosting platform (DigitalOcean App Platform, Heroku, etc.)

## Testing the Connections

### WebSocket Connection Test

1. Open the deployed application in your browser
2. Open the browser's Developer Tools (F12)
3. Go to the Network tab
4. Look for WebSocket connections
5. Verify that the connection is established to `https://tableserves-5hy4f.ondigitalocean.app`

You should see a message in the console similar to:
```
WebSocket connected to: https://tableserves-5hy4f.ondigitalocean.app
```

### Database Connection Test

1. Check the backend logs for successful database connection messages:
   ```
   ✅ MongoDB Connected Successfully
   ```

2. Access the health check endpoint:
   ```
   GET https://tableserves-5hy4f.ondigitalocean.app/health/database
   ```

   You should receive a response like:
   ```json
   {
     "success": true,
     "data": {
       "connected": true,
       "database": "tableserve_production",
       "host": "tableserves.w4jzk34.mongodb.net",
       "readyState": 1
     }
   }
   ```

## Troubleshooting

### WebSocket Connection Issues

1. **Check Environment Variables**: Ensure `VITE_WEBSOCKET_URL` is correctly set in your frontend [.env](file:///C:/Users/eykyo/Downloads/tableserve-finall/.env) file
2. **Verify CORS Configuration**: Ensure the backend allows connections from your frontend domain
3. **Check Network Connectivity**: Ensure there are no firewall rules blocking WebSocket connections

### Database Connection Issues

1. **Check MongoDB URI**: Ensure `MONGODB_URI` is correctly formatted and credentials are valid
2. **Verify Network Access**: Ensure your MongoDB Atlas cluster allows connections from your backend server
3. **Check Connection Limits**: Ensure you haven't exceeded MongoDB connection limits

### Common Error Messages

1. **"WebSocket connection failed"**: Check that the WebSocket URL is correct and the backend server is running
2. **"MongoDB connection failed"**: Check that the MongoDB URI is correct and network connectivity is established
3. **"CORS error"**: Check that the backend CORS configuration includes your frontend domain

## Monitoring

### Frontend Monitoring

1. Check browser console for WebSocket connection messages
2. Monitor network tab for API and WebSocket traffic
3. Look for any error messages related to connections

### Backend Monitoring

1. Check server logs for database connection messages
2. Monitor WebSocket connection events
3. Watch for any connection errors or timeouts

## Security Considerations

1. **Environment Variables**: Never commit sensitive environment variables to version control
2. **MongoDB Security**: Use strong passwords and limit database user permissions
3. **WebSocket Security**: Ensure WebSocket connections are properly authenticated
4. **CORS Configuration**: Only allow trusted origins in CORS configuration

## Maintenance

1. **Regular Health Checks**: Periodically check the health endpoints
2. **Connection Monitoring**: Monitor WebSocket and database connections for issues
3. **Log Review**: Regularly review logs for any connection-related errors
4. **Performance Monitoring**: Monitor connection performance and latency

## Support

If you encounter any issues with the connections:

1. Check the logs for error messages
2. Verify all environment variables are correctly set
3. Ensure network connectivity between services
4. Contact the development team for assistance