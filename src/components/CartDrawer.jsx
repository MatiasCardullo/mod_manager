import React from "react";

export default function CartDrawer({
    open,
    items,
    onClose,
    onRemove,
    onExport,
    onSendToDownloader,
    onDownloadAll,
    onDownload,
}) {
    if (!open) return null;
    return (
        <>
            <div className="overlay open" onClick={onClose} />
            <aside className="drawer open" aria-label="Download cart">
                <div className="drawer-header">
                    <h2>Cart</h2>
                    <button type="button" className="icon-btn" onClick={onClose} aria-label="Close cart">×</button>
                </div>
                <div className="drawer-body">
                    {items.length === 0 ? (
                        <div className="cart-empty">Cart empty. Add mods from results.</div>
                    ) : (
                        <ul className="cart-list">
                            {items.map((item, index) => (
                                <li className="cart-item" data-kind={item.kind} key={`${item.modId}-${item.version}-${index}`}>
                                    <div className="cart-item-row">
                                        <div>
                                            <div className="cart-item-kind">
                                                {item.kind === "dependency" ? "Dependency" : "Selected"}
                                            </div>
                                            <div className="cart-item-title">{item.title}</div>
                                            <div className="cart-item-sub">{item.modId} · v{item.version}</div>
                                        </div>
                                        <div className="cart-item-actions">
                                            <button
                                                type="button"
                                                className="cart-item-download"
                                                onClick={() => onDownload(item)}
                                                title="Download this file"
                                            >
                                                ↓
                                            </button>
                                            <button
                                                type="button"
                                                className="cart-remove"
                                                onClick={() => onRemove(index)}
                                                title="Remove"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <div className="drawer-footer">
                    <button type="button" className="btn btn-primary" onClick={onSendToDownloader} disabled={!items.length}>
                        Send to IARA Downloader
                    </button>
                    <button type="button" className="btn" onClick={onExport} disabled={!items.length}>
                        Export JSON
                    </button>
                    <button type="button" className="btn btn-primary" onClick={onDownloadAll} disabled={!items.length}>
                        Download all
                    </button>
                </div>
            </aside>
        </>
    );
}
