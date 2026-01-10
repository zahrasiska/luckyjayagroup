# Barang view
```sql
SELECT
  -- === Data Barang Utama ===
  brg.kode,
  brg.barcode,
  brg.id,
  brg.nama,
  brg.idkategori,
  bkg.kategori,
  brg.idkelompok,
  bkk.kelompok,
  brg.idjenis,
  brg.idgol AS idgolongan,
  g.nama AS golongan,
  bj.jenis,
  brg.idmerk,
  bm.merk,
  sa.satuan,
  bs.beli,
  bs.jual,
  bs.jual1,
  bs.jual2,
  bs.jual3,
  bs.jual4,
  bs.jual5,
  g.rek,
  stok_sum.stok,
  stok_sum.stokgd,
  stok_sum.stoknr,
  bs.poin,
  i.pembagi,
  i.kg,
  g.rekhpp,
  i.kd,
  brg.gambar,
  bs.markup1,
  bs.markup2,
  bs.markup3,
  bs.markup4,
  bs.markup5,
  bs.markupbeli,
  i.stokminimal,
  i.minimal,
  i.hdasar,
  brg.aktif,
  i.supplier,
  i.qtydos,
  i.minorder,
  i.bobot,
  i.grade,
  i.rak,
  i.nama_list,
  i.deskripsi,  
  brg.defsatuan,
  bs.isi,
  brg.nostok,
  -- === JSON Listsatuan ===
  COALESCE(ls.json_listsatuan, '[]'::jsonb) AS listsatuan,
  -- === JSON Liststok ===
  COALESCE(lstok.json_liststok, '[]'::jsonb) AS liststok,
  -- === JSON Listpeletakan ===
  COALESCE(lp.json_listpeletakan, '[]'::jsonb) AS listpeletakan,
  -- === JSON Galery Gambar ===
  COALESCE(lbg.json_listgaleri, '[]'::jsonb) AS listgaleri,
  brg.created_at,
  GREATEST(brg.updated_at, stok_sum.updated_at, bs.updated_at, i.updated_at) AS updated_at,
  brg.deleted_at
FROM brg
  -- === Relasi Master Data ===
  LEFT JOIN brggolongan g    ON g.id = brg.idgol
  LEFT JOIN brgjenis bj      ON bj.id = brg.idjenis
  LEFT JOIN brgkategori bkg  ON bkg.id = brg.idkategori
  LEFT JOIN brgkelompok bkk  ON bkk.id = brg.idkelompok
  LEFT JOIN brgmerk bm       ON bm.id = brg.idmerk
  LEFT JOIN brgsatuan bs     ON bs.id = brg.id AND bs.idsatuan = brg.defsatuan
  LEFT JOIN satuan sa        ON sa.id = brg.defsatuan
  LEFT JOIN brginfo i        ON i.id = brg.id
  -- === Aggregasi Stok ===
  LEFT JOIN (
    SELECT
      s.idbarang,
      SUM(s.stok) AS stok,
      SUM(CASE WHEN s.idlokasi = 6  THEN s.stok ELSE 0 END) AS stokgd,
      SUM(CASE WHEN s.idlokasi = 13 THEN 0      ELSE s.stok END) AS stoknr,
      MAX(s.updated_at) AS updated_at
    FROM s
    WHERE s.idlokasi IS NOT NULL
    GROUP BY s.idbarang
  ) stok_sum ON stok_sum.idbarang = brg.id
  -- === JSON Listsatuan ===
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object(
      'id', bs2.id,
      'idsatuan', bs2.idsatuan,
      'satuan', s2.satuan,
      'isi', bs2.isi,
      'jual1', bs2.jual1,
      'jual2', bs2.jual2,
      'jual3', bs2.jual3,
      'jual4', bs2.jual4,
      'jual5', bs2.jual5
    ) ORDER BY bs2.idsatuan) AS json_listsatuan
    FROM brgsatuan bs2
      LEFT JOIN satuan s2 ON s2.id = bs2.idsatuan
    WHERE bs2.id = brg.id 
  ) ls ON TRUE
  -- === JSON Liststok ===
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object(
      'idbarang', s3.idbarang,
      'idlokasi', s3.idlokasi,
      'kode', l.kode,
      'lokasi', l.nama,
      'stok', s3.stok
    ) ORDER BY s3.idlokasi) AS json_liststok
    FROM s s3
      LEFT JOIN lokasi l ON l.id = s3.idlokasi
    WHERE s3.idbarang = brg.id AND s3.stok <> 0
  ) lstok ON TRUE
  -- === JSON Listpeletakan ===
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object(
      'id', p.id,
      'idlokasi', r.idlokasi,
      'lokasi', l.kode,
      'rak', r.kode
    ) ORDER BY p.id) AS json_listpeletakan
    FROM peletakan p
    JOIN rak r ON r.id = p.id
    JOIN lokasi l ON l.id = r.idlokasi
    WHERE p.idbarang = brg.id
  ) lp ON TRUE
  -- === JSON Galery Gambar ===
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object(
      'id', bg.id,
      'namafile', bg.namafile,
      'tanggal', bg.tanggal,
      'tipefile', bg.tipefile
    ) ORDER BY bg.id) AS json_listgaleri
    FROM brggaleri bg
    WHERE bg.idbarang = brg.id
  ) lbg ON TRUE
WHERE brg.deleted_at IS NULL and brg.aktif = true;
```

