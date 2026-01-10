-- Stock Movement Analysis Query
-- Parameters: :start_date, :end_date, :idbarang (optional)
-- Schema: dynamically replaced with {schema}

SELECT 
    b.kode,
    b.nama,
    bm.merk,
    t.kdtrans,
    t.tanggal,
    t.notrans,
    d.qtynota as qty,
    d.satuan / d.isi as mutasi,
    l1.nama as lokasi_asal,
    l2.nama as lokasi_tujuan,
    t.keterangan
FROM {schema}.d d
JOIN {schema}.t t ON t.id = d.idtrans
JOIN {schema}.brg b ON b.id = d.idbarang
LEFT JOIN {schema}.brgmerk bm ON bm.id = b.idmerk
LEFT JOIN {schema}.lokasi l1 ON l1.id = d.idlokasi
LEFT JOIN {schema}.lokasi l2 ON l2.id = d.idlokasi2
WHERE t.deleted_at IS NULL
    AND t.tanggal BETWEEN :start_date::date AND :end_date::date AND d.mutasi <> 0
    {{IDBARANG_FILTER}}
ORDER BY t.tanggal, t.id;
