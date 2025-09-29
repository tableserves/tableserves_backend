# TableServe Public Ratings API

## Overview
Public endpoints for accessing TableServe platform ratings and statistics without authentication.

## Base URL
```
http://localhost:5000/api/v1/tableserve-ratings
```

## Endpoints

### Get Public Platform Statistics
```
GET /public-statistics
```

#### Response
```json
{
  "success": true,
  "data": {
    "totalRatings": 120,
    "averageServiceRating": 4.5,
    "averageAppExperience": 4.3,
    "averageOrderingProcess": 4.6,
    "averagePaymentExperience": 4.4,
    "averageOverallSatisfaction": 4.5,
    "ratingDistribution": [5, 4, 5, 3, 5, ...]
  }
}
```

### Get Recent Public Ratings
```
GET /public-recent?limit=8
```

#### Parameters
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| limit | integer | Number of recent ratings to retrieve | 8 |

#### Response
```json
{
  "success": true,
  "data": [
    {
      "id": "64a7b8c9d0e1f2a3b4c5d6e7",
      "customerName": "John Smith",
      "serviceRating": 5,
      "serviceFeedback": "Excellent service! The ordering process was smooth and quick.",
      "submittedAt": "2024-08-26T10:30:00.000Z"
    },
    {
      "id": "64a7b8c9d0e1f2a3b4c5d6e8",
      "customerName": "Sarah Johnson",
      "serviceRating": 4,
      "serviceFeedback": "Great experience overall. The menu was easy to navigate.",
      "submittedAt": "2024-08-25T14:15:00.000Z"
    }
  ]
}
```

## Response Codes
| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request |
| 500 | Internal Server Error |

## Example Usage
```javascript
// Get platform statistics
fetch('http://localhost:5000/api/v1/tableserve-ratings/public-statistics')
  .then(response => response.json())
  .then(data => console.log(data));

// Get recent ratings
fetch('http://localhost:5000/api/v1/tableserve-ratings/public-recent?limit=5')
  .then(response => response.json())
  .then(data => console.log(data));
```