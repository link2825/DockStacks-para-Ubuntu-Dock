import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {chooseIconFolder, chooseImageFolder, restoreDefaultIcons} from './icon-paths.js';
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
                row.title = value ? title : `${title} · predeterminado`;
                preview.set_from_gicon(value.startsWith('/')
                    ? Gio.FileIcon.new(Gio.File.new_for_path(value))
                    : value ? Gio.ThemedIcon.new(value)
                        : Gio.FileIcon.new(this.dir.get_child('assets').get_child(`${key}.png`)));
            };
            const signal = settings.connect(`changed::${key}`, update);
            window.connect('close-request', () => { settings.disconnect(signal); return false; });
            row.connect('apply', () => {
                const value = row.text.trim();
                if (!value) { settings.reset(key); return; }
                if ((value.startsWith('/') && !GLib.file_test(value, GLib.FileTest.IS_REGULAR))) {
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
                // Start in the active icon theme, rather than the home directory.
                const theme = Gtk.IconTheme.get_for_display(window.get_display());
                const roots = [...new Set([
                    GLib.build_filenamev([GLib.get_user_data_dir(), 'icons']),
                    GLib.build_filenamev([GLib.get_home_dir(), '.icons']),
                    ...theme.get_search_path(),
                    ...GLib.get_system_data_dirs().map(path => GLib.build_filenamev([path, 'icons'])),
                    '/usr/share/icons',
                ])];
                const themeFolder = chooseIconFolder(theme.get_theme_name(), roots,
                    path => GLib.file_test(path, GLib.FileTest.IS_DIR));
                const initial = themeFolder ? chooseImageFolder(themeFolder,
                    key === 'icon-stack' ? 'apps' : 'places', path => {
                        let enumerator;
                        try {
                            enumerator = Gio.File.new_for_path(path).enumerate_children(
                                'standard::name,standard::type', Gio.FileQueryInfoFlags.NONE, null);
                            const entries = [];
                            let info;
                            while ((info = enumerator.next_file(null))) {
                                const name = info.get_name();
                                const directory = info.get_file_type() === Gio.FileType.DIRECTORY;
                                entries.push({name, directory, image: !directory && /\.(png|svg)$/i.test(name)});
                            }
                            return entries;
                        } catch (_) { return null; }
                        finally { if (enumerator) enumerator.close(null); }
                    }) : null;
                if (initial) {
                    try {
                        dialog.set_current_folder(Gio.File.new_for_path(initial));
                    } catch (error) {
                        window.add_toast(new Adw.Toast({title: `No se pudo abrir la carpeta de iconos: ${error.message}`}));
                    }
                }
                // Keep the system and user collections within easy reach.
                for (const path of [...new Set([themeFolder, ...roots].filter(Boolean))]) {
                    if (!GLib.file_test(path, GLib.FileTest.IS_DIR)) continue;
                    try { dialog.add_shortcut_folder(Gio.File.new_for_path(path)); }
                    catch (_) { /* The portal may already provide this shortcut. */ }
                }
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
        const restoreGroup = new Adw.PreferencesGroup({description: 'Recupera los cuatro diseños originales de DockStacks. Tus imágenes personalizadas no se borran.'});
        const restoreAll = new Gtk.Button({label: 'Restaurar iconos por defecto',
            halign: Gtk.Align.FILL, margin_top: 4, margin_bottom: 4});
        restoreAll.connect('clicked', () => {
            restoreDefaultIcons(settings);
            window.add_toast(new Adw.Toast({title: 'Se restauraron los cuatro iconos de DockStacks.'}));
        });
        restoreGroup.add(restoreAll);
        page.add(restoreGroup);
        const info = new Adw.PreferencesGroup({title: 'Ubuntu Dock',
            description: 'Posición y tamaño automáticos. Al desactivar DockStacks se restaura el ajuste previo de aplicaciones abiertas del dock.'});
        page.add(info);
        window.add(page);
    }
}
