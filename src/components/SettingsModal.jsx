import React, { useEffect, useState } from "react";
import { parseFactorioLog } from "../helpers/filters";

export default function SettingsModal({
    open,
    settings,
    setSettings,
    isFactorio,
    onFactorioVersion,
    onFactorioLog,
}) {
    const [draft, setDraft] = useState(settings);

    useEffect(() => {
        if (open) setDraft(settings);
    }, [open, settings]);

    if (!open) return null;
    const update = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
    const close = () => setSettings(draft);

    return (
        <div className="modal-overlay open" onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
        }}>
            <div className="modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
                <div className="modal-header">
                    <h2 id="settings-title">Settings</h2>
                    <button type="button" className="icon-btn" onClick={close} aria-label="Close settings">×</button>
                </div>
                <div className="modal-body">
                    <div className="field">
                        <label htmlFor="mods-path">Mods folder (export path)</label>
                        <input
                            id="mods-path"
                            value={draft.modsPath || ""}
                            onChange={(event) => update("modsPath", event.target.value)}
                            placeholder={isFactorio ? "C:\\Users\\User\\AppData\\Roaming\\Factorio\\mods" : "%APPDATA%\\.minecraft\\mods"}
                        />
                        <span className="field-help">Saved in this browser. Used as path in exported Downloader entries.</span>
                    </div>
                    <>
                        {isFactorio && (
                            <div className="field">
                                <label htmlFor="factorio-log">factorio-current.log (optional)</label>
                                <input
                                    id="factorio-log"
                                    type="file"
                                    accept=".log,text/plain"
                                    onChange={async (event) => {
                                        const file = event.target.files?.[0];
                                        if (!file) return;
                                        const logData = parseFactorioLog(await file.text());
                                        if (onFactorioLog) onFactorioLog(logData);
                                        else if (logData.factorioVersion) onFactorioVersion(logData.factorioVersion);
                                        if (!logData.factorioVersion && !logData.dependencies.length && !logData.replacementMods.length) {
                                            return;
                                        }
                                    }}
                                />
                                <span className="field-help">Detect installed Factorio version from log.</span>
                            </div>
                        )}
                    </>
                </div>
                <div className="modal-footer">
                    <button type="button" className="btn" onClick={close}>Close</button>
                </div>
            </div>
        </div>
    );
}
