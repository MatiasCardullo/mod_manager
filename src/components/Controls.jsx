import React from "react";
import { cycleFilterValue, filterState } from "../helpers/filters";
import { cloneDefaults } from "../config/games";

export function SearchControls({ config, filters, setFilters, query, setQuery, onSearch }) {
    const versions = config.versions
        ? [...new Set([...config.versions, filters.targetVersion].filter(Boolean))]
        : [];
    return (
        <form
            className="search-form"
            onSubmit={(event) => {
                event.preventDefault();
                onSearch(query);
            }}
        >
            <div className="search-input-wrap">
                <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={config.searchPlaceholder}
                    aria-label="Search mods"
                />
                <div className="belt" />
            </div>
            <select
                className="mode-select"
                value={filters.mode}
                onChange={(event) =>
                    setFilters((current) => ({ ...current, mode: event.target.value }))
                }
                aria-label="Sort results"
            >
                {config.modes.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                ))}
            </select>
            {config.versions && (
                <select
                    className="version-select"
                    value={filters.targetVersion}
                    onChange={(event) =>
                        setFilters((current) => ({
                            ...current,
                            targetVersion: event.target.value,
                        }))
                    }
                    aria-label="Factorio version"
                >
                    {versions.map((version) => (
                        <option key={version} value={version}>Factorio {version}</option>
                    ))}
                </select>
            )}
        </form>
    );
}

export function ChipGroup({ values, selected, onChange }) {
    return (
        <div className="chip-row">
            {values.map((value) => (
                <button
                    type="button"
                    className="chip"
                    data-state={filterState(selected, value)}
                    key={value}
                    onClick={() => onChange(value)}
                >
                    {value}
                </button>
            ))}
        </div>
    );
}

export function FilterSidebar({ config, game, filters, setFilters }) {
    const update = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
    const reset = () => setFilters(cloneDefaults(game));

    return (
        <aside className="sidebar">
            {config.loaders && (
                <>
                    <div className="filter-group">
                        <p className="filter-group-title">Loader</p>
                        <select
                            className="version-select"
                            value={filters.loader}
                            onChange={(event) => update("loader", event.target.value)}
                            style={{ width: "100%" }}
                        >
                            <option value="">All loaders</option>
                            {config.loaders.map((loader) => <option key={loader}>{loader}</option>)}
                        </select>
                    </div>
                    <div className="filter-group">
                        <p className="filter-group-title">Minecraft version</p>
                        <input
                            list="minecraft-version-list"
                            value={filters.gameVersion}
                            onChange={(event) => update("gameVersion", event.target.value)}
                            placeholder="All versions (e.g. 1.21)"
                            style={{ width: "100%" }}
                        />
                        {config.gameVersions?.length > 0 && (
                            <datalist id="minecraft-version-list">
                                {config.gameVersions.map((version) => <option key={version} value={version} />)}
                            </datalist>
                        )}
                    </div>
                    <div className="filter-group">
                        <p className="filter-group-title">Categories</p>
                        <ChipGroup
                            values={config.categories}
                            selected={filters.categories}
                            onChange={(value) =>
                                update("categories", cycleFilterValue(value, filters.categories))
                            }
                        />
                    </div>
                </>
            )}
            {config.tags && (
                <>
                    <div className="filter-group">
                        <p className="filter-group-title">Expansion</p>
                        <ChipGroup
                            values={["Space Age"]}
                            selected={filters.expansion ? new Set(["Space Age"]) : new Set()}
                            onChange={() =>
                                update("expansion", filters.expansion ? "" : "space-age")
                            }
                        />
                    </div>
                    <div className="filter-group">
                        <p className="filter-group-title">Categories</p>
                        <ChipGroup
                            values={config.categories}
                            selected={filters.category}
                            onChange={(value) =>
                                update("category", cycleFilterValue(value, filters.category))
                            }
                        />
                    </div>
                    <div className="filter-group">
                        <p className="filter-group-title">Tags</p>
                        <ChipGroup
                            values={config.tags}
                            selected={filters.tag}
                            onChange={(value) => update("tag", cycleFilterValue(value, filters.tag))}
                        />
                    </div>
                </>
            )}
            <button type="button" className="reset-filters" onClick={reset}>Reset filters</button>
        </aside>
    );
}
