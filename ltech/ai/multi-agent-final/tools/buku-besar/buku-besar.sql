-- Buku Besar (General Ledger) Query
-- Parameters: $1 = start_date, $2 = end_date, $3 = account_code (optional, use '%' for all)
-- Schema: dynamically replaced with {schema}

SELECT 
    t.id AS idtrans,
    t.tanggal,
    t.notrans,
    r.noklasifikasi,
    r.namaklasifikasi,
    r.nosubklasifikasi,
    r.namasubklasifikasi,
    j.rek AS kode_akun,
    r.akun AS nama_akun,
    j.uraian,
    COALESCE(j.debit, 0) AS debit,
    COALESCE(j.kredit, 0) AS kredit    
FROM {schema}.j j
JOIN {schema}.t t ON t.id = j.idtrans
JOIN prive.v_rekening r ON r.kode = j.rek
WHERE t.deleted_at IS NULL
    AND t.tanggal BETWEEN $1::date AND $2::date
    AND j.rek::text LIKE $3
ORDER BY t.tanggal, t.id;
