const HOST = "https://mods.factorio.com";
const INFO = "https://re146.dev";
const DOWNLOAD = "https://mods-storage.re146.dev";
const PROXY = "https://factoriomods.supermaty97.workers.dev";
const SPECIAL_DEPENDENCIES = new Set(["base", "core", "space-age"]);
const infoCache = new Map();

export const proxyUrl = PROXY;

export async function factorioFetch(url, useProxy = true, proxy = PROXY) {
    const base = String(proxy || "").trim().replace(/\/+$/, "");
    const target = useProxy && base
        ? `${base}/fetch?url=${encodeURIComponent(url)}`
        : url;
    try {
        const response = await fetch(target, { cache: "no-store" });
        if (!response.ok) throw Error(`HTTP ${response.status}`);
        return response;
    } catch (error) {
        if (!useProxy || !base || error instanceof Error && error.message.startsWith("HTTP ")) {
            throw error;
        }
        const retryUrl = `${target}${target.includes("?") ? "&" : "?"}cacheBust=${Date.now()}`;
        const response = await fetch(retryUrl, { cache: "reload" });
        if (!response.ok) throw Error(`HTTP ${response.status}`);
        return response;
    }
}

function absoluteUrl(value) {
    if (!value) return "";
    return value.startsWith("/") ? `${HOST}${value}` : value;
}

function parsePage(doc) {
    let total = null;
    const found = doc.querySelector("div.grey")?.textContent.match(/Found\s+([\d,]+)\s+mods/i);
    if (found) total = Number(found[1].replace(/,/g, ""));
    let lastPage = null;
    let currentPage = null;
    doc.querySelectorAll("a.button.square-sm").forEach((anchor) => {
        const match = anchor.getAttribute("href")?.match(/[?&]page=(\d+)/);
        if (!match) return;
        const page = Number(match[1]);
        lastPage = Math.max(lastPage || page, page);
        if (anchor.classList.contains("active")) currentPage = page;
    });
    return { total, page: currentPage || 1, lastPage };
}