# Barang by id
```sql
SELECT
  -- === Data Barang Utama ===
  brg.kode,
  brg.barcode,
  brg.id,
  brg.nama,
  brg.idkategori,
  bkg.kategori,
  brg.idkelompok,
  bkk.kelompok,
  brg.idjenis,
  brg.idgol AS idgolongan,
  g.nama AS golongan,
  bj.jenis,
  brg.idmerk,
  bm.merk,
  sa.satuan,
  bs.beli,
  bs.jual,
  bs.jual1,
  bs.jual2,
  bs.jual3,
  bs.jual4,
  bs.jual5,
  g.rek,
  stok_sum.stok,
  stok_sum.stokgd,
  stok_sum.stoknr,
  bs.poin,
  i.pembagi,
  i.kg,
  g.rekhpp,
  i.kd,
  brg.gambar,
  bs.markup1,
  bs.markup2,
  bs.markup3,
  bs.markup4,
  bs.markup5,
  bs.markupbeli,
  i.stokminimal,
  i.minimal,
  i.hdasar,
  brg.aktif,
  i.supplier,
  i.qtydos,
  i.minorder,
  i.bobot,
  i.grade,
  i.rak,
  i.nama_list,
  i.deskripsi,  
  brg.defsatuan,
  bs.isi,
  brg.nostok,
  -- === JSON Listsatuan ===
  COALESCE(ls.json_listsatuan, '[]'::jsonb) AS listsatuan,
  -- === JSON Liststok ===
  COALESCE(lstok.json_liststok, '[]'::jsonb) AS liststok,
  -- === JSON Listpeletakan ===
  COALESCE(lp.json_listpeletakan, '[]'::jsonb) AS listpeletakan,
  -- === JSON Galery Gambar ===
  COALESCE(lbg.json_listgaleri, '[]'::jsonb) AS listgaleri,
  brg.created_at,
  GREATEST(brg.updated_at, stok_sum.updated_at, bs.updated_at, i.updated_at) AS updated_at,
  brg.deleted_at
FROM brg
  -- === Relasi Master Data ===
  LEFT JOIN brggolongan g    ON g.id = brg.idgol
  LEFT JOIN brgjenis bj      ON bj.id = brg.idjenis
  LEFT JOIN brgkategori bkg  ON bkg.id = brg.idkategori
  LEFT JOIN brgkelompok bkk  ON bkk.id = brg.idkelompok
  LEFT JOIN brgmerk bm       ON bm.id = brg.idmerk
  LEFT JOIN brgsatuan bs     ON bs.id = brg.id AND bs.idsatuan = brg.defsatuan
  LEFT JOIN satuan sa        ON sa.id = brg.defsatuan
  LEFT JOIN brginfo i        ON i.id = brg.id
  -- === Aggregasi Stok ===
  LEFT JOIN (
    SELECT
      s.idbarang,
      SUM(s.stok) AS stok,
      SUM(CASE WHEN s.idlokasi = 6  THEN s.stok ELSE 0 END) AS stokgd,
      SUM(CASE WHEN s.idlokasi = 13 THEN 0      ELSE s.stok END) AS stoknr,
      MAX(s.updated_at) AS updated_at
    FROM s
    WHERE s.idlokasi IS NOT NULL
    GROUP BY s.idbarang
  ) stok_sum ON stok_sum.idbarang = brg.id
  -- === JSON Listsatuan ===
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object(
      'id', bs2.id,
      'idsatuan', bs2.idsatuan,
      'satuan', s2.satuan,
      'isi', bs2.isi,
      'jual1', bs2.jual1,
      'jual2', bs2.jual2,
      'jual3', bs2.jual3,
      'jual4', bs2.jual4,
      'jual5', bs2.jual5
    ) ORDER BY bs2.idsatuan) AS json_listsatuan
    FROM brgsatuan bs2
      LEFT JOIN satuan s2 ON s2.id = bs2.idsatuan
    WHERE bs2.id = brg.id 
  ) ls ON TRUE
  -- === JSON Liststok ===
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object(
      'idbarang', s3.idbarang,
      'idlokasi', s3.idlokasi,
      'kode', l.kode,
      'lokasi', l.nama,
      'stok', s3.stok
    ) ORDER BY s3.idlokasi) AS json_liststok
    FROM s s3
      LEFT JOIN lokasi l ON l.id = s3.idlokasi
    WHERE s3.idbarang = brg.id AND s3.stok <> 0
  ) lstok ON TRUE
  -- === JSON Listpeletakan ===
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object(
      'id', p.id,
      'idlokasi', r.idlokasi,
      'lokasi', l.kode,
      'rak', r.kode
    ) ORDER BY p.id) AS json_listpeletakan
    FROM peletakan p
    JOIN rak r ON r.id = p.id
    JOIN lokasi l ON l.id = r.idlokasi
    WHERE p.idbarang = brg.id
  ) lp ON TRUE
  -- === JSON Galery Gambar ===
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object(
      'id', bg.id,
      'namafile', bg.namafile,
      'tanggal', bg.tanggal,
      'tipefile', bg.tipefile
    ) ORDER BY bg.id) AS json_listgaleri
    FROM brggaleri bg
    WHERE bg.idbarang = brg.id
  ) lbg ON TRUE
WHERE brg.id = :id;
```
# table brg
```sql

CREATE TABLE brg (
  id          bigint NOT NULL PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY
    (MAXVALUE 9223372036854775807),
  idgol       bigint NOT NULL,
  idkategori  bigint,
  idkelompok  integer,
  idjenis     bigint,
  idmerk      bigint,
  barcode     varchar(20),
  kode        varchar(20) NOT NULL,
  nama        varchar(50),
  aktif       boolean,
  defsatuan   bigint,
  harga       numeric(12,2),
  eceran      numeric(12,2),
  nostok      boolean,
  gambar      text,
  created_at  timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at  timestamp without time zone,
  deleted_at  timestamp without time zone,
  search_tsv  tsvector GENERATED ALWAYS AS ((setweight(to_tsvector('simple'::regconfig, (COALESCE(kode, ''::character varying))::text), 'A'::"char") || setweight(to_tsvector('simple'::regconfig, (COALESCE(nama, ''::character varying))::text), 'B'::"char")) || setweight(to_tsvector('simple'::regconfig, (COALESCE(barcode, ''::character varying))::text), 'C'::"char")) STORED,
  /* Keys */
  CONSTRAINT brg_pkey
    PRIMARY KEY (id),
  /* Foreign keys */
  CONSTRAINT brg_fk_idgol
    FOREIGN KEY (idgol)
    REFERENCES brggolongan(id), 
  CONSTRAINT brg_fk_idjenis
    FOREIGN KEY (idjenis)
    REFERENCES brgjenis(id), 
  CONSTRAINT brg_fk_idkategori
    FOREIGN KEY (idkategori)
    REFERENCES brgkategori(id), 
  CONSTRAINT brg_fk_idkelompok
    FOREIGN KEY (idkelompok)
    REFERENCES brgkelompok(id), 
  CONSTRAINT brg_fk_idmerk
    FOREIGN KEY (idmerk)
    REFERENCES brgmerk(id)
);
```

