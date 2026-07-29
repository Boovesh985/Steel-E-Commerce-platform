// Shared helpers for reading the catalog backend's shape:
// - Decimal fields (pricePerUnit, discountPrice, unitPrice, subtotal, gstAmount,
//   totalAmount) commonly serialize as strings over JSON — always coerce with toNumber.
// - Images come back as ProductImage[] ({ url, displayOrder }), not string[].
// - There's no single stockStatus/stockQty field — stock lives in an
//   Inventory[] array (one row per warehouse) and must be aggregated.

export function toNumber(value, fallback = 0) {
  if (value === null || value === undefined) return fallback;
  const n = Number(value);
  return Number.isNaN(n) ? fallback : n;
}

export function formatINR(value) {
  return `₹${toNumber(value).toLocaleString('en-IN')}`;
}

export function productThumbnail(product) {
  const images = [...(product?.images || [])].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  return images[0]?.url || null;
}

export function productImageUrls(product) {
  const images = [...(product?.images || [])].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  return images.map((img) => img.url);
}

export function productPrice(product) {
  const discount = toNumber(product?.discountPrice, null);
  const base = toNumber(product?.pricePerUnit);
  return discount && discount > 0 && discount < base ? discount : base;
}

export function productOriginalPrice(product) {
  return toNumber(product?.pricePerUnit);
}

/**
 * Aggregates a product's stock into a single available quantity and status.
 * The list endpoint pre-computes totalStock/inStock (no inventory[] sent).
 * The detail endpoint sends full inventory[] rows (one per warehouse).
 * This function handles both shapes.
 */
export function aggregateStock(product) {
  // Fast path: backend already computed totalStock (list endpoint)
  if (product?.totalStock !== undefined || product?.inStock !== undefined) {
    const available = toNumber(product.totalStock);
    let status = 'in_stock';
    if (available <= 0) status = 'out_of_stock';
    else if (available <= 10) status = 'low_stock';
    return { available, status };
  }

  // Detail endpoint: aggregate from inventory[] rows
  const rows = product?.inventory || [];
  const available = rows.reduce((sum, row) => sum + Math.max(0, toNumber(row.quantityAvailable) - toNumber(row.quantityReserved)), 0);
  const reorderLevel = rows.length ? Math.max(...rows.map((r) => toNumber(r.reorderLevel, 10))) : 10;

  let status = 'in_stock';
  if (available <= 0) status = 'out_of_stock';
  else if (available <= reorderLevel) status = 'low_stock';

  return { available, status };
}

export const STOCK_LABELS = {
  in_stock: { label: 'In stock', variant: 'success' },
  low_stock: { label: 'Low stock', variant: 'warning' },
  out_of_stock: { label: 'Out of stock', variant: 'danger' },
};
