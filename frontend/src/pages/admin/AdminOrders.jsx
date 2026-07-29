import { useState } from 'react';
import { useAdminOrders, useUpdateOrderStatus } from '../../hooks/useAdmin';
import OrderStatusBadge, { ORDER_STATUS_CONFIG, PaymentStatusBadge } from '../../components/order/OrderStatusBadge';
import { FullPageSpinner } from '../../components/ui/Spinner';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { toNumber } from '../../utils/product';

export default function AdminOrders() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [editingOrder, setEditingOrder] = useState(null);
  const [statusForm, setStatusForm] = useState({ status: '', note: '', location: '' });

  const { data, isLoading } = useAdminOrders({ page, limit: 20, status: statusFilter || undefined });
  const updateStatus = useUpdateOrderStatus();

  const orders = data?.items || data?.orders || [];

  const openStatusModal = (order) => {
    setEditingOrder(order);
    setStatusForm({ status: order.status, note: '', location: '' });
  };

  const handleStatusSubmit = (e) => {
    e.preventDefault();
    updateStatus.mutate(
      { id: editingOrder.id, payload: { status: statusForm.status, note: statusForm.note || undefined, location: statusForm.location || undefined } },
      { onSuccess: () => setEditingOrder(null) }
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-headline-lg text-text">Orders</h1>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="h-10 px-3 rounded-standard border border-border bg-surface text-body-sm outline-none"
        >
          <option value="">All statuses</option>
          {Object.entries(ORDER_STATUS_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <FullPageSpinner />
      ) : (
        <div className="bg-surface border border-border rounded-container overflow-x-auto">
          <table className="w-full text-body-sm min-w-[760px]">
            <thead>
              <tr className="border-b border-border text-left text-text-secondary">
                <th className="p-3.5 font-medium">Order</th>
                <th className="p-3.5 font-medium">Customer</th>
                <th className="p-3.5 font-medium">Total</th>
                <th className="p-3.5 font-medium">Status</th>
                <th className="p-3.5 font-medium">Payment</th>
                <th className="p-3.5 font-medium w-28">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-border last:border-0">
                  <td className="p-3.5 text-text font-medium">#{order.orderNumber || order.id}</td>
                  <td className="p-3.5 text-text-secondary">{order.user?.name || order.customerName}</td>
                  <td className="p-3.5 font-mono text-text">₹{toNumber(order.totalAmount).toLocaleString('en-IN')}</td>
                  <td className="p-3.5"><OrderStatusBadge status={order.status} /></td>
                  <td className="p-3.5"><PaymentStatusBadge status={order.paymentStatus} /></td>
                  <td className="p-3.5">
                    <Button variant="link" size="sm" onClick={() => openStatusModal(order)}>Update</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.length === 0 && <p className="text-body-sm text-text-secondary text-center py-10">No orders match this filter.</p>}
        </div>
      )}

      {data?.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="text-body-sm text-text-secondary px-2">Page {page} of {data.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}

      <Modal isOpen={!!editingOrder} onClose={() => setEditingOrder(null)} title={`Update #${editingOrder?.orderNumber || editingOrder?.id}`}>
        <form onSubmit={handleStatusSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-label-md text-text">Status</label>
            <select
              value={statusForm.status}
              onChange={(e) => setStatusForm((f) => ({ ...f, status: e.target.value }))}
              className="h-11 px-3 rounded-standard border border-border bg-surface text-body-md outline-none focus:border-primary"
            >
              {Object.entries(ORDER_STATUS_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
          </div>
          <Input label="Note (optional)" value={statusForm.note} onChange={(e) => setStatusForm((f) => ({ ...f, note: e.target.value }))} />
          <Input label="Location (optional)" value={statusForm.location} onChange={(e) => setStatusForm((f) => ({ ...f, location: e.target.value }))} />
          <Button type="submit" fullWidth isLoading={updateStatus.isPending}>Save update</Button>
        </form>
      </Modal>
    </div>
  );
}
