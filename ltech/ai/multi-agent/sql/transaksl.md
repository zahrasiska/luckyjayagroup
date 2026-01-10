# tabel transaksi (t)

# berikut adalah contoh view untuk semua transaksi 
rubah `sparepart` sesuai schema yang aktif
contoh `kdtrans`:
 - `PJ` = PENJUALAN
 - `PB` = PEMBELIAN
 - `PP` = PELUNASAN PIUTANG
 - `RJ` = RETUR PENJUALAN
 - `HU` = HUTANG
 - `PH` = PELUNASAN HUTANG
 - `PI` = PIUTANG
 - `PP` = PELUNASAN PIUTANG
 - `KM` = Kas Masuk
 - `KK` = Kas Keluar

 - `OS` = STOK OPNAME (Penyesuaian)
 - `PL` = MUTASI (Pindah Lokasi)
 - dst
 
```sql
select 
  t.id AS id,
  t.notrans AS notrans, -- no bukti transaksi kdpc.kdtrans.nobukti (generate by trigger)
  t.kdpc AS kdpc, -- kode device
  t.kdtrans AS kdtrans, -- kode transaksi terhubung dengan prive.datakode
  t.iddevisi AS iddevisi, -- idcabang
  dv.nama AS devisi, -- nama cabang
  t.nobukti AS nobukti,  -- nomor nota (urut)'
  t.tanggal AS tanggal, -- tangagal transaksi
  t.idkontak AS idkontak, -- id kontak (pihak ke dua) penjual / pembeli --> terhubung dengan table ktk
  k.kode AS kontak,  
  k.nama AS namakontak, -- nama kontak
  t.nilai AS nilai, -- nilai transaksi
  t.norek AS norek, -- rekening akuntansi untuk jurnal umum 
  t.operator AS operator, -- user 
  t.keterangan AS keterangan, 
  t.idpegawai AS idpegawai, -- sales /  finance / gudang tergantung transaksi --> terhubung dengan table ktk
  p.kode AS pegawai,
  t.pdiskon AS pdiskon, -- diskon berupa 10 / 10+5 (% prosentase)
  t.diskon AS diskon, -- nilai diskon (Rp)
  t.biaya AS biaya, -- biaya lain 
  t.nilaitotal AS nilaitotal, -- total = (nilai + biaya) - diskon
  t.rek_kas AS rek_kas, -- rekening akuntansi kas 
  t.bayar AS bayar, -- DP / pembayaran langsung (jika ada)
  t.pembulatan AS pembulatan, -- pembulatan
  t.rek_kredit AS rek_kredit, -- akuntansi rekening kredit 
  t.kredit AS kredit, -- nilai kredit nilaitotal - bayar
  t.potongnota AS potongnota, -- potongnota (untuk retur) 
  t.pembayaran AS pembayaran, -- generate by system = jumlah pembayaran kredit
  t.saldo AS saldo, -- saldo kredit
  t.tempo AS tempo, -- tanggal jatuh tempo
  t.termin AS termin, -- termin pembayaran --> terhubung dengan table termin
  t.qty AS qty, -- qty items
  t.idlokasi AS idlokasi, -- lokasi transaksi (acuan mutasi stok) --> terhubung dengan table lokasi
  l1.kode AS lokasi, -- kode lokasi 
  t.idlokasi2 AS idlokasi2, -- lokasi tujuan ( acuan tujuan mutasi) --> terhubung dengan table lokasi
  l2.kode AS lokasi2, -- kode lokasi tujuan 
  t.jharga AS jharga, -- kode harga yang di pakai di transaksi --> terhubung dengan table harga
  t.idpengirim AS idpengirim, -- id pengirim --> terhubung dengan table ktk
  ki.kode AS pengirim,
  t.pengirimantgl AS pengirimantgl, -- tanggal pengiriman
  t.hpp AS hpp, -- dihitung otomati by trigger nilai hpp
  t.referensi AS referensi, -- referensi external nota / internal nota non key
  t.catatan AS catatan,
  t.notasales AS notasales, -- template invoice yang di cetak 
  t.poin AS poin, -- poin sales
  t.cek AS cek, 
  t.status AS status,
  t.created_at, 
  t.updated_at,
  t.deleted_at
from t t 
  left join ktk k on
    k.id = t.idkontak 
  left join ktk p on
    p.id = t.idpegawai 
  left join ktk ki on
    ki.id = t.idpengirim 
  left join lokasi l1 on
    l1.id = t.idlokasi 
  left join lokasi l2 on
    l2.id = t.idlokasi2 
  left join devisi dv on
    dv.id = t.iddevisi;
```

# Transaksi by id

