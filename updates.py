#!/usr/bin/python3
"""Actualizaciones optativas de Releases estables del repositorio oficial."""
import argparse
import contextlib
import fcntl
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import stat
import subprocess
import sys
import tempfile
import time
from urllib.error import HTTPError
from urllib.parse import urlparse
from urllib.request import Request, urlopen
import zipfile

REPO = 'link2825/DockStacks-para-Ubuntu-Dock'
UUID = 'carpetas-isla@manuel.local'
APP_VERSION = '11.0.0'
ROOT = Path(__file__).resolve().parent
DATA = Path(os.environ.get('XDG_DATA_HOME', str(Path.home() / '.local/share')))
CONFIG = Path(os.environ.get('XDG_CONFIG_HOME', str(Path.home() / '.config')))
STATE = Path(os.environ.get('XDG_STATE_HOME', str(Path.home() / '.local/state'))) / 'dockstacks'
MANAGER = DATA / 'dockstacks/manager'
EXTENSION = DATA / 'gnome-shell/extensions' / UUID
MAX_ZIP = 40 * 1024 * 1024
MAX_EXPANDED = 150 * 1024 * 1024
HEADERS = {'User-Agent': 'DockStacks/' + APP_VERSION, 'Accept': 'application/vnd.github+json'}


class UpdateError(Exception):
    pass


def version_tuple(value):
    match = re.fullmatch(r'v?(\d+)\.(\d+)\.(\d+)', str(value))
    if not match:
        raise UpdateError('La versión no tiene el formato estable vN.N.N.')
    return tuple(map(int, match.groups()))


def load_json(path, default=None):
    try:
        return json.loads(Path(path).read_text(encoding='utf-8'))
    except (OSError, ValueError):
        return {} if default is None else default


def save_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile('w', encoding='utf-8', dir=path.parent, delete=False) as stream:
        json.dump(value, stream, ensure_ascii=False)
        temporary = Path(stream.name)
    os.chmod(temporary, 0o600)
    os.replace(temporary, path)


def preferences():
    return load_json(CONFIG / 'dockstacks/updates.json', {'daily': False})


def installed_version():
    # The manager and extension are updated together; either older component
    # must allow a repair/update instead of claiming the install is current.
    manager = version_tuple(APP_VERSION)
    extension = load_json(EXTENSION / 'metadata.json').get('version', 0)
    return min(manager, (int(extension), 0, 0))


def official_url(url, download=False):
    parsed = urlparse(str(url))
    hosts = {'api.github.com', 'github.com'}
    if download:
        hosts |= {'release-assets.githubusercontent.com', 'objects.githubusercontent.com'}
    if parsed.scheme != 'https' or parsed.hostname not in hosts or parsed.username or parsed.password:
        raise UpdateError('La descarga no pertenece a un servidor HTTPS de GitHub permitido.')
    return url


def request_bytes(url, limit, download=False):
    request = Request(official_url(url, download), headers=HEADERS)
    with urlopen(request, timeout=25) as response:
        official_url(response.url, download)
        content = response.read(limit + 1)
    if len(content) > limit:
        raise UpdateError('La respuesta supera el tamaño permitido.')
    return content


def parse_release(data, current):
    if not isinstance(data, dict) or data.get('draft') or data.get('prerelease'):
        raise UpdateError('La publicación recibida no es una versión estable.')
    tag = data.get('tag_name', '')
    version = version_tuple(tag)
    page = f'https://github.com/{REPO}/releases/tag/{tag}'
    if data.get('html_url') != page:
        raise UpdateError('La publicación no pertenece al repositorio esperado.')
    name = f'DockStacks-{tag}.zip'
    asset = next((a for a in data.get('assets', []) if a.get('name') == name), None)
    if asset is None:
        raise UpdateError('La Release todavía no contiene el paquete instalable de DockStacks.')
    expected_url = f'https://github.com/{REPO}/releases/download/{tag}/{name}'
    if asset.get('browser_download_url') != expected_url:
        raise UpdateError('El paquete no pertenece a la Release esperada.')
    digest = asset.get('digest', '')
    if not re.fullmatch(r'sha256:[a-fA-F0-9]{64}', digest):
        raise UpdateError('GitHub todavía no informa una suma SHA-256 válida del paquete.')
    return {'tag': tag, 'version': list(version), 'available': version > tuple(current),
            'url': page, 'download_url': expected_url, 'digest': digest.lower(),
            'name': name, 'size': int(asset.get('size', 0)), 'notes': str(data.get('body') or '')[:20000]}


