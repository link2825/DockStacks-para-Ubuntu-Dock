#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
bash instalar.sh
/usr/bin/python3 - <<'PY'
import importlib.util
from pathlib import Path
path=Path('dockstacks.py').resolve()
spec=importlib.util.spec_from_file_location('dockstacks_manager',path)
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
module.save_launcher()
print('DockStacks 10 estable instalado; acceso creado en el menú de aplicaciones.')
print('Cierra sesión completamente y vuelve a entrar para cargar la extensión 10.')
PY
