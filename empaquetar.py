#!/usr/bin/env python3
"""Reconstruye el ZIP instalable sin incluir capturas ni documentación."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import shutil
import subprocess

root = Path(__file__).resolve().parent
source = root / 'extension'
output = root / 'carpetas-isla@manuel.local.shell-extension.zip'
compiler = shutil.which('glib-compile-schemas')
if not compiler:
    fallback = Path('/usr/lib/x86_64-linux-gnu/glib-2.0/glib-compile-schemas')
    compiler = str(fallback) if fallback.is_file() else None
if not compiler:
    raise SystemExit('Falta glib-compile-schemas. Instala libglib2.0-bin para reconstruir el paquete.')
subprocess.run([compiler, '--strict', str(source / 'schemas')], check=True)
with ZipFile(output, 'w', ZIP_DEFLATED) as archive:
    for path in sorted(source.rglob('*')):
        if path.is_file() and path.suffix != '.pyc' and '__pycache__' not in path.parts:
            archive.write(path, path.relative_to(source))
with ZipFile(output) as archive:
    if archive.testzip() is not None:
        raise SystemExit('El ZIP no superó la comprobación de integridad')
print(output)