def check_release():
    try:
        raw = request_bytes(f'https://api.github.com/repos/{REPO}/releases/latest', 2 * 1024 * 1024)
    except HTTPError as error:
        if error.code == 404:
            return {'available': False, 'no_release': True,
                    'message': 'Aún no hay una Release estable publicada en GitHub.'}
        raise UpdateError(f'GitHub respondió con error {error.code}. Inténtalo más tarde.') from error
    try:
        result = parse_release(json.loads(raw), installed_version())
    except (ValueError, TypeError) as error:
        raise UpdateError('La respuesta de GitHub no es válida.') from error
    save_json(STATE / 'latest.json', {**result, 'checked_at': int(time.time())})
    return result


def notify_release(release):
    try:
        from gi.repository import Gio, GLib
        bus = Gio.bus_get_sync(Gio.BusType.SESSION, None)
        body = f"Está disponible DockStacks {release['tag']}. Abre DockStacks y pulsa Actualizar ahora."
        bus.call_sync('org.freedesktop.Notifications', '/org/freedesktop/Notifications',
                      'org.freedesktop.Notifications', 'Notify',
                      GLib.Variant('(susssasa{sv}i)', ('DockStacks', 0,
                          'com.github.link2825.DockStacks', 'Nueva versión de DockStacks',
                          body, [], {}, -1)), None, Gio.DBusCallFlags.NONE, 5000, None)
        return True
    except Exception as error:
        print(f'No se pudo mostrar la notificación: {error}', file=sys.stderr)
        return False


def daily_check():
    if not preferences().get('daily', False):
        return {'available': False, 'disabled': True}
    result = check_release()
    state = load_json(STATE / 'notification.json')
    if (result.get('available') and state.get('notified') != result['tag']
            and time.time() >= state.get('snooze_until', 0)):
        if notify_release(result):
            save_json(STATE / 'notification.json', {'notified': result['tag']})
    return result


def snooze():
    state = load_json(STATE / 'notification.json')
    state['snooze_until'] = time.time() + 86400
    save_json(STATE / 'notification.json', state)


def unit_quote(value):
    return '"' + str(value).replace('\\', '\\\\').replace('"', '\\"').replace('%', '%%') + '"'


def install_timer():
    directory = CONFIG / 'systemd/user'
    directory.mkdir(parents=True, exist_ok=True)
    executable = unit_quote(MANAGER / 'updates.py')
    (directory / 'dockstacks-updates.service').write_text(
        '[Unit]\nDescription=Buscar actualizaciones de DockStacks\n'
        '[Service]\nType=oneshot\n'
        f'ExecStart=/usr/bin/python3 {executable} --daily\n'
        'TimeoutStartSec=60\n', encoding='utf-8')
    (directory / 'dockstacks-updates.timer').write_text(
        '[Unit]\nDescription=Revisión diaria opcional de DockStacks\n'
        '[Timer]\nOnCalendar=daily\nOnStartupSec=5min\nRandomizedDelaySec=15min\n'
        'Persistent=true\n[Install]\nWantedBy=timers.target\n', encoding='utf-8')
    subprocess.run(['systemctl', '--user', 'daemon-reload'], check=True, capture_output=True, text=True, timeout=15)


def set_daily(enabled):
    if not shutil.which('systemctl'):
        raise UpdateError('Este sistema no dispone de systemd de usuario.')
    previous = preferences()
    if enabled:
        install_timer()
    subprocess.run(['systemctl', '--user', 'enable' if enabled else 'disable', '--now',
                    'dockstacks-updates.timer'], check=True, capture_output=True, text=True, timeout=15)
    if not enabled:
        subprocess.run(['systemctl', '--user', 'stop', 'dockstacks-updates.service'],
                       check=False, capture_output=True, text=True, timeout=15)
    save_json(CONFIG / 'dockstacks/updates.json', {**previous, 'daily': bool(enabled)})


def restore_timer():
    # Installation never turns daily checks on unless the user selected them.
    if preferences().get('daily', False):
        set_daily(True)


