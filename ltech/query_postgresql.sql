-- PostgreSQL version of the original MariaDB query
-- Schema: u1566482_sparepart
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
                 CASE WHEN noklasifikasi < 4 THEN 
                     SUM(COALESCE(debit, 0) - COALESCE(kredit, 0)) OVER (PARTITION BY r.kode ORDER BY ja.tahun, ja.bulan, r.kode) 
                     ELSE 0 
                 END AS saldo,
                 CASE WHEN noklasifikasi < 4 THEN 
                     COALESCE(x.debit, 0) - COALESCE(x.kredit, 0) 
                     ELSE NULL 
                 END AS mutasi
          FROM v_rekening r
          JOIN
              (SELECT DISTINCT EXTRACT(YEAR FROM t.tanggal) AS tahun,
                      EXTRACT(MONTH FROM t.tanggal) AS bulan
               FROM t) ja ON TRUE
          LEFT JOIN
              (SELECT j.rek,
                      EXTRACT(YEAR FROM t.tanggal) AS tahun,
                      EXTRACT(MONTH FROM t.tanggal) AS bulan,
                      SUM(COALESCE(j.debit, 0)) AS debit,
                      SUM(COALESCE(j.kredit, 0)) AS kredit
               FROM j
               INNER JOIN t ON t.id = j.idtrans
               AND j.rek != 340.00
               GROUP BY j.rek,
                   EXTRACT(YEAR FROM t.tanggal),
                   EXTRACT(MONTH FROM t.tanggal)) x ON x.rek = r.kode
          AND x.tahun = ja.tahun
          AND x.bulan = ja.bulan
          ORDER BY tahun,
              bulan,
              r.kode) c
     WHERE (tahun::text || LPAD(bulan::text, 2, '0')) <= (EXTRACT(YEAR FROM $2)::text || LPAD(EXTRACT(MONTH FROM $2)::text, 2, '0'))
         AND (tahun::text || LPAD(bulan::text, 2, '0')) >= (EXTRACT(YEAR FROM $1)::text || LPAD(EXTRACT(MONTH FROM $1)::text, 2, '0'))
     UNION ALL 
     SELECT *
     FROM
         (SELECT tahun,
                 bulan,
                 klasifikasi,
                 subklasifikasi,
                 kode,
                 akun,
                 alias,
                 saldo - (debit-kredit) AS sawal,
                 debit,
                 kredit,
                 debit-kredit AS mutasi,
                 saldo
          FROM
              (SELECT DISTINCT tahun,
                      LPAD(bulan::text, 2, '0') AS bulan,
                      aliasklasifikasi AS klasifikasi,
                      aliassubklasifikasi AS subklasifikasi,
                      kode,
                      akun,
                      alias,
                      d AS debit, 
                      -rl AS kredit,
                      SUM(rl+d) OVER (ORDER BY ja.tahun, ja.bulan) AS saldo
               FROM
                   (SELECT EXTRACT(YEAR FROM t.tanggal) AS tahun,
                           EXTRACT(MONTH FROM t.tanggal) AS bulan,
                           340.00 AS rek,
                           SUM(CASE WHEN r.noklasifikasi >= 4 THEN
                               COALESCE(j.debit, 0)-COALESCE(j.kredit, 0)
                               ELSE 0
                           END) AS rl,
                           SUM(CASE WHEN j.rek = 340.00 THEN j.debit-j.kredit ELSE 0 END) AS d
                    FROM j
                    INNER JOIN v_rekening r ON r.kode = j.rek
                    INNER JOIN t ON t.id = j.idtrans
                    WHERE r.noklasifikasi >= 4
                        OR j.rek = 340.00
                    GROUP BY EXTRACT(YEAR FROM t.tanggal),
                        EXTRACT(MONTH FROM t.tanggal) AS tahun,
                           EXTRACT(MONTH FROM j INNER JOIN t ON t.id = j.idtrans WHERE j.tanggal) AS bulan,
                           340.00 AS rek,
                           SUM(CASE WHEN r.noklasifikasi >= 4 THEN 
                               COALESCE(j.debit, 0)-COALESCE(j.kredit, 0) 
                               ELSE 0 
                           END) AS rl,
                           SUM(CASE WHEN j.rek = 340.00 THEN j.debit-j.kredit ELSE 0 END) AS d
                    FROM j
                    INNER JOIN v_rekening r ON r.kode = j.rek
                    INNER JOIN t ON t.id = j.idtrans
                    WHERE r.noklasifikasi >= 4
                        OR j.rek = 340.00
                    GROUP BY EXTRACT(YEAR FROM t.tanggal) AS tahun,
                           EXTRACT(MONTH FROM t.tanggal) AS bulan,
                           340.00 AS rek,
                           SUM(CASE WHEN r.noklasifikasi >= 4 THEN
                               COALESCE(j.debit, 0)-COALESCE(j.kredit, 0)
                               ELSE 0
                           END) AS rl,
                           SUM(CASE WHEN j.rek = 340.00 THEN j.debit-j.kredit ELSE 0 END) AS d
                    FROM j
                    INNER JOIN v_rekening r ON r.kode = j.rek
                    INNER JOIN t ON t.id = j.idtrans
                    WHERE r.noklasifikasi >= 4
                        OR j.rek = 340.00
                    GROUP BY EXTRACT(YEAR FROM t.tanggal),
                        EXTRACT(MONTH FROM t.tanggal),
                        EXTRACT(MONTH FROM j INNER JOIN t ON t.id = j.idtrans WHERE j.tanggal)) x
               JOIN v_rekening r2 ON r2.kode = 340.00) x2) y2
     WHERE (tahun::text || LPAD(bulan::text, 2, '0')) <= (EXTRACT(YEAR FROM $2)::text || LPAD(EXTRACT(MONTH FROM $2)::text, 2, '0'))
         AND (tahun::text || LPAD(bulan::text, 2, '0')) >= (EXTRACT(YEAR FROM $1)::text || LPAD(EXTRACT(MONTH FROM $1)::text, 2, '0'))) y3
WHERE (COALESCE(saldo, 0) <> 0
    OR COALESCE(sawal, 0) <> 0
    OR COALESCE(debit, 0) <> 0
    OR COALESCE(kredit, 0) <> 0)