# table brgsatuan
```sql
CREATE TABLE brgsatuan (
  id          bigint NOT NULL,
  idsatuan    bigint NOT NULL,
  isi         numeric(10,2),
  beli        numeric(12,2),
  jual        numeric(12,2),
  jual1       numeric(12,2),
  jual2       numeric(12,2),
  jual3       numeric(12,2),
  jual4       numeric(12,2),
  jual5       numeric(12,2),
  markupbeli  varchar(20),
  markup1     varchar(20),
  markup2     varchar(20),
  markup3     varchar(20),
  markup4     varchar(20),
  markup5     varchar(20),
  poin        numeric(12,2),
  aktif       boolean,
  barcode     varchar(20),
  updated_at  timestamp without time zone,
  created_at  timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  deleted_at  timestamp without time zone,
  /* Keys */
  CONSTRAINT brgsatuan_pkey
    PRIMARY KEY (id, idsatuan),
  /* Foreign keys */
  CONSTRAINT brgsatuan_fk_id
    FOREIGN KEY (id)
    REFERENCES brg(id), 
  CONSTRAINT brgsatuan_fk_idsatuan
    FOREIGN KEY (idsatuan)
    REFERENCES satuan(id)
);

CREATE INDEX brgsatuan_fk_idsatuan
  ON brgsatuan
  (idsatuan);

ALTER TABLE brgsatuan
  OWNER TO postgres;

COMMENT ON TABLE brgsatuan
  IS 'Master konversi satuan barang, menyimpan informasi harga jual/beli untuk setiap satuan yang dimiliki suatu barang';

COMMENT ON COLUMN brgsatuan.id
  IS 'ID barang, relasi ke brg(id)';

COMMENT ON COLUMN brgsatuan.idsatuan
  IS 'ID satuan, relasi ke satuan(id)';

COMMENT ON COLUMN brgsatuan.isi
  IS 'Nilai konversi jumlah unit per satuan (misal: 1 dus = 12 pcs)';

COMMENT ON COLUMN brgsatuan.beli
  IS 'Harga beli dalam satuan ini';

COMMENT ON COLUMN brgsatuan.jual
  IS 'Harga jual utama dalam satuan ini';

COMMENT ON COLUMN brgsatuan.jual1
  IS 'Harga jual alternatif 1';

COMMENT ON COLUMN brgsatuan.jual2
  IS 'Harga jual alternatif 2';

COMMENT ON COLUMN brgsatuan.jual3
  IS 'Harga jual alternatif 3';

COMMENT ON COLUMN brgsatuan.jual4
  IS 'Harga jual alternatif 4';

COMMENT ON COLUMN brgsatuan.jual5
  IS 'Harga jual alternatif 5';

COMMENT ON COLUMN brgsatuan.markupbeli
  IS 'Persentase markup dari harga beli';

COMMENT ON COLUMN brgsatuan.markup1
  IS 'Persentase markup untuk harga jual 1';

COMMENT ON COLUMN brgsatuan.markup2
  IS 'Persentase markup untuk harga jual 2';

COMMENT ON COLUMN brgsatuan.markup3
  IS 'Persentase markup untuk harga jual 3';

COMMENT ON COLUMN brgsatuan.markup4
  IS 'Persentase markup untuk harga jual 4';

COMMENT ON COLUMN brgsatuan.markup5
  IS 'Persentase markup untuk harga jual 5';

COMMENT ON COLUMN brgsatuan.poin
  IS 'Poin reward yang diberikan untuk penjualan dalam satuan ini';

COMMENT ON COLUMN brgsatuan.aktif
  IS 'Status aktif (1=aktif, 0=nonaktif)';

COMMENT ON COLUMN brgsatuan.barcode
  IS 'Barcode untuk satuan ini';

COMMENT ON COLUMN brgsatuan.updated_at
  IS 'Waktu terakhir data diperbarui';

COMMENT ON COLUMN brgsatuan.created_at
  IS 'Waktu data dibuat';

COMMENT ON COLUMN brgsatuan.deleted_at
  IS 'Waktu data dihapus (soft delete)';
```
# Table brginfo
```sql
CREATE TABLE brginfo (
  id           bigint NOT NULL,
  deskripsi    varchar(255),
  gambar       bytea,
  kd           varchar(20),
  kg           numeric(12,2),
  pembagi      numeric(12,2),
  qtydos       numeric(12,2),
  hdasar       varchar(20),
  stokminimal  boolean,
  supplier     varchar(20),
  minimal      numeric(12,2),
  stok         numeric(12,2),
  rak          varchar(20),
  minorder     numeric(12,2),
  bobot        numeric(12,2),
  grade        integer,
  nama_list    varchar(100),
  updated_at   timestamp without time zone,
  /* Keys */
  CONSTRAINT brginfo_pkey
    PRIMARY KEY (id),
  /* Foreign keys */
  CONSTRAINT brginfo_fk_id
    FOREIGN KEY (id)
    REFERENCES brg(id)
);

ALTER TABLE brginfo
  OWNER TO postgres;

COMMENT ON TABLE brginfo
  IS 'Informasi tambahan barang, melengkapi data di tabel brg';

COMMENT ON COLUMN brginfo.id
  IS 'ID barang, relasi ke brg(id)';

COMMENT ON COLUMN brginfo.deskripsi
  IS 'Deskripsi singkat barang';

COMMENT ON COLUMN brginfo.gambar
  IS 'Gambar barang (format bytea/biner)';

COMMENT ON COLUMN brginfo.kd
  IS 'Kode tambahan atau kode internal';

COMMENT ON COLUMN brginfo.kg
  IS 'Berat barang dalam kilogram';

COMMENT ON COLUMN brginfo.pembagi
  IS 'Nilai pembagi untuk perhitungan konversi';

COMMENT ON COLUMN brginfo.qtydos
  IS 'Jumlah isi per dus';

COMMENT ON COLUMN brginfo.hdasar
  IS 'Harga dasar (misalnya harga patokan sebelum markup)';

COMMENT ON COLUMN brginfo.stokminimal
  IS 'Batas stok minimum (unit)';

COMMENT ON COLUMN brginfo.supplier
  IS 'Kode pemasok utama';

COMMENT ON COLUMN brginfo.minimal
  IS 'Jumlah minimum untuk pemesanan';

COMMENT ON COLUMN brginfo.stok
  IS 'Stok aktual barang';

COMMENT ON COLUMN brginfo.rak
  IS 'Lokasi penyimpanan (nomor rak)';

COMMENT ON COLUMN brginfo.minorder
  IS 'Minimal order (unit)';

COMMENT ON COLUMN brginfo.bobot
  IS 'Bobot barang (bisa beda dari kg untuk perhitungan logistik)';

COMMENT ON COLUMN brginfo.grade
  IS 'Kualitas barang (misal 1=terbaik)';

COMMENT ON COLUMN brginfo.nama_list
  IS 'Nama barang untuk daftar harga atau katalog';

COMMENT ON COLUMN brginfo.updated_at
  IS 'Tanggal dan waktu terakhir pembaruan data';
```