```sql
SELECT 
  t.id AS id,
  t.notrans AS notrans,
  t.kdpc AS kdpc,
  t.kdtrans AS kdtrans,
  t.iddevisi AS iddevisi,
  dv.nama AS devisi,
  t.nobukti AS nobukti,
  t.tanggal AS tanggal,
  t.idkontak AS idkontak,
  k.kode AS kontak,
  k.nama AS namakontak,
  t.tipe AS tipe,
  t.nilai AS nilai,
  t.norek AS norek,
  t.operator AS operator,
  t.keterangan AS keterangan,
  t.idpegawai AS idpegawai,
  p.kode AS pegawai,
  t.pdiskon AS pdiskon,
  t.diskon AS diskon,
  t.biaya AS biaya,
  t.nilaitotal AS nilaitotal,
  t.rek_kas AS rek_kas,
  t.bayar AS bayar,
  t.pembulatan AS pembulatan,
  t.rek_kredit AS rek_kredit,
  t.kredit AS kredit,
  t.potongnota AS potongnota,
  t.pembayaran AS pembayaran,
  t.saldo AS saldo,
  t.tempo AS tempo,
  t.termin AS termin,
  t.qty AS qty,
  t.idlokasi AS idlokasi,
  l1.kode AS lokasi,
  t.idlokasi2 AS idlokasi2,
  l2.kode AS lokasi2,
  t.jharga AS jharga,
  t.idpengirim AS idpengirim,
  ki.kode AS pengirim,
  t.pengirimantgl AS pengirimantgl,
  t.hpp AS hpp,
  t.referensi AS referensi,
  t.debit AS debit,
  t.tgldibukukan AS tgldibukukan,
  t.tutup AS tutup,
  t.catatan AS catatan,
  t.notasales AS notasales,
  t.poin AS poin,
  t.pointempo AS pointempo,
  t.pointerbayar AS pointerbayar,
  t.cek AS cek,
  CASE when lower(p.jabatan) = 'sales' then (CASE WHEN sm.kode is null then p.kode else sm.kode end) else 'NON SALES' end  AS sales,
  t.idstatus,
  ts.status AS status,
  t.created_at AS created_at,
  t.updated_at AS updated_at,
  t.deleted_at AS deleted_at,
  COALESCE(ls.json_lisbarang, '[]'::jsonb) AS detail,
  COALESCE(lk.json_listkas, '[]'::jsonb) AS kas,
  COALESCE(lb.json_listbayar, '[]'::jsonb) AS listbayar
FROM t
LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object(
      'id', d.id,
      'idbarang', d.idbarang,
      'nama', brg.nama,
      'merk', bm.merk,
      'order', d.proses,
      'qty', d.qty,
      'idsatuan', d.idsatuan,
      'satuan', s.satuan,
      'isi', d.isi,
      'jumlah', d.jumlah,
      'harga', d.harga,
      'diskon', d.diskon,
      'total', d.total,
      'poin', d.poin,
      'keterangan', d.keterangan
      )
    ) AS json_lisbarang
    FROM d
      LEFT JOIN brg on brg.id = d.idbarang
      LEFT JOIN brgmerk bm on bm.id = brg.idmerk
      LEFT JOIN satuan s on s.id = d.idsatuan

    WHERE d.idbarang = brg.id and d.idtrans = t.id and d.deleted_at IS NULL
  ) ls ON TRUE
LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object(
      'id', k.id,
      'refernsi', k.referensi,
      'rek', k.rek,
      'akun', r.akun,
      'rekkas', k.rekkas,
      'akunkas', r2.akun,
      'uraian', k.uraian,
      'nilai', k.nilai
      )
    ) AS json_listkas
    FROM kas k
      LEFT JOIN prive.rekening r on r.kode = k.rek
      LEFT JOIN prive.rekening r2 on r2.kode = k.rekkas
    WHERE k.idtrans = t.id 
  ) lk ON TRUE
LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object(
      'id', k.id,
      'rek', k.rek,
      'akun', r.akun,
      'rekkas', k.rekkas,
      'akunkas', r2.akun,
      'uraian', k.uraian,
      'nilai', k.nilai
      )
    ) AS json_listbayar
    FROM kas k
      LEFT JOIN prive.rekening r on r.kode = k.rek
      LEFT JOIN prive.rekening r2 on r2.kode = k.rekkas
    WHERE k.refidtrans = t.id 
  ) lb ON TRUE
  LEFT JOIN ktk k ON k.id = t.idkontak
  LEFT JOIN ktk p ON p.id = t.idpegawai
  LEFT JOIN ktkinfo pi on pi.id = p.id
  LEFT JOIN ktk sm on sm.id = pi.iddevisi
  LEFT JOIN ktk ki ON ki.id = t.idpengirim
  LEFT JOIN lokasi l1 ON l1.id = t.idlokasi
  LEFT JOIN lokasi l2 ON l2.id = t.idlokasi2
  LEFT JOIN devisi dv ON dv.id = t.iddevisi
  left JOIN trsts ts on ts.id = t.idstatus
where t.id = :id;
```

