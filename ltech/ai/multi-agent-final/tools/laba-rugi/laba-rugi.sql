-- Laba Rugi (Income Statement) Query
-- Parameters: $1 = start_date, $2 = end_date
-- Schema: dynamically replaced with {schema}
-- Aggregates by account for the entire period (not per month)

SELECT 
    r.noklasifikasi,
    r.aliasklasifikasi AS klasifikasi,
    r.aliassubklasifikasi AS subklasifikasi,
    j.rek,
    r.alias AS akun,
    SUM(COALESCE(j.kredit, 0)) AS pemasukan,
    SUM(COALESCE(j.debit, 0)) AS pengeluaran,
    SUM(COALESCE(j.kredit, 0) - COALESCE(j.debit, 0)) AS mutasi
FROM {schema}.j j
LEFT JOIN {schema}.t t ON t.id = j.idtrans
LEFT JOIN prive.v_rekening r ON r.kode = j.rek
WHERE r.noklasifikasi >= 4
    AND t.tanggal >= $1::date
    AND t.tanggal <= $2::date
    AND t.deleted_at IS NULL
GROUP BY 
    r.noklasifikasi,
    j.rek,
    r.aliasklasifikasi,
    r.aliassubklasifikasi,
    r.alias
HAVING SUM(COALESCE(j.kredit, 0) - COALESCE(j.debit, 0)) != 0
ORDER BY r.noklasifikasi, j.rek;