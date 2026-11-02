import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class Preferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        window.set_default_size(720, 650);
        const page = new Adw.PreferencesPage({title: 'DockStacks', icon_name: 'folder-symbolic'});
        const group = new Adw.PreferencesGroup({title: 'Iconos del dock',
            description: 'Escribe un nombre del tema y pulsa aplicar, o elige una imagen PNG/SVG. Los cambios se aplican al momento; las imágenes se copian a DockStacks.'});
        for (const [key, title] of [['icon-stack', 'Aplicaciones abiertas'],
            ['icon-downloads', 'Descargas'], ['icon-documents', 'Documentos'], ['icon-pictures', 'Imágenes']]) {
            const row = new Adw.EntryRow({title, show_apply_button: true});
            const preview = new Gtk.Image({pixel_size: 32});
            row.add_prefix(preview);
            const update = () => {
                const value = settings.get_string(key);
                row.text = value;
                preview.set_from_gicon(value.startsWith('/')
                    ? Gio.FileIcon.new(Gio.File.new_for_path(value)) : Gio.ThemedIcon.new(value));
            };
            const signal = settings.connect(`changed::${key}`, update);
            window.connect('close-request', () => { settings.disconnect(signal); return false; });
            row.connect('apply', () => {
                const value = row.text.trim();
                if (!value || (value.startsWith('/') && !GLib.file_test(value, GLib.FileTest.IS_REGULAR))) {
                    window.add_toast(new Adw.Toast({title: 'Escribe un nombre de icono o una ruta de archivo válida.'}));
                    return;
                }
                settings.set_string(key, value);
            });
            const choose = new Gtk.Button({icon_name: 'folder-open-symbolic', valign: Gtk.Align.CENTER,
                tooltip_text: 'Elegir imagen PNG o SVG'});
            choose.connect('clicked', () => {
                const dialog = new Gtk.FileChooserNative({title: `Icono de ${title}`, transient_for: window,
                    action: Gtk.FileChooserAction.OPEN, accept_label: 'Elegir', cancel_label: 'Cancelar'});
                const filter = new Gtk.FileFilter({name: 'Imágenes PNG y SVG'});
                filter.add_mime_type('image/png');
                filter.add_mime_type('image/svg+xml');
                dialog.add_filter(filter);
                dialog.connect('response', (_dialog, response) => {
                    if (response === Gtk.ResponseType.ACCEPT) {
                        try {
                            const source = dialog.get_file();
                            const ext = source.get_basename().split('.').pop().toLowerCase();
                            if (!['png', 'svg'].includes(ext)) throw new Error('Selecciona un archivo PNG o SVG.');
                            const directory = GLib.build_filenamev([GLib.get_user_data_dir(), 'dockstacks', 'icons']);
                            GLib.mkdir_with_parents(directory, 0o700);
                            const target = Gio.File.new_for_path(GLib.build_filenamev([directory, `${key}-${GLib.uuid_string_random()}.${ext}`]));
                            source.copy(target, Gio.FileCopyFlags.NONE, null, null);
                            settings.set_string(key, target.get_path());
                        } catch (error) {
                            window.add_toast(new Adw.Toast({title: `No se pudo usar la imagen: ${error.message}`}));
                        }
                    }
                    dialog.destroy();
                });
                dialog.show();
            });
            const reset = new Gtk.Button({icon_name: 'edit-undo-symbolic', valign: Gtk.Align.CENTER,
                tooltip_text: 'Restaurar icono original'});
            reset.connect('clicked', () => settings.reset(key));
            row.add_suffix(choose);
            row.add_suffix(reset);
            update();
            group.add(row);
        }
        page.add(group);
        const info = new Adw.PreferencesGroup({title: 'Ubuntu Dock',
            description: 'Posición y tamaño automáticos. Al desactivar DockStacks se restaura el ajuste previo de aplicaciones abiertas del dock.'});
        page.add(info);
        window.add(page);
    }
}
