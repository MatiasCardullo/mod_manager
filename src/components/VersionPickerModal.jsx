import React, { useEffect, useMemo, useState } from "react";

function unique(values) {
    return [...new Set(values)].sort().reverse();
}

function label(option) {
    return [option.versionNumber || option.name || "Version", option.filename, option.published]
        .filter(Boolean)
        .join(" · ");
}

export default function VersionPickerModal({ request, onCancel, onConfirm }) {
    const [loader, setLoader] = useState("");
    const [gameVersion, setGameVersion] = useState("");
    const [index, setIndex] = useState(0);

    useEffect(() => {
        if (!request) return;
        setLoader(request.options.some((option) => option.loaders.includes(request.loader)) ? request.loader : "");
        setGameVersion(request.options.some((option) => option.gameVersions.includes(request.gameVersion)) ? request.gameVersion : "");
        setIndex(0);
    }, [request]);

    const loaders = useMemo(() => unique((request?.options || []).flatMap((option) => option.loaders)), [request]);
    const gameVersions = useMemo(() => unique((request?.options || []).flatMap((option) => option.gameVersions)), [request]);
    const filtered = useMemo(() => {
        if (!request) return [];
        const matches = request.options.filter((option) =>
            (!loader || option.loaders.includes(loader)) &&
            (!gameVersion || option.gameVersions.includes(gameVersion))
        );
        return matches.length ? matches : request.options;
    }, [request, loader, gameVersion]);

    useEffect(() => {
        if (index >= filtered.length) setIndex(0);
    }, [filtered, index]);

    if (!request) return null;
    return (
        <div className="modal-overlay open" onMouseDown={(event) => {
            if (event.target === event.currentTarget) onCancel();
        }}>
            <div className="modal" role="dialog" aria-modal="true" aria-labelledby="picker-title">
                <div className="modal-header">
                    <h2 id="picker-title">Choose version — {request.title}</h2>
                    <button type="button" className="icon-btn" onClick={onCancel} aria-label="Close picker">×</button>
                </div>
                <div className="modal-body">
                    <div className="field">
                        <label htmlFor="picker-loader">Loader</label>
                        <select id="picker-loader" className="version-select" value={loader} onChange={(event) => setLoader(event.target.value)}>
                            <option value="">Any loader</option>
                            {loaders.map((value) => <option key={value} value={value}>{value}</option>)}
                        </select>
                    </div>
                    <div className="field">
                        <label htmlFor="picker-game-version">Minecraft version</label>
                        <select id="picker-game-version" className="version-select" value={gameVersion} onChange={(event) => setGameVersion(event.target.value)}>
                            <option value="">Any version</option>
                            {gameVersions.map((value) => <option key={value} value={value}>{value}</option>)}
                        </select>
                    </div>
                    <div className="field">
                        <label htmlFor="picker-file">Version / file</label>
                        <select id="picker-file" className="version-select" value={index} onChange={(event) => setIndex(Number(event.target.value))}>
                            {filtered.map((option, optionIndex) => (
                                <option key={`${option.id}-${option.filename}`} value={optionIndex}>
                                    {label(option)}{option.primary ? " (primary)" : ""}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="modal-footer">
                    <button type="button" className="btn" onClick={onCancel}>Cancel</button>
                    <button type="button" className="btn btn-primary" onClick={() => onConfirm(filtered[index])}>Add</button>
                </div>
            </div>
        </div>
    );
}
