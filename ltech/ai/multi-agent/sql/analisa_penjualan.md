# Analisa Penjualan
    Berfungsi untuk menganalisa kebutuhan  persediaan berdasarkan permintaan dan trend permintaan.
    ini bersifat per perusahaan jadi pastikan middleware schema / aplikasi / perusahaan di set dengan benar

## Analisa Persediaan
Endpoint: `GET /api/analisa/trendpenjualan/persediaan`
buat parameters :
 - search by kode, nama, dan merk, supplier dan 
 - pagination
 - sort by  
 - filter by idkelompok, idjenis, idsupplier, idmerk

```sql
SELECT 
			b.id, b.kode, b.nama, 
			bm.merk, 
			bk.kelompok, 
			bj.jenis, 
			bi.supplier, 
			s.satuan as idsatuan, 
			COALESCE(bs.isi, 1) as isi, 
			COALESCE(p.harga, bs.beli) as harga,
			d.O1, d.O2, d.O3, d.O4, 
			d.N1, d.N2, d.N3, d.N4, 
			d.RO1, d.RO2, d.RO3, d.RO4, 
			d.PB1, d.PB2, d.PB3, d.PB4,
			d.akhir, d.permintaan, d.nota, 
			COALESCE(d.permintaan,0)-COALESCE(d.nota,0) as referensi, 
			bi.stok as stoknr, 
			0 as stokgd, 
			bi.minimal, 
			x.qty as in_order, 
			x.proses as in_proses, 
			0 as idtrans, -- :idtrans::bigint as idtrans, 
			p.qty as pesan, 
			p.urgensi, 
			p.keterangan
		FROM 
			brg b
		LEFT JOIN brgmerk bm ON bm.id = b.idmerk
		LEFT JOIN brgkelompok bk ON bk.id = b.idkelompok
		LEFT JOIN brgjenis bj ON bj.id = b.idjenis
		LEFT JOIN brginfo bi ON bi.id = b.id
		LEFT JOIN satuan s ON s.id = b.defsatuan
		LEFT JOIN brgsatuan bs ON bs.id = b.id AND bs.idsatuan = b.defsatuan
		LEFT JOIN (
			SELECT 
				d.idbarang, 
				SUM(CASE WHEN t.kdtrans = 'PJ' AND EXTRACT(MONTH FROM (CURRENT_DATE - INTERVAL '3 months')) = EXTRACT(MONTH FROM t.tanggal) THEN d.proses ELSE NULL END) as O1,
				SUM(CASE WHEN t.kdtrans = 'PJ' AND EXTRACT(MONTH FROM (CURRENT_DATE - INTERVAL '2 months')) = EXTRACT(MONTH FROM t.tanggal) THEN d.proses ELSE NULL END) as O2,
				SUM(CASE WHEN t.kdtrans = 'PJ' AND EXTRACT(MONTH FROM (CURRENT_DATE - INTERVAL '1 month')) = EXTRACT(MONTH FROM t.tanggal) THEN d.proses ELSE NULL END) as O3,
				SUM(CASE WHEN t.kdtrans = 'PJ' AND EXTRACT(MONTH FROM CURRENT_DATE) = EXTRACT(MONTH FROM t.tanggal) THEN d.proses ELSE NULL END) as O4,
				
				SUM(CASE WHEN t.kdtrans = 'PJ' AND EXTRACT(MONTH FROM (CURRENT_DATE - INTERVAL '3 months')) = EXTRACT(MONTH FROM t.tanggal) THEN d.qty ELSE NULL END) as N1,
				SUM(CASE WHEN t.kdtrans = 'PJ' AND EXTRACT(MONTH FROM (CURRENT_DATE - INTERVAL '2 months')) = EXTRACT(MONTH FROM t.tanggal) THEN d.qty ELSE NULL END) as N2,
				SUM(CASE WHEN t.kdtrans = 'PJ' AND EXTRACT(MONTH FROM (CURRENT_DATE - INTERVAL '1 month')) = EXTRACT(MONTH FROM t.tanggal) THEN d.qty ELSE NULL END) as N3,
				SUM(CASE WHEN t.kdtrans = 'PJ' AND EXTRACT(MONTH FROM CURRENT_DATE) = EXTRACT(MONTH FROM t.tanggal) THEN d.qty ELSE NULL END) as N4,

				SUM(CASE WHEN t.kdtrans = 'PJ' AND EXTRACT(MONTH FROM (CURRENT_DATE - INTERVAL '3 months')) = EXTRACT(MONTH FROM t.tanggal) THEN d.pesan ELSE NULL END) as RO1,
				SUM(CASE WHEN t.kdtrans = 'PJ' AND EXTRACT(MONTH FROM (CURRENT_DATE - INTERVAL '2 months')) = EXTRACT(MONTH FROM t.tanggal) THEN d.pesan ELSE NULL END) as RO2,
				SUM(CASE WHEN t.kdtrans = 'PJ' AND EXTRACT(MONTH FROM (CURRENT_DATE - INTERVAL '1 month')) = EXTRACT(MONTH FROM t.tanggal) THEN d.pesan ELSE NULL END) as RO3,
				SUM(CASE WHEN t.kdtrans = 'PJ' AND EXTRACT(MONTH FROM CURRENT_DATE) = EXTRACT(MONTH FROM t.tanggal) THEN d.pesan ELSE NULL END) as RO4,

				SUM(CASE WHEN t.kdtrans = 'PB' AND EXTRACT(MONTH FROM (CURRENT_DATE - INTERVAL '3 months')) = EXTRACT(MONTH FROM t.tanggal) THEN d.qtynota ELSE NULL END) as PB1,
				SUM(CASE WHEN t.kdtrans = 'PB' AND EXTRACT(MONTH FROM (CURRENT_DATE - INTERVAL '2 months')) = EXTRACT(MONTH FROM t.tanggal) THEN d.qtynota ELSE NULL END) as PB2,
				SUM(CASE WHEN t.kdtrans = 'PB' AND EXTRACT(MONTH FROM (CURRENT_DATE - INTERVAL '1 month')) = EXTRACT(MONTH FROM t.tanggal) THEN d.qtynota ELSE NULL END) as PB3,
				SUM(CASE WHEN t.kdtrans = 'PB' AND EXTRACT(MONTH FROM CURRENT_DATE) = EXTRACT(MONTH FROM t.tanggal) THEN d.qtynota ELSE NULL END) as PB4,

				MAX(CASE WHEN kdtrans = 'PB' THEN t.tanggal ELSE NULL END) as akhir,
				SUM(CASE WHEN kdtrans ='PJ' THEN d.proses ELSE 0 END) as permintaan, 
				SUM(CASE WHEN kdtrans='PJ' THEN d.qtynota ELSE 0 END) as nota
			FROM 
				t 
			INNER JOIN d ON d.idtrans = t.id  
			WHERE 
				t.kdtrans IN ('PJ','PB') 
				AND CAST(t.tanggal as date) >= (CURRENT_DATE - INTERVAL '3 months')
			GROUP BY d.idbarang
		) d ON d.idbarang = b.id 
		LEFT JOIN (
			SELECT 
				idbarang, 
				SUM(CASE WHEN pesan.sts=3 THEN qty ELSE 0 END) as qty, 
				SUM(CASE WHEN pesan.sts<3 THEN qty ELSE 0 END) as proses 
			FROM 
				pesand 
			INNER JOIN pesan ON pesan.id = pesand.idtrans 
			WHERE pesan.sts < 4 
			GROUP BY idbarang
		) x ON x.idbarang = b.id
		LEFT JOIN pesand p ON p.idbarang = b.id AND p.idtrans =  0 -- :idtrans::bigint
		WHERE b.aktif = true and b.deleted_at is null
        order by b.nama;
```
### Example
```bash
curl "http://localhost:8082/api/analisa/trendpenjualan/persediaan?page=1&limit=20&search=semen" \
  -H "Authorization: Bearer <token>"
```

