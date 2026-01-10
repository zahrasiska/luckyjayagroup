-- Stock Report Query (Current Stock)
-- Parameters: :search (optional), :idbarang (optional)
-- Schema: dynamically replaced with {schema}

SELECT 
    b.id,
    b.kode,
    b.barcode,
    b.nama,
    bm.merk,
    l.nama as lokasi,
    s.stok,
    sa.satuan,
    i.rak
FROM {schema}.s s
JOIN {schema}.brg b ON b.id = s.idbarang
JOIN {schema}.lokasi l ON l.id = s.idlokasi
LEFT JOIN {schema}.brgmerk bm ON bm.id = b.idmerk
LEFT JOIN {schema}.brginfo i ON i.id = b.id
LEFT JOIN {schema}.satuan sa ON sa.id = b.defsatuan
WHERE b.deleted_at IS NULL 
    AND b.aktif = true
    AND s.stok <> 0
    {{SEARCH_FILTER}}
    {{IDBARANG_FILTER}}
ORDER BY b.nama, l.nama;
