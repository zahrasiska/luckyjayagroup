-- Top Brands Sales Query
-- Parameters: $1 = start_date, $2 = end_date, $3 = limit
-- Schema: dynamically replaced with {schema}

WITH brand_performance AS (
    SELECT 
        bm.merk as brand_name,
        SUM(COALESCE(d.total, 0)) as total_value,
        COUNT(DISTINCT t.id) as transaction_count,
        SUM(COALESCE(d.qty, 0)) as total_qty
    FROM {schema}.d d
    JOIN {schema}.t t ON t.id = d.idtrans
    JOIN {schema}.brg b ON b.id = d.idbarang
    LEFT JOIN {schema}.brgmerk bm ON bm.id = b.idmerk
    WHERE t.tanggal >= $1::date AND t.tanggal <= $2::date
        AND t.kdtrans = 'PJ'
        AND t.deleted_at IS NULL
    GROUP BY bm.merk
    ORDER BY total_value DESC NULLS LAST
    LIMIT $3
)
SELECT 
    brand_name,
    total_value as amount,
    transaction_count as count,
    total_qty as qty,
    -- Calculate contribution percentage if needed by joining with total
    (SELECT SUM(total_value) FROM brand_performance) as grand_total
FROM brand_performance;