# MULTI INSERT and UPDATE
data di simpan dalam bentuk batch


## Struktur data transaksi "t"

```sql
CREATE TABLE t (
  id             bigint NOT NULL PRIMARY KEY,
  notrans        varchar(20),
  kdpc           char(3),
  kdtrans        varchar(3) NOT NULL,
  nobukti        bigint,
  tanggal        timestamp without time zone NOT NULL,
  idkontak       bigint,
  tipe           varchar(10),
  nilai          numeric(12,2),
  norek          numeric(12,2),
  "operator"     varchar(20),
  keterangan     varchar(50),
  idpegawai      bigint,
  pdiskon        varchar(20),
  diskon         numeric(12,2),
  biaya          numeric(12,2),
  nilaitotal     numeric(12,2),
  rek_kas        numeric(12,2),
  bayar          numeric(12,2),
  pembulatan     numeric(12,2),
  rek_kredit     numeric(12,2),
  kredit         numeric(12,2),
  potongnota     numeric(12,2),
  pembayaran     numeric(12,2),
  saldo          numeric(12,2),
  tempo          date,
  termin         varchar(20),
  qty            numeric(12,2),
  idlokasi       bigint,
  idlokasi2      bigint,
  jharga         varchar(20),
  idpengirim     bigint,
  pengirimantgl  date,
  hpp            numeric(12,2),
  referensi      varchar(20),
  debit          integer,
  tgldibukukan   date,
  tutup          integer,
  catatan        text,
  notasales      integer,
  poin           numeric(12,2),
  pointempo      date,
  pointerbayar   numeric(12,2),
  cek            integer,
  idstatus       integer,
  iddevisi       bigint,
  idcabang       bigint,
  created_at     timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at     timestamp without time zone,
  deleted_at     timestamp without time zone,
  /* Keys */
  CONSTRAINT t_pkey
    PRIMARY KEY (id),
  /* Foreign keys */
  CONSTRAINT t_fk_iddevisi
    FOREIGN KEY (iddevisi)
    REFERENCES devisi(id), 
  CONSTRAINT t_fk_idkontak
    FOREIGN KEY (idkontak)
    REFERENCES ktk(id), 
  CONSTRAINT t_fk_idlokasi
    FOREIGN KEY (idlokasi)
    REFERENCES lokasi(id), 
  CONSTRAINT t_fk_idlokasi2
    FOREIGN KEY (idlokasi2)
    REFERENCES lokasi(id), 
  CONSTRAINT t_fk_idpegawai
    FOREIGN KEY (idpegawai)
    REFERENCES ktk(id), 
  CONSTRAINT t_fk_idpengirim
    FOREIGN KEY (idpengirim)
    REFERENCES ktk(id), 
  CONSTRAINT t_fk_jharga
    FOREIGN KEY (jharga)
    REFERENCES harga(kode), 
  CONSTRAINT t_fk_kdpc
    FOREIGN KEY (kdpc)
    REFERENCES prive.klien(klien)
    ON DELETE RESTRICT
    ON UPDATE CASCADE, 
  CONSTRAINT t_fk_norek
    FOREIGN KEY (norek)
    REFERENCES prive.rekening(kode)
    ON DELETE RESTRICT
    ON UPDATE CASCADE, 
  CONSTRAINT t_fk_operator
    FOREIGN KEY ("operator")
    REFERENCES prive."operator"(namauser)
    ON DELETE RESTRICT
    ON UPDATE CASCADE, 
  CONSTRAINT t_fk_rekkas
    FOREIGN KEY (rek_kas)
    REFERENCES prive.rekening(kode)
    ON DELETE RESTRICT
    ON UPDATE CASCADE, 
  CONSTRAINT t_fk_rekkredit
    FOREIGN KEY (rek_kredit)
    REFERENCES prive.rekening(kode)
    ON DELETE RESTRICT
    ON UPDATE CASCADE, 
  CONSTRAINT t_fk_status
    FOREIGN KEY (idstatus)
    REFERENCES trsts(id), 
  CONSTRAINT t_fk_termin
    FOREIGN KEY (termin)
    REFERENCES termin(kode), 
  CONSTRAINT t_fkkdtrans
    FOREIGN KEY (kdtrans)
    REFERENCES prive.datakode(kode)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
);

CREATE INDEX t_fk_iddevisi
  ON t
  (iddevisi);

CREATE INDEX t_fk_idkontak
  ON t
  (idkontak);

CREATE INDEX t_fk_idlokasi
  ON t
  (idlokasi);

CREATE INDEX t_fk_idlokasi2
  ON t
  (idlokasi2);

CREATE INDEX t_fk_idpegawai
  ON t
  (idpegawai);

CREATE INDEX t_fk_idpengirim
  ON t
  (idpengirim);

CREATE INDEX t_fk_jharga
  ON t
  (jharga);

CREATE INDEX t_fk_kdpc
  ON t
  (kdpc);

CREATE INDEX t_fk_kdtrans
  ON t
  (kdtrans);

CREATE INDEX t_fk_norek
  ON t
  (norek);

CREATE INDEX t_fk_operator
  ON t
  ("operator");

CREATE INDEX t_fk_rekkredit
  ON t
  (rek_kredit);

CREATE INDEX t_fk_status
  ON t
  (idstatus);

CREATE INDEX t_fk_termin
  ON t
  (termin);

CREATE TRIGGER t_tr_bi
  BEFORE INSERT
  ON t
  FOR EACH ROW
  EXECUTE PROCEDURE prive.t_tr_bi();

CREATE TRIGGER t_tr_bi_cek
  BEFORE INSERT
  ON t
  FOR EACH ROW
  EXECUTE PROCEDURE prive.t_tr_bi_cek();

```

