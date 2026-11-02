#!/usr/bin/env bash
set -euo pipefail
if [[ $EUID -eq 0 ]]; then
    echo 'Ejecuta este instalador con tu usuario normal, sin sudo.' >&2
    exit 1
fi
command -v gnome-shell >/dev/null
command -v gnome-extensions >/dev/null
shell_version=$(gnome-shell --version)
if [[ ! "$shell_version" =~ [[:space:]]50\. ]]; then
    echo "Este prototipo requiere GNOME Shell 50. Detectado: $shell_version" >&2
    exit 1
fi
package_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
gnome-extensions install --force "$package_dir/carpetas-isla@manuel.local.shell-extension.zip"
echo 'Extensión actualizada. Cierra sesión y vuelve a entrar para cargar el código nuevo.'
if gnome-extensions enable carpetas-isla@manuel.local; then
    echo 'Activación solicitada. Tras volver a entrar, comprueba las carpetas dentro de Ubuntu Dock.'
else
    echo 'GNOME debe registrar la nueva extensión: cierra sesión, vuelve a entrar y ejecuta:'
    echo 'gnome-extensions enable carpetas-isla@manuel.local'
fi
echo 'Ajustes: gnome-extensions prefs carpetas-isla@manuel.local'
echo 'Desactivar: gnome-extensions disable carpetas-isla@manuel.local'