def extract_package(archive, destination, expected_major):
    with zipfile.ZipFile(archive) as bundle:
        members = bundle.infolist()
        if sum(m.file_size for m in members) > MAX_EXPANDED or len(members) > 2000:
            raise UpdateError('El paquete descomprimido supera el límite permitido.')
        roots = set()
        for member in members:
            path = PurePosixPath(member.filename)
            if path.is_absolute() or '..' in path.parts or '\\' in member.filename:
                raise UpdateError('El ZIP contiene una ruta no permitida.')
            mode = member.external_attr >> 16
            if stat.S_ISLNK(mode):
                raise UpdateError('El ZIP contiene un enlace simbólico no permitido.')
            if path.parts:
                roots.add(path.parts[0])
        if len(roots) != 1:
            raise UpdateError('El ZIP no contiene una carpeta única de instalación.')
        bundle.extractall(destination)
    root = Path(destination) / roots.pop()
    required = ['dockstacks.py', 'updates.py', 'instalar.sh', 'instalar-visual.sh',
                'carpetas-isla@manuel.local.shell-extension.zip', 'extension/metadata.json']
    if any(not (root / name).is_file() for name in required):
        raise UpdateError('El paquete está incompleto.')
    metadata = load_json(root / 'extension/metadata.json')
    if metadata.get('uuid') != UUID or metadata.get('version') != expected_major:
        raise UpdateError('La identidad o versión de la extensión no coincide con la Release.')
    with zipfile.ZipFile(root / 'carpetas-isla@manuel.local.shell-extension.zip') as extension:
        if json.loads(extension.read('metadata.json')) != metadata or extension.testzip():
            raise UpdateError('El ZIP de la extensión no coincide con el proyecto.')
    return root


@contextlib.contextmanager
def update_lock():
    STATE.mkdir(parents=True, exist_ok=True)
    with (STATE / 'update.lock').open('w') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as error:
            raise UpdateError('Ya hay otra actualización en curso.') from error
        yield


def install_downloaded(root, runner=subprocess.run):
    # Keep both components for rollback; do not read or overwrite dconf/icon choices.
    enabled = runner(['gnome-extensions', 'list', '--enabled'], check=True,
                     capture_output=True, text=True, timeout=15).stdout.splitlines()
    was_enabled = UUID in enabled
    backup = STATE / ('backup-' + str(time.time_ns()))
    backup.mkdir(parents=True)
    for name, target in [('manager', MANAGER), ('extension', EXTENSION)]:
        if target.is_dir():
            shutil.copytree(target, backup / name)
    try:
        runner(['bash', str(root / 'instalar-visual.sh')], check=True,
               capture_output=True, text=True, timeout=120, cwd=root)
        if not was_enabled:
            runner(['gnome-extensions', 'disable', UUID], check=True,
                   capture_output=True, text=True, timeout=15)
    except Exception:
        for name, target in [('manager', MANAGER), ('extension', EXTENSION)]:
            if (backup / name).exists():
                if target.exists():
                    shutil.rmtree(target)
                shutil.copytree(backup / name, target)
        raise UpdateError('La instalación falló; se restauraron los archivos anteriores. Cierra sesión y vuelve a entrar.')
    return str(backup)


def apply_update(expected_tag):
    if os.geteuid() == 0:
        raise UpdateError('Actualiza con tu usuario normal, sin sudo.')
    with update_lock():
        # Fetch again rather than trusting stale cached download addresses.
        release = check_release()
        if not release.get('available') or release.get('tag') != expected_tag:
            raise UpdateError('La Release cambió o ya no hay una actualización pendiente. Busca de nuevo.')
        if not 0 < release['size'] <= MAX_ZIP:
            raise UpdateError('El tamaño del paquete no es válido.')
        with tempfile.TemporaryDirectory(prefix='dockstacks-update-') as temporary:
            work = Path(temporary)
            content = request_bytes(release['download_url'], MAX_ZIP, download=True)
            if len(content) != release['size'] or 'sha256:' + hashlib.sha256(content).hexdigest() != release['digest']:
                raise UpdateError('El paquete no supera la verificación SHA-256 de GitHub.')
            archive = work / 'package.zip'
            archive.write_bytes(content)
            root = extract_package(archive, work / 'extracted', release['version'][0])
            backup = install_downloaded(root)
    return {'installed': release['tag'], 'backup': backup,
            'message': 'Actualización instalada. Cierra DockStacks, cierra sesión y vuelve a entrar.'}


def main():
    parser = argparse.ArgumentParser()
    actions = parser.add_mutually_exclusive_group(required=True)
    actions.add_argument('--check', action='store_true')
    actions.add_argument('--daily', action='store_true')
    actions.add_argument('--apply', metavar='TAG')
    actions.add_argument('--daily-setting', choices=['on', 'off'])
    actions.add_argument('--snooze', action='store_true')
    args = parser.parse_args()
    try:
        if args.check:
            result = check_release()
        elif args.daily:
            result = daily_check()
        elif args.apply:
            result = apply_update(args.apply)
        elif args.daily_setting:
            set_daily(args.daily_setting == 'on')
            result = {'daily': args.daily_setting == 'on'}
        else:
            snooze()
            result = {'postponed': True}
        print(json.dumps(result, ensure_ascii=False))
        return 0
    except Exception as error:
        print(json.dumps({'error': str(error)}, ensure_ascii=False))
        return 1


if __name__ == '__main__':
    sys.exit(main())
