#!/usr/bin/env python3

import re

def clean_temp_tables(input_file, output_file):
    with open(input_file, 'r') as f:
        lines = f.readlines()

    cleaned_lines = []
    skip = False

    for line in lines:
        if re.search(r'CREATE TABLE u1566482_sparepart\.(temp_|t_temp)', line):
            skip = True
            continue
        elif skip and re.search(r'CREATE TABLE u1566482_sparepart\.', line):
            skip = False
        if not skip:
            cleaned_lines.append(line)

    with open(output_file, 'w') as f:
        f.writelines(cleaned_lines)

if __name__ == "__main__":
    clean_temp_tables('schema_u1566482_sparepart.sql', 'schema_u1566482_sparepart_no_temp.sql')