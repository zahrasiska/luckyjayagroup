-- Active: 1767458714744@@127.0.0.1@5432@luckyjayagroup@u1566482_sparepart

select *
from
		(select tahun,
				bulan,
				aliasklasifikasi klasifikasi,
				aliassubklasifikasi subklasifikasi,
				kode,
				akun,
				alias,
				coalesce(coalesce(saldo, 0) - coalesce(mutasi, 0)) sawal,
				debit,
				kredit,
				mutasi,
				saldo
			from
					(select ja.tahun,
							lpad(ja.bulan, 2, 0) bulan,
							r.kode,
							r.aliasklasifikasi,
							r.aliassubklasifikasi,
							r.akun,
							r.alias,
							x.debit,
							x.kredit,
							if(noklasifikasi<4, sum(coalesce(debit, 0) - coalesce(kredit, 0)) over (partition by r.kode
																																																																															order by tahun, bulan, r.kode), 0) saldo,
							if(noklasifikasi<4, coalesce(x.debit, 0)-coalesce(x.kredit, 0), null) mutasi
						from v_rekening r
						join
								(select distinct extract(year
																																	from t.tanggal) tahun,
										extract(month
																		from t.tanggal) bulan
									from t) ja
						left join
								(select j.rek,
										extract(year
																		from t.tanggal) tahun,
										extract(month
																		from t.tanggal) bulan,
										sum(coalesce(j.debit, 0)) debit,
										sum(coalesce(j.kredit, 0)) kredit
									from j
									inner join t on t.id = j.idtrans
									and j.rek != 340.00
									group by j.rek,
										extract(year
																		from t.tanggal),
										extract(month
																		from t.tanggal)) x on x.rek = r.kode
						and x.tahun = ja.tahun
						and x.bulan = ja.bulan
						order by tahun,
							bulan,
							r.kode) c
			where concat(tahun, bulan) <= concat(extract(year
																																																from :tgl2), lpad(extract(month
																																																																										from :tgl2), 2, 0))
					and concat(tahun, lpad(bulan, 2, 0)) >= concat(extract(year
																																																												from :tgl1), lpad(extract(month
																																																																																						from :tgl1), 2, 0))
			union all select *
			from
					(select tahun,
							bulan,
							klasifikasi,
							subklasifikasi,
							kode,
							akun,
							alias,
							saldo - (debit-kredit) sawal,
							debit,
							kredit,
							debit-kredit mutasi,
							saldo
						from
								(select distinct tahun,
										lpad(bulan, 2, 0) bulan,
										aliasklasifikasi klasifikasi,
										aliassubklasifikasi subklasifikasi,
										kode,
										akun,
										alias,
										d debit, -rl kredit,
										sum(rl+d) over (
																										order by tahun, bulan)saldo
									from
											(select extract(year
																											from j.tanggal) tahun,
													extract(month
																					from j.tanggal) bulan,
													340.00 rek,
													sum(if(r.noklasifikasi >= 4, coalesce(j.debit, 0)-coalesce(j.kredit, 0), 0)) rl,
													sum(if(j.rek = 340.00, j.debit-j.kredit, 0)) d
												from jurnal j
												inner join v_rekening r on r.kode = j.rek
												inner join t on t.id = j.idtrans
												where r.noklasifikasi >= 4
														or j.rek = 340.00
												group by extract(year
																													from j.tanggal),
													extract(month
																					from j.tanggal) /*union all
  select extract(year from :tgl2) tahun, extract(month from :tgl2) bulan,  340.00 , 0, 0*/ ) x
									join v_rekening r2 on r2.kode = 340.00) x2) y2
			where concat(tahun, lpad(bulan, 2, 0)) <= concat(extract(year
																																																												from :tgl2), lpad(extract(month
																																																																																						from :tgl2), 2, 0))
					and concat(tahun, lpad(bulan, 2, 0)) >= concat(extract(year
																																																												from :tgl1), lpad(extract(month
																																																																																						from :tgl1), 2, 0)) ) y3
where (coalesce(saldo, 0) <> 0
							or coalesce(sawal, 0) <> 0
							or coalesce(debit, 0) <> 0
							or coalesce(kredit, 0) <> 0)