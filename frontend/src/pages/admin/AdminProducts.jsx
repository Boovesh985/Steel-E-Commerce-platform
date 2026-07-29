import { useRef, useState } from 'react';
import { Plus, Pencil, Trash2, Upload } from 'lucide-react';
import { useProductList, useFlatCategories } from '../../hooks/useProducts';
import { useCreateProduct, useUpdateProduct, useDeleteProduct, useBulkImportProducts } from '../../hooks/useAdmin';
import { FullPageSpinner } from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { useToastStore } from '../../stores/toastStore';
import { STOCK_LABELS, aggregateStock, productThumbnail, productPrice } from '../../utils/product';

const emptyForm = {
  name: '', categoryId: '', sku: '', brand: '', hsnCode: '', gstRate: '18',
  baseUnit: 'kg', pricePerUnit: '', discountPrice: '', minOrderQty: '1',
  description: '', imageUrl: '', specificationsJson: '{}',
};

export default function AdminProducts() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const fileInputRef = useRef(null);

  // There's no dedicated admin product-list endpoint — reuse the public
  // catalog listing (it already returns isActive products, including any
  // filters/pagination we pass).
  const { data, isLoading } = useProductList({ page, limit: 20, q: search || undefined });
  const { data: categories } = useFlatCategories();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const bulkImport = useBulkImportProducts();

  const products = data?.items || data?.products || [];

  const openCreate = () => { setEditingProduct(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      categoryId: product.categoryId,
      sku: product.sku,
      brand: product.brand || '',
      hsnCode: product.hsnCode || '',
      gstRate: String(product.gstRate ?? '18'),
      baseUnit: product.baseUnit,
      pricePerUnit: String(product.pricePerUnit ?? ''),
      discountPrice: product.discountPrice ? String(product.discountPrice) : '',
      minOrderQty: String(product.minOrderQty ?? '1'),
      description: product.description || '',
      imageUrl: productThumbnail(product) || '',
      specificationsJson: JSON.stringify(product.specifications || {}, null, 2),
    });
    setModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    let specifications;
    try {
      specifications = JSON.parse(form.specificationsJson || '{}');
    } catch {
      useToastStore.getState().error('Specifications must be valid JSON, e.g. {"grade": "Fe 500D"}.');
      return;
    }
    const payload = {
      name: form.name,
      categoryId: form.categoryId,
      sku: form.sku,
      brand: form.brand || undefined,
      hsnCode: form.hsnCode || undefined,
      gstRate: Number(form.gstRate) || 18,
      baseUnit: form.baseUnit,
      pricePerUnit: Number(form.pricePerUnit),
      discountPrice: form.discountPrice ? Number(form.discountPrice) : undefined,
      minOrderQty: Number(form.minOrderQty) || 1,
      description: form.description || undefined,
      specifications,
      // Not explicitly documented for create/update, but Product has an
      // `images` relation — sending a single-image array is a reasonable
      // best effort; confirm this against your actual handler.
      images: form.imageUrl ? [{ url: form.imageUrl, displayOrder: 0 }] : undefined,
    };
    if (editingProduct) {
      updateProduct.mutate({ id: editingProduct.id, payload }, { onSuccess: () => setModalOpen(false) });
    } else {
      createProduct.mutate(payload, { onSuccess: () => setModalOpen(false) });
    }
  };

  // POST /admin/products/import expects { products: Product[] } as JSON —
  // not a CSV/multipart upload — so this reads a .json file containing an array.
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const list = Array.isArray(parsed) ? parsed : parsed.products;
        if (!Array.isArray(list)) throw new Error('Expected a JSON array of products.');
        bulkImport.mutate(list);
      } catch {
        useToastStore.getState().error('Could not parse that file — expected a JSON array of products.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-headline-lg text-text">Products</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} isLoading={bulkImport.isPending} leftIcon={<Upload className="w-4 h-4" />}>
            Bulk import (.json)
          </Button>
          <input ref={fileInputRef} type="file" accept="application/json" hidden onChange={handleFileSelect} />
          <Button size="sm" onClick={openCreate} leftIcon={<Plus className="w-4 h-4" />}>
            New product
          </Button>
        </div>
      </div>

      <input
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        placeholder="Search products by name…"
        className="w-full max-w-sm h-10 px-3 rounded-standard border border-border bg-surface text-body-sm outline-none focus:border-primary mb-4"
      />

      {isLoading ? (
        <FullPageSpinner />
      ) : (
        <div className="bg-surface border border-border rounded-container overflow-x-auto">
          <table className="w-full text-body-sm min-w-[760px]">
            <thead>
              <tr className="border-b border-border text-left text-text-secondary">
                <th className="p-3.5 font-medium">Product</th>
                <th className="p-3.5 font-medium">SKU</th>
                <th className="p-3.5 font-medium">Price</th>
                <th className="p-3.5 font-medium">Stock</th>
                <th className="p-3.5 font-medium">Status</th>
                <th className="p-3.5 font-medium w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const { available, status } = aggregateStock(product);
                const stock = STOCK_LABELS[status];
                return (
                  <tr key={product.id} className="border-b border-border last:border-0">
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <img src={productThumbnail(product) || 'https://placehold.co/80x80?text=AMK'} alt="" className="w-9 h-9 rounded-standard object-cover bg-bg flex-shrink-0" />
                        <span className="text-text font-medium line-clamp-1">{product.name}</span>
                      </div>
                    </td>
                    <td className="p-3.5 text-text-secondary font-mono">{product.sku}</td>
                    <td className="p-3.5 font-mono text-text">₹{productPrice(product).toLocaleString('en-IN')}</td>
                    <td className="p-3.5 font-mono text-text">{available}</td>
                    <td className="p-3.5">
                      <Badge variant={stock.variant} withDot>{stock.label}</Badge>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(product)} className="text-text-secondary hover:text-primary"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => deleteProduct.mutate(product.id)} className="text-text-secondary hover:text-danger" title="Deactivate"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {products.length === 0 && <p className="text-body-sm text-text-secondary text-center py-10">No products found.</p>}
        </div>
      )}

      {data?.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="text-body-sm text-text-secondary px-2">Page {page} of {data.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingProduct ? 'Edit product' : 'New product'} size="lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Product name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-label-md text-text">Category</label>
              <select
                value={form.categoryId}
                onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                required
                className="h-11 px-3 rounded-standard border border-border bg-surface text-body-md outline-none focus:border-primary"
              >
                <option value="">Select category</option>
                {categories?.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
            </div>
            <Input label="SKU" required value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Brand" value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} />
            <Input label="HSN code" value={form.hsnCode} onChange={(e) => setForm((f) => ({ ...f, hsnCode: e.target.value }))} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Price/unit (₹)" type="number" required value={form.pricePerUnit} onChange={(e) => setForm((f) => ({ ...f, pricePerUnit: e.target.value }))} />
            <Input label="Discount price (₹)" type="number" value={form.discountPrice} onChange={(e) => setForm((f) => ({ ...f, discountPrice: e.target.value }))} />
            <Input label="Base unit" required value={form.baseUnit} onChange={(e) => setForm((f) => ({ ...f, baseUnit: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Min order qty" type="number" required value={form.minOrderQty} onChange={(e) => setForm((f) => ({ ...f, minOrderQty: e.target.value }))} />
            <Input label="GST rate (%)" type="number" value={form.gstRate} onChange={(e) => setForm((f) => ({ ...f, gstRate: e.target.value }))} />
          </div>
          <Input label="Image URL" value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} hint="Best effort — no dedicated image-upload endpoint is documented." />
          <div className="flex flex-col gap-1.5">
            <label className="text-label-md text-text">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              className="rounded-standard border border-border p-3 text-body-sm outline-none focus:border-primary resize-none"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-label-md text-text">Specifications (JSON)</label>
            <textarea
              value={form.specificationsJson}
              onChange={(e) => setForm((f) => ({ ...f, specificationsJson: e.target.value }))}
              rows={3}
              placeholder='{"grade": "Fe 500D", "diameterMm": 12}'
              className="rounded-standard border border-border p-3 text-body-sm font-mono outline-none focus:border-primary resize-none"
            />
          </div>
          <Button type="submit" fullWidth isLoading={createProduct.isPending || updateProduct.isPending}>
            {editingProduct ? 'Save changes' : 'Create product'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
