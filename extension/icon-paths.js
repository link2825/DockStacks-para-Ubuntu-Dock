// Pure path selection; the caller supplies the current theme and directory checks.
export function chooseIconFolder(theme, roots, isDirectory) {
    const uniqueRoots = [...new Set(roots.filter(Boolean).map(root => root.replace(/\/+$/, '')))];
    const themes = [...new Set([theme, 'Yaru'].filter(name => name && !/[\/\\]/.test(name)))];
    for (const name of themes) {
        for (const root of uniqueRoots) {
            const path = `${root}/${name}`;
            if (isDirectory(path)) return path;
        }
    }
    if (isDirectory('/usr/share/icons')) return '/usr/share/icons';
    return uniqueRoots.find(isDirectory) ?? null;
}

// Search category/size subfolders until a directory containing PNG/SVG is found.
export function chooseImageFolder(root, category, listChildren) {
    const queue = [`${root}/${category}`, `${root}/scalable/${category}`,
        `${root}/symbolic/${category}`, `${root}/48x48/${category}`, root];
    const visited = new Set();
    while (queue.length && visited.size < 100) {
        const path = queue.shift();
        if (visited.has(path)) continue;
        visited.add(path);
        const entries = listChildren(path);
        if (!entries) continue;
        if (entries.some(entry => entry.image)) return path;
        for (const entry of entries) {
            if (entry.directory && path.split('/').length - root.split('/').length < 4)
                queue.push(`${path}/${entry.name}`);
        }
    }
    return root;
}

// Only icon overrides are cleared; all monitoring/dock preferences are preserved.
export function restoreDefaultIcons(settings) {
    for (const key of ['icon-stack', 'icon-downloads', 'icon-documents', 'icon-pictures'])
        settings.reset(key);
}
