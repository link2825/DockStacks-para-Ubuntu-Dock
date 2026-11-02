// Unit tests for logic and lifecycle; this does not emulate GNOME's rendering.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../extension/extension.js', import.meta.url), 'utf8')
    .replace(/^import .*;\n/gm, '')
    .replace('export default class FolderIsland extends Extension', 'class FolderIsland extends Extension');
const settings = values => ({
    values: {...values},
    get_string(key) { return this.values[key] ?? ""; },
    get_boolean(key) { return this.values[key]; },
    set_boolean(key, value) { this.values[key] = value; },
    connect() { return 1; },
    disconnect() {},
});
let dockSettings;
let apps = [];
let activated;
class InjectionManager {
    overrideMethod(object, key, factory) {
        this.object = object;
        this.key = key;
        this.original = object[key];
        object[key] = factory(this.original);
    }
    clear() { this.object[this.key] = this.original; }
}
const context = vm.createContext({
    Extension: class {}, InjectionManager,
    Gio: {SettingsSchemaSource: {get_default: () => ({lookup: () => ({has_key: () => true})})},
        Settings: function () { return dockSettings; },
        ThemedIcon: {new: name => ({theme: name})},
        FileIcon: {new: file => ({file})},
        File: {new_for_path: path => path}},
    GLib: {FileTest: {IS_REGULAR: 1}, file_test: path => path === '/icons/valid.svg', UserDirectory: {DIRECTORY_DOWNLOAD: 0, DIRECTORY_DOCUMENTS: 1, DIRECTORY_PICTURES: 2}},
    Shell: {AppSystem: {get_default: () => ({get_running: () => apps})}},
    Main: {activateWindow: window => { activated = window; }},
    St: {ThemeContext: {get_for_stage: () => ({scale_factor: 1})}}, global: {stage: {}},
});
const FolderIsland = vm.runInContext(`${source}\nFolderIsland`, context);
const extension = new FolderIsland();
for (const initial of [true, false]) {
    extension._alive = true;
    extension._settings = settings({'show-running-saved': false, 'saved-show-running': true});
    dockSettings = settings({'show-running': initial});
    extension._enableStackMode();
    assert.equal(dockSettings.get_boolean('show-running'), false);
    assert.equal(extension._settings.get_boolean('saved-show-running'), initial);
    extension._restoreStackMode();
    assert.equal(dockSettings.get_boolean('show-running'), initial);
    assert.equal(extension._settings.get_boolean('show-running-saved'), false);
}
// A persisted backup after an interrupted session must not be overwritten.
extension._settings = settings({'show-running-saved': true, 'saved-show-running': true});
dockSettings = settings({'show-running': false});
extension._enableStackMode();
extension._restoreStackMode();
assert.equal(dockSettings.get_boolean('show-running'), true);

const window1 = {skip_taskbar: false};
const window2 = {skip_taskbar: false};
const hidden = {skip_taskbar: true};
const app = (name, windows) => ({get_name: () => name, get_windows: () => windows});
apps = [app('Terminal', [window1, window2]), app('Oculta', [hidden]), app('Archivos', [window1])];
const entries = extension._runningEntries();
assert.equal(entries.length, 2);
assert.equal(entries[0].app.get_name(), 'Archivos');
assert.equal(entries[1].windows.length, 2);
let closed = 0;
extension._menus = [{menu: {close: () => closed++}}];
extension._activateWindow(window2);
assert.equal(activated, window2);
assert.equal(closed, 1);

let measured;
let style = 'padding: 1px';
const original = function () { measured = this._maxWidth; return 7; };
const dash = {_isHorizontal: true, _maxWidth: 1000, iconSize: 48,
    _adjustIconSize: original,
    _scrollView: {get_style: () => style, set_style: value => { style = value; }},
    _queueRedisplay() {},
};
extension._dash = dash;
extension._reservedSize = () => 250;
extension._installSpaceBudget();
assert.equal(dash._adjustIconSize(), 7);
assert.equal(measured, 750);
assert.equal(dash._maxWidth, 1000);
extension._island = {};
extension._syncSpaceBudget();
assert.match(style, /max-width: 646px/);
extension._removeSpaceBudget();
assert.equal(dash._adjustIconSize, original);
assert.equal(style, 'padding: 1px');
// The original maximum must also survive an exception in the dock code.
dash._adjustIconSize = function () { throw new Error('simulated'); };
extension._installSpaceBudget();
assert.throws(() => dash._adjustIconSize(), /simulated/);
assert.equal(dash._maxWidth, 1000);
extension._removeSpaceBudget();
console.log('OK: agrupación, activación, restauración de preferencias y reserva de espacio');

