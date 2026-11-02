#!/usr/bin/env python3
"""Reconstruye el ZIP instalable sin incluir capturas ni documentación."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parent
source = root / 'extension'
output = root / 'carpetas-isla@manuel.local.shell-extension.zip'
with ZipFile(output, 'w', ZIP_DEFLATED) as archive:
    for path in sorted(source.rglob('*')):
        if path.is_file() and path.suffix != '.pyc' and '__pycache__' not in path.parts:
            archive.write(path, path.relative_to(source))
with ZipFile(output) as archive:
    if archive.testzip() is not None:
        raise SystemExit('El ZIP no superó la comprobación de integridad')
print(output)
