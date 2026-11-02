import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source = readFileSync(new URL('../extension/icon-paths.js', import.meta.url), 'utf8').replace(/export function/g, 'function');
const choose = vm.runInNewContext(`${source}\nchooseIconFolder`);
const roots = ['/home/test/.local/share/icons', '/home/test/.icons', '/usr/share/icons'];
const dirs = paths => path => paths.includes(path);
assert.equal(choose('Yaru-blue', roots, dirs(['/usr/share/icons/Yaru-blue', '/usr/share/icons/Yaru'])), '/usr/share/icons/Yaru-blue');
assert.equal(choose('Personal', roots, dirs(['/home/test/.local/share/icons/Personal', '/usr/share/icons/Yaru'])), '/home/test/.local/share/icons/Personal');
assert.equal(choose('Missing', roots, dirs(['/usr/share/icons/Yaru'])), '/usr/share/icons/Yaru');
assert.equal(choose('Missing', roots, dirs(['/usr/share/icons'])), '/usr/share/icons');
assert.equal(choose('Missing', roots, dirs([])), null);
assert.equal(choose('Legacy', roots, dirs(['/home/test/.icons/Legacy'])), '/home/test/.icons/Legacy');
assert.equal(choose('../invalid', roots, dirs(['/usr/share/icons/Yaru'])), '/usr/share/icons/Yaru');
console.log('OK: tema activo, variante Yaru, temas personales, directorio heredado y alternativas');

const chooseImages = vm.runInNewContext(`${source}\nchooseImageFolder`);
const tree = {
 '/icons/Infinity': [{name: 'apps', directory: true}, {name: 'places', directory: true}],
 '/icons/Infinity/apps': [{name: '48', directory: true}],
 '/icons/Infinity/apps/48': [{name: 'application.png', image: true}],
 '/icons/Infinity/places': [{name: 'folder.svg', image: true}],
};
assert.equal(chooseImages('/icons/Infinity', 'apps', path => tree[path] ?? null), '/icons/Infinity/apps/48');
assert.equal(chooseImages('/icons/Infinity', 'places', path => tree[path] ?? null), '/icons/Infinity/places');
assert.equal(chooseImages('/empty', 'apps', () => null), '/empty');
console.log('OK: subcarpetas Infinity, selección apps/places y tema sin imágenes');

const restoreDefaults = vm.runInNewContext(`${source}\nrestoreDefaultIcons`);
const values = {'icon-stack': '/custom/stack.png', 'icon-downloads': 'custom-download',
    'icon-documents': 'custom-doc', 'icon-pictures': 'custom-photo', 'saved-show-running': false};
const resets = [];
restoreDefaults({reset(key) { resets.push(key); delete values[key]; }});
assert.deepEqual(resets, ['icon-stack', 'icon-downloads', 'icon-documents', 'icon-pictures']);
assert.deepEqual(values, {'saved-show-running': false});
console.log('OK: restauración global de cuatro iconos sin modificar otros ajustes');