# Table brggaleri
```sql
CREATE TABLE sparepart.brggaleri (
  id        bigint NOT NULL,
  idbarang  bigint NOT NULL,
  namafile  varchar(1000),
  tanggal   timestamp without time zone,
  tipefile  varchar(100),
  sizefile  double precision,
  filex     bytea,
  /* Keys */
  CONSTRAINT brggaleri_pkey
    PRIMARY KEY (id),
  /* Foreign keys */
  CONSTRAINT brggaleri_fk_idbarang
    FOREIGN KEY (idbarang)
    REFERENCES sparepart.brg(id)
);

CREATE INDEX brggaleri_fk_idbarang
  ON sparepart.brggaleri
  (idbarang);
```

# Table peletakan
```sql
CREATE TABLE .peletakan (
  id        varchar(40) NOT NULL,
  idbarang  bigint NOT NULL,
  updated   timestamp with time zone,
  /* Keys */
  CONSTRAINT idx_134571_primary
    PRIMARY KEY (id, idbarang),
  /* Foreign keys */
  CONSTRAINT peletakan_fk_barang
    FOREIGN KEY (idbarang)
    REFERENCES .brg(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE, 
  CONSTRAINT peletakan_fk_rak
    FOREIGN KEY (id)
    REFERENCES .rak(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE TRIGGER on_update_current_timestamp
  BEFORE UPDATE
  ON .peletakan
  FOR EACH ROW
  EXECUTE PROCEDURE .on_update_current_timestamp_peletakan();

ALTER TABLE .peletakan
  OWNER TO knavinkids;
```

