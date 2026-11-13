import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useInventory } from '../../context/InventoryContext';
import Badge from '../../components/Badge';
import { formatNumber } from '../../utils/hooks';
import { useWarehouseAccess } from './useWarehouseAccess';
import { warehouseStore } from './warehouseStore';
import RackBinExplorer from './RackBinExplorer';
import './WarehouseModule.css';

export default function ViewWarehouse() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { products } = useInventory();
  const { warehouse, loading, canEdit } = useWarehouseAccess(id);
  const [racks, setRacks] = useState([]);
  const [bins, setBins] = useState([]);
  const [items, setItems] = useState([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([warehouseStore.getRacks(id), warehouseStore.getBins(id), warehouseStore.getInventory(id)])
      .then(([r, b, i]) => { if (!cancelled) { setRacks(r); setBins(b); setItems(i); } })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <div className="page-fade"><div className="skeleton" style={{ height: 300 }} /></div>;
  if (!warehouse) {
    return (
      <div className="page-fade">
        <div className="empty-state">Warehouse not found</div>
        <button className="btn btn-ghost" onClick={() => navigate('/warehouses')}>Back to Warehouses</button>
      </div>
    );
  }

  const totalUnits = products.reduce((sum, p) => sum + (p.warehouseStock?.[warehouse.id] || 0), 0);
  const pct = warehouse.capacity ? Math.min((totalUnits / warehouse.capacity) * 100, 100) : 0;

  return (
    <div className="page-fade">
      <div className="page-header page-header-row">
        <div>
          <h1>Warehouse Details</h1>
          <p>{warehouse.name} — {warehouse.location}</p>
        </div>
        <div className="wh-actions">
          <button className="btn btn-primary" onClick={() => navigate(`/warehouses/${warehouse.id}/inventory`)}>View Inventory</button>
          <button className="btn btn-primary" onClick={() => navigate(`/warehouses/${warehouse.id}/racks`)}>Manage Racks</button>
          {canEdit && <button className="btn btn-ghost" onClick={() => navigate(`/warehouses/edit/${warehouse.id}`)}>Edit</button>}
        </div>
      </div>

      <div className="card">
        <div className="wh-detail-grid">
          <div><div className="wh-detail-label">Name</div><div className="wh-detail-value">{warehouse.name}</div></div>
          <div><div className="wh-detail-label">Location</div><div className="wh-detail-value">{warehouse.location}</div></div>
          <div>
            <div className="wh-detail-label">Utilisation</div>
            <div className="wh-detail-value"><Badge variant={pct > 80 ? 'danger' : pct > 50 ? 'warning' : 'success'}>{pct.toFixed(0)}% full</Badge></div>
          </div>
          <div><div className="wh-detail-label">Total Units</div><div className="wh-detail-value">{formatNumber(totalUnits)}</div></div>
          <div><div className="wh-detail-label">Capacity</div><div className="wh-detail-value">{formatNumber(warehouse.capacity)}</div></div>
          <div><div className="wh-detail-label">Locations</div><div className="wh-detail-value">{warehouse.locations.length}</div></div>
          <div><div className="wh-detail-label">Racks</div><div className="wh-detail-value">{racks.length}</div></div>
          <div><div className="wh-detail-label">Bins</div><div className="wh-detail-value">{bins.length}</div></div>
        </div>
      </div>

      <RackBinExplorer racks={racks} bins={bins} items={items} products={products} />

      <div className="wh-form-actions" style={{ justifyContent: 'flex-start', marginTop: 16 }}>
        <button className="btn btn-ghost" onClick={() => navigate('/warehouses')}>Back to Warehouses</button>
      </div>
    </div>
  );
}