## Struktur data Detail transaksi barang "d"

```sql
CREATE TABLE d (
  id           varchar(60) NOT NULL PRIMARY KEY,
  idtrans      bigint NOT NULL,
  urut         integer,
  idbarang     bigint NOT NULL,
  qtynota      numeric(10,2),
  idsatuan     bigint,
  isi          numeric(10,2),
  satuan       varchar(15),
  harga        numeric(12,2),
  hpp          numeric(12,2),
  jumlah       numeric(12,2),
  diskon       numeric(12,2),
  biaya        numeric(12,2),
  total        numeric(12,2),
  keterangan   varchar(100),
  idlokasi     bigint,
  idlokasi2    bigint,
  pesan        numeric(12,2),
  proses       numeric(10,2),
  mutasi       numeric(12,2),
  debit        integer,
  hppbeli      integer,
  poin         numeric(12,2),
  waktu        timestamp without time zone,
  diskon2      varchar(20),
  potong_nota  smallint,
  poin2        varchar(20),
  diskonnota   numeric(12,2),
  qty          numeric(10,2),
  refnotrans   varchar(20),
  refidtrans   bigint,
  refid        varchar(60),
  cek          boolean,
  terbayar     numeric(12,2),
  stok         numeric(12,2),
  dicek        integer,
  idtipe       integer,
  created_at   timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at   timestamp without time zone,
  deleted_at   timestamp without time zone,
  idpld        bigint,
  /* Keys */
  CONSTRAINT d_pkey
    PRIMARY KEY (id),
  /* Foreign keys */
  CONSTRAINT d_fk_idbarang
    FOREIGN KEY (idbarang)
    REFERENCES brg(id), 
  CONSTRAINT d_fk_idlokasi
    FOREIGN KEY (idlokasi)
    REFERENCES lokasi(id), 
  CONSTRAINT d_fk_idlokasi2
    FOREIGN KEY (idlokasi2)
    REFERENCES lokasi(id), 
  CONSTRAINT d_fk_idsatuan
    FOREIGN KEY (idsatuan)
    REFERENCES satuan(id), 
  CONSTRAINT d_fk_idtrans
    FOREIGN KEY (idtrans)
    REFERENCES t(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE, 
  CONSTRAINT d_fk_refidtrans
    FOREIGN KEY (refidtrans)
    REFERENCES t(id), 
  CONSTRAINT d_fk_t_so_pl_d
    FOREIGN KEY (idpld)
    REFERENCES t_so_pl_d(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
);

CREATE INDEX d_fk_idbarang
  ON d
  (idbarang);

CREATE INDEX d_fk_idlokasi
  ON d
  (idlokasi);

CREATE INDEX d_fk_idlokasi2
  ON d
  (idlokasi2);

CREATE INDEX d_fk_idsatuan
  ON d
  (idsatuan);

CREATE INDEX d_fk_idtrans
  ON d
  (idtrans);

CREATE INDEX d_fk_refidtrans
  ON d
  (refidtrans);
```

## Struktur data Detail transaksi kas (akuntansi kas masuk, kas keluar, pembayaran, dll) "kas"

