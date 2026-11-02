#!/usr/bin/python3
"""Gestor visual local de DockStacks. No necesita permisos de administrador."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys

try:
    import gi
    gi.require_version('Gtk', '4.0')
    gi.require_version('Adw', '1')
    from gi.repository import Adw, Gio, GLib, Gtk
except (ImportError, ValueError) as error:
    message = ('Faltan los componentes gráficos de GNOME. Instala:\n'
               'sudo apt install python3-gi gir1.2-gtk-4.0 gir1.2-adw-1 libglib2.0-bin\n\n' + str(error))
    print(message, file=sys.stderr)
    if shutil.which('zenity'):
        subprocess.run(['zenity', '--error', '--text', message], check=False)
    sys.exit(1)

UUID = 'carpetas-isla@manuel.local'
ROOT = Path(__file__).resolve().parent
DATA = Path(GLib.get_user_data_dir())
INSTALLED = DATA / 'gnome-shell/extensions' / UUID
MANAGER = DATA / 'dockstacks/manager'


def unpack_info(reply):
    """GVariant may unpack nested variants or leave them wrapped."""
    values = reply.unpack()[0]
    return {key: value.unpack() if hasattr(value, 'unpack') else value
            for key, value in values.items()}


def extension_info():
    bus = Gio.bus_get_sync(Gio.BusType.SESSION, None)
    reply = bus.call_sync('org.gnome.Shell', '/org/gnome/Shell',
                          'org.gnome.Shell.Extensions', 'GetExtensionInfo',
                          GLib.Variant('(s)', (UUID,)), None,
                          Gio.DBusCallFlags.NONE, 2000, None)
    return unpack_info(reply)


def save_launcher():
    """Keep the manager after the downloaded project is removed."""
    MANAGER.mkdir(parents=True, exist_ok=True)
    for name in ('dockstacks.py', 'instalar.sh', 'carpetas-isla@manuel.local.shell-extension.zip'):
        source, target = ROOT / name, MANAGER / name
        if source.resolve() != target.resolve():
            shutil.copy2(source, target)
    asset = ROOT / 'extension/assets/dockstacks.png'
    if not asset.is_file():
        asset = ROOT / 'assets/dockstacks.png'
    if asset.is_file():
        bundled_icon = MANAGER / 'assets/dockstacks.png'
        bundled_icon.parent.mkdir(parents=True, exist_ok=True)
        if asset.resolve() != bundled_icon.resolve():
            shutil.copy2(asset, bundled_icon)
        icon_directory = DATA / 'icons/hicolor/256x256/apps'
        icon_directory.mkdir(parents=True, exist_ok=True)
        shutil.copy2(asset, icon_directory / 'com.github.link2825.DockStacks.png')
        # GTK searches hicolor even when a custom icon theme is active.
        if shutil.which('gtk-update-icon-cache'):
            subprocess.run(['gtk-update-icon-cache', '--force', '--ignore-theme-index',
                            str(DATA / 'icons/hicolor')], check=False,
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    applications = DATA / 'applications' 
    applications.mkdir(parents=True, exist_ok=True)
    # Desktop Entry quoting: escape backslash, quote, backtick and dollar sign.
    script = str(MANAGER / 'dockstacks.py')
    for char in ('\\', '"', '`', '$'):
        script = script.replace(char, '\\' + char)
    script = script.replace('%', '%%')
    (applications / 'com.github.link2825.DockStacks.desktop').write_text(
        '[Desktop Entry]\nType=Application\nName=DockStacks\n'
        'Comment=Administrar DockStacks e iconos de Ubuntu Dock\n'
        f'Exec=/usr/bin/python3 "{script}"\n'
        'Icon=com.github.link2825.DockStacks\nStartupWMClass=com.github.link2825.DockStacks\nTerminal=false\nCategories=Settings;Utility;\n', encoding='utf-8')

    old_launcher = applications / 'dockstacks.desktop'
    if old_launcher.is_file() and 'dockstacks/manager' in old_launcher.read_text():
        old_launcher.unlink()


class Manager(Adw.Application):
    def __init__(self):
        super().__init__(application_id='com.github.link2825.DockStacks',
                         flags=Gio.ApplicationFlags.NON_UNIQUE)
        self.busy = False
        self.connect('activate', self.activate_window)

    def activate_window(self, *_):
        if self.get_active_window():
            self.get_active_window().present()
            return
        self.window = Adw.ApplicationWindow(application=self, title='DockStacks · estable 10',
                                           default_width=620, default_height=570)
        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        box.append(Adw.HeaderBar())
        scroll = Gtk.ScrolledWindow(vexpand=True, hscrollbar_policy=Gtk.PolicyType.NEVER)
        content = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=22,
                          margin_top=20, margin_bottom=28, margin_start=28, margin_end=28)
        title = Gtk.Label(label='DockStacks', xalign=0)
        title.add_css_class('title-1')
        content.append(title)
        content.append(Gtk.Label(label='Tus carpetas y aplicaciones, a un clic del dock.',
                                 wrap=True, xalign=0))
        group = Adw.PreferencesGroup(title='Estado de la extensión')
        self.status = Adw.ActionRow(title='Consultando…')
        group.add(self.status)
        content.append(group)
        actions = Gtk.Box(spacing=10, homogeneous=True)
        self.install = Gtk.Button(label='Instalar / actualizar')
        self.install.add_css_class('suggested-action')
        self.install.connect('clicked', lambda *_: self.install_extension())
        actions.append(self.install)
        self.refresh = Gtk.Button(label='Actualizar estado')
        self.refresh.connect('clicked', lambda *_: self.refresh_status())
        actions.append(self.refresh)
        content.append(actions)
        controls = Gtk.Box(spacing=10, homogeneous=True)
        self.enable = Gtk.Button(label='Habilitar')
        self.enable.connect('clicked', lambda *_: self.run_command(['gnome-extensions', 'enable', UUID]))
        controls.append(self.enable)
        self.disable = Gtk.Button(label='Deshabilitar')
        self.disable.connect('clicked', lambda *_: self.run_command(['gnome-extensions', 'disable', UUID]))
        controls.append(self.disable)
        content.append(controls)
        self.icons = Gtk.Button(label='Personalizar iconos…')
        self.icons.connect('clicked', lambda *_: self.open_icons())
        content.append(self.icons)
        self.message = Gtk.Label(label='Después de instalar o actualizar, cierra sesión y vuelve a entrar.',
                                 wrap=True, selectable=True, xalign=0)
        content.append(self.message)
        scroll.set_child(content)
        box.append(scroll)
        self.window.set_content(box)
        self.window.present()
        self.refresh_status()

    def refresh_status(self):
        info, error = {}, None
        try:
            info = extension_info()
        except GLib.Error as exc:
            error = str(exc)
        installed = (INSTALLED / 'metadata.json').is_file()
        state = int(info.get('state', 0))
        labels = {1: 'Habilitada', 2: 'Deshabilitada', 3: 'Error al cargar',
                  4: 'Versión de GNOME incompatible', 5: 'Descargada de la sesión',
                  6: 'Inicializada; pendiente de activación', 99: 'No registrada en la sesión'}
        self.status.set_title('No se pudo consultar GNOME Shell' if error else labels.get(state, 'Instalada; pendiente de iniciar sesión' if installed else 'Sin instalar'))
        version = ''
        if installed:
            try:
                version = f"Versión instalada: {json.loads((INSTALLED / 'metadata.json').read_text()).get('version', '?')}. "
            except (OSError, ValueError):
                pass
        self.status.set_subtitle(version + ('No se pudo consultar GNOME Shell.' if error else 'GNOME Shell · Ubuntu Dock'))
        self.enable.set_sensitive(installed and state != 1 and not self.busy)
        self.disable.set_sensitive(installed and state != 2 and not self.busy)
        self.icons.set_sensitive(installed and not self.busy)
        self.install.set_sensitive(not self.busy)
        self.refresh.set_sensitive(not self.busy)
        if error:
            self.message.set_text('Error al consultar GNOME Shell: ' + error)
        if state == 3:
            self.message.set_text('GNOME informa un error: ' + str(info.get('error', 'Consulta la aplicación Extensiones.')))

    def install_extension(self):
        if os.geteuid() == 0:
            self.message.set_text('Abre DockStacks con tu usuario normal, sin sudo.')
            return
        self.run_command(['bash', str(ROOT / 'instalar.sh')], installing=True)

    def run_command(self, args, installing=False):
        try:
            process = Gio.Subprocess.new(args, Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE)
        except GLib.Error as error:
            self.message.set_text(str(error))
            return
        self.busy = True
        self.refresh_status()
        self.message.set_text('Instalando…' if installing else 'Aplicando cambio…')
        process.communicate_utf8_async(None, None, self.command_finished, installing)

    def command_finished(self, process, result, installing):
        try:
            _, output, errors = process.communicate_utf8_finish(result)
            if process.get_successful():
                if installing:
                    try:
                        save_launcher()
                        self.message.set_text('Instalación completada. Encontrarás DockStacks en el menú de aplicaciones. '
                                              'Cierra sesión y vuelve a entrar para cargar la nueva versión; después podrás personalizar los iconos.')
                    except OSError as error:
                        self.message.set_text(f'Extensión instalada, pero no se creó el acceso al gestor: {error}')
                else:
                    self.message.set_text('Cambio solicitado. Revisa el estado que informa GNOME.')
            else:
                self.message.set_text((errors or output or 'No se pudo completar la operación.').strip())
        except GLib.Error as error:
            self.message.set_text(str(error))
        self.busy = False
        self.refresh_status()

    def open_icons(self):
        # The preferences process owns the native file chooser and previews.
        try:
            Gio.Subprocess.new(['gnome-extensions', 'prefs', UUID], Gio.SubprocessFlags.NONE)
            self.message.set_text('En Iconos del dock puedes elegir PNG/SVG, escribir un nombre del tema o restaurar cada icono.')
        except GLib.Error as error:
            self.message.set_text(str(error))


if __name__ == '__main__':
    GLib.set_application_name('DockStacks')
    GLib.set_prgname('com.github.link2825.DockStacks')
    Gtk.Window.set_default_icon_name('com.github.link2825.DockStacks')
    print('DockStacks: iniciando gestor de estable 10', flush=True)
    sys.exit(Manager().run(sys.argv))
