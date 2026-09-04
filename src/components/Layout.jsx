import React, { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { downloadJson, parseCartProfile, saveCartProfile, write } from "../services/storage";
import { GAME_CONFIG } from "../config/games";
import { SearchControls, FilterSidebar } from "./Controls";
import CartDrawer from "./CartDrawer";
import SettingsModal from "./SettingsModal";

export default function Layout({
    game,
    children,
    filters,
    setFilters,
    cart,
    setCart,
    search,
    settings,
    setSettings,
    onFactorioVersion,
    onFactorioLog,
    onReplace,
    onCartChange,
    onStatus,
    query,
    setQuery,
    gameConfig,
}) {
    const config = gameConfig || GAME_CONFIG[game];
    const isFactorio = game === "factorio";
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [localQuery, setLocalQuery] = useState("");
    const activeQuery = query ?? localQuery;
    const updateQuery = setQuery || setLocalQuery;

    useEffect(() => {
        write(config.storage.settings, settings);
    }, [config.storage.settings, settings]);

    const updateCart = (next) => {
        setCart(next);
        write(config.storage.cart, next);
        onCartChange?.(next);
    };
    const saveProfile = () => {
        const name = window.prompt("Cart profile name", `${game}-cart`);
        if (name?.trim()) saveCartProfile(name.trim(), cart);
    };
    const loadProfile = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json,application/json";
        input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;
            try {
                const loaded = parseCartProfile(await file.text());
                updateCart(loaded);
                onStatus?.(`Loaded ${loaded.length} cart item(s).`);
            } catch (error) {
                onStatus?.(error.message);
            }
        };
        input.click();
    };
    const download = (item) => {
        const link = document.createElement("a");
        link.href = item.url;
        link.download = item.title || "";
        document.body.appendChild(link);
        link.click();
        link.remove();
    };
    const exportCart = () => downloadJson(
        config.exportName,
        cart.map((item) => ({
            url: item.url,
            path: settings.modsPath || "",
            password: "",
            title: item.title,
        })),
    );
    const sendToDownloader = () => {
        if (!cart.length) return;
        const entries = cart.map((item) => ({
            url: item.url,
            path: settings.modsPath || "",
            password: "",
            title: item.title,
        }));
        const bytes = new TextEncoder().encode(JSON.stringify(entries));
        let binary = "";
        bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
        const payload = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
        window.location.href = `iara-downloads://add-mods?payload=${payload}`;
    };

    return (
        <div className={`app-shell ${game}`}>
            <header className="topbar">
                <Link className="brand" to="/minecraft" aria-label="IARA Mod Manager home">
                    <span className="brand-mark" aria-hidden="true">◈</span>
                    <span>Mod Search<small>{config.label}</small></span>
                </Link>
                <nav className="game-nav" aria-label="Game sections">
                    <NavLink
                        to="/minecraft"
                        className={({ isActive }) => isActive ? "game-nav-link active" : "game-nav-link"}
                    >
                        Minecraft
                    </NavLink>
                    <NavLink
                        to="/factorio"
                        className={({ isActive }) => isActive ? "game-nav-link active" : "game-nav-link"}
                    >
                        Factorio
                    </NavLink>
                </nav>
                <SearchControls
                    config={config}
                    filters={filters}
                    setFilters={setFilters}
                    query={activeQuery}
                    setQuery={updateQuery}
                    onSearch={search}
                />
                <div className="topbar-actions">
                    <button type="button" className="icon-btn" onClick={() => setSettingsOpen(true)} aria-label="Open settings">⚙</button>
                    <button type="button" className="cart-btn" onClick={() => setDrawerOpen(true)}>
                        Cart <span className="count">{cart.length}</span>
                    </button>
                </div>
            </header>
            <FilterSidebar config={config} game={game} filters={filters} setFilters={setFilters} />
            <main className="main">{children}</main>
            <CartDrawer
                open={drawerOpen}
                items={cart}
                onClose={() => setDrawerOpen(false)}
                onRemove={(index) => updateCart(cart.filter((_, itemIndex) => itemIndex !== index))}
                onExport={exportCart}
                onSendToDownloader={sendToDownloader}
                onDownload={download}
                onDownloadAll={() => cart.forEach(download)}
                onClear={() => {
                    if (window.confirm("Clear all cart items?")) updateCart([]);
                }}
                onSaveProfile={saveProfile}
                onLoadProfile={loadProfile}
                onReplace={onReplace}
            />
            <SettingsModal
                open={settingsOpen}
                settings={settings}
                setSettings={(next) => {
                    setSettings(next);
                    setSettingsOpen(false);
                }}
                isFactorio={isFactorio}
                onFactorioVersion={onFactorioVersion}
                onFactorioLog={onFactorioLog}
            />
        </div>
    );
}
