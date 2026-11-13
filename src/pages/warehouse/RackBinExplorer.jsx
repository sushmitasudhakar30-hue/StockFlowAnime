import { useMemo, useState } from 'react';
import { formatINR, formatNumber } from '../../utils/hooks';

/* Pick a Rack and then a Bin → see everything stored there.
   Used on the Warehouse Details page and the Warehouse Inventory page.
   Props: racks, bins (all bins of the warehouse), items (inventory entries), products,
          renderAction(item) — optional, e.g. a Delete button for each row. */
export default function RackBinExplorer({ racks, bins, items, products, renderAction }) {
  const [rackId, setRackId] = useState('');
  const [binId, setBinId] = useState('');

  const productById = useMemo(() => new Map(products.map((p) => [String(p.id), p])), [products]);
  const valueOf = (item) => item.quantity * (Number(productById.get(String(item.productId))?.price) || 0);

  const sameId = (a, b) => String(a) === String(b);
  const rack = racks.find((r) => sameId(r.id, rackId));
  const bin = bins.find((b) => sameId(b.id, binId));
  const rackBins = rack ? bins.filter((b) => sameId(b.rackId, rack.id)) : [];

  const visible = items.filter(
    (i) => (!rack || sameId(i.rackId, rack.id)) && (!bin || sameId(i.binId, bin.id))
  );
  const sum = (list) => ({
    entries: list.length,
    units: list.reduce((s, i) => s + i.quantity, 0),
    value: list.reduce((s, i) => s + valueOf(i), 0),
  });
  const totals = sum(visible);

  const pickRack = (id) => { setRackId(id); setBinId(''); };
  const clear = () => { setRackId(''); setBinId(''); };

  const title = bin ? `${rack.name} › ${bin.name}` : rack ? rack.name : 'All racks & bins';

  const tiles = bin
    ? [['Product entries', totals.entries], ['Units stored', formatNumber(totals.units)], ['Stock value', formatINR(totals.value)]]
    : rack
      ? [['Bins in rack', rackBins.length], ['Product entries', totals.entries], ['Units stored', formatNumber(totals.units)], ['Stock value', formatINR(totals.value)]]
      : [['Racks', racks.length], ['Bins', bins.length], ['Product entries', totals.entries], ['Units stored', formatNumber(totals.units)], ['Stock value', formatINR(totals.value)]];

  // Breakdown: racks (nothing selected) or bins of the chosen rack
  const breakdown = bin
    ? null
    : rack
      ? { label: 'Bin', rows: rackBins.map((b) => ({ id: b.id, name: b.name, extra: null, ...sum(items.filter((i) => sameId(i.binId, b.id))), open: () => setBinId(String(b.id)) })) }
      : { label: 'Rack', rows: racks.map((r) => ({ id: r.id, name: r.name, extra: bins.filter((b) => sameId(b.rackId, r.id)).length, ...sum(items.filter((i) => sameId(i.rackId, r.id))), open: () => pickRack(String(r.id)) })) };

  if (racks.length === 0) {
    return (
      <div className="card wh-section">
        <div className="card-title">Racks &amp; Bins</div>
        <div className="empty-state">No racks have been created for this warehouse yet. Use “Manage Racks” to add racks and bins.</div>
      </div>
    );
  }

  return (
    <div className="wh-explorer">
      <div className="card wh-section">
        <div className="card-title">Browse by Rack &amp; Bin</div>
        <div className="wh-filter-bar">
          <div className="form-group">
            <label className="form-label" htmlFor="explore-rack">Rack</label>
            <select id="explore-rack" className="form-select" value={rackId} onChange={(e) => pickRack(e.target.value)}>
              <option value="">All racks</option>
              {racks.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="explore-bin">Bin</label>
            <select id="explore-bin" className="form-select" value={binId} onChange={(e) => setBinId(e.target.value)} disabled={!rack}>
              <option value="">{rack ? 'All bins in this rack' : 'Select a rack first'}</option>
              {rackBins.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <button type="button" className="btn btn-ghost" onClick={clear} disabled={!rack}>Clear</button>
        </div>
        {rack && rackBins.length === 0 && (
          <p className="wh-hint">{rack.name} has no bins yet — add some under Manage Racks → Manage Bins.</p>
        )}
      </div>

      <div className="card wh-section">
        <div className="card-title">{title}</div>
        <div className="wh-stats">
          {tiles.map(([label, value]) => (
            <div key={label} className="wh-stat">
              <div className="wh-detail-label">{label}</div>
              <div className="wh-detail-value">{value}</div>
            </div>
          ))}
        </div>

        {breakdown && breakdown.rows.length > 0 && (
          <div className="data-table-wrap" style={{ marginTop: 16 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{breakdown.label}</th>
                  {!rack && <th>Bins</th>}
                  <th>Product entries</th>
                  <th>Units</th>
                  <th>Stock value</th>
                  <th className="text-right">Details</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.rows.map((row) => (
                  <tr key={row.id}>
                    <td style={{ fontWeight: 600 }}>{row.name}</td>
                    {!rack && <td>{row.extra}</td>}
                    <td>{row.entries}</td>
                    <td>{formatNumber(row.units)}</td>
                    <td>{formatINR(row.value)}</td>
                    <td className="text-right"><button className="btn btn-ghost btn-sm" onClick={row.open}>Open</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title">{bin ? `Stored in ${bin.name}` : rack ? `Stored in ${rack.name}` : 'All stored products'}</div>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th><th>SKU</th><th>Category</th><th>Quantity</th>
                <th>Unit price</th><th>Value</th><th>Rack</th><th>Bin</th>
                {renderAction && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => {
                const product = productById.get(String(item.productId));
                return (
                  <tr key={item.id}>
                    <td>{item.productName}</td>
                    <td>{item.sku}</td>
                    <td>{product?.category || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{formatNumber(item.quantity)}</td>
                    <td>{product ? formatINR(product.price) : '—'}</td>
                    <td>{formatINR(valueOf(item))}</td>
                    <td>{item.rack}</td>
                    <td>{item.bin}</td>
                    {renderAction && <td>{renderAction(item)}</td>}
                  </tr>
                );
              })}
              {visible.length === 0 && (
                <tr><td colSpan={renderAction ? 9 : 8}><div className="empty-state">{rack ? 'Nothing is stored here yet' : 'No inventory found'}</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
