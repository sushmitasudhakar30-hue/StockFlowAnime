import { useAuth } from '../../context/AuthContext';
import { useInventory } from '../../context/InventoryContext';

/* Shared lookup for the warehouse sub-pages */
export function useWarehouseAccess(id) {
  const { user } = useAuth();
  const { warehouses, loading } = useInventory();
  const canEdit = user?.role === 'Admin' || user?.role === 'Warehouse Manager';
  const warehouse = warehouses.find((w) => String(w.id) === String(id)) || null;
  return { warehouse, loading, canEdit };
}
