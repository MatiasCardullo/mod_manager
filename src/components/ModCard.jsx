import React from "react";

const PLACEHOLDER = "data:image/svg+xml;utf8," + encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='112' height='112'><rect width='112' height='112' fill='#20242a'/><path d='M20 85l23-28 16 18 18-27 25 37z' fill='#3a4048'/><circle cx='37' cy='32' r='10' fill='#3a4048'/></svg>",
);

export default function ModCard({ item, onAdd }) {
    const versions = item.versions || item.gameVersions?.slice(0, 3).join(", ");
    return (
        <article className="mod-card">
            <img
                className="mod-thumb"
                src={item.thumbnail || PLACEHOLDER}
                alt=""
                loading="lazy"
                onError={(event) => { event.currentTarget.src = PLACEHOLDER; }}
            />
            <div className="mod-body">
                <div className="mod-title-row"><h3 className="mod-title">{item.name}</h3></div>
                <p className="mod-author">{item.author}</p>
                <p className="mod-desc">{item.description || "No description."}</p>
                <div className="mod-meta">
                    {item.category && <span>{item.category}</span>}
                    {versions && <span>{item.gameVersions ? `MC ${versions}` : versions}</span>}
                    {item.downloads && <span>{item.downloads} DL</span>}
                    {item.updated && <span>{item.updated}</span>}
                </div>
            </div>
            <div className="mod-actions">
                <button type="button" className="btn btn-primary" onClick={() => onAdd(item)}>+ Cart</button>
                <a className="btn" href={item.url} target="_blank" rel="noopener noreferrer">Portal</a>
            </div>
        </article>
    );
}
