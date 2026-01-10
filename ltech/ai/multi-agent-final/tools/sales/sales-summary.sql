-- Sales Summary & Top Items Query
-- Parameters: $1 = start_date, $2 = end_date, $3 = top_limit, $4 = brand_filter (optional, use '%' for all)
-- Schema: dynamically replaced with {schema}
-- Note: When brand filter is applied, summary counts line items (d), not transactions (t)

WITH sales_detail AS (
    SELECT 
        d.idtrans,
        d.qty,
        d.total,
        t.tanggal,
        t.kdtrans,
        bm.merk
    FROM {schema}.d d
    JOIN {schema}.t t ON t.id = d.idtrans
    JOIN {schema}.brg b ON b.id = d.idbarang
    LEFT JOIN {schema}.brgmerk bm ON bm.id = b.idmerk
    WHERE t.tanggal >= $1::date AND t.tanggal <= $2::date
        AND t.kdtrans IN ('PJ', 'RJ')
        AND t.deleted_at IS NULL
        AND (UPPER(bm.merk) LIKE UPPER($4) OR $4 = '%')
),
summary AS (
    SELECT 
        COUNT(DISTINCT CASE WHEN kdtrans = 'PJ' THEN idtrans END) as total_pj_count,
        SUM(CASE WHEN kdtrans = 'PJ' THEN COALESCE(total, 0) ELSE 0 END) as total_pj_value,
        COUNT(DISTINCT CASE WHEN kdtrans = 'RJ' THEN idtrans END) as total_rj_count,
        SUM(CASE WHEN kdtrans = 'RJ' THEN COALESCE(total, 0) ELSE 0 END) as total_rj_value
    FROM sales_detail
),
top_items AS (
    SELECT 
        b.nama as item_name,
        bm.merk as brand_name,
        SUM(COALESCE(d.qty, 0)) as qty,
        SUM(COALESCE(d.total, 0)) as amount
    FROM {schema}.d d
    JOIN {schema}.t t ON t.id = d.idtrans
    JOIN {schema}.brg b ON b.id = d.idbarang
    LEFT JOIN {schema}.brgmerk bm ON bm.id = b.idmerk
    WHERE t.tanggal >= $1::date AND t.tanggal <= $2::date
        AND t.kdtrans = 'PJ'
        AND t.deleted_at IS NULL
        AND (UPPER(bm.merk) LIKE UPPER($4) OR $4 = '%')
    GROUP BY b.nama, bm.merk
    ORDER BY amount DESC NULLS LAST
    LIMIT $3
)
SELECT 
    (SELECT json_build_object(
        'count_pj', total_pj_count,
        'value_pj', total_pj_value,
        'count_rj', total_rj_count,
        'value_rj', total_rj_value,
        'net_value', COALESCE(total_pj_value, 0) - COALESCE(total_rj_value, 0)
    ) FROM summary) as summary,
    (SELECT json_agg(top_items) FROM top_items) as top_products;
