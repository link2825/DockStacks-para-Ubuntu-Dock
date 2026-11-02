// Unit tests for logic and lifecycle; this does not emulate GNOME's rendering.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../extension/extension.js', import.meta.url), 'utf8')
    .replace(/^import .*;\n/gm, '')
    .replace('export default class FolderIsland extends Extension', 'class FolderIsland extends Extension');
const settings = values => ({
    values: {...values},
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
        Settings: function () { return dockSettings; }},
    GLib: {UserDirectory: {DIRECTORY_DOWNLOAD: 0, DIRECTORY_DOCUMENTS: 1, DIRECTORY_PICTURES: 2}},
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
