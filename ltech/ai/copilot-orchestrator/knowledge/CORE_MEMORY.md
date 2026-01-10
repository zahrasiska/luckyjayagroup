# CORE_MEMORY.md - Copilot Orchestrator Global Knowledge Base

## Business Rules & Facts

### System Information
- [2026-01-07] Lucky Tech Group menggunakan sistem ERP untuk sparepart otomotif
- [2026-01-07] Database: PostgreSQL dengan multi-tenant schema
- [2026-01-07] Model default: gpt-4.1 (36% lebih cepat dari gpt-5-mini, gratis)

### Perhitungan Akuntansi (Kas)
- [2026-01-07] Kas Tunai = rekening dengan subklasifikasi 110
- [2026-01-07] Kas Bank = rekening dengan subklasifikasi 120
- [2026-01-07] Total Kas = SUM(debit) - SUM(kredit) dari tabel `j` (jurnal)
- [2026-01-07] Query template:
```sql
SELECT SUM(j.debit) - SUM(j.kredit) as saldo_kas
FROM j
WHERE j.rek IN (
  SELECT r.kode 
  FROM prive.rekening r 
  JOIN prive.subklas sk ON sk.nosubklasifikasi = r.nosubklasifikasi 
  WHERE sk.nosubklasifikasi IN (110, 120)
);
```

### Transaction Codes
- PJ = Sales (Penjualan)
- PB = Purchase (Pembelian)
- KM = Cash Receipt (Kas Masuk)
- KK = Cash Payment (Kas Keluar)
- JU = General Journal (Jurnal Umum)

---
*Last updated: 2026-01-07*


