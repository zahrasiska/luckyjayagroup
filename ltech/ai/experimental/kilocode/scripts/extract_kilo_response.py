#!/usr/bin/env python3
"""
Script untuk mengekstrak response final dari output Kilocode CLI
"""
import json
import re

# Baca file
with open('/home/luckyjayagroup/ltech/result.json', 'r') as f:
    content = f.read()

# Hapus ANSI escape codes
ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
cleaned = ansi_escape.sub('', content)

# Ekstrak semua JSON objects
final_text = None
for line in cleaned.split('\n'):
    line = line.strip()
    if line.startswith('{') and line.endswith('}'):
        try:
            obj = json.loads(line)
            # Cari response text yang final (bukan partial)
            if (obj.get('type') == 'say' and 
                obj.get('say') == 'text' and 
                obj.get('partial') == False and
                'content' in obj):
                final_text = obj['content']
        except json.JSONDecodeError:
            continue

# Output hasil
if final_text:
    print("=" * 80)
    print("RESPONSE FINAL DARI KILOCODE:")
    print("=" * 80)
    print(final_text)
    print("\n" + "=" * 80)
    
    # Simpan ke file bersih
    with open('/home/luckyjayagroup/ltech/result_clean.txt', 'w') as f:
        f.write(final_text)
    print("\n✅ Response disimpan ke: /home/luckyjayagroup/ltech/result_clean.txt")
else:
    print("❌ Tidak ditemukan response final dalam file")