## Trend & History
Endpoint: `GET /api/analisa/trendpenjualan/trend`

    Data yang menyajikan trend per nama barang berdasarkan nama barang yang dipilih.
dipanggil saat klik nama barang di analisa persediaan

```sql
SELECT 
			b.kode, b.nama, bm.merk, 
			CONCAT(EXTRACT(YEAR FROM t.tanggal), LPAD(EXTRACT(MONTH FROM t.tanggal)::text, 2, '0')) as periode,
			EXTRACT(YEAR FROM t.tanggal) as tahun, 
			EXTRACT(MONTH FROM t.tanggal) as bulan,
			SUM(CASE WHEN t.kdtrans ='PJ' THEN COALESCE(d.proses, d.qty) ELSE 0 END) as permintaan, 
			SUM(CASE WHEN t.kdtrans ='PB' THEN d.qtynota ELSE 0 END) as beli
		FROM 
			t 
		INNER JOIN d ON d.idtrans = t.id 
		INNER JOIN brg b ON b.id = d.idbarang 
		INNER JOIN brgmerk bm ON bm.id = b.idmerk
		WHERE 
			t.kdtrans IN ('PJ', 'PB') 
			AND t.iddevisi = :iddevisi
			AND b.nama ILIKE :nama
		GROUP BY 
			b.kode, b.nama, bm.merk, EXTRACT(YEAR FROM t.tanggal), EXTRACT(MONTH FROM t.tanggal)
		ORDER BY b.nama, tahun DESC, bulan DESC
```
### Example
```bash
curl "http://localhost:8082/api/analisa/trendpenjualan/trend?nama=semen&iddevisi=2" \
  -H "Authorization: Bearer <token>"
```