```sql

CREATE TABLE sparepart.kas (
  id          bigint NOT NULL,
  idtrans     bigint NOT NULL,
  refidtrans  bigint,
  refid       bigint,
  idkontak    bigint,
  rek         numeric(12,2),
  rekkas      numeric(12,2),
  uraian      varchar(50),
  debit       numeric(12,2),
  kredit      numeric(12,2),
  tempo       date,
  pembayaran  numeric(12,2),
  saldo       numeric(12,2),
  tipe        varchar(10),
  dibayar     integer,
  referensi   varchar(15),
  refid2      varchar(40),
  cek         integer,
  nilai       numeric(12,2),
  /* Keys */
  CONSTRAINT kas_pkey
    PRIMARY KEY (id),
  /* Foreign keys */
  CONSTRAINT kas_fk_idkontak
    FOREIGN KEY (idkontak)
    REFERENCES sparepart.ktk(id), 
  CONSTRAINT kas_fk_idtrans
    FOREIGN KEY (idtrans)
    REFERENCES sparepart.t(id), 
  CONSTRAINT kas_fk_refidtrans
    FOREIGN KEY (refidtrans)
    REFERENCES sparepart.t(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE, 
  CONSTRAINT kas_fk_rek
    FOREIGN KEY (rek)
    REFERENCES prive.rekening(kode)
    ON DELETE RESTRICT
    ON UPDATE CASCADE, 
  CONSTRAINT kas_fk_rekkas
    FOREIGN KEY (rekkas)
    REFERENCES prive.rekening(kode)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
);

CREATE INDEX kas_fk_idkontak
  ON sparepart.kas
  (idkontak);

CREATE INDEX kas_fk_idtrans
  ON sparepart.kas
  (idtrans);

CREATE INDEX kas_fk_refidtrans
  ON sparepart.kas
  (refidtrans);

CREATE INDEX kas_fk_rek
  ON sparepart.kas
  (rek);

CREATE INDEX kas_fk_rekkas
  ON sparepart.kas
  (rekkas);
```


## SQL Query
Backend endpoint `api/transaksi/detail` menggunakan query berikut:

