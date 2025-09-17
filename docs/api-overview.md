# TableServe API Documentation

## Overview

This document provides comprehensive documentation for the TableServe API.

## Base URL

```
Development: http://localhost:3000/api
Production: https://api.tableserve.com/api
```

## Authentication

The API uses JWT (JSON Web Token) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_token_here>
```

## Error Handling

The API uses conventional HTTP response codes:

- 2xx: Success
- 4xx: Client errors
- 5xx: Server errors

Error Response Format:
```json
{
  "status": "error",
  "message": "Error description",
  "code": "ERROR_CODE"
}
```

## Rate Limiting

Requests are limited to:
- 100 requests per IP per 15 minutes for public endpoints
- 1000 requests per IP per 15 minutes for authenticated endpoints

## API Endpoints

### Authentication
- [Login](./api/auth/login.md)
- [Register](./api/auth/register.md)
- [Refresh Token](./api/auth/refresh-token.md)

### Users
- [Get User Profile](./api/users/get-profile.md)
- [Update User Profile](./api/users/update-profile.md)

### Menu
- [Get Menu Items](./api/menu/get-items.md)
- [Create Menu Item](./api/menu/create-item.md)
- [Update Menu Item](./api/menu/update-item.md)
- [Delete Menu Item](./api/menu/delete-item.md)

### Orders
- [Create Order](./api/orders/create.md)
- [Get Orders](./api/orders/get.md)
- [Update Order Status](./api/orders/update-status.md)

## Versioning

The API is versioned through the URL path. The current version is v1:
```
/api/v1/
```

## Support

For API support, please email api-support@tableserve.com
