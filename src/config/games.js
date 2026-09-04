import {
    addFactorio,
    proxyUrl,
    resolveFactorioLogDependencies,
    searchFactorio,
} from "../services/factorio";
import { addModrinth, searchModrinth } from "../services/modrinth";

export const GAME_CONFIG = {
    minecraft: {
        label: "Minecraft · Modrinth",
        searchPlaceholder: "Search Minecraft mods…",
        storage: {
            settings: "modrinthSearchSettings",
            cart: "modrinthSearchCart",
        },
        defaults: {
            mode: "popular",
            loader: "",
            gameVersion: "",
            categories: new Set(),
        },
        modes: [
            ["popular", "Popular"],
            ["updated", "Updated"],
            ["newest", "Newest"],
        ],
        loaders: ["fabric", "forge", "quilt", "neoforge"],
        categories: ["adventure", "optimization", "technology", "magic"],
        search: (filters, query, page, settings) =>
            searchModrinth({ query, ...filters, page, settings }),
        add: (item, filters, settings, chooseVersion, progress) =>
            addModrinth(item.id, item.name, filters, settings, chooseVersion, progress),
        settings: { useProxy: false, proxyBase: "http://localhost:8787", modsPath: "" },
        exportName: "modrinth_cart.json",
    },
    factorio: {
        label: "Factorio Mod Portal",
        searchPlaceholder: "Search Factorio mods…",
        storage: {
            settings: "modSearchSettings",
            cart: "modSearchCart",
        },
        defaults: {
            mode: "updated",
            targetVersion: "2.0",
            expansion: "",
            category: { include: new Set(), exclude: new Set() },
            tag: { include: new Set(), exclude: new Set() },
        },
        modes: [
            ["updated", "Updated"],
            ["downloaded", "Downloaded"],
            ["trending", "Trending"],
        ],
        versions: ["2.0", "1.1", "1.0", "0.18", "0.17", "0.16"],
        categories: [
            "content", "overhaul", "tweaks", "utilities", "scenarios", "mod-packs",
            "localizations", "internal", "no-category",
        ],
        tags: [
            "planets", "transportation", "logistics", "trains", "combat", "armor",
            "character", "enemies", "environment", "mining", "fluids",
            "logistic-network", "circuit-network", "manufacturing", "power",
            "storage", "blueprints", "cheats",
        ],
        search: (filters, query, page, settings) =>
            searchFactorio({
                query,
                mode: filters.mode,
                version: filters.targetVersion,
                page,
                filters,
                useProxy: true,
                proxy: proxyUrl,
            }),
        add: (item, filters, settings) =>
            addFactorio(
                item.id,
                item.name,
                filters.targetVersion,
                true,
                proxyUrl,
                settings.componentVersions,
            ),
        repairLog: (logData, filters, settings) =>
            resolveFactorioLogDependencies(
                logData,
                filters.targetVersion,
                true,
                proxyUrl,
                logData.componentVersions,
            ),
        settings: { modsPath: "", componentVersions: {} },
        exportName: "mod_search_cart.json",
    },
};

export function cloneDefaults(game) {
    const defaults = GAME_CONFIG[game].defaults;
    return {
        ...defaults,
        categories: defaults.categories ? new Set(defaults.categories) : undefined,
        category: defaults.category
            ? { include: new Set(), exclude: new Set() }
            : undefined,
        tag: defaults.tag ? { include: new Set(), exclude: new Set() } : undefined,
    };
}
