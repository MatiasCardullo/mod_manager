export function cycleFilterValue(value, selection) {
    if (selection instanceof Set) {
        const next = new Set(selection);
        if (next.has(value)) next.delete(value);
        else next.add(value);
        return next;
    }

    const next = {
        include: new Set(selection?.include || []),
        exclude: new Set(selection?.exclude || []),
    };
    if (next.include.has(value)) {
        next.include.delete(value);
        next.exclude.add(value);
    } else if (next.exclude.has(value)) {
        next.exclude.delete(value);
    } else {
        next.include.add(value);
    }
    return next;
}

export function filterState(value, item) {
    if (value instanceof Set) return value.has(item) ? "include" : "";
    if (value?.include?.has(item)) return "include";
    if (value?.exclude?.has(item)) return "exclude";
    return "";
}

export function parseFactorioVersionFromLog(text) {
    const lines = String(text || "").split(/\r\n|\r|\n/);
    for (const line of lines) {
        const index = line.toLowerCase().indexOf("factorio");
        if (index < 0) continue;
        const match = line.slice(index + "factorio".length).match(/(\d+\.\d+(?:\.\d+)*)/);
        if (match) return match[1].split(".").slice(0, 2).join(".");
    }
    return "";
}

export function parseFactorioRuntimeVersionFromLog(text) {
    const lines = String(text || "").split(/\r\n|\r|\n/);
    for (const line of lines) {
        const index = line.toLowerCase().indexOf("factorio");
        if (index < 0) continue;
        const match = line.slice(index + "factorio".length).match(/(\d+\.\d+(?:\.\d+)*)/);
        if (match) return match[1];
    }
    return "";
}

const DEPENDENCY_RE = /(?:Dependency|requires)\s+"([^"]+)"|(?:Falta la dependencia requerida)\s+(.+?)(?:\s*\(.*\))?$|(?:Dependencia)\s+(.+?)(?:\s+no est[aá]\s+satisfecha)?(?:\s*\(.*\))?$/i;
const ACTIVE_COMPONENT_RE = /(?:activa:\s*|active:\s*)([A-Za-z0-9_.-]+)\s+([A-Za-z0-9_.+-]+)/i;

export function parseFactorioLog(text) {
    const result = {
        factorioVersion: parseFactorioVersionFromLog(text),
        factorioRuntimeVersion: parseFactorioRuntimeVersionFromLog(text),
        componentVersions: {},
        dependencies: [],
        replacementMods: [],
    };
    const seenDependencies = new Set();
    const seenReplacements = new Set();
    let currentMod = "";

    for (const rawLine of String(text || "").split(/\r\n|\r|\n/)) {
        const line = rawLine.trim();
        if (!line) continue;
        if (line.startsWith("•")) {
            const content = line.slice(1).trim();
            const lower = content.toLowerCase();
            const issue = /^(dependency|dependencia|requires|falta la dependencia requerida|incompatible|versión incompatible|version incompatible)/i.test(content);
            if (!issue) {
                currentMod = content;
                continue;
            }
            const active = content.match(ACTIVE_COMPONENT_RE);
            if (active && /^(base|core|space-age)$/i.test(active[1])) {
                result.componentVersions[active[1].toLowerCase()] = active[2];
            }
            if (/incompatible/i.test(lower) && currentMod && !seenReplacements.has(currentMod)) {
                seenReplacements.add(currentMod);
                result.replacementMods.push(currentMod);
            }
        }

        if (!/depend|requir|falta|satisfecha|satisfied/i.test(line)) continue;
        const quoted = [...line.matchAll(/(?:Dependency|dependency|requires)\s+"([^"]+)"/g)].map((m) => m[1]);
        const inline = line.match(DEPENDENCY_RE);
        const values = quoted.concat(inline ? inline.slice(1).filter(Boolean) : []);
        for (const value of values) {
            const dependency = String(value).replace(/[.:]+$/, "").trim();
            const name = dependency.split(/\s+/)[0].toLowerCase();
            if (!dependency || ["base", "core", "space-age"].includes(name) || seenDependencies.has(dependency)) continue;
            seenDependencies.add(dependency);
            result.dependencies.push(dependency);
        }
    }
    return result;
}
