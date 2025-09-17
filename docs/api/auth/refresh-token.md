# Auth - Refresh Token

## Description

Brief description of the endpoint.

## Endpoint

```
METHOD /api/v1/auth/refresh/token
```

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

```json
{
  "field1": "value1",
  "field2": "value2"
}
```

## Response

### Success Response

```json
{
  "status": "success",
  "data": {}
}
```

### Error Response

```json
{
  "status": "error",
  "message": "Error description"
}
```

## Example

### Request

```bash
curl -X METHOD   -H "Authorization: Bearer <token>"   -H "Content-Type: application/json"   -d '{"field":"value"}'   http://localhost:3000/api/v1/auth/refresh/token
```

### Response

```json
{
  "status": "success",
  "data": {}
}
```

## Notes

- Additional information about the endpoint
- Rate limiting details
- Special considerations