export async function searchFactorio({ query, mode, version, page, filters, useProxy = true, proxy = PROXY }) {
    const params = new URLSearchParams({
        factorio_version: version || "2.0",
        show_deprecated: "false",
        page: String(page || 1),
    });
    if (filters?.expansion) params.set("expansion", filters.expansion);
    for (const group of ["category", "tag"]) {
        for (const value of filters?.[group]?.include || []) params.append(group, value);
        for (const value of filters?.[group]?.exclude || []) params.append(`exclude_${group}`, value);
    }
    const base = query ? `${HOST}/search` : `${HOST}/browse/${mode || "updated"}`;
    if (query) params.set("query", query);
    const response = await factorioFetch(`${base}?${params}`, useProxy, proxy);
    const doc = new DOMParser().parseFromString(await response.text(), "text/html");
    const list = doc.querySelector("div.mod-list") || doc;
    const containers = [...list.querySelectorAll("div.panel-inset-lighter.flex-column.p0, div.panel-inset-lighter")];
    const seen = new Set();
    const items = containers.map((container) => {
        const anchor = container.querySelector("h2 a.result-field[href^='/mod/'], h2 a[href^='/mod/']");
        if (!anchor) return null;
        const href = (anchor.getAttribute("href") || "").split(/[?#]/)[0];
        const id = href.replace(/^\/mod\//, "").replace(/\/$/, "");
        if (!id || seen.has(id)) return null;
        seen.add(id);
        const image = container.querySelector("img")?.getAttribute("src") || "";
        return {
            id,
            name: anchor.textContent.trim() || id,
            url: `${HOST}${href}`,
            author: container.querySelector("a[href^='/user/']")?.textContent.trim() || "",
            description: container.querySelector("p.result-field")?.textContent.trim() || "",
            category: container.querySelector(".category-label")?.textContent.trim() || "",
            versions: container.querySelector("[title='Factorio version'] span")?.textContent.trim() || "",
            downloads: container.querySelector("[title='Downloads']")?.textContent.trim() || "",
            updated: container.querySelector("[title='Last updated'] span")?.textContent.trim() || "",
            thumbnail: absoluteUrl(image),
        };
    }).filter(Boolean);
    return { ...parsePage(doc), items };
}

export function normalizeFactorioTargetVersion(value) {
    const match = String(value || "").match(/(\d+\.\d+(?:\.\d+)*)/);
    return match ? match[1].split(".").slice(0, 2).join(".") : "";
}

export function parseVersion(value) {
    const numbers = String(value || "").trim().split(/[.+-]/)
        .map((part) => /^\d+$/.test(part) ? Number(part) : null)
        .filter((part) => part !== null);
    return numbers.length ? numbers : [0];
}

export function compareVersions(left, right, operator) {
    const a = parseVersion(left);
    const b = parseVersion(right);
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
        const diff = (a[i] || 0) - (b[i] || 0);
        if (diff) {
            if (operator === ">=") return diff >= 0;
            if (operator === "<=") return diff <= 0;
            if (operator === ">") return diff > 0;
            if (operator === "<") return diff < 0;
            if (operator === "=") return false;
            return diff > 0;
        }
    }
    if (operator === ">") return false;
    if (operator === "<") return false;
    if (operator === "=") return true;
    return operator === ">=" || operator === "<=" || !operator;
}

export function parseDependency(value, ignoreSpecial = true) {
    let dependency = String(value || "").trim();
    if (!dependency || /^[?!]/.test(dependency)) return null;
    dependency = dependency.replace(/^~+/, "").replace(/^\((.*)\)$/, "$1").trim();
    const match = dependency.match(/^(.+?)(?:\s+(>=|<=|=|>|<)\s*(\S+))?$/);
    if (!match) return null;
    const name = match[1].trim();
    if (!name || (ignoreSpecial && SPECIAL_DEPENDENCIES.has(name.toLowerCase()))) return null;
    return { name, op: match[2] || "", version: match[3] || "" };
}

export function buildDependencyCandidates(value) {
    const base = String(value || "").trim();
    if (!base) return [];
    return [...new Set([
        base, base.replace(/\s+/g, "-"), base.replace(/\s+/g, "_"),
        base.replace(/-/g, " "), base.replace(/_/g, " "),
        base.replace(/_/g, "-"), base.replace(/-/g, "_"),
    ])];
}

export function extractReleaseFactorioVersion(release) {
    const info = release?.info_json || {};
    return normalizeFactorioTargetVersion(
        release?.factorio_version || info.factorio_version || info.game_version || info.factorioVersion,
    );
}

export function factorioReleaseMatchesTarget(release, targetVersion) {
    const target = normalizeFactorioTargetVersion(targetVersion);
    return !target || extractReleaseFactorioVersion(release) === target;
}

function releaseDependencies(release) {
    return (release?.info_json?.dependencies || []).filter((dependency) => typeof dependency === "string");
}

function releaseScore(release) {
    const specialVersions = releaseDependencies(release)
        .map((dependency) => parseDependency(dependency, false))
        .filter((dependency) => dependency && ["=", ">="].includes(dependency.op) && SPECIAL_DEPENDENCIES.has(dependency.name.toLowerCase()))
        .map((dependency) => parseVersion(dependency.version));
    return [
        specialVersions.reduce((best, current) => compareVersionArrays(current, best) > 0 ? current : best, [0]),
        parseVersion(release?.version),
        release?.released_at || "",
    ];
}

function compareVersionArrays(a, b) {
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
        if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) - (b[i] || 0);
    }
    return 0;
}

function pickBestRelease(releases) {
    return releases.reduce((best, release) => {
        if (!best) return release;
        const a = releaseScore(release);
        const b = releaseScore(best);
        return compareVersionArrays(a[0], b[0]) > 0 ||
            (compareVersionArrays(a[0], b[0]) === 0 && compareVersionArrays(a[1], b[1]) > 0) ||
            (compareVersionArrays(a[0], b[0]) === 0 && compareVersionArrays(a[1], b[1]) === 0 && a[2] > b[2])
            ? release : best;
    }, null);
}

