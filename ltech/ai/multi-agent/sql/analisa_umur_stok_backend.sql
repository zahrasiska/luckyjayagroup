-- =====================================================
-- ANALISA UMUR STOK - BACKEND VERSION (REFINED)
-- Path: /api/analisa/umur-stok
-- Original: handlers/analisa.go
-- =====================================================

WITH date_filter AS (
    SELECT 
        CURRENT_DATE - INTERVAL '90 days' AS date_90d,
        CURRENT_DATE - INTERVAL '60 days' AS date_60d,
        CURRENT_DATE - INTERVAL '30 days' AS date_30d,
        CURRENT_DATE AS date_now
),
stok_tersedia AS (
    SELECT 
        s.idbarang,
        s.idlokasi,
        s.stok,
        s.commited,
        s.stok - COALESCE(s.commited, 0) AS stok_available,
        s.updated_at AS stok_last_update
    FROM s
    WHERE s.stok > 0
    -- Dynamic Lokasi Filter: AND s.idlokasi = {idLokasi}
),
pembelian_terakhir AS (
    SELECT DISTINCT ON (d.idbarang)
        d.idbarang,
        t.tanggal AS tgl_pembelian_terakhir,
        t.id AS idtrans_terakhir,
        d.qty AS qty_beli_terakhir,
        (d.harga - (COALESCE(d.diskon, 0) / NULLIF(d.qty, 0))) AS harga_beli_terakhir,
        d.idsatuan,
        t.idkontak,
        t.nobukti,
        t.notrans
    FROM d
    INNER JOIN t ON t.id = d.idtrans AND t.kdtrans = 'PB' AND t.deleted_at IS NULL
    WHERE d.deleted_at IS NULL
    ORDER BY d.idbarang, t.tanggal DESC, t.id DESC
),
analisa_penjualan AS (
    SELECT 
        d.idbarang,
        t.idlokasi,
        SUM(CASE 
            WHEN pt.tgl_pembelian_terakhir IS NOT NULL 
                AND t.tanggal >= pt.tgl_pembelian_terakhir 
            THEN d.qty ELSE 0 
        END) AS total_jual_sejak_beli,
        SUM(CASE WHEN t.tanggal >= df.date_30d THEN d.qty ELSE 0 END) AS total_jual_30hari,
        AVG(CASE WHEN t.tanggal >= df.date_30d THEN d.qty ELSE NULL END) AS avg_jual_30hari,
        SUM(CASE WHEN t.tanggal >= df.date_60d THEN d.qty ELSE 0 END) AS total_jual_60hari,
        AVG(CASE WHEN t.tanggal >= df.date_60d THEN d.qty ELSE NULL END) AS avg_jual_60hari,
        SUM(CASE WHEN t.tanggal >= df.date_90d THEN d.qty ELSE 0 END) AS total_jual_90hari,
        AVG(CASE WHEN t.tanggal >= df.date_90d THEN d.qty ELSE NULL END) AS avg_jual_90hari
    FROM d
    INNER JOIN t ON t.id = d.idtrans AND t.kdtrans = 'PJ' AND t.deleted_at IS NULL
    LEFT JOIN pembelian_terakhir pt ON pt.idbarang = d.idbarang
    CROSS JOIN date_filter df
    WHERE d.deleted_at IS NULL
        AND t.tanggal >= df.date_90d
        -- Dynamic Lokasi Filter: AND t.idlokasi = {idLokasi}
    GROUP BY d.idbarang, t.idlokasi
),
main_data AS (
    SELECT 
        brg.kode AS kode_barang,
        brg.nama AS nama_barang,
        bm.merk,
        bg.nama AS golongan,
        bk.kategori,
        l.kode AS kode_lokasi,
        l.nama AS nama_lokasi,
        st.stok AS stok_tersedia,
        st.commited AS stok_commited,
        st.stok_available AS stok_available,
        pt.tgl_pembelian_terakhir::text,
        CASE 
            WHEN pt.tgl_pembelian_terakhir IS NOT NULL 
            THEN CURRENT_DATE - DATE(pt.tgl_pembelian_terakhir)
            ELSE NULL
        END AS umur_stok_hari,
        pt.notrans AS no_pembelian_terakhir,
        k.nama AS supplier,
        pt.qty_beli_terakhir,
        COALESCE(pt.harga_beli_terakhir::numeric, bs.beli::numeric, 0) AS harga_beli_terakhir,
        CASE 
            WHEN pt.tgl_pembelian_terakhir IS NULL THEN 'TIDAK ADA DATA PEMBELIAN'
            WHEN CURRENT_DATE - DATE(pt.tgl_pembelian_terakhir) <= 30 THEN '0-30 hari'
            WHEN CURRENT_DATE - DATE(pt.tgl_pembelian_terakhir) <= 60 THEN '31-60 hari'
            WHEN CURRENT_DATE - DATE(pt.tgl_pembelian_terakhir) <= 90 THEN '61-90 hari'
            WHEN CURRENT_DATE - DATE(pt.tgl_pembelian_terakhir) <= 180 THEN '91-180 hari'
            WHEN CURRENT_DATE - DATE(pt.tgl_pembelian_terakhir) <= 365 THEN '181-365 hari'
            WHEN CURRENT_DATE - DATE(pt.tgl_pembelian_terakhir) <= 730 THEN '1-2 tahun'
            ELSE '> 2 tahun'
        END AS kategori_umur,
        COALESCE(ap.total_jual_30hari, 0) AS terjual_30hari,
        ROUND(COALESCE(ap.avg_jual_30hari, 0), 2) AS avg_jual_per_hari,
        COALESCE(ap.total_jual_90hari, 0) AS terjual_90hari,
        COALESCE(ap.total_jual_sejak_beli, 0) AS terjual_sejak_beli_terakhir,
        CASE 
            WHEN COALESCE(ap.avg_jual_30hari, 0) > 0 
            THEN ROUND(st.stok_available / ap.avg_jual_30hari, 1)
            WHEN COALESCE(ap.total_jual_90hari, 0) = 0 THEN 999
            ELSE NULL
        END AS coverage_hari,
        ROUND(st.stok * COALESCE(pt.harga_beli_terakhir::numeric, bs.beli::numeric, 0), 0) AS nilai_stok_total,
        CASE 
            WHEN st.stok > 0 
            THEN ROUND((COALESCE(ap.total_jual_90hari, 0) * 100.0 / st.stok), 1)
            ELSE 0
        END AS persen_terjual_90hari,
        CASE 
            WHEN pt.tgl_pembelian_terakhir IS NULL AND COALESCE(ap.total_jual_90hari, 0) = 0 THEN 'TIDAK ADA DATA - Dead Stock'
            WHEN pt.tgl_pembelian_terakhir IS NULL AND COALESCE(ap.avg_jual_30hari, 0) > 0 THEN 'TIDAK ADA DATA PB - Tapi Masih Laku'
            WHEN pt.tgl_pembelian_terakhir IS NULL THEN 'TIDAK ADA DATA PEMBELIAN'
            WHEN COALESCE(ap.avg_jual_30hari, 0) = 0 AND COALESCE(ap.total_jual_90hari, 0) = 0 AND CURRENT_DATE - DATE(pt.tgl_pembelian_terakhir) > 180 THEN 'DEAD STOCK > 6 Bulan'
            WHEN COALESCE(ap.avg_jual_30hari, 0) = 0 AND COALESCE(ap.total_jual_90hari, 0) = 0 AND CURRENT_DATE - DATE(pt.tgl_pembelian_terakhir) > 90 THEN 'DEAD STOCK > 3 Bulan'
            WHEN COALESCE(ap.avg_jual_30hari, 0) > 0 AND st.stok_available / ap.avg_jual_30hari > 180 THEN 'OVERSTOK BERAT (> 6 Bulan)'
            WHEN COALESCE(ap.avg_jual_30hari, 0) > 0 AND st.stok_available / ap.avg_jual_30hari > 90 THEN 'OVERSTOK (> 3 Bulan)'
            WHEN CURRENT_DATE - DATE(pt.tgl_pembelian_terakhir) > 365 AND COALESCE(ap.total_jual_90hari, 0) < st.stok * 0.1 THEN 'SLOW MOVING (> 1 Tahun)'
            WHEN CURRENT_DATE - DATE(pt.tgl_pembelian_terakhir) > 180 AND COALESCE(ap.total_jual_90hari, 0) < st.stok * 0.2 THEN 'SLOW MOVING (> 6 Bulan)'
            WHEN COALESCE(ap.avg_jual_30hari, 0) > 0 AND st.stok_available / ap.avg_jual_30hari > 60 THEN 'STOK TINGGI (> 2 Bulan)'
            WHEN COALESCE(ap.avg_jual_30hari, 0) > 0 AND st.stok_available / ap.avg_jual_30hari > 30 THEN 'STOK AMAN (1-2 Bulan)'
            ELSE 'NORMAL'
        END AS status_stok,
        CASE 
            WHEN pt.tgl_pembelian_terakhir IS NULL AND COALESCE(ap.total_jual_90hari, 0) = 0 THEN 'INVESTIGASI: Cek asal stok (opname/mutasi/retur?) & consider write-off'
            WHEN pt.tgl_pembelian_terakhir IS NULL THEN 'INVESTIGASI: Cek asal stok (opname/mutasi/retur?)'
            WHEN COALESCE(ap.avg_jual_30hari, 0) = 0 AND COALESCE(ap.total_jual_90hari, 0) = 0 AND CURRENT_DATE - DATE(pt.tgl_pembelian_terakhir) > 180 THEN 'URGENT: Diskon besar-besaran atau retur ke supplier'
            WHEN COALESCE(ap.avg_jual_30hari, 0) = 0 AND COALESCE(ap.total_jual_90hari, 0) = 0 AND CURRENT_DATE - DATE(pt.tgl_pembelian_terakhir) > 90 THEN 'Promosi khusus / bundling / diskon'
            WHEN COALESCE(ap.avg_jual_30hari, 0) > 0 AND st.stok_available / ap.avg_jual_30hari > 180 THEN 'Stop pembelian, fokus jual stok existing'
            WHEN COALESCE(ap.avg_jual_30hari, 0) > 0 AND st.stok_available / ap.avg_jual_30hari > 90 THEN 'Kurangi order, monitor pergerakan'
            ELSE 'Monitor rutin'
        END AS rekomendasi,
        st.stok_last_update::text,
        CASE 
            WHEN pt.tgl_pembelian_terakhir IS NULL 
            THEN 'Cek: mungkin dari stock opname/mutasi/retur'
            ELSE NULL
        END AS catatan
    FROM stok_tersedia st
    INNER JOIN brg ON brg.id = st.idbarang
    LEFT JOIN pembelian_terakhir pt ON pt.idbarang = st.idbarang
    LEFT JOIN analisa_penjualan ap ON ap.idbarang = st.idbarang AND ap.idlokasi = st.idlokasi
    LEFT JOIN lokasi l ON l.id = st.idlokasi
    LEFT JOIN ktk k ON k.id = pt.idkontak
    LEFT JOIN brgmerk bm ON bm.id = brg.idmerk
    LEFT JOIN brggolongan bg ON bg.id = brg.idgol
    LEFT JOIN brgkategori bk ON bk.id = brg.idkategori
    LEFT JOIN brgsatuan bs ON bs.id = brg.id AND bs.idsatuan = brg.defsatuan
    LEFT JOIN brginfo i ON i.id = brg.id
    WHERE brg.deleted_at IS NULL
        AND brg.aktif = true
        AND brg.nostok = false
        AND (brg.nama ILIKE :search OR brg.kode ILIKE :search)
        -- Dynamic Merk Filter: AND brg.idmerk = {idMerk}
)
SELECT * FROM main_data
WHERE 1=1
-- Dynamic Status Filter: AND status_stok ILIKE '%{statusFilter}%'
ORDER BY {orderByField} {sortOrder}, 
    CASE 
        WHEN status_stok LIKE 'DEAD STOCK' THEN 1
        WHEN status_stok LIKE 'OVERSTOK' THEN 2
        WHEN status_stok LIKE 'SLOW MOVING' THEN 3
        ELSE 4
    END, 
    nilai_stok_total DESC;
