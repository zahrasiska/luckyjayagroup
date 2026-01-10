-- Inventory Summary & Low Stock Query
-- Parameters: $1 = limit for low stock items
-- Schema: dynamically replaced with {schema}

WITH stock_data AS (
    SELECT 
        b.id,
        b.kode,
        b.nama,
        bm.merk,
        COALESCE(i.minimal, 0) as minimal,
        COALESCE(bs.beli, 0) as harga_beli,
        COALESCE(stok_sum.stok, 0) as total_stok
    FROM {schema}.brg b
    LEFT JOIN {schema}.brginfo i ON i.id = b.id
    LEFT JOIN {schema}.brgsatuan bs ON bs.id = b.id AND bs.idsatuan = b.defsatuan
    LEFT JOIN {schema}.brgmerk bm ON bm.id = b.idmerk
    LEFT JOIN (
        SELECT idbarang, SUM(COALESCE(stok, 0)) as stok 
        FROM {schema}.s 
        WHERE idlokasi IS NOT NULL
        GROUP BY idbarang
    ) stok_sum ON stok_sum.idbarang = b.id
    WHERE b.aktif = true AND b.deleted_at IS NULL
),
summary AS (
    SELECT 
        COUNT(*) as total_items,
        SUM(COALESCE(total_stok, 0)) as total_qty,
        SUM(COALESCE(total_stok, 0) * COALESCE(harga_beli, 0)) as total_value,
        COUNT(CASE WHEN total_stok < minimal AND minimal > 0 THEN 1 END) as low_stock_count
    FROM stock_data
),
low_stock_items AS (
    SELECT * FROM stock_data 
    WHERE total_stok < minimal AND minimal > 0
    ORDER BY (minimal - total_stok) DESC
    LIMIT $1
)
SELECT 
    (SELECT json_build_object(
        'total_items', total_items,
        'total_qty', total_qty,
        'total_value', total_value,
        'low_stock_count', low_stock_count
    ) FROM summary) as summary,
    (SELECT json_agg(low_stock_items) FROM low_stock_items) as low_stock;
