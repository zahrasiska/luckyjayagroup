-- Active: 1767458714744@@127.0.0.1@5432@luckyjayagroup@u1566482_leontech
-- PostgreSQL version of the original MariaDB query
-- Schema: u1566482_sparepart (tenant data) with prive (supporting data for all tenants)
-- Connection: DATABASE_URL="postgresql://knavinkids:Duaribu%2325%23%23@localhost:5432/luckyjayagroup?sslmode=disable"

SELECT *
FROM
    (SELECT tahun,
            bulan,
            aliasklasifikasi AS klasifikasi,
            aliassubklasifikasi AS subklasifikasi,
            kode,
            akun,
            alias,
            COALESCE(COALESCE(saldo, 0) - COALESCE(mutasi, 0), 0) AS sawal,
            debit,
            kredit,
            mutasi,
            saldo
     FROM
         (SELECT ja.tahun,
                 LPAD(ja.bulan::text, 2, '0') AS bulan,
                 r.kode,
                 r.aliasklasifikasi,
                 r.aliassubklasifikasi,
                 r.akun,
                 r.alias,
                 x.debit,
                 x.kredit,
                 CASE
                     WHEN r.noklasifikasi < 4 THEN SUM(COALESCE(debit, 0) - COALESCE(kredit, 0)) OVER (PARTITION BY r.kode
                                                                                                       ORDER BY ja.tahun, ja.bulan, r.kode)
                     ELSE 0
                 END AS saldo,
                 CASE
                     WHEN r.noklasifikasi < 4 THEN COALESCE(x.debit, 0) - COALESCE(x.kredit, 0)
                     ELSE NULL
                 END AS mutasi
          FROM prive.v_rekening r
          JOIN
              (SELECT DISTINCT EXTRACT(YEAR
                                       FROM t.tanggal) AS tahun,
                               EXTRACT(MONTH
                                       FROM t.tanggal) AS bulan
               FROM u1566482_sparepart.t) ja ON TRUE
          LEFT JOIN
              (SELECT j.rek,
                      EXTRACT(YEAR
                              FROM t.tanggal) AS tahun,
                      EXTRACT(MONTH
                              FROM t.tanggal) AS bulan,
                      SUM(COALESCE(j.debit, 0)) AS debit,
                      SUM(COALESCE(j.kredit, 0)) AS kredit
               FROM u1566482_sparepart.j
               INNER JOIN u1566482_sparepart.t ON t.id = j.idtrans
               AND j.rek != 340.00
               GROUP BY j.rek,
                        EXTRACT(YEAR
                                FROM t.tanggal),
                        EXTRACT(MONTH
                                FROM t.tanggal)) x ON x.rek = r.kode
          AND x.tahun = ja.tahun
          AND x.bulan = ja.bulan
          ORDER BY ja.tahun,
                   ja.bulan,
                   r.kode) c
     WHERE (tahun::text || LPAD(bulan::text, 2, '0')) <= (EXTRACT(YEAR
                                                                  FROM $2::timestamp)::text || LPAD(EXTRACT(MONTH
                                                                                                            FROM $2::timestamp)::text, 2, '0'))
         AND (tahun::text || LPAD(bulan::text, 2, '0')) >= (EXTRACT(YEAR
                                                                    FROM $1::timestamp)::text || LPAD(EXTRACT(MONTH
                                                                                                              FROM $1::timestamp)::text, 2, '0'))
     UNION ALL SELECT *
     FROM
         (SELECT tahun,
                 bulan,
                 klasifikasi,
                 subklasifikasi,
                 kode,
                 akun,
                 alias,
                  COALESCE(saldo, 0) - (COALESCE(debit, 0) - COALESCE(kredit, 0)) AS sawal,
                  COALESCE(debit, 0) AS debit,
                  COALESCE(kredit, 0) AS kredit,
                  COALESCE(debit, 0) - COALESCE(kredit, 0) AS mutasi,
                  COALESCE(saldo, 0) AS saldo
          FROM
              (SELECT DISTINCT tahun,
                               LPAD(bulan::text, 2, '0') AS bulan,
                               vr.aliasklasifikasi AS klasifikasi,
                               vr.aliassubklasifikasi AS subklasifikasi,
                               vr.kode,
                               vr.akun,
                               vr.alias,
                               COALESCE(d, 0) AS debit, -COALESCE(rl, 0) AS kredit,
                                            SUM(COALESCE(rl, 0) + COALESCE(d, 0)) OVER (
                                                            ORDER BY tahun, bulan) AS saldo
               FROM
                   (SELECT EXTRACT(YEAR
                                   FROM t.tanggal) AS tahun,
                           EXTRACT(MONTH
                                   FROM t.tanggal) AS bulan,
                           340.00 AS rek,
                           SUM(CASE
                                   WHEN r.noklasifikasi >= 4 THEN COALESCE(j.debit, 0)-COALESCE(j.kredit, 0)
                                   ELSE 0
                               END) AS rl,
                           SUM(CASE
                                   WHEN j.rek = 340.00 THEN j.debit-j.kredit
                                   ELSE 0
                               END) AS d
                    FROM u1566482_sparepart.j
                    INNER JOIN prive.v_rekening r ON r.kode = j.rek
                    INNER JOIN u1566482_sparepart.t ON t.id = j.idtrans
                    WHERE r.noklasifikasi >= 4
                        OR j.rek = 340.00
                    GROUP BY EXTRACT(YEAR
                                     FROM t.tanggal),
                             EXTRACT(MONTH
                                     FROM t.tanggal)) x
               JOIN prive.v_rekening vr ON vr.kode = 340.00) x2) y2
     WHERE (tahun::text || LPAD(bulan::text, 2, '0')) <= (EXTRACT(YEAR
                                                                  FROM $2::timestamp)::text || LPAD(EXTRACT(MONTH
                                                                                                            FROM $2::timestamp)::text, 2, '0'))
         AND (tahun::text || LPAD(bulan::text, 2, '0')) >= (EXTRACT(YEAR
                                                                    FROM $1::timestamp)::text || LPAD(EXTRACT(MONTH
                                                                                                              FROM $1::timestamp)::text, 2, '0'))) y3
WHERE (COALESCE(saldo, 0) <> 0
       OR COALESCE(sawal, 0) <> 0
       OR COALESCE(debit, 0) <> 0
       OR COALESCE(kredit, 0) <> 0)