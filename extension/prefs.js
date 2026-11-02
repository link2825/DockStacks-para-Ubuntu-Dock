import Adw from 'gi://Adw';
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
export default class Preferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const page = new Adw.PreferencesPage({title: 'DockStacks', icon_name: 'folder-symbolic'});
        const group = new Adw.PreferencesGroup({title: 'Integrado en Ubuntu Dock',
            description: 'Posición y tamaño automáticos. Incluye un stack de aplicaciones y tres carpetas con scroll. Mientras está activa, agrupa las aplicaciones abiertas en ese botón; al desactivarla restaura el ajuste anterior del dock.'});
        group.add(new Adw.ActionRow({title: 'Carpetas', subtitle: 'Aplicaciones abiertas · Descargas · Documentos · Imágenes'}));
        page.add(group);
        window.add(page);
    }
}
