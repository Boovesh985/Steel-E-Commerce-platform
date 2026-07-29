import { useMemo, useState } from 'react';
import { PackagePlus } from 'lucide-react';
import { useAdminInventory, useUpdateInventory } from '../../hooks/useAdmin';
import { FullPageSpinner } from '../../components/ui/Spinner';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

export default function AdminInventory() {
  const [page, setPage] = useState(1);
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [form, setForm] = useState({ quantityAvailable: '', quantityReserved: '', reorderLevel: '' });

  const { data, isLoading } = useAdminInventory({
    page,
    limit: 20,
    warehouseId: warehouseFilter || undefined,
    lowStock: lowStockOnly || undefined,
  });
  const updateInventory = useUpdateInventory();

  const rows = data?.items || [];

  // No dedicated warehouses endpoint is documented — derive the filter
  // options from whatever warehouses show up in the loaded inventory rows.
  const warehouseOptions = useMemo(() => {
    const map = new Map();
    rows.forEach((row) => {
      const id = row.warehouseId || row.warehouse?.id;
      const name = row.warehouse?.name || row.warehouseName;
      if (id && !map.has(id)) map.set(id, name || id);
    });
    return Array.from(map.entries());
  }, [rows]);

  const openEdit = (row) => {
    setEditingRow(row);
    setForm({
      quantityAvailable: String(row.quantityAvailable ?? 0),
      quantityReserved: String(row.quantityReserved ?? 0),
      reorderLevel: String(row.reorderLevel ?? 10),
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateInventory.mutate(
      {
        productId: editingRow.productId,
        payload: {
          quantityAvailable: Number(form.quantityAvailable),
          quantityReserved: Number(form.quantityReserved),
          reorderLevel: Number(form.reorderLevel),
          // Not in the documented body, but included defensively since a
          // product can have stock rows in more than one warehouse.
          warehouseId: editingRow.warehouseId,
        },
      },
      { onSuccess: () => setEditingRow(null) }
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-headline-lg text-text">Inventory</h1>
        <div className="flex gap-2 items-center flex-wrap">
          <select
            value={warehouseFilter}
            onChange={(e) => { setWarehouseFilter(e.target.value); setPage(1); }}
            className="h-10 px-3 rounded-standard border border-border bg-surface text-body-sm outline-none"
          >
            <option value="">All warehouses</option>
            {warehouseOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
          <label className="flex items-center gap-2 text-body-sm text-text-secondary">
            <input type="checkbox" checked={lowStockOnly} onChange={(e) => { setLowStockOnly(e.target.checked); setPage(1); }} className="accent-primary" />
            Low stock only
          </label>
        </div>
      </div>

      {isLoading ? (
        <FullPageSpinner />
      ) : (
        <div className="bg-surface border border-border rounded-container overflow-x-auto">
          <table className="w-full text-body-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-border text-left text-text-secondary">
                <th className="p-3.5 font-medium">Product</th>
                <th className="p-3.5 font-medium">Warehouse</th>
                <th className="p-3.5 font-medium">Available</th>
                <th className="p-3.5 font-medium">Reserved</th>
                <th className="p-3.5 font-medium">Reorder level</th>
                <th className="p-3.5 font-medium w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.productId}-${row.warehouseId}`} className="border-b border-border last:border-0">
                  <td className="p-3.5 text-text font-medium">{row.product?.name || row.productName}</td>
                  <td className="p-3.5 text-text-secondary">{row.warehouse?.name || row.warehouseName}</td>
                  <td className="p-3.5 font-mono text-text">{row.quantityAvailable}</td>
                  <td className="p-3.5 font-mono text-text-secondary">{row.quantityReserved}</td>
                  <td className="p-3.5 font-mono text-text-secondary">{row.reorderLevel}</td>
                  <td className="p-3.5">
                    <Button variant="link" size="sm" onClick={() => openEdit(row)} leftIcon={<PackagePlus className="w-4 h-4" />}>
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="text-body-sm text-text-secondary text-center py-10">No inventory records found.</p>}
        </div>
      )}

      {data?.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="text-body-sm text-text-secondary px-2">Page {page} of {data.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}

      <Modal isOpen={!!editingRow} onClose={() => setEditingRow(null)} title={`Edit stock — ${editingRow?.product?.name || editingRow?.productName || ''}`}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Quantity available" type="number" required value={form.quantityAvailable} onChange={(e) => setForm((f) => ({ ...f, quantityAvailable: e.target.value }))} />
          <Input label="Quantity reserved" type="number" required value={form.quantityReserved} onChange={(e) => setForm((f) => ({ ...f, quantityReserved: e.target.value }))} />
          <Input label="Reorder level" type="number" required value={form.reorderLevel} onChange={(e) => setForm((f) => ({ ...f, reorderLevel: e.target.value }))} />
          <Button type="submit" fullWidth isLoading={updateInventory.isPending}>Save</Button>
        </form>
      </Modal>
    </div>
  );
}
