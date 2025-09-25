# Order Status Flow Documentation

## Order Status Flow

The order status system follows a clear, step-by-step flow that matches real-world restaurant operations.

### Status Flow

```
pending → confirmed → ready → completed
```

### Status Definitions

1. **pending** - Order has been placed by customer, waiting for shop to accept
2. **confirmed** - Shop has accepted the order and is preparing it (combines confirmation + preparation)
3. **ready** - Order is prepared and ready for pickup/delivery
4. **completed** - Order has been delivered/picked up and is complete

**Note**: The "preparing" status still exists for legacy support but "confirmed" now includes the preparation phase.

### Valid Transitions

| From | To | Description |
|------|----|-----------| 
| `pending` | `confirmed` | Shop accepts the order and starts preparing |
| `pending` | `cancelled` | Order cancelled before shop accepts |
| `confirmed` | `ready` | Order preparation is complete (confirmed includes preparing) |
| `confirmed` | `cancelled` | Order cancelled after confirmation |
| `preparing` | `ready` | Legacy support - Order preparation is complete |
| `preparing` | `cancelled` | Legacy support - Order cancelled while being prepared |
| `ready` | `completed` | Order delivered/picked up |
| `ready` | `cancelled` | Order cancelled when ready |

### Invalid Transitions (Blocked)

- `pending` → `preparing` (must go through confirmed)
- `pending` → `ready` (must go through confirmed)
- `pending` → `completed` (must go through confirmed and ready)
- `confirmed` → `completed` (must go through ready)
- `preparing` → `completed` (must go through ready)
- `completed` → any status (final state)
- `cancelled` → any status (final state)

### System Features

1. **Combined confirmation + preparation** - "confirmed" status includes preparation phase
2. **Simplified flow** - Only 4 main statuses: pending → confirmed → ready → completed
3. **Frontend compatibility** - Supports existing frontend status updates
4. **Legacy support** - "preparing" status still supported for backward compatibility
5. **Validation enforced** - Invalid transitions are blocked
6. **Real-time updates** - Status changes trigger notifications

### Zone Order Synchronization

For zone orders with multiple shops:
- Parent order status is calculated based on all child shop orders
- Single-shop zone orders follow the same simplified flow
- Multi-shop zone orders aggregate statuses appropriately

### Implementation Notes

- Status validation is enforced at the service layer
- Database enums have been updated to reflect new statuses
- All timing fields updated to use `preparationStarted` instead of `orderConfirmed`
- Tests updated to validate new flow

### Migration Notes

Existing orders with "confirmed" status should be migrated to "preparing" status to maintain consistency with the new flow.