#!/usr/bin/env python3
"""Construye el paquete completo y sus sumas; no necesita credenciales."""
from pathlib import Path
import hashlib
import json
import re
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parent
manifest = json.loads((root / 'version.json').read_text())
version = manifest['version']
if not re.fullmatch(r'\d+\.0\.0', version):
    raise SystemExit('Esta línea usa vN.0.0 y el entero N de GNOME para mantener la comparación coherente.')
metadata = json.loads((root / 'extension/metadata.json').read_text())
if metadata['version'] != int(version.split('.')[0]) or manifest['extension_version'] != metadata['version']:
    raise SystemExit('version.json no coincide con la versión de la extensión.')
if f"APP_VERSION = '{version}'" not in (root / 'updates.py').read_text():
    raise SystemExit('La versión del actualizador no coincide con version.json.')
tag = 'v' + version
name = f'DockStacks-{tag}.zip'
if manifest['asset'] != name:
    raise SystemExit('El nombre del paquete no coincide con la versión.')
dist = root / 'dist'
dist.mkdir(exist_ok=True)
output = dist / name
with ZipFile(output, 'w', ZIP_DEFLATED) as archive:
    for path in sorted(root.rglob('*')):
        relative = path.relative_to(root)
        if (not path.is_file() or any(part in {'.git', '.github', '__pycache__', 'dist'} for part in relative.parts)
                or path.suffix == '.pyc' or path.name == 'gschemas.compiled'):
            continue
        archive.write(path, Path(f'DockStacks-{tag}') / relative)
with ZipFile(output) as archive:
    if archive.testzip():
        raise SystemExit('Paquete inválido')
digest = hashlib.sha256(output.read_bytes()).hexdigest()
(dist / 'SHA256SUMS').write_text(f'{digest}  {name}\n')
notes = root / f"RELEASE-NOTES-v{metadata['version']}.md"
(dist / 'release-notes.md').write_text(notes.read_text() if notes.exists() else f'DockStacks {tag}\n\nConsulta CHANGELOG.md.')
print(tag)