function releaseMatchesComponents(release, componentVersions = {}) {
    return releaseDependencies(release).every((dependency) => {
        const parsed = parseDependency(dependency, false);
        if (!parsed?.op) return true;
        const key = parsed.name.toLowerCase().replace(/\s+/g, "-");
        return !componentVersions[key] || compareVersions(componentVersions[key], parsed.version, parsed.op);
    });
}

export function selectFactorioRelease(info, targetVersion, constraint = null, componentVersions = {}) {
    let releases = (info?.releases || []).filter((release) =>
        factorioReleaseMatchesTarget(release, targetVersion) &&
        releaseMatchesComponents(release, componentVersions),
    );
    if (constraint?.op) {
        releases = releases.filter((release) => compareVersions(release.version, constraint.version, constraint.op));
    }
    return pickBestRelease(releases);
}

export async function getFactorioModInfo(id, useProxy = true, proxy = PROXY) {
    const key = `${proxy}|${useProxy}|${id}`;
    if (!infoCache.has(key)) {
        const request = factorioFetch(
            `${INFO}/factorio/mods/modinfo?rand=${Math.random().toFixed(18)}&id=${encodeURIComponent(id)}`,
            useProxy,
            proxy,
        ).then((response) => response.json()).catch(() => null);
        infoCache.set(key, request);
    }
    return infoCache.get(key);
}

function cartItem(modId, version, kind, name) {
    return {
        title: `${modId}_${version}.zip`,
        url: `${DOWNLOAD}/${modId}/${version}.zip?anticache=${Math.random().toFixed(18)}`,
        modId,
        version,
        kind,
        name,
    };
}

export async function resolveFactorioDependencies(dependencies, targetVersion, useProxy, proxy, visited = new Set(), componentVersions = {}, progress) {
    const resolved = [];
    for (const raw of dependencies || []) {
        const dependency = parseDependency(raw);
        if (!dependency) continue;
        const visitKey = dependency.name.toLowerCase();
        if (visited.has(visitKey)) continue;
        visited.add(visitKey);
        progress?.(dependency.name);
        let modId = dependency.name;
        let info = null;
        for (const candidate of buildDependencyCandidates(dependency.name)) {
            info = await getFactorioModInfo(candidate, useProxy, proxy);
            if (info) {
                modId = candidate;
                break;
            }
        }
        const release = selectFactorioRelease(info, targetVersion, dependency, componentVersions);
        if (!release?.version) continue;
        resolved.push(cartItem(modId, release.version, "dependency"));
        resolved.push(...await resolveFactorioDependencies(
            releaseDependencies(release), targetVersion, useProxy, proxy, visited, componentVersions, progress,
        ));
    }
    return resolved;
}

export async function addFactorio(id, name, targetVersion, useProxy = true, proxy = PROXY, componentVersions = {}) {
    const info = await getFactorioModInfo(id, useProxy, proxy);
    const release = selectFactorioRelease(info, targetVersion, null, componentVersions);
    if (!release?.version) {
        throw Error(`No compatible releases for Factorio ${targetVersion}: ${id}`);
    }
    const direct = cartItem(id, release.version, "direct", name);
    const dependencies = await resolveFactorioDependencies(
        releaseDependencies(release),
        targetVersion,
        useProxy,
        proxy,
        new Set([id.toLowerCase()]),
        componentVersions,
    );
    return [direct, ...dependencies];
}

export async function resolveFactorioLogDependencies(logData, targetVersion, useProxy, proxy, componentVersions = {}) {
    const names = [...(logData?.replacementMods || []), ...(logData?.dependencies || [])];
    return resolveFactorioDependencies(names, targetVersion, useProxy, proxy, new Set(), componentVersions);
}