```sql
SELECT 
t.id, t.notrans, t.kdpc, t.kdtrans,
  t.iddevisi, dv.nama AS devisi,
  t.nobukti, t.tanggal,
  t.idkontak, k.kode AS kontak, k.nama AS namakontak,
  CASE WHEN t.idkontak IS NULL THEN NULL ELSE
    jsonb_build_object(
   'id', k.id,
   'kode', k.kode,
   'nama', k.nama
  ) 
  END AS datakontak,

  t.tipe, t.nilai, t.norek, t.operator, t.keterangan,
  t.idpegawai, p.kode AS pegawai,
  CASE WHEN t.idpegawai IS NULL THEN NULL ELSE
  jsonb_build_object(
   'id', p.id,
   'kode', p.kode,
   'nama', p.nama
  ) 
  END AS datapegawai,
  t.pdiskon, t.diskon, t.biaya, t.nilaitotal,
  t.rek_kas, t.bayar, t.pembulatan,
  t.rek_kredit, t.kredit, t.potongnota, t.pembayaran, t.saldo,
  t.tempo, t.termin, 
  CASE WHEN t.termin IS NULL THEN NULL ELSE
  jsonb_build_object(
   'kode', tm.kode,
   'nama', tm.nama,
   'hari', tm.hari  
  ) 
  END AS datatermin,
  t.qty,
  t.idlokasi, l1.kode AS lokasi,
  CASE WHEN t.idlokasi IS NULL THEN NULL ELSE 
  jsonb_build_object(
    'id', l1.id,
    'kode', l1.kode,
    'nama', l1.nama
  )
  END AS datalokasi, 
  t.idlokasi2, l2.kode AS lokasi2,
  CASE WHEN t.idlokasi2 IS NULL THEN NULL ELSE
  jsonb_build_object(
   'id', l2.id,
   'kode', l2.kode,
   'nama', l2.nama
  ) 
  END AS datalokasi2,
  t.jharga, 
  CASE WHEN t.jharga IS NULL THEN NULL ELSE
  jsonb_build_object(
   'kode', h.kode,
   'nama', h.nama
  ) 
  END AS dataharga,
  t.idpengirim, ki.kode AS pengirim,
  CASE WHEN t.idpengirim IS NULL THEN NULL ELSE
  jsonb_build_object(
   'id', ki.id,
   'kode', ki.kode,
   'nama', ki.nama
  ) 
  END AS datapengirim,
  t.pengirimantgl, t.hpp, t.referensi,
  t.debit, t.tgldibukukan, t.tutup,
  t.catatan, t.notasales,
  t.poin, t.pointempo, t.pointerbayar, t.cek,
  CASE WHEN lower(p.jabatan) = 'sales' THEN (CASE WHEN sm.kode IS NULL THEN p.kode ELSE sm.kode END) ELSE 'NON SALES' END AS sales,
  t.idstatus, ts.status,
  CASE WHEN t.idstatus IS NULL THEN NULL ELSE
  jsonb_build_object(
   'id', ts.id,
   'status', ts.status
  ) 
  END AS datastatus,
  t.created_at, t.updated_at, t.deleted_at,
  COALESCE(ls.json_listbarang, '[]'::jsonb) AS detail,
  COALESCE(lk.json_listkas, '[]'::jsonb) AS kas,
  COALESCE(lb.json_listbayar, '[]'::jsonb) AS listbayar
FROM t
LEFT JOIN LATERAL (
  SELECT jsonb_agg(jsonb_build_object(
    'id', d.id,
    'idbarang', d.idbarang,
    'idlokasi', d.idlokasi,
    'idlokasi2', d.idlokasi2,
    'nama', brg.nama,
    'merk', bm.merk,
    'order', d.proses,
    'qtynota', d.qtynota,
    'pesan', d.pesan,
    'idsatuan', d.idsatuan,
    'satuan', s.satuan,
    'isi', d.isi,
    'qty', d.qty,
    'jumlah', d.jumlah,
    'harga', d.harga,
    'diskon', d.diskon,
    'total', d.total,
    'poin2', d.poin2,
    'poin', d.poin,
    'keterangan', d.keterangan,
    'dicek', d.dicek
  )) AS json_listbarang
  FROM d
  LEFT JOIN brg ON brg.id = d.idbarang
  LEFT JOIN brgmerk bm ON bm.id = brg.idmerk
  LEFT JOIN satuan s ON s.id = d.idsatuan
  WHERE d.idtrans = t.id AND d.deleted_at IS NULL
) ls ON TRUE
LEFT JOIN LATERAL (
  SELECT jsonb_agg(jsonb_build_object(
    'id', kas.id,
    'referensi', kas.referensi,
    'rek', kas.rek::text,
    'akun', r.akun,
    'rekkas', kas.rekkas::text,
    'akunkas', r2.akun,
    'uraian', kas.uraian,
    'nilai', kas.nilai
  )) AS json_listkas
  FROM kas
  LEFT JOIN prive.rekening r ON r.kode = kas.rek
  LEFT JOIN prive.rekening r2 ON r2.kode = kas.rekkas
  WHERE kas.idtrans = t.id
) lk ON TRUE
LEFT JOIN LATERAL (
  SELECT jsonb_agg(jsonb_build_object(
    'id', kas.id,
    'rek', kas.rek::text,
    'akun', r.akun,
    'rekkas', kas.rekkas::text,
    'akunkas', r2.akun,
    'uraian', kas.uraian,
    'nilai', kas.nilai
  )) AS json_listbayar
  FROM kas
  LEFT JOIN prive.rekening r ON r.kode = kas.rek
  LEFT JOIN prive.rekening r2 ON r2.kode = kas.rekkas
  WHERE kas.refidtrans = t.id
) lb ON TRUE
LEFT JOIN ktk k ON k.id = t.idkontak
LEFT JOIN ktk p ON p.id = t.idpegawai
LEFT JOIN ktkinfo pi ON pi.id = p.id
LEFT JOIN ktk sm ON sm.id = pi.iddevisi
LEFT JOIN ktk ki ON ki.id = t.idpengirim
LEFT JOIN lokasi l1 ON l1.id = t.idlokasi
LEFT JOIN lokasi l2 ON l2.id = t.idlokasi2
LEFT JOIN devisi dv ON dv.id = t.iddevisi
LEFT JOIN trsts ts ON ts.id = t.idstatus
LEFT JOIN harga h on h.kode= t.jharga
LEFT JOIN termin tm on tm.kode = t.termin
WHERE t.id = $1 AND t.deleted_at IS NULL
LIMIT 1;
```

