# Multi-Agent Pipeline - Database Mapping

## Role System

### User Login Roles (`prive.user_login.role`)
Simple role strings stored directly in user table:
- `superadmin` - Full system access
- `admin` - Administrative access
- `manager` - Management access
- `user` - Regular user access

### Permission Roles (`prive.roles`)
Detailed role definitions for permission system:
- `ADMIN` - Administrator
- `DIREKSI` - Direksi/CEO
- `FINANCE` - Finance
- `SALES_MANAGER` - Sales Manager
- `INVENTORY_MANAGER` - Inventory Manager
- `PURCHASING` - Purchasing
- `KASIR` - Kasir/Cashier
- `ADMINISTRASI_UMUM` - General Administration
- `DEVELOPMENT` - Development/IT

## Specialist Agent Mapping

UI maps `user_login.role` to specialist agents:

```javascript
{
  'superadmin': 'CEO',           // Fachrudin Lutfie
  'admin': 'CEO',                // Administrator, Siti Fatimah
  'manager': 'CEO',              // Manager user
  'finance': 'Finance Manager',  // (if exists)
  'sales': 'Sales Manager',      // (if exists)
  'inventory': 'Inventory Manager', // (if exists)
  'user': 'Sales Manager',       // Default - Andrias, Dea, etc.
}
```

## Current Users in Database

| ID | Name | user_login.role | Maps to Agent |
|----|------|-----------------|---------------|
| 2 | Administrator | admin | CEO |
| 8 | Fachrudin Lutfie | superadmin | CEO |
| 3 | Manager | manager | CEO |
| 37 | Andrias Setiawan | user | Sales Manager |
| 35 | Dea xbrog | user | Sales Manager |
| 12 | Click Test User | user | Sales Manager |
| 13 | New Test User | user | Sales Manager |
| 15 | Siti Fatimah | admin | CEO |

## Implementation Notes

1. **Use Case**: `user_login.role` is for UI/frontend role assignment
2. **Permission System**: `prive.roles` + `user_aplikasi_roles` for fine-grained permissions
3. **Multi-Agent**: We map simple `user_login.role` to 4 specialist agents
4. **Future**: Can implement role-based routing using `user_aplikasi_roles` for more granular control

## Tenant Schema

From `prive.aplikasi`:

| ID | name | code | schema |
|----|------|------|--------|
| 6 | Lucky Jaya Group - Leontech Module | ljg_leontech | u1566482_leontech |
| 12 | Lucky Jaya Group - Sparepart Module | ljg_sparepart | sparepart |
| 13 | u1566482_sparepart | u1566482_sparepart | u1566482_sparepart |

Default tenant: `u1566482_sparepart`
