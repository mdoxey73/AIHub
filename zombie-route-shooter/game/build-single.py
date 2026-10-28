#!/usr/bin/env python3
"""Bundle the game into one self-contained HTML file (dist/zombie-route-shooter.html).
Inlines the stylesheet and every script in load order; drops the manifest and
service worker, which cannot work from a local file. No dependencies."""
import os, re
here = os.path.dirname(os.path.abspath(__file__))
html = open(os.path.join(here, 'index.html'), encoding='utf-8').read()
css = open(os.path.join(here, 'css', 'style.css'), encoding='utf-8').read()
html = html.replace('<link rel="stylesheet" href="css/style.css">', '<style>\n' + css + '</style>')
html = re.sub(r'<link rel="manifest"[^>]*>\n?', '', html)
html = re.sub(r'<link rel="apple-touch-icon"[^>]*>\n?', '', html)
html = re.sub(r'<link rel="icon"[^>]*>\n?', '', html)
def inline(m):
    src = m.group(1)
    js = open(os.path.join(here, src), encoding='utf-8').read()
    return '<script>\n/* ---- ' + src + ' ---- */\n' + js + '</script>'
html = re.sub(r'<script src="([^"]+)"></script>', inline, html)
html = re.sub(r'<script>\n// Offline support.*?</script>\n', '', html, flags=re.S)
out_dir = os.path.join(here, 'dist'); os.makedirs(out_dir, exist_ok=True)
out = os.path.join(out_dir, 'zombie-route-shooter.html')
open(out, 'w', encoding='utf-8').write(html)
print('wrote', out, len(html) // 1024, 'KB')