# contoh endpoint:
```bash
curl -X 'GET' \
  'https://dev.ui.luckyjaya.tech/api/inventory/barang/detail?id=10541' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer 00b8db06-0b67-4f1e-96b7-d87a5165f8ce'
```

response:
```json
{
  "data": {
    "kode": "TNS-GTZ5S",
    "id": 10541,
    "nama": "ACCU GTZ5S-BS ( KARISMA ) FULL KERING",
    "gambar": "IMG_2013275576089369967.jpg",
    "aktif": true,
    "created_at": "2023-10-15T15:24:50+07:00",
    "updated_at": "2025-12-19T17:30:00+07:00",
    "idkategori": 1,
    "idkelompok": 659,
    "idjenis": 2,
    "idmerk": 556,
    "idgolongan": 1,
    "defsatuan": 8,
    "kategori": "SPAREPART",
    "kelompok": "TENSHI...",
    "golongan": "Sparepart",
    "jenis": "ACCU",
    "merk": "TENSHI",
    "satuan": "PCS",
    "beli": 95000,
    "jual1": 128300,
    "jual2": 116000,
    "jual3": 104600,
    "jual4": 114100,
    "jual5": 128300,
    "poin": 4,
    "rek": "140.01",
    "rekhpp": "500.51",
    "stok": 51,
    "stokgd": 0,
    "stoknr": 49,
    "nostok": false,
    "markup1": "35",
    "markup2": "22",
    "markup3": "10",
    "markup4": "20",
    "markup5": "35",
    "hdasar": "BELI",
    "supplier": "JATAYU",
    "qtydos": 10,
    "rak": "OL02",
    "nama_list": "BATTERY GTZ - 5S",
    "isi": 1,
    "listsatuan": [
      {
        "id": 10541,
        "idsatuan": 8,
        "satuan": "PCS",
        "isi": 1,
        "poin": 4,
        "beli": 95000,
        "jual1": 128300,
        "jual2": 116000,
        "jual3": 104600,
        "jual4": 114100,
        "jual5": 128300,
        "markup1": "35",
        "markup2": "22",
        "markup3": "10",
        "markup4": "20",
        "markup5": "35",
        "aktif": true
      }
    ],
    "liststok": [
      {
        "idbarang": 10541,
        "idlokasi": 7,
        "kode": "KV-01",
        "lokasi": "KANVAS-01 ( JK )",
        "stok": 10
      },
      {
        "idbarang": 10541,
        "idlokasi": 9,
        "kode": "KV-03",
        "lokasi": "KANVAS-03 ( KH )",
        "stok": 29
      },
      {
        "idbarang": 10541,
        "idlokasi": 10,
        "kode": "KV-04",
        "lokasi": "KANVAS-04 ( POR )",
        "stok": 10
      },
      {
        "idbarang": 10541,
        "idlokasi": 13,
        "kode": "RETUR",
        "lokasi": "RETUR",
        "stok": 2
      }
    ],
    "listpeletakan": [
      {
        "id": "6.OL02",
        "idlokasi": 6,
        "lokasi": "GUDANG",
        "rak": "OL02"
      }
    ],
    "listgaleri": [
      {
        "id": 8,
        "namafile": "scaled_IMG_2013275576089369967_1.jpg",
        "tanggal": "2025-12-19T09:39:56+07:00",
        "tipefile": "application/octet-stream",
        "deskripsi": null
      }
    ]
  },
  "success": true
}
```