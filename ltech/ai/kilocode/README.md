# Kilocode Integration

Wrapper dan dokumentasi untuk integrasi Kilocode CLI dengan project ltech.

## 📁 Struktur Folder

```
ai/kilocode/
├── scripts/          # Executable scripts
│   ├── olik          # Main wrapper (text output)
│   ├── olikj         # JSON output variant
│   └── extract_kilo_response.py  # Helper script
├── docs/             # Documentation
│   ├── olik_usage.md
│   ├── olik_enhancements.md
│   ├── session_fix_plan.md
│   └── kilocode_features.md
└── tests/            # Test files & outputs
    ├── result.json
    ├── result_clean.txt
    └── test_jsonio_1.json
```

## 🚀 Quick Start

```bash
# Text output (default)
olik tampilkan daftar table schema u1566482_sparepart

# JSON output
olik --output-json tampilkan daftar table

# Continue conversation
olik -c lanjutkan analisis

# With session ID
olik -s <session-id> follow up question
```

## 📚 Documentation

- **[olik_usage.md](docs/olik_usage.md)** - Panduan penggunaan lengkap
- **[kilocode_features.md](docs/kilocode_features.md)** - Daftar fitur yang tersedia
- **[session_fix_plan.md](docs/session_fix_plan.md)** - Rencana fix session continuation
- **[olik_enhancements.md](docs/olik_enhancements.md)** - Summary enhancements

## 🔧 Installation

Scripts sudah ter-install via symlinks:
- `/usr/local/bin/olik` → `scripts/olik`
- `/usr/local/bin/olikj` → `scripts/olikj`

Alias di `~/.bashrc`:
```bash
alias olik='/home/luckyjayagroup/ltech/ai/kilocode/scripts/olik'
alias olikj='/home/luckyjayagroup/ltech/ai/kilocode/scripts/olikj'
```

## 📝 Notes

- **Session Continuation**: Fitur `-c` dan `-s` memiliki batasan performa di mode autonomous. Lihat **[session_continuation_findings.md](docs/session_continuation_findings.md)** untuk detailnya.
- **Rekomendasi**: Gunakan `olik` untuk query cepat, gunakan `kilo` interaktif untuk diskusi panjang.
- Kilocode config: `~/.kilocode/cli/config.json`
- Session files: `~/.kilocode/cli/workspaces/`