**Penjelasan:**
- Query menggunakan `LATERAL` subquery untuk mengambil detail barang, kas, dan list pembayaran dalam format JSONB
- Filter `d.deleted_at IS NULL` untuk memastikan hanya item yang tidak dihapus yang ditampilkan
- `CASE` statement untuk menentukan nama sales berdasarkan jabatan pegawai
- Parameter `$1` adalah ID transaksi yang dicari
- **Detail items** mencakup informasi lokasi stok (`idlokasi`, `idlokasi2`), quantity (`qtynota`, `qty`), referensi order (`pesan`), dan poin (`poin2`, `poin`)
> **Note:** Setiap item di dalam array `detail` memiliki fields berikut:
> - `id` - ID detail transaksi
> - `idbarang` - ID barang
> - `idlokasi` - ID lokasi stok asal
> - `idlokasi2` - ID lokasi tujuan (untuk PL/Mutasi Lokasi), nullable
> - `nama` - Nama barang
> - `merk` - Merk barang
> - `order` - Qty Order / Permintaan (d.proses)
> - `qtynota` - Quantity di nota (d.proses - stok), nullable
> - `pesan` - Referensi order pembelian, nullable
> - `idsatuan` - ID satuan
> - `satuan` - Nama satuan (PCS, SET, dll)
> - `isi` - Isi per satuan
> - `qty` - Quantity aktual (qtynota * isi)
> - `jumlah` - Jumlah total
> - `harga` - Harga per unit
> - `diskon` - Nilai diskon per item
> - `total` - Total harga setelah diskon
> - `poin2` - Poin berdasarkan % (Ex: "10+5"), nullable
> - `poin` - Poin reward dalam Rupiah
> - `keterangan` - Catatan/keterangan, nullable


## contoh response 
`api/transaksi/detail?id=195340`

