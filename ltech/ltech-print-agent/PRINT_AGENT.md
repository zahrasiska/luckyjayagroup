# LTech Print Agent

Aplikasi pembantu (bridge) untuk melakukan pencetakan langsung dari web browser ke printer lokal (khususnya Dot Matrix) tanpa melalui Dialog Print.

## Fitur
- **Direct Printing**: Kirim data langsung ke printer (Zero Click).
- **High Speed**: Menggunakan mode teks (ESC/P) yang sangat cepat untuk printer Dot Matrix (Epson LX/LQ series).
- **Auto Discovery**: Otomatis mendeteksi printer yang terpasang di komputer.

## Cara Instalasi (Untuk User/Kasir)

### 1. Persiapan
- Pastikan printer sudah terpasang dan terdeteksi di Windows/Linux.
- Gunakan driver **Generic / Text Only** jika ingin hasil cetak super cepat (ESC/P).

### 2. Jalankan Agent
- Unduh file `ltech-print-agent.exe` (untuk Windows) atau `ltech-print-agent` (untuk Linux).
- Jalankan aplikasi tersebut. Anda akan melihat jendela hitam (terminal) yang menyatakan:
  `LTech Print Agent starting on http://localhost:12345`
- **Jangan tutup jendela ini** selama Anda ingin menggunakan fitur Direct Print.

### 3. Cara Build dari Source (Untuk Developer)
Jika Anda ingin mengompilasi sendiri aplikasi ini:
```bash
cd ltech-print-agent
# Build untuk Windows
GOOS=windows GOARCH=amd64 go build -o ltech-print-agent.exe main.go
# Build untuk Linux
GOOS=linux GOARCH=amd64 go build -o ltech-print-agent main.go
```

## Cara Penggunaan di Aplikasi Web
1. Buka Purchasing (PO/PR).
2. Klik tombol **Cetak**.
3. Pilih opsi **Direct Print (LTech Agent)**.
   - Status akan berwarna Hijau (ONLINE) jika agent sudah berjalan.
4. Pilih printer yang ingin digunakan dari dropdown.
5. Selesai! Printer akan langsung mencetak.

---
> [!TIP]
> Agar aplikasi ini otomatis berjalan saat komputer menyala, buatlah shortcut dari `ltech-print-agent.exe` dan masukkan ke folder **Startup** Windows.
