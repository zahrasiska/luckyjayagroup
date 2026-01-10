-- Saldo Kas (Cash Balance) Query
-- Parameters: $1 = as_of_date
-- Schema: dynamically replaced with {schema}

SELECT 
    r.noklasifikasi,
    r.namaklasifikasi,
    r.nosubklasifikasi,
    r.namasubklasifikasi,
    r.kode,
    r.akun,
    r.aliassubklasifikasi AS subklasifikasi,
    SUM(COALESCE(j.debit, 0)) AS total_debit,
    SUM(COALESCE(j.kredit, 0)) AS total_kredit,
    SUM(COALESCE(j.debit, 0) - COALESCE(j.kredit, 0)) AS saldo
FROM prive.v_rekening r
LEFT JOIN {schema}.j j ON j.rek = r.kode
LEFT JOIN {schema}.t t ON t.id = j.idtrans
WHERE 
    (r.aliassubklasifikasi ILIKE '%Kas%' OR r.aliassubklasifikasi ILIKE '%Bank%')
    AND t.tanggal <= $1::date
    AND t.deleted_at IS NULL
GROUP BY 
    r.noklasifikasi, 
    r.namaklasifikasi, 
    r.nosubklasifikasi, 
    r.namasubklasifikasi, 
    r.kode, 
    r.akun, 
    r.aliassubklasifikasi
HAVING SUM(COALESCE(j.debit, 0) - COALESCE(j.kredit, 0)) != 0
ORDER BY r.kode;
