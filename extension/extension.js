import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Pango from 'gi://Pango';
import St from 'gi://St';
import Shell from 'gi://Shell';
import {Extension, InjectionManager} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

const FOLDERS = [
    [GLib.UserDirectory.DIRECTORY_DOWNLOAD, 'Downloads', 'Descargas', 'folder-download-symbolic', 'ci-downloads'],
    [GLib.UserDirectory.DIRECTORY_DOCUMENTS, 'Documents', 'Documentos', 'folder-documents-symbolic', 'ci-documents'],
    [GLib.UserDirectory.DIRECTORY_PICTURES, 'Pictures', 'Imágenes', 'folder-pictures-symbolic', 'ci-pictures'],
];

function enumerate(file, cancellable) {
    return new Promise((resolve, reject) => file.enumerate_children_async(
        'standard::name,standard::display-name,standard::icon,standard::is-hidden',
        Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, GLib.PRIORITY_DEFAULT,
        cancellable, (source, result) => {
            try { resolve(source.enumerate_children_finish(result)); }
            catch (error) { reject(error); }
        }));
}
function nextBatch(enumerator, cancellable) {
    return new Promise((resolve, reject) => enumerator.next_files_async(
        64, GLib.PRIORITY_DEFAULT, cancellable, (source, result) => {
            try { resolve(source.next_files_finish(result)); }
            catch (error) { reject(error); }
        }));
}
function closeEnumerator(enumerator) {
    enumerator.close_async(GLib.PRIORITY_DEFAULT, null, (source, result) => {
        try { source.close_finish(result); } catch (_) { /* Already closed. */ }
    });
}

