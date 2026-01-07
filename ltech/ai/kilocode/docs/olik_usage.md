# Olik - Wrapper Kilocode CLI

## ✅ Instalasi Selesai

Fungsi `olik` telah berhasil dibuat dan siap digunakan!

## 📝 Cara Penggunaan

```bash
olik [kilo-options] [--output-json] <prompt>
```

### Contoh Dasar:

```bash
# Text output (default)
olik tampilkan daftar table schema u1566482_sparepart

# JSON output
olik --output-json tampilkan daftar table schema u1566482_sparepart

# Dengan continue conversation
olik -c lanjutkan analisis sebelumnya

# JSON + continue
olik --output-json -c lanjutkan analisis

# Dengan workspace custom
olik -w /path/to/project jelaskan struktur project

# Dengan timeout
olik -t 60 analisis kompleks yang memakan waktu
```

## ⚠️ Limitasi Penting: Session Continuation

Berdasarkan pengujian teknis, fitur **Session Continuation** (`-c` atau `-s`) memiliki beberapa batasan di `olik`:

1. **Inkompatibilitas Mode**: Kilocode secara internal tidak mengizinkan kombinasi flag `--auto` (yang digunakan `olik` agar cepat) dengan flag continuation (`-c`/`-s`).
2. **Performa**: Menggunakan mode alternatif agar session bekerja membuat response menjadi sangat lambat (> 2 menit).

### **Rekomendasi Alur Kerja:**

| Kebutuhan | Tool Rekomendasi |
|-----------|------------------|
| Query satu kali (cepat & bersih) | `olik "pertanyaan anda"` |
| Percakapan berkelanjutan (context) | Gunakan `kilo` (Interactive Mode) |
| Scripting / Automation | `olik --output-json "query"` |

### **Workaround untuk `olik`:**
Jika Anda ingin `olik` mengingat context sebelumnya, sertakan ringkasan context di prompt baru:
```bash
olik "Dari 107 tabel yang disebutkan tadi, tolong list tabel yang berhubungan dengan stok."
```

### Format Output JSON:

```json
{
  "success": true,
  "response": "Response text dari AI...",
  "session": {
    "id": "abc-123-def-456",
    "title": "Session title"
  }
}
```

### Contoh Kombinasi:

```bash
# Continue + custom prompt
olik -c golongkan tabel menurut karakteristik

# Multiple options
olik -c -t 120 berikan analisis mendalam tentang database schema
```

## 🔧 Apa yang Dilakukan `olik`?

1. ✅ Menjalankan Kilocode dengan parameter optimal:
   - Model: `x-ai/grok-code-fast-1`
   - Mode: `ask` (untuk pertanyaan)
   - Auto-approve: `--yolo -a`
   - JSON output: `-j`

2. ✅ Membersihkan output otomatis:
   - Menghapus ANSI escape codes
   - Memfilter hanya response final
   - Membuang streaming partial responses

3. ✅ Menampilkan hasil bersih di terminal

## 🎛️ Kilo Options yang Tersedia

Anda bisa menambahkan options berikut sebelum prompt:

| Option | Deskripsi | Contoh |
|--------|-----------|--------|
| `-c, --continue` | Lanjutkan percakapan terakhir | `olik -c lanjutkan analisis` |
| `-w, --workspace <path>` | Set workspace directory | `olik -w /tmp analisis file` |
| `-t, --timeout <seconds>` | Set timeout untuk autonomous mode | `olik -t 120 analisis kompleks` |
| `-m, --mode <mode>` | Override mode (architect/code/ask/debug/orchestrator) | `olik -m orchestrator analisis` |
| `-mo, --model <model>` | Override model | `olik -mo claude-3-opus buat kode` |
| `--nosplash` | Disable welcome message | `olik --nosplash quick query` |

### 🔄 Override Default Parameters

Default parameters bisa di-override dengan memberikan option yang sama:

```bash
# Override mode: ask → orchestrator
olik -m orchestrator analisis kompleks

# Override model: grok-code-fast-1 → claude
olik -mo anthropic/claude-3-opus buat aplikasi

# Multiple overrides
olik -m code -t 120 -mo anthropic/claude-3-opus buat fungsi kompleks
```

**Catatan:** Kilo menggunakan **nilai terakhir** jika ada duplikat flag, jadi user options akan menang.

## 📂 Lokasi File

- Script: `/home/luckyjayagroup/ltech/olik`
- Symlink: `/usr/local/bin/olik`
- Alias: Ditambahkan ke `~/.bashrc`

## 🚀 Aktivasi

Untuk menggunakan sekarang tanpa restart terminal:

```bash
source ~/.bashrc
# atau langsung
/usr/local/bin/olik <prompt>
```

## 🎯 Keuntungan

| Sebelum | Sesudah |
|---------|---------|
| `kilo -mo x-ai/grok-code-fast-1 --yolo -m ask -a -j "prompt" > result.json` | `olik prompt` |
| `python3 extract_kilo_response.py` | *(otomatis)* |
| `cat result_clean.txt` | *(otomatis)* |
| **3 perintah** | **1 perintah** |

## 💡 Tips

- Prompt bisa multi-kata tanpa tanda kutip
- Output otomatis dibersihkan dan ditampilkan
- File temporary otomatis dihapus
- Bisa digunakan dari direktori mana saja

## 🔄 Session Management

Setiap kali menjalankan `olik`, session ID akan ditampilkan di akhir output:

```
📋 Session Info:
   ID: abc-123-def-456
   Title: Request to display table schema list

💡 Untuk melanjutkan conversation ini:
   olik -s abc-123-def-456 <prompt>
   atau
   olik -c <prompt>
```

### Melanjutkan Conversation:

```bash
# Menggunakan session ID spesifik
olik -s abc-123-def-456 lanjutkan analisis tabel

# Menggunakan conversation terakhir dari workspace
olik -c lanjutkan analisis tabel
```

### Keuntungan Continue Conversation:
- ✅ AI mengingat context sebelumnya
- ✅ Tidak perlu mengulang informasi
- ✅ Analisis lebih mendalam dan koheren