// Custom icons apply immediately; a deleted file falls back to the original.
extension._defaultIcon = key => ({file: `bundled/${key}.png`});
const icon = {_dockStacksKey: 'icon-stack', _dockStacksFallback: 'view-grid-symbolic'};
extension._buttons = [icon];
for (const [value, kind, expected] of [
    ['applications-other-symbolic', 'theme', 'applications-other-symbolic'],
    ['/icons/valid.svg', 'file', '/icons/valid.svg'],
    ['/icons/deleted.svg', 'file', 'bundled/icon-stack.png'],
    ['', 'file', 'bundled/icon-stack.png'],
]) {
    extension._settings = settings({'icon-stack': value});
    extension._updateIcons();
    assert.equal(icon.gicon[kind], expected);
}
console.log('OK: iconos del tema, archivo local y recuperación ante archivo eliminado');

assert.equal(extension._appName({get_id: () => 'com.github.link2825.DockStacks.desktop', get_name: () => 'com.github.lin…'}), 'DockStacks');
assert.equal(extension._appName({get_id: () => 'terminal.desktop', get_name: () => 'Terminal'}), 'Terminal');
let deleted = [];
context.global.get_current_time = () => 123;
extension._tooltip = null;
const closable = {skip_taskbar: false, can_close: () => true, delete: time => deleted.push(time)};
const protectedWindow = {skip_taskbar: false, can_close: () => false, delete: () => {throw Error('No debe cerrar');}};
const hiddenWindow = {skip_taskbar: true, can_close: () => true, delete: () => {throw Error('No debe cerrar');}};
extension._closeApplication({get_windows: () => [closable, protectedWindow, hiddenWindow]});
assert.deepEqual(deleted, [123]);
console.log('OK: identificación de DockStacks y solicitud de cierre normal de ventanas');

// The context menu uses its own modal manager and never replaces/closes the stack.
let parentClosed = 0;
let contextAdded = 0;
let contextRemoved = 0;
const parent = {close() { parentClosed++; }, removeAll() { throw Error('No reemplazar el stack'); }};
extension._menus = [{menu: parent}];
extension._stackState = {menu: parent};
extension._manager = {addMenu() { throw Error('No compartir gestor del stack'); }};
context.Main.uiGroup = {add_child() {}};
context.St.Side = {BOTTOM: 0};
class ContextMenu {
    constructor(button) { this.sourceActor = button; this.actor = {add_style_class_name() {}, hide() {}}; this.items = []; }
    addMenuItem(item) { this.items.push(item); }
    connect(_signal, callback) { this.changed = callback; }
    open() { this.isOpen = true; this.changed?.(this, true); }
    close() { this.isOpen = false; this.changed?.(this, false); }
    destroy() { this.destroyed = true; }
}
context.PopupMenu = {
    PopupMenu: ContextMenu,
    PopupMenuManager: class {
        addMenu() { contextAdded++; }
        removeMenu() { contextRemoved++; }
    },
    PopupMenuItem: class {
        constructor(text) { this.text = text; }
        setSensitive(value) { this.sensitive = value; }
        connect(_signal, callback) { this.activate = callback; }
    },
};
const anchor = {};
const contextualApp = {get_id: () => 'terminal.desktop', get_name: () => 'Terminal', get_windows: () => [closable]};
extension._showAppContext(contextualApp, anchor);
const child = extension._appContext;
assert.equal(child.sourceActor, anchor);
assert.equal(child.isOpen, true);
assert.equal(parentClosed, 0);
assert.equal(contextAdded, 1);
child.items[1].activate();
assert.equal(child.isOpen, false);
assert.equal(parentClosed, 0);
extension._destroyAppContext();
assert.equal(child.destroyed, true);
assert.equal(contextRemoved, 1);
assert.equal(extension._appContext, null);
console.log('OK: menú anclado al icono, stack conservado al abrir y cerrar aplicación, limpieza del contexto');