## Substitusi / Persamaan
Endpoint: `GET /api/analisa/trendpenjualan/substitusi`

    Data yang menyajikan persamaan per nama barang berdasarkan nama barang yang dipilih.
dipanggil saat klik nama barang di analisa persediaan
```sql
SELECT DISTINCT 
			b.id as idbarang, b.kode, b.nama, 
			bk.kelompok, 
			bj.jenis, 
			bm.merk, 
			COALESCE(bs.beli, 0), COALESCE(bs.jual2, 0), 
			COALESCE(bs.jual2 - bs.beli, 0) as selisih, 
			COALESCE((bs.jual2 - bs.beli) * 100 / NULLIF(bs.beli, 0), 0) as margin, 
			bi.supplier as supp, 
			bs.poin, bi.minorder, bi.bobot, bi.grade::text, 
			COALESCE(bi.stok, 0) as stoknr, 
			p.nobukti as last_order, 
			p.tanggal::text, 
			d.qty, 
			k.kode as supplier, 
			p.sts
		FROM 
			brg b
		LEFT JOIN brgkelompok bk ON bk.id = b.idkelompok
		LEFT JOIN brgjenis bj ON bj.id = b.idjenis
		LEFT JOIN brgmerk bm ON bm.id = b.idmerk
		LEFT JOIN brginfo bi ON bi.id = b.id
		LEFT JOIN brgsatuan bs ON bs.id = b.id AND bs.idsatuan = b.defsatuan
		LEFT JOIN pesan p ON p.id = (
			SELECT p.id 
			FROM pesan p 
			INNER JOIN pesand pd ON p.id = pd.idtrans 
			WHERE pd.idbarang = b.id 
			ORDER BY p.tanggal DESC 
			LIMIT 1
		)
		LEFT JOIN pesand d ON d.idtrans = p.id AND d.idbarang = b.id
		LEFT JOIN ktk k ON k.id = p.idkontak
		WHERE 
			b.nama ILIKE 'ACCU GTZ5S-BS ( KARISMA ) FULL KERING' -- :nama 
			AND b.aktif = true
```
### Example
```bash
curl "http://localhost:8082/api/analisa/trendpenjualan/substitusi?nama=semen&iddevisi=2" \
  -H "Authorization: Bearer <token>"
```