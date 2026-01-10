-- Query to retrieve General Ledger (Buku Besar) transactions
-- Parameters: :start_date, :end_date, :account_code (optional)
-- Schema: dynamically replaced with {schema}

SELECT 
    t.id as idtrans,
    t.tanggal,
    t.notrans,
    r.noklasifikasi,
    r.namaklasifikasi,
    r.nosubklasifikasi,
    r.namasubklasifikasi,
    j.rek as kode_akun,
    r.akun as nama_akun,
    j.uraian,
    COALESCE(j.debit, 0) as debit,
    COALESCE(j.kredit, 0) as kredit    
FROM {schema}.j j
JOIN {schema}.t t ON t.id = j.idtrans
JOIN prive.v_rekening r ON r.kode = j.rek
WHERE t.deleted_at IS NULL
    AND t.tanggal BETWEEN :start_date::date AND :end_date::date
    -- Parameter replacement will handle optional account_code
    {{ACCOUNT_FILTER}}
ORDER BY t.tanggal, t.id;
