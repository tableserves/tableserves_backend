# Order Status Flow Documentation

## Simplified Order Status Flow

The order status system has been simplified to provide a clearer, more intuitive flow that matches real-world restaurant operations.

### Status Flow

```
pending → preparing → ready → completed
```

### Status Definitions

1. **pending** - Order has been placed by customer, waiting for shop to accept
2. **preparing** - Shop has accepted the order and is preparing it (combines old "confirmed" + "preparing")
3. **ready** - Order is prepared and ready for pickup/delivery
4. **completed** - Order has been delivered/picked up and is complete

### Valid Transitions

| From | To | Description |
|------|----|-----------| 
| `pending` | `preparing` | Shop accepts order and starts preparing |
| `pending` | `cancelled` | Order cancelled before shop accepts |
| `preparing` | `ready` | Order preparation is complete |
| `preparing` | `cancelled` | Order cancelled while being prepared |
| `ready` | `completed` | Order delivered/picked up |
| `ready` | `cancelled` | Order cancelled when ready |

### Invalid Transitions (Blocked)

- `pending` → `ready` (must go through preparing)
- `pending` → `completed` (must go through preparing and ready)
- `preparing` → `completed` (must go through ready)
- `completed` → any status (final state)
- `cancelled` → any status (final state)

### Key Changes from Previous System

1. **Eliminated "confirmed" status** - Shop acceptance now directly moves to "preparing"
2. **Simplified workflow** - Reduced from 5 states to 4 states
3. **Clearer semantics** - Each status clearly represents what's happening
4. **Better UX** - Customers see immediate progress when shop accepts

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