-- Query to calculate accurate balance for Kas & Bank accounts
-- Parameters: :as_of_date (YYYY-MM-DD)
-- Replace: u1566482_sparepart with actual tenant schema

SELECT 
    r.noklasifikasi,
    r.namaklasifikasi,
    r.nosubklasifikasi,
    r.namasubklasifikasi,
    r.kode,
    r.akun,
    r.aliassubklasifikasi as subklasifikasi,
    SUM(COALESCE(j.debit, 0)) as total_debit,
    SUM(COALESCE(j.kredit, 0)) as total_kredit,
    SUM(COALESCE(j.debit, 0) - COALESCE(j.kredit, 0)) as saldo
FROM prive.v_rekening r
LEFT JOIN u1566482_sparepart.j j ON j.rek = r.kode
LEFT JOIN u1566482_sparepart.t t ON t.id = j.idtrans
WHERE 
    (r.aliassubklasifikasi ILIKE '%Kas%' OR r.aliassubklasifikasi ILIKE '%Bank%')
    AND t.tanggal <= :as_of_date::date
    AND t.deleted_at IS NULL
GROUP BY r.noklasifikasi, r.namaklasifikasi, r.nosubklasifikasi, r.namasubklasifikasi, r.kode, r.akun, r.aliassubklasifikasi
HAVING SUM(COALESCE(j.debit, 0) - COALESCE(j.kredit, 0)) != 0
ORDER BY r.kode;
