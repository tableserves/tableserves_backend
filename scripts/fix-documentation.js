require('dotenv').config();
const fs = require('fs');
const path = require('path');

const validateAndFixDocumentation = async () => {
  console.log('=== API DOCUMENTATION VALIDATION AND FIXES ===\n');

  const fixes = [];
  const errors = [];

  // 1. Create API Documentation Directory
  console.log('1. Setting up API Documentation Directory...');
  const docsDir = path.join(__dirname, '../docs');
  const apiDocsDir = path.join(docsDir, 'api');

  try {
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir);
    }
    if (!fs.existsSync(apiDocsDir)) {
      fs.mkdirSync(apiDocsDir);
    }
    console.log('✅ Created documentation directories');
    fixes.push('Created documentation directories');
  } catch (error) {
    console.error('❌ Failed to create documentation directories:', error.message);
    errors.push(`Failed to create documentation directories: ${error.message}`);
  }

  // 2. Create API Overview Document
  console.log('\n2. Creating API Overview Document...');
  const apiOverviewPath = path.join(docsDir, 'api-overview.md');
  const apiOverviewContent = `# TableServe API Documentation

## Overview

This document provides comprehensive documentation for the TableServe API.

## Base URL

\`\`\`
Development: http://localhost:3000/api
Production: https://api.tableserve.com/api
\`\`\`

## Authentication

The API uses JWT (JSON Web Token) for authentication. Include the token in the Authorization header:

\`\`\`
Authorization: Bearer <your_token_here>
\`\`\`

## Error Handling

The API uses conventional HTTP response codes:

- 2xx: Success
- 4xx: Client errors
- 5xx: Server errors

Error Response Format:
\`\`\`json
{
  "status": "error",
  "message": "Error description",
  "code": "ERROR_CODE"
}
\`\`\`

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
\`\`\`
/api/v1/
\`\`\`

## Support

For API support, please email api-support@tableserve.com
`;

  try {
    fs.writeFileSync(apiOverviewPath, apiOverviewContent);
    console.log('✅ Created API overview document');
    fixes.push('Created API overview document');
  } catch (error) {
    console.error('❌ Failed to create API overview document:', error.message);
    errors.push(`Failed to create API overview document: ${error.message}`);
  }

  // 3. Create Endpoint Documentation Templates
  console.log('\n3. Creating Endpoint Documentation Templates...');

  const endpointDocs = [
    {
      category: 'auth',
      endpoints: ['login', 'register', 'refresh-token']
    },
    {
      category: 'users',
      endpoints: ['get-profile', 'update-profile']
    },
    {
      category: 'menu',
      endpoints: ['get-items', 'create-item', 'update-item', 'delete-item']
    },
    {
      category: 'orders',
      endpoints: ['create', 'get', 'update-status']
    }
  ];

  for (const category of endpointDocs) {
    const categoryDir = path.join(apiDocsDir, category.category);
    
    try {
      if (!fs.existsSync(categoryDir)) {
        fs.mkdirSync(categoryDir);
      }

      for (const endpoint of category.endpoints) {
        const endpointPath = path.join(categoryDir, `${endpoint}.md`);
        const endpointContent = `# ${category.category.charAt(0).toUpperCase() + category.category.slice(1)} - ${endpoint.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}

## Description

Brief description of the endpoint.

## Endpoint

\`\`\`
METHOD /api/v1/${category.category}/${endpoint.replace('-', '/')}
\`\`\`

## Authentication

- Required: Yes/No
- Type: Bearer Token

## Request Parameters

### Headers

| Name | Type | Required | Description |
|------|------|----------|-------------|
| Authorization | string | Yes/No | Bearer token |

### Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes/No | Resource ID |

### Query Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| page | number | No | Page number |
| limit | number | No | Items per page |

### Request Body

\`\`\`json
{
  "field1": "value1",
  "field2": "value2"
}
\`\`\`

## Response

### Success Response

\`\`\`json
{
  "status": "success",
  "data": {}
}
\`\`\`

### Error Response

\`\`\`json
{
  "status": "error",
  "message": "Error description"
}
\`\`\`

## Example

### Request

\`\`\`bash
curl -X METHOD \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"field":"value"}' \
  http://localhost:3000/api/v1/${category.category}/${endpoint.replace('-', '/')}
\`\`\`

### Response

\`\`\`json
{
  "status": "success",
  "data": {}
}
\`\`\`

## Notes

- Additional information about the endpoint
- Rate limiting details
- Special considerations
`;

        fs.writeFileSync(endpointPath, endpointContent);
        console.log(`✅ Created documentation for ${category.category}/${endpoint}`);
        fixes.push(`Created documentation for ${category.category}/${endpoint}`);
      }
    } catch (error) {
      console.error(`❌ Failed to create documentation for ${category.category}:`, error.message);
      errors.push(`Failed to create documentation for ${category.category}: ${error.message}`);
    }
  }

  // 4. Create Postman Collection
  console.log('\n4. Creating Postman Collection...');
  const postmanCollectionPath = path.join(docsDir, 'tableserve-api.postman_collection.json');
  const postmanCollection = {
    info: {
      name: 'TableServe API',
      description: 'API collection for TableServe application',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    },
    item: [
      {
        name: 'Auth',
        item: [
          {
            name: 'Login',
            request: {
              method: 'POST',
              header: [],
              url: {
                raw: '{{baseUrl}}/api/v1/auth/login',
                host: ['{{baseUrl}}'],
                path: ['api', 'v1', 'auth', 'login']
              },
              body: {
                mode: 'raw',
                raw: JSON.stringify({
                  email: 'user@example.com',
                  password: 'password123'
                }),
                options: {
                  raw: {
                    language: 'json'
                  }
                }
              }
            }
          }
        ]
      }
    ],
    variable: [
      {
        key: 'baseUrl',
        value: 'http://localhost:3000',
        type: 'string'
      }
    ]
  };

  try {
    fs.writeFileSync(postmanCollectionPath, JSON.stringify(postmanCollection, null, 2));
    console.log('✅ Created Postman collection');
    fixes.push('Created Postman collection');
  } catch (error) {
    console.error('❌ Failed to create Postman collection:', error.message);
    errors.push(`Failed to create Postman collection: ${error.message}`);
  }

  // Summary
  console.log('\n=== DOCUMENTATION FIX SUMMARY ===');
  console.log(`\nFixed Items (${fixes.length}):`);
  fixes.forEach(fix => console.log(`✅ ${fix}`));

  if (errors.length > 0) {
    console.log(`\nErrors (${errors.length}):`);
    errors.forEach(error => console.log(`❌ ${error}`));
  }

  console.log('\n=== NEXT STEPS ===');
  console.log('1. Review and customize API documentation');
  console.log('2. Add detailed request/response examples');
  console.log('3. Update Postman collection with all endpoints');
  console.log('4. Set up automated documentation generation');
  console.log('5. Add authentication and environment setup guide');

  return {
    fixes,
    errors
  };
};

validateAndFixDocumentation().catch(console.error);