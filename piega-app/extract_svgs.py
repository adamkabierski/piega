import re, urllib.parse, os, sys

base = r'c:\Users\IliaKuzmin\Documents\GitHub\piega'
resources = base + r'\resources'

# --- Extract Woodbury SVG from landing page ---
with open(resources + r'\piega-landing.html', 'r', encoding='utf-8') as f:
    landing = f.read()

matches = re.findall(r'class="card-img" src="([^"]+)"', landing)
print(f'Found {len(matches)} card-img sources in landing')
for i, m in enumerate(matches):
    if 'svg+xml' in m:
        decoded = urllib.parse.unquote(m.replace('data:image/svg+xml,',''))
        print(f'Card {i} SVG ({len(decoded)} chars):')
        print(decoded[:200])
        print('...')
        with open(base + rf'\piega-app\woodbury_card.svg', 'w', encoding='utf-8') as out:
            out.write(decoded)
        print(f'Saved to woodbury_card.svg')
    else:
        print(f'Card {i}: {m[:60]}...')

# --- Extract all SVG schema functions from report_1.jsx ---
with open(resources + r'\report_1.jsx', 'r', encoding='utf-8') as f:
    r1_lines = f.readlines()

with open(resources + r'\report_2.jsx', 'r', encoding='utf-8') as f:
    r2_lines = f.readlines()

r1_schema_indices = [50, 52, 54, 56, 58, 60, 62, 64, 66, 68, 71]
r2_schema_indices = [51, 53, 55, 57, 59, 61, 63, 65, 67, 69, 71]

def extract_funcs(lines, indices):
    funcs = []
    for idx in indices:
        if idx < len(lines):
            content = lines[idx].rstrip()
            if 'function ' in content:
                name = content.split('function ')[1].split('(')[0]
                funcs.append((name, content))
    return funcs

r1_funcs = extract_funcs(r1_lines, r1_schema_indices)
r2_funcs = extract_funcs(r2_lines, r2_schema_indices)

print(f'\nReport 1 SVG functions: {[n for n,_ in r1_funcs]}')
print(f'Report 2 SVG functions: {[n for n,_ in r2_funcs]}')

# Write report_1 schemas
with open(base + r'\piega-app\src\components\report\Report1Schemas.jsx', 'w', encoding='utf-8') as out:
    out.write('"use client";\n\n')
    out.write('import { C } from "@/lib/theme";\n')
    out.write('import { useReveal, Lab, Cap } from "./Shared";\n\n')
    for name, content in r1_funcs:
        out.write(f'export {content}\n\n')

print('\nWrote Report1Schemas.jsx')

# Write report_2 schemas
with open(base + r'\piega-app\src\components\report\Report2Schemas.jsx', 'w', encoding='utf-8') as out:
    out.write('"use client";\n\n')
    out.write('import { C } from "@/lib/theme";\n')
    out.write('import { useReveal, Lab, Cap } from "./Shared";\n\n')
    for name, content in r2_funcs:
        out.write(f'export {content}\n\n')

print('Wrote Report2Schemas.jsx')

# Also extract image variable names from both reports
print('\n--- Report 1 image variables ---')
for ln, line in enumerate(r1_lines):
    if 'const IMG' in line or 'let IMG' in line:
        print(f'L{ln+1}: {line[:100]}')

print('\n--- Report 2 image variables ---')
for ln, line in enumerate(r2_lines):
    if 'const IMG' in line or 'let IMG' in line:
        print(f'L{ln+1}: {line[:100]}')
