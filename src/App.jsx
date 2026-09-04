import React, { useCallback, useEffect, useRef, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import ModCard from "./components/ModCard";
import VersionPickerModal from "./components/VersionPickerModal";
import { getModrinthOptions, loadModrinthTags } from "./services/modrinth";
import { normalizeCart, readCompatible, write } from "./services/storage";
import { getFactorioModInfo, selectFactorioRelease } from "./services/factorio";
import { cloneDefaults, GAME_CONFIG } from "./config/games";

function Manager({ game }) {
  const config = GAME_CONFIG[game];
  const [filters, setFilters] = useState(() => cloneDefaults(game));
  const [settings, setSettings] = useState(() => ({
    ...config.settings,
    ...readCompatible([
      config.storage.settings,
      game === "minecraft" ? "minecraftModSettings" : "factorioModSettings",
    ], {}),
  }));
  const [cart, setCart] = useState(() => normalizeCart(readCompatible([
  config.storage.cart,
  game === "minecraft" ? "minecraftModCart" : "factorioModCart",
  ], [])));
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("Ready.");
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [lastPage, setLastPage] = useState(null);
  const [total, setTotal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState(null);
  const [picker, setPicker] = useState(null);
  const requestRef = useRef(0);

  useEffect(() => {
    write(config.storage.cart, cart);
  }, [cart, config.storage.cart]);

  const doSearch = useCallback(async (nextQuery = "", nextPage = 1) => {
    const requestId = ++requestRef.current;
    setLoading(true);
    setStatus("Searching…");
    try {
      const result = await config.search(filters, nextQuery, nextPage, settings);
      if (requestId !== requestRef.current) return;
      setItems((current) => nextPage === 1 ? result.items : [...current, ...result.items]);
      setPage(nextPage);
      setQuery(nextQuery);
      setLastPage(result.lastPage ?? null);
      setTotal(result.total ?? null);
      setStatus(`${result.items.length} mods loaded${result.total == null ? "." : ` of ${result.total}.`}`);
    } catch (error) {
      if (requestId !== requestRef.current) return;
      setStatus(`Network error: ${error.message}`);
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false);
      }
    }
  }, [config, filters, settings]);

  useEffect(() => {
    doSearch(query, 1);
  }, [game, filters, settings, doSearch]);

  useEffect(() => {
    if (game !== "minecraft") return undefined;
    let active = true;
    loadModrinthTags(settings).then((result) => {
      if (active) setTags(result);
    });
    return () => { active = false; };
  }, [game, settings]);

  const chooseVersion = useCallback((title, options) => new Promise((resolve) => {
    setPicker({
      title,
      options,
      loader: filters.loader,
      gameVersion: filters.gameVersion,
      resolve,
    });
  }), [filters.gameVersion, filters.loader]);

  const more = () => {
    if (!loading && (lastPage == null || page < lastPage)) doSearch(query, page + 1);
  };
  const add = async (item) => {
    try {
      setStatus("Resolving dependencies…");
      const additions = await config.add(
        item,
        filters,
        settings,
        chooseVersion,
        (message) => setStatus(message),
      );
      setCart((current) => {
        const next = [...current];
        additions.forEach((addition) => {
          const sameMod = next.findIndex((existing) => existing.modId === addition.modId);
          if (sameMod < 0) next.push(addition);
          else if (next[sameMod].version !== addition.version &&
            window.confirm(`${addition.modId} already has another version. Replace it?`)) {
            next[sameMod] = addition;
          }
        });
        return next;
      });
      setStatus(`Added ${additions.length} item(s).`);
    } catch (error) {
      setStatus(error.message);
    }
  };

  const replace = async (item) => {
    try {
      let option;
      if (game === "minecraft") {
        const options = await getModrinthOptions(item.modId, settings);
        option = await chooseVersion(item.modId, options);
      } else {
        const info = await getFactorioModInfo(item.modId);
        const release = selectFactorioRelease(info, filters.targetVersion, null, settings.componentVersions);
        if (release?.version) option = { version: release.version, url: `${item.url.split("/").slice(0, -1).join("/")}/${release.version}.zip`, filename: `${item.modId}_${release.version}.zip` };
      }
      if (!option) return;
      setCart((current) => current.map((entry) => entry.modId === item.modId ? {
        ...entry,
        version: option.version || option.id,
        title: option.filename || `${item.modId}_${option.version}.zip`,
        url: option.url,
      } : entry));
      setStatus(`Replaced ${item.modId} version.`);
    } catch (error) {
      setStatus(`Version replacement error: ${error.message}`);
    }
  };

  const onFactorioLog = async (logData) => {
    if (game !== "factorio") return;
    const nextFilters = logData.factorioVersion
      ? { ...filters, targetVersion: logData.factorioVersion }
      : filters;
    const nextSettings = {
      ...settings,
      componentVersions: logData.componentVersions || {},
    };
    setFilters(nextFilters);
    setSettings(nextSettings);
    if (!config.repairLog || (!logData.dependencies?.length && !logData.replacementMods?.length)) {
      setStatus("No missing or incompatible dependencies found in log.");
      return;
    }
    setStatus("Resolving dependencies from factorio-current.log…");
    try {
      const additions = await config.repairLog(logData, nextFilters, nextSettings);
      setCart((current) => {
        const next = [...current];
        additions.forEach((addition) => {
          if (!next.some((existing) => existing.modId === addition.modId && existing.version === addition.version)) {
            next.push(addition);
          }
        });
        return next;
      });
      setStatus(additions.length ? `Added ${additions.length} log dependency item(s).` : "Log dependencies already in cart.");
    } catch (error) {
      setStatus(`Log dependency error: ${error.message}`);
    }
  };

  const viewConfig = game === "minecraft" && tags
    ? {
      ...config,
      loaders: tags.loaders.length ? tags.loaders : config.loaders,
      categories: tags.categories.length ? tags.categories : config.categories,
      gameVersions: tags.gameVersions,
    }
    : config;

  return (
    <>
    <Layout
      game={game}
      gameConfig={viewConfig}
      filters={filters}
      setFilters={setFilters}
      cart={cart}
      setCart={setCart}
      search={(nextQuery) => doSearch(nextQuery, 1)}
      settings={settings}
      setSettings={setSettings}
      onFactorioVersion={(version) => setFilters((current) => ({ ...current, targetVersion: version }))}
      onFactorioLog={onFactorioLog}
      onReplace={replace}
      onStatus={setStatus}
      query={query}
      setQuery={setQuery}
    >
      <div className={`status-line${status.startsWith("Network error") ? " error" : ""}`}>
        <span className="status-dot" />{status}
      </div>
      {items.length ? (
        <div className="mod-grid">
          {items.map((item) => <ModCard key={item.id} item={item} onAdd={add} />)}
        </div>
      ) : (
        <div className="empty-state">{loading ? "Loading mods…" : "No mods loaded."}</div>
      )}
      <div className="load-more-row">
        <button type="button" className="btn" onClick={more} disabled={loading || (lastPage != null && page >= lastPage)}>
          {loading ? "Loading…" : total != null && page >= lastPage ? "No more mods" : "Load more"}
        </button>
      </div>
    </Layout>
    <VersionPickerModal
      request={picker}
      onCancel={() => {
        picker?.resolve(null);
        setPicker(null);
      }}
      onConfirm={(option) => {
        picker?.resolve(option);
        setPicker(null);
      }}
    />
    </>
  );
}
export default function App() {
  return (
    <Routes>
      <Route path="/minecraft/*" element={<Manager key="minecraft" game="minecraft" />} />
      <Route path="/factorio/*" element={<Manager key="factorio" game="factorio" />} />
      <Route path="*" element={<Navigate to="/minecraft" replace />} />
    </Routes>
  );
}