```json
{
  "data": {
    "id": 195340,
    "notrans": "NET.PJ.67090",
    "kdpc": "NET",
    "kdtrans": "PJ",
    "iddevisi": 2,
    "devisi": "Lucky Jaya Motorindo",
    "nobukti": 67090,
    "tanggal": "2026-01-01T16:59:42+07:00",
    "idkontak": 481,
    "kontak": "LMJ-MISNADI",
    "namakontak": "P.MISNADI",
    "nilai": 1336500,
    "operator": "NET",
    "keterangan": "Penjualan",
    "idpegawai": 388,
    "pegawai": "KHOIRUL",
    "nilaitotal": 1336500,
    "rek_kas": "110.22",
    "rek_kredit": "130.00",
    "kredit": 1336500,
    "saldo": 1336500,
    "tempo": "2026-01-29T00:00:00Z",
    "termin": "n-28",
    "qty": 11,
    "idlokasi": 6,
    "lokasi": "GUDANG",
    "jharga": "JUAL2",
    "pengirimantgl": "2026-01-01T00:00:00Z",
    "hpp": 999988.52,
    "referensi": "NET.PJ.7651",
    "debit": 1,
    "tgldibukukan": "2026-01-01T00:00:00Z",
    "notasales": "1",
    "poin": 81315,
    "sales": "KHOIRUL",
    "idstatus": 1,
    "status": "Dalam Proses",
    "datakontak": {
      "id": 481,
      "kode": "LMJ-MISNADI",
      "nama": "P.MISNADI"
    },
    "datapegawai": {
      "id": 388,
      "kode": "KHOIRUL",
      "nama": "KH (085101608128)(020886)"
    },
    "datatermin": {
      "kode": "n-28",
      "nama": "28 hari",
      "hari": 28
    },
    "datalokasi": {
      "id": 6,
      "kode": "GUDANG",
      "nama": "GUDANG"
    },
    "dataharga": {
      "kode": "JUAL2",
      "nama": "Partai"
    },
    "datastatus": {
      "id": 1,
      "status": "Dalam Proses"
    },
    "created_at": "2026-01-01T17:06:09Z",
    "updated_at": "2026-01-01T17:06:15Z",
    "detail": [
      {
        "id": 0,
        "idbarang": 642,
        "idlokasi": 6,
        "nama": "BEARING 60/22 - LLU 2 RS CM",
        "merk": "NTN",
        "order": 5,
        "qty": 0,
        "idsatuan": 8,
        "satuan": "PCS",
        "isi": 1,
        "jumlah": 0,
        "harga": 31000,
        "total": 0,
        "poin2": "8",
        "poin": 0,
        "qtynota": 0,
        "pesan": 5
      },
      {
        "id": 0,
        "idbarang": 704,
        "idlokasi": 6,
        "nama": "BEARING 6201 - 2RS",
        "merk": "KC",
        "order": 10,
        "qty": 10,
        "idsatuan": 8,
        "satuan": "PCS",
        "isi": 1,
        "jumlah": 69000,
        "harga": 6900,
        "total": 69000,
        "poin2": "7",
        "poin": 4830,
        "qtynota": 10
      },
      {
        "id": 0,
        "idbarang": 795,
        "idlokasi": 6,
        "nama": "BEARING 6301 - LLU",
        "merk": "NTN",
        "order": 10,
        "qty": 10,
        "idsatuan": 8,
        "satuan": "PCS",
        "isi": 1,
        "jumlah": 121000,
        "harga": 12100,
        "total": 121000,
        "poin2": "8",
        "poin": 9680,
        "qtynota": 10
      },
      {
        "id": 0,
        "idbarang": 6250,
        "idlokasi": 6,
        "nama": "RANTAI 428H-120 L ( GOLD )",
        "merk": "CORAZONE",
        "order": 2,
        "qty": 2,
        "idsatuan": 8,
        "satuan": "PCS",
        "isi": 1,
        "jumlah": 178200,
        "harga": 89100,
        "total": 178200,
        "poin2": "7",
        "poin": 12474,
        "qtynota": 2
      },
      {
        "id": 0,
        "idbarang": 7129,
        "idlokasi": 6,
        "nama": "SEAL SHOCK DEPAN GRAND / PRIMA / SUPRA",
        "merk": "KC",
        "order": 10,
        "qty": 10,
        "idsatuan": 11,
        "satuan": "SET",
        "isi": 1,
        "jumlah": 67000,
        "harga": 6700,
        "total": 67000,
        "poin2": "7",
        "poin": 4690,
        "qtynota": 10
      },
      {
        "id": 0,
        "idbarang": 7249,
        "idlokasi": 6,
        "nama": "SHOCK BLK HEAVY DUTY FIZ 280",
        "merk": "CORAZONE",
        "order": 1,
        "qty": 1,
        "idsatuan": 11,
        "satuan": "SET",
        "isi": 1,
        "jumlah": 228800,
        "harga": 228800,
        "total": 228800,
        "poin2": "7",
        "poin": 16016,
        "qtynota": 1
      },
      {
        "id": 0,
        "idbarang": 9018,
        "idlokasi": 6,
        "nama": "GIR BLK FIZ / RX - 50T",
        "merk": "MAX1",
        "order": 3,
        "qty": 3,
        "idsatuan": 8,
        "satuan": "PCS",
        "isi": 1,
        "jumlah": 166200,
        "harga": 55400,
        "total": 166200,
        "poin2": "5",
        "poin": 8310,
        "qtynota": 3
      },
      {
        "id": 0,
        "idbarang": 9353,
        "idlokasi": 6,
        "nama": "GIR DEPAN FIZ / RX 100 - 13T",
        "merk": "MAX1",
        "order": 10,
        "qty": 10,
        "idsatuan": 8,
        "satuan": "PCS",
        "isi": 1,
        "jumlah": 89000,
        "harga": 8900,
        "total": 89000,
        "poin2": "5",
        "poin": 4450,
        "qtynota": 10
      },
      {
        "id": 0,
        "idbarang": 13014,
        "idlokasi": 6,
        "nama": "RANTAI 428H-112 L",
        "merk": "MAX1",
        "order": 3,
        "qty": 3,
        "idsatuan": 8,
        "satuan": "PCS",
        "isi": 1,
        "jumlah": 182700,
        "harga": 60900,
        "total": 182700,
        "poin2": "5",
        "poin": 9135,
        "qtynota": 3
      },
      {
        "id": 0,
        "idbarang": 14315,
        "idlokasi": 6,
        "nama": "PIRINGAN CAKRAM DEPAN FIZR / JUP-MX / NEW",
        "merk": "MAX1",
        "order": 2,
        "qty": 2,
        "idsatuan": 8,
        "satuan": "PCS",
        "isi": 1,
        "jumlah": 162600,
        "harga": 81300,
        "total": 162600,
        "poin2": "5",
        "poin": 8130,
        "qtynota": 2
      },
      {
        "id": 0,
        "idbarang": 23295,
        "idlokasi": 6,
        "nama": "HANDFAD PROTAPER ( BLUE )",
        "merk": "PROTAPER",
        "order": 3,
        "qty": 3,
        "idsatuan": 11,
        "satuan": "SET",
        "isi": 1,
        "jumlah": 36000,
        "harga": 12000,
        "total": 36000,
        "poin2": "5",
        "poin": 1800,
        "qtynota": 3
      },
      {
        "id": 0,
        "idbarang": 23297,
        "idlokasi": 6,
        "nama": "HANDFAD PROTAPER  ( KUNING )",
        "merk": "PROTAPER",
        "order": 3,
        "qty": 3,
        "idsatuan": 11,
        "satuan": "SET",
        "isi": 1,
        "jumlah": 36000,
        "harga": 12000,
        "total": 36000,
        "poin2": "5",
        "poin": 1800,
        "qtynota": 3
      }
    ]
  },
  "success": true
}
```