export default class FolderIsland extends Extension {
    enable() {
        this._alive = true;
        this._menus = [];
        this._buttons = [];
        this._settings = this.getSettings();
        this._iconsChanged = this._settings.connect('changed', (_settings, key) => {
            if (key.startsWith('icon-')) this._updateIcons();
        });
        this._enableStackMode();
        this._manager = new PopupMenu.PopupMenuManager(Main.layoutManager);
        this._overviewShow = Main.overview.connect('showing', () => {
            for (const state of this._menus) state.menu.close();
        });
        this._syncDock();
        // Reconnect when Ubuntu Dock is enabled later or rebuilds a monitor.
        this._dockTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
            this._syncDock();
            return GLib.SOURCE_CONTINUE;
        });
    }

    _defaultIcon(key) {
        return Gio.FileIcon.new(this.dir.get_child('assets').get_child(`${key}.png`));
    }

    _applyIcon(actor) {
        const value = this._settings.get_string(actor._dockStacksKey).trim();
        try {
            if (value.startsWith('/') && GLib.file_test(value, GLib.FileTest.IS_REGULAR))
                actor.gicon = Gio.FileIcon.new(Gio.File.new_for_path(value));
            else
                actor.gicon = value && !value.startsWith('/')
                    ? Gio.ThemedIcon.new(value) : this._defaultIcon(actor._dockStacksKey);
        } catch (_) {
            actor.gicon = this._defaultIcon(actor._dockStacksKey);
        }
    }

    _updateIcons() {
        for (const actor of this._buttons) this._applyIcon(actor);
    }

    _findDock() {
        const monitor = Main.layoutManager.primaryMonitor;
        if (!monitor) return null;
        const pending = [Main.uiGroup];
        while (pending.length) {
            const actor = pending.pop();
            if (actor.name === 'dashtodockBoxContainer') {
                const dash = actor.get_children().find(child => child._delegate?.iconSize)?._delegate;
                if (dash && dash._monitorIndex === Main.layoutManager.primaryIndex)
                    return {actor, dash};
            }
            pending.push(...actor.get_children());
        }
        return null;
    }

    _syncDock() {
        if (!this._alive) return;
        const found = this._findDock();
        if (!found) {
            this._removeIsland();
            return;
        }
        if (this._dockBox !== found.actor || !this._island) {
            this._removeIsland();
            this._dockBox = found.actor;
            this._dash = found.dash;
            this._createIsland();
            // Keep our controls outside the scrolling applications area.
            const host = this._dash._dashContainer;
            host.insert_child_above(this._island, this._dash._scrollView);
            this._installSpaceBudget();
        }
        const horizontal = this._dash._isHorizontal !== false;
        this._island.orientation = horizontal ? Clutter.Orientation.HORIZONTAL : Clutter.Orientation.VERTICAL;
        this._separator.set_style(horizontal
            ? 'width: 1px; height: 32px; margin: 0 8px; background-color: rgba(255,255,255,0.25);'
            : 'height: 1px; width: 32px; margin: 8px 0; background-color: rgba(255,255,255,0.25);');
        const size = Math.max(16, Math.min(96, this._dash.iconSize));
        for (const icon of this._buttons) icon.icon_size = size;
        this._syncSpaceBudget();
        this._refreshStack();
    }

    _createIsland() {
        this._island = new St.BoxLayout({style_class: 'ci-integrated', reactive: true,
            x_align: Clutter.ActorAlign.CENTER, y_align: Clutter.ActorAlign.CENTER});
        this._separator = new St.Widget({x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER});
        this._island.add_child(this._separator);
        this._island.connect('destroy', () => {
            this._removeSpaceBudget();
            this._clearMenus();
            this._island = null;
            this._dockBox = null;
            this._dash = null;
        });
        const monitor = Main.layoutManager.primaryMonitor;
        const [dockX, dockY] = this._dockBox.get_transformed_position();
        const horizontal = this._dash._isHorizontal !== false;
        const side = horizontal
            ? (dockY > monitor.y + monitor.height / 2 ? St.Side.BOTTOM : St.Side.TOP)
            : (dockX > monitor.x + monitor.width / 2 ? St.Side.RIGHT : St.Side.LEFT);
        this._createStack(side);
        for (const [kind, fallback, title, icon, color] of FOLDERS) {
            const path = GLib.get_user_special_dir(kind) ?? GLib.build_filenamev([GLib.get_home_dir(), fallback]);
            const directory = Gio.File.new_for_path(path);
            const button = new St.Button({style_class: `ci-folder ${color}`, reactive: true,
                can_focus: true, accessible_name: title, track_hover: true,
                x_align: Clutter.ActorAlign.CENTER, y_align: Clutter.ActorAlign.CENTER});
            const image = new St.Icon({icon_name: icon, icon_size: this._dash.iconSize});
            button.set_child(image);
            this._addTooltip(button, title);
            image._dockStacksKey = `icon-${fallback.toLowerCase()}`;
            image._dockStacksFallback = icon;
            this._applyIcon(image);
            this._buttons.push(image);
            this._island.add_child(button);
            const menu = new PopupMenu.PopupMenu(button, 0.5, side);
            menu.actor.add_style_class_name('ci-popup');
            Main.uiGroup.add_child(menu.actor);
            menu.actor.hide();
            // PopupMenu refuses to open an empty menu.
            menu.addMenuItem(new PopupMenu.PopupMenuItem('Cargando…', {reactive: false}));
            this._manager.addMenu(menu);
            const state = {menu, directory, title, cancellable: null};
            this._menus.push(state);
            button.connect('clicked', () => menu.toggle());
            menu.connect('open-state-changed', (_menu, open) => {
                // This is the same hook used by the dock's application menus.
                this._dash?.emit(open ? 'menu-opened' : 'menu-closed');
                if (open) this._populate(state);
                else { state.cancellable?.cancel(); state.cancellable = null; this._hideTooltip(); }
            });
        }
    }

    _enableStackMode() {
        // Save across updates/restarts so disabling the extension restores the
        // user's preference, even if the previous session ended unexpectedly.
        const schema = Gio.SettingsSchemaSource.get_default().lookup('org.gnome.shell.extensions.dash-to-dock', true);
        if (!schema?.has_key('show-running')) return;
        this._dockSettings = new Gio.Settings({settings_schema: schema});
        if (!this._settings.get_boolean('show-running-saved')) {
            this._settings.set_boolean('saved-show-running', this._dockSettings.get_boolean('show-running'));
            this._settings.set_boolean('show-running-saved', true);
        }
        this._dockSettings.set_boolean('show-running', false);
        this._showRunningSignal = this._dockSettings.connect('changed::show-running', () => {
            if (this._alive && this._dockSettings.get_boolean('show-running'))
                this._dockSettings.set_boolean('show-running', false);
        });
    }

    _restoreStackMode() {
        if (this._showRunningSignal) this._dockSettings.disconnect(this._showRunningSignal);
        this._showRunningSignal = 0;
        if (this._dockSettings && this._settings.get_boolean('show-running-saved')) {
            this._dockSettings.set_boolean('show-running', this._settings.get_boolean('saved-show-running'));
            this._settings.set_boolean('show-running-saved', false);
        }
        this._dockSettings = null;
    }

    _reservedSize() {
        if (!this._island || !this._dash) return 0;
        const size = Math.max(16, Math.min(96, this._dash.iconSize));
        for (const icon of this._buttons) icon.icon_size = size;
        const horizontal = this._dash._isHorizontal !== false;
        const [, natural] = horizontal
            ? this._island.get_preferred_width(-1) : this._island.get_preferred_height(-1);
        return Math.ceil(natural) + 8;
    }

    _installSpaceBudget() {
        const owner = this;
        this._spaceInjections = new InjectionManager();
        this._spaceInjections.overrideMethod(this._dash, '_adjustIconSize', original => function (...args) {
            const key = this._isHorizontal ? '_maxWidth' : '_maxHeight';
            const maximum = this[key];
            if (maximum > 0) this[key] = Math.max(1, maximum - owner._reservedSize());
            try { return original.apply(this, args); }
            finally { this[key] = maximum; }
        });
        this._scrollStyle = this._dash._scrollView.get_style();
        this._lastBudget = null;
    }

    _syncSpaceBudget() {
        if (!this._dash || !this._island) return;
        const horizontal = this._dash._isHorizontal !== false;
        const maximum = horizontal ? this._dash._maxWidth : this._dash._maxHeight;
        const reserve = this._reservedSize();
        const scale = St.ThemeContext.get_for_stage(global.stage).scale_factor;
        // The normal Show Applications button also needs its own space.
        const showApps = (this._dash.iconSize + 24) * scale;
        const available = maximum > 0 ? Math.max(1, maximum - reserve - showApps - 32 * scale) : -1;
        const signature = `${horizontal}:${maximum}:${reserve}:${available}`;
        if (signature === this._lastBudget) return;
        this._lastBudget = signature;
        if (available > 0) this._dash._scrollView.set_style(
            `${this._scrollStyle ?? ''}; max-${horizontal ? 'width' : 'height'}: ${Math.floor(available / scale)}px;`);
        this._dash._queueRedisplay();
    }

    _removeSpaceBudget() {
        this._spaceInjections?.clear();
        this._spaceInjections = null;
        if (this._dash) {
            this._dash._scrollView.set_style(this._scrollStyle ?? null);
            this._dash._queueRedisplay();
        }
        this._lastBudget = null;
    }

    _isDockStacks(app) {
        return String(app.get_id?.() ?? app.get_name()).toLowerCase().includes('com.github.link2825.dockstacks');
    }

    _appName(app) {
        return this._isDockStacks(app) ? 'DockStacks' : app.get_name();
    }

    _appIcon(app, size) {
        return this._isDockStacks(app)
            ? new St.Icon({gicon: Gio.FileIcon.new(this.dir.get_child('assets').get_child('dockstacks.png')), icon_size: size})
            : app.create_icon_texture(size);
    }

    _hideTooltip() {
        this._tooltip?.hide();
    }

    _addTooltip(button, text) {
        button.track_hover = true;
        button.connect('notify::hover', () => {
            if (!button.hover) { this._hideTooltip(); return; }
            if (!this._tooltip) {
                this._tooltip = new St.Label({style_class: 'ci-tooltip', reactive: false});
                this._tooltip.clutter_text.line_wrap = true;
                Main.uiGroup.add_child(this._tooltip);
            }
            this._tooltip.text = text;
            this._tooltip.show();
            const [x, y] = button.get_transformed_position();
            const [width, height] = button.get_transformed_size();
            const monitor = Main.layoutManager.primaryMonitor;
            const [tipWidth, tipHeight] = this._tooltip.get_transformed_size();
            const tipX = Math.max(monitor.x + 8, Math.min(x + (width - tipWidth) / 2,
                monitor.x + monitor.width - tipWidth - 8));
            const tipY = y - tipHeight - 8 >= monitor.y ? y - tipHeight - 8 : y + height + 8;
            this._tooltip.set_position(tipX, Math.min(tipY, monitor.y + monitor.height - tipHeight - 8));
        });
        button.connect('destroy', () => this._hideTooltip());
    }

    _closeApplication(app) {
        this._hideTooltip();
        this._appContext?.close();
        const timestamp = global.get_current_time();
        for (const window of app.get_windows()) {
            if (!window.skip_taskbar && window.can_close()) window.delete(timestamp);
        }
    }

    _destroyAppContext() {
        const menu = this._appContext;
        const manager = this._contextManager;
        this._appContext = null;
        this._contextManager = null;
        if (menu) {
            menu.close(false);
            manager?.removeMenu(menu);
            menu.destroy();
        }
    }

    _showAppContext(app, button) {
        this._hideTooltip();
        this._destroyAppContext();
        // A separate manager owns a nested modal grab. Registering this menu
        // with the stack's manager would close the stack when it opens.
        const menu = new PopupMenu.PopupMenu(button, 0.5, St.Side.BOTTOM);
        menu.actor.add_style_class_name('ci-popup');
        Main.uiGroup.add_child(menu.actor);
        menu.actor.hide();
        this._appContext = menu;
        this._contextManager = new PopupMenu.PopupMenuManager(button);
        this._contextManager.addMenu(menu);
        menu.addMenuItem(new PopupMenu.PopupMenuItem(this._appName(app), {reactive: false}));
        const close = new PopupMenu.PopupMenuItem('Cerrar aplicación');
        close.setSensitive(app.get_windows().some(window => !window.skip_taskbar && window.can_close()));
        close.connect('activate', () => this._closeApplication(app));
        menu.addMenuItem(close);
        menu.connect('open-state-changed', (_menu, open) => {
            if (!open) this._stackSignature = null;
        });
        menu.open();
    }

    _runningEntries() {
        return Shell.AppSystem.get_default().get_running()
            .map(app => ({app, windows: app.get_windows().filter(window => !window.skip_taskbar)}))
            .filter(entry => entry.windows.length > 0)
            .sort((a, b) => this._appName(a.app).localeCompare(this._appName(b.app), 'es', {numeric: true}));
    }

    _createStack(side) {
        const button = new St.Button({style_class: 'ci-folder ci-running', reactive: true,
            can_focus: true, accessible_name: 'Aplicaciones abiertas', track_hover: true});
        const content = new St.Widget({layout_manager: new Clutter.BinLayout()});
        const icon = new St.Icon({icon_name: 'view-grid-symbolic', icon_size: this._dash.iconSize});
        icon._dockStacksKey = 'icon-stack';
        icon._dockStacksFallback = 'view-grid-symbolic';
        this._applyIcon(icon);
        this._buttons.push(icon);
        content.add_child(icon);
        this._runningBadge = new St.Label({text: '0', style_class: 'ci-running-count',
            x_align: Clutter.ActorAlign.END, y_align: Clutter.ActorAlign.END});
        content.add_child(this._runningBadge);
        button.set_child(content);
        this._addTooltip(button, 'Aplicaciones abiertas');
        this._island.add_child(button);
        const menu = new PopupMenu.PopupMenu(button, 0.5, side);
        menu.actor.add_style_class_name('ci-popup');
        Main.uiGroup.add_child(menu.actor);
        menu.actor.hide();
        menu.addMenuItem(new PopupMenu.PopupMenuItem('Aplicaciones abiertas', {reactive: false}));
        this._manager.addMenu(menu);
        const state = {menu, title: 'Aplicaciones abiertas', cancellable: null};
        this._stackState = state;
        this._menus.push(state);
        button.connect('clicked', () => menu.toggle());
        menu.connect('open-state-changed', (_menu, open) => {
            this._dash?.emit(open ? 'menu-opened' : 'menu-closed');
            if (open) this._populateStack(this._runningEntries());
            else { this._destroyAppContext(); this._stackSignature = null; this._hideTooltip(); }
        });
    }

    _refreshStack() {
        if (!this._stackState) return;
        const entries = this._runningEntries();
        const count = String(entries.length);
        if (this._runningBadge.text !== count) this._runningBadge.text = count;
        const signature = JSON.stringify(entries.map(({app, windows}) => [app.get_id(),
            windows.map(window => [window.get_id(), window.get_title()])]));
        if (this._stackState.menu.isOpen && signature !== this._stackSignature && !this._stackWindows && !this._appContext?.isOpen)
            this._populateStack(entries);
        this._stackSignature = signature;
    }

    _stackGrid(menu) {
        const item = new PopupMenu.PopupBaseMenuItem({reactive: false, can_focus: false});
        const layout = new Clutter.GridLayout({orientation: Clutter.Orientation.HORIZONTAL});
        const grid = new St.Widget({layout_manager: layout, style_class: 'ci-grid'});
        const scale = St.ThemeContext.get_for_stage(global.stage).scale_factor;
        const monitor = Main.layoutManager.primaryMonitor;
        const maxHeight = Math.max(100, Math.min(420, Math.floor((monitor.height - 200) / scale)));
        const scroll = new St.ScrollView({hscrollbar_policy: St.PolicyType.NEVER,
            vscrollbar_policy: St.PolicyType.AUTOMATIC, overlay_scrollbars: false,
            style: `max-height: ${maxHeight}px;`, x_expand: true});
        const content = new St.BoxLayout({orientation: Clutter.Orientation.VERTICAL});
        content.add_child(grid);
        scroll.set_child(content);
        item.add_child(scroll);
        menu.addMenuItem(item);
        return layout;
    }

    _activateWindow(window) {
        for (const state of this._menus) state.menu.close();
        Main.activateWindow(window);
    }

    _populateStack(entries) {
        this._destroyAppContext();
        const {menu} = this._stackState;
        this._stackWindows = false;
        menu.removeAll();
        menu.addMenuItem(new PopupMenu.PopupMenuItem('Aplicaciones abiertas', {reactive: false}));
        if (!entries.length) {
            menu.addMenuItem(new PopupMenu.PopupMenuItem('No hay ventanas abiertas.', {reactive: false}));
            return;
        }
        const layout = this._stackGrid(menu);
        entries.forEach(({app, windows}, index) => {
            const button = new St.Button({style_class: 'ci-tile', reactive: true, can_focus: true, button_mask: St.ButtonMask.ONE | St.ButtonMask.THREE,
                accessible_name: `${this._appName(app)}, ${windows.length} ventanas`});
            const content = new St.BoxLayout({orientation: Clutter.Orientation.VERTICAL,
                style_class: 'ci-tile-box'});
            content.add_child(this._appIcon(app, 38));
            const label = new St.Label({text: this._appName(app), style_class: 'ci-file-label'});
            label.clutter_text.ellipsize = Pango.EllipsizeMode.END;
            content.add_child(label);
            content.add_child(new St.Label({text: `${windows.length} ${windows.length === 1 ? 'ventana' : 'ventanas'}`,
                style_class: 'ci-window-count', x_align: Clutter.ActorAlign.CENTER}));
            button.set_child(content);
            this._addTooltip(button, this._appName(app));
            button.connect('clicked', (_button, mouseButton) => {
                if (mouseButton === Clutter.BUTTON_SECONDARY) { this._showAppContext(app, button); return; }
                this._hideTooltip();
                const current = app.get_windows().filter(window => !window.skip_taskbar);
                if (current.length === 1) this._activateWindow(current[0]);
                else if (current.length > 1) this._populateWindows(app, current);
                else this._populateStack(this._runningEntries());
            });
            layout.attach(button, index % 4, Math.floor(index / 4), 1, 1);
        });
    }

    _populateWindows(app, windows) {
        this._destroyAppContext();
        const {menu} = this._stackState;
        this._stackWindows = true;
        menu.removeAll();
        const heading = new PopupMenu.PopupBaseMenuItem({reactive: false, can_focus: false});
        const backButton = new St.Button({label: '‹ Todas las aplicaciones', reactive: true,
            can_focus: true, style_class: 'ci-open'});
        backButton.connect('clicked', () => this._populateStack(this._runningEntries()));
        heading.add_child(backButton);
        menu.addMenuItem(heading);
        menu.addMenuItem(new PopupMenu.PopupMenuItem(this._appName(app), {reactive: false}));
        const layout = this._stackGrid(menu);
        windows.forEach((window, index) => {
            const button = new St.Button({style_class: 'ci-tile', reactive: true, can_focus: true,
                accessible_name: window.get_title() ?? this._appName(app)});
            const content = new St.BoxLayout({orientation: Clutter.Orientation.VERTICAL,
                style_class: 'ci-tile-box'});
            content.add_child(this._appIcon(app, 38));
            const label = new St.Label({text: window.get_title() ?? this._appName(app), style_class: 'ci-file-label'});
            label.clutter_text.ellipsize = Pango.EllipsizeMode.END;
            content.add_child(label);
            button.set_child(content);
            button.connect('clicked', () => {
                const current = app.get_windows();
                if (current.includes(window)) this._activateWindow(window);
                else this._populateWindows(app, current.filter(w => !w.skip_taskbar));
            });
            layout.attach(button, index % 4, Math.floor(index / 4), 1, 1);
        });
    }

    _clearMenus() {
        this._destroyAppContext();
        this._tooltip?.destroy();
        this._tooltip = null;
        for (const state of this._menus ?? []) {
            state.cancellable?.cancel();
            state.menu.close(false);
            this._manager?.removeMenu(state.menu);
            state.menu.destroy();
        }
        this._menus = [];
        this._buttons = [];
        this._stackState = null;
        this._stackWindows = false;
        this._runningBadge = null;
        this._stackSignature = null;
    }

    _removeIsland() {
        this._removeSpaceBudget();
        this._clearMenus();
        const island = this._island;
        this._island = null;
        if (island) {
            island.get_parent()?.remove_child(island);
            island.destroy();
        }
        this._dockBox = null;
        this._dash = null;
    }

    _open(file) {
        for (const state of this._menus) state.menu.close();
        Gio.AppInfo.launch_default_for_uri_async(file.get_uri(),
            global.create_app_launch_context(0, -1), null, (_source, result) => {
                try { Gio.AppInfo.launch_default_for_uri_finish(result); }
                catch (error) {
                    if (this._alive) Main.notify('DockStacks', `No se pudo abrir: ${error.message}`);
                }
            });
    }

    async _populate(state) {
        state.cancellable?.cancel();
        const cancellable = new Gio.Cancellable();
        state.cancellable = cancellable;
        const {menu, directory, title} = state;
        menu.removeAll();
        const heading = new PopupMenu.PopupBaseMenuItem({reactive: false, can_focus: false});
        const header = new St.BoxLayout({style_class: 'ci-header', x_expand: true});
        const labels = new St.BoxLayout({vertical: true, x_expand: true});
        labels.add_child(new St.Label({text: title, style_class: 'ci-title'}));
        labels.add_child(new St.Label({text: 'Vista previa · orden por nombre', style_class: 'ci-subtitle'}));
        header.add_child(labels);
        const open = new St.Button({label: 'Abrir carpeta', style_class: 'ci-open', can_focus: true});
        open.connect('clicked', () => this._open(directory));
        header.add_child(open);
        heading.add_child(header);
        menu.addMenuItem(heading);
        let message = new PopupMenu.PopupMenuItem('Cargando…', {reactive: false});
        menu.addMenuItem(message);
        let enumerator;
        try {
            enumerator = await enumerate(directory, cancellable);
            const files = [];
            while (true) {
                const batch = await nextBatch(enumerator, cancellable);
                if (!batch.length) break;
                for (const info of batch) if (!info.get_is_hidden()) files.push(info);
            }
            if (!this._alive || cancellable.is_cancelled() || !menu.isOpen) return;
            message.destroy();
            message = null;
            files.sort((a, b) => a.get_display_name().localeCompare(b.get_display_name(), 'es', {numeric: true}));
            if (!files.length) {
                menu.addMenuItem(new PopupMenu.PopupMenuItem('No hay elementos visibles.', {reactive: false, style_class: 'ci-empty'}));
            } else {
                const item = new PopupMenu.PopupBaseMenuItem({reactive: false, can_focus: false});
                const layout = new Clutter.GridLayout({orientation: Clutter.Orientation.HORIZONTAL});
                const grid = new St.Widget({layout_manager: layout, style_class: 'ci-grid'});
                const scale = St.ThemeContext.get_for_stage(global.stage).scale_factor;
                const monitor = Main.layoutManager.primaryMonitor;
                const maxHeight = Math.max(100, Math.min(420, Math.floor((monitor.height - 200) / scale)));
                const scroll = new St.ScrollView({style_class: 'ci-scroll',
                    hscrollbar_policy: St.PolicyType.NEVER,
                    vscrollbar_policy: St.PolicyType.AUTOMATIC,
                    overlay_scrollbars: false, x_expand: true,
                    style: `max-height: ${maxHeight}px;`});
                const scrollContent = new St.BoxLayout({orientation: Clutter.Orientation.VERTICAL});
                scrollContent.add_child(grid);
                scroll.set_child(scrollContent);
                item.add_child(scroll);
                menu.addMenuItem(item);
                for (let i = 0; i < files.length; i++) {
                    if (i > 0 && i % 64 === 0) {
                        await new Promise(resolve => GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
                            resolve();
                            return GLib.SOURCE_REMOVE;
                        }));
                        if (!this._alive || cancellable.is_cancelled() || !menu.isOpen) return;
                    }
                    const info = files[i];
                    const button = new St.Button({style_class: 'ci-tile', can_focus: true,
                        accessible_name: info.get_display_name()});
                    const content = new St.BoxLayout({vertical: true, style_class: 'ci-tile-box'});
                    content.add_child(new St.Icon({gicon: info.get_icon(), icon_size: 38, x_align: Clutter.ActorAlign.CENTER}));
                    const label = new St.Label({text: info.get_display_name(), style_class: 'ci-file-label'});
                    label.clutter_text.ellipsize = Pango.EllipsizeMode.END;
                    content.add_child(label);
                    button.set_child(content);
                    button.connect('clicked', () => this._open(directory.get_child(info.get_name())));
                    layout.attach(button, i % 4, Math.floor(i / 4), 1, 1);
                }
            }
            if (files.length) menu.addMenuItem(new PopupMenu.PopupMenuItem(`${files.length} elementos · 4 columnas`,
                {reactive: false, style_class: 'ci-footer'}));
        } catch (error) {
            if (!this._alive || cancellable.is_cancelled()) return;
            const text = error.matches?.(Gio.io_error_quark(), Gio.IOErrorEnum.NOT_FOUND)
                ? 'La carpeta todavía no existe.' : `No se pudo mostrar: ${error.message}`;
            if (message) message.label.text = text;
            else menu.addMenuItem(new PopupMenu.PopupMenuItem(text, {reactive: false}));
        } finally {
            if (enumerator) closeEnumerator(enumerator);
        }
    }

    disable() {
        this._alive = false;
        if (this._dockTimer) GLib.Source.remove(this._dockTimer);
        this._dockTimer = 0;
        if (this._overviewShow) Main.overview.disconnect(this._overviewShow);
        this._overviewShow = 0;
        this._removeIsland();
        this._restoreStackMode();
        this._manager = null;
        if (this._iconsChanged) this._settings.disconnect(this._iconsChanged);
        this._iconsChanged = 0;
        this._settings = null;
    }
}
