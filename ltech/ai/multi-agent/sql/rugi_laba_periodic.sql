-- Active: 1767458714744@@127.0.0.1@5432@luckyjayagroup@u1566482_sparepart

select extract(year
               from t.tanggal) tahun,
       extract(month
               from t.tanggal) bulan,
       aliasklasifikasi klasifikasi,
       aliassubklasifikasi subklasifikasi,
       rek,
       alias akun,
             sum(COALESCE(j.kredit, 0)) pemasukan,
             sum(COALESCE(j.debit, 0)) pengeluaran,
             sum(COALESCE(j.kredit, 0) - COALESCE(j.debit, 0)) mutasi
from j
inner join t on t.id = j.idtrans
inner join prive.v_rekening r on r.kode = j.rek
where r.noklasifikasi > 3
    and cast(t.tanggal as date) >= cast(:tgl1 as date)
    and cast(t.tanggal as date)<=cast(:tgl2 as date)
    and iddevisi = :iddevisi
group by extract(year
                 from t.tanggal),
         extract(month
                 from t.tanggal),
         j.rek,
         r.aliasklasifikasi,
         r.aliassubklasifikasi,
         r.alias