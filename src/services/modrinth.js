const API = "https://api.modrinth.com/v2";
const SITE = "https://modrinth.com";
const PAGE_SIZE = 20;
const INDEXES = { popular: "downloads", updated: "updated", newest: "newest" };
const versionCache = new Map();

const placeholder = "data:image/svg+xml;utf8," + encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><rect width='64' height='64' fill='#1d2420'/><rect x='14' y='14' width='36' height='36' fill='#33402f'/></svg>",
);

function requestUrl(url, settings = {}) {
    if (!settings.useProxy) return url;
    const base = String(settings.proxyBase || "").replace(/\/+$/, "");
    return base ? `${base}/fetch?url=${encodeURIComponent(url)}` : url;
}

async function fetchJson(url, settings) {
    try {
        const response = await fetch(requestUrl(url, settings));
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    } catch (error) {
        // Local proxy shipped with legacy Minecraft page only whitelists
        // Factorio hosts. Keep Modrinth usable when proxy toggle is enabled.
        if (settings?.useProxy && new URL(url).hostname === "api.modrinth.com") {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json();
        }
        throw error;
    }
}

const formatCount = (value) => {
    if (typeof value !== "number") return "";
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}k`;
    return String(value);
};

const formatDate = (value) => value
    ? String(value).replace("T", " ").replace(/\.\d+Z?$/, "").replace("Z", " UTC")
    : "";

function facetsFor(filters = {}) {
    const facets = [["project_type:mod"]];
    if (filters.categories?.size) facets.push([...filters.categories].map((value) => `categories:${value}`));
    if (filters.loader) facets.push([`categories:${filters.loader}`]);
    if (filters.gameVersion) facets.push([`versions:${filters.gameVersion}`]);
    return facets;
}

export async function searchModrinth({ query = "", mode = "popular", loader = "", gameVersion = "", categories = new Set(), page = 1, settings }) {
    const params = new URLSearchParams({
        query,
        limit: String(PAGE_SIZE),
        offset: String((page - 1) * PAGE_SIZE),
        index: INDEXES[mode] || INDEXES.popular,
        facets: JSON.stringify(facetsFor({ loader, gameVersion, categories })),
    });
    const data = await fetchJson(`${API}/search?${params}`, settings);
    const total = typeof data.total_hits === "number" ? data.total_hits : null;
    return {
        total,
        lastPage: total == null ? null : Math.max(1, Math.ceil(total / PAGE_SIZE)),
        hasMore: total == null ? (data.hits || []).length === PAGE_SIZE : page * PAGE_SIZE < total,
        items: (data.hits || []).filter((hit) => String(hit.project_type || "").toLowerCase() === "mod").map((hit) => ({
            id: hit.project_id || hit.slug,
            name: hit.title || hit.slug || "Untitled mod",
            author: hit.author || "Unknown",
            description: hit.description || "",
            url: `${SITE}/mod/${hit.slug || hit.project_id}`,
            category: [...new Set([...(hit.display_categories || []), ...(hit.loaders || [])])].slice(0, 3).join(", "),
            loaders: Array.isArray(hit.loaders) ? hit.loaders : [],
            gameVersions: Array.isArray(hit.versions) ? hit.versions : [],
            downloads: formatCount(hit.downloads),
            updated: formatDate(hit.date_modified),
            thumbnail: hit.icon_url || placeholder,
        })),
    };
}

export async function loadModrinthTags(settings) {
    const [loaders, categories, versions] = await Promise.all([
        fetchJson(`${API}/tag/loader`, settings).catch(() => []),
        fetchJson(`${API}/tag/category`, settings).catch(() => []),
        fetchJson(`${API}/tag/game_version`, settings).catch(() => []),
    ]);
    return {
        loaders: (loaders || []).filter((tag) => !tag.supported_project_types || tag.supported_project_types.includes("mod")).map((tag) => tag.name).filter(Boolean),
        categories: (categories || []).filter((tag) => String(tag.project_type || "").toLowerCase() === "mod").map((tag) => tag.name).filter(Boolean),
        gameVersions: (versions || []).filter((tag) => tag.version_type === "release").map((tag) => tag.version).filter(Boolean),
    };
}

function validFile(file) {
    return Boolean(file?.url && file?.filename);
}

function normalizeVersion(version) {
    if (!version || typeof version !== "object") return null;
    const files = (version.files || []).filter(validFile);
    if (!files.length) return null;
    const primaryFile = files.find((file) => file.primary) || files[0];
    return {
        id: version.id || "",
        name: version.name || version.version_number || "Version",
        versionNumber: version.version_number || "",
        datePublished: version.date_published || "",
        published: formatDate(version.date_published),
        downloads: formatCount(version.downloads),
        loaders: Array.isArray(version.loaders) ? version.loaders : [],
        gameVersions: Array.isArray(version.game_versions) ? version.game_versions : [],
        files,
        primaryFile,
        dependencies: Array.isArray(version.dependencies) ? version.dependencies : [],
        projectId: version.project_id || "",
    };
}

function optionsFromVersions(versions) {
    return versions.flatMap((version) => {
        const normalized = normalizeVersion(version);
        if (!normalized) return [];
        return normalized.files.map((file, index) => ({
            ...normalized,
            file,
            filename: file.filename,
            url: file.url,
            primary: Boolean(file.primary) || index === 0,
        }));
    }).sort((left, right) =>
        String(right.datePublished).localeCompare(String(left.datePublished)) ||
        Number(right.primary) - Number(left.primary)
    );
}

export async function fetchModrinthVersions(projectId, settings) {
    const cacheKey = `${projectId}:${settings?.useProxy ? settings.proxyBase : "direct"}`;
    if (!versionCache.has(cacheKey)) {
        versionCache.set(cacheKey, fetchJson(`${API}/project/${projectId}/version`, settings)
            .then((versions) => Array.isArray(versions) ? versions : [])
            .catch(() => []));
    }
    return versionCache.get(cacheKey);
}

export async function fetchModrinthVersion(versionId, settings) {
    try {
        return normalizeVersion(await fetchJson(`${API}/version/${versionId}`, settings));
    } catch {
        return null;
    }
}

export async function getModrinthOptions(projectId, settings) {
    return optionsFromVersions(await fetchModrinthVersions(projectId, settings));
}

function compatible(option, context = {}) {
    const loaders = context.loaders || [];
    const gameVersions = context.gameVersions || [];
    return (!loaders.length || option.loaders.some((loader) => loaders.includes(loader))) &&
        (!gameVersions.length || option.gameVersions.some((version) => gameVersions.includes(version)));
}

async function bestOption(projectId, context, settings) {
    const options = await getModrinthOptions(projectId, settings);
    return options.find((option) => compatible(option, context)) || options[0] || null;
}

function requiredDependencies(dependencies) {
    return (dependencies || []).filter((dependency) =>
        String(dependency?.dependency_type || "").toLowerCase() === "required"
    );
}

function cartItem(projectId, option, kind) {
    return {
        title: option.filename,
        url: option.url,
        modId: projectId || option.projectId || option.id,
        version: option.id,
        kind: kind || "direct",
    };
}

async function resolveDependencies(dependencies, visited, context, settings, progress) {
    const resolved = [];
    for (const dependency of requiredDependencies(dependencies)) {
        const projectId = dependency.project_id || "";
        const versionId = dependency.version_id || "";
        const visitKey = projectId || versionId;
        if (!visitKey || visited.has(visitKey)) continue;
        visited.add(visitKey);
        progress?.(`Resolving dependency: ${visitKey}`);

        let option = versionId ? await fetchModrinthVersion(versionId, settings) : null;
        if (!option && projectId) option = await bestOption(projectId, context, settings);
        if (!option) continue;

        const resolvedProjectId = option.projectId || projectId || versionId;
        visited.add(resolvedProjectId);
        resolved.push(cartItem(resolvedProjectId, option, "dependency"));
        resolved.push(...await resolveDependencies(
            option.dependencies,
            visited,
            { loaders: option.loaders, gameVersions: option.gameVersions },
            settings,
            progress,
        ));
    }
    return resolved;
}

export async function addModrinth(id, name, filters, settings, chooseVersion, progress) {
    const options = await getModrinthOptions(id, settings);
    const compatibleOptions = options.filter((option) => compatible(option, {
        loaders: filters.loader ? [filters.loader] : [],
        gameVersions: filters.gameVersion ? [filters.gameVersion] : [],
    }));
    const candidates = compatibleOptions.length ? compatibleOptions : options;
    if (!candidates.length) throw new Error(`No downloadable files for ${name}`);
    const selected = candidates.length === 1 ? candidates[0] : await chooseVersion(name, candidates);
    if (!selected) return [];

    const item = cartItem(id, selected, "direct");
    const dependencies = await resolveDependencies(
        selected.dependencies,
        new Set([id]),
        { loaders: selected.loaders, gameVersions: selected.gameVersions },
        settings,
        progress,
    );
    return [item, ...dependencies];
}
