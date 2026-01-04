# MariaDB to PostgreSQL Query Conversion

This project contains the conversion of a MariaDB query to PostgreSQL format.

## Files

- `query.sql` - Original MariaDB query
- `query_postgresql.sql` - Converted PostgreSQL query
- `test_postgresql_query.sh` - Test script for the PostgreSQL query

## Conversion Details

The original MariaDB query has been converted to PostgreSQL with the following changes:

1. **IF statements** → **CASE WHEN statements**: 
   - `IF(condition, true_value, false_value)` → `CASE WHEN condition THEN true_value ELSE false_value END`

2. **String concatenation**:
   - MariaDB uses `CONCAT()` or direct concatenation with `+`
   - PostgreSQL uses `||` operator for concatenation

3. **LPAD function**: 
   - Used `LPAD(string, length, pad_string)` in PostgreSQL

4. **Parameter placeholders**:
   - Changed from MariaDB named parameters to PostgreSQL positional parameters (`$1`, `$2`)

5. **Date extraction**:
   - `EXTRACT(YEAR FROM date)` and `EXTRACT(MONTH FROM date)` remain the same in both systems

## Schema Information

- **Target Schema**: `u1566482_sparepart`
- **Connection String**: `DATABASE_URL="postgresql://knavinkids:Duaribu%2325%23%23@localhost:5432/luckyjayagroup?sslmode=disable"`

## Testing

To test the query:

1. Make sure PostgreSQL is running and accessible
2. Ensure the schema `u1566482_sparepart` exists
3. Run the test script: `./test_postgresql_query.sh`

## Notes

- The query uses date parameters that need to be provided when executing
- All required tables (t, j, v_rekening, jurnal) must exist in the target schema
- The query performs financial reporting with complex window functions and unions
