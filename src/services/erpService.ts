export interface ErpEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: ErpPagination;
  errors?: { code?: string; field?: string; message?: string }[];
}

export interface ErpOrderSummary {
  orderId: string;
  createdAt: string;
  updatedAt: string;
  orderStatus: string;
  paymentStatus: string;
  currency: string;
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  customer: { customerId: string; name: string | null; email: string | null };
  items: { productId: string; variantId: string; sku: string | null; name: string | null; size: string | null; quantity: number; unitPrice: number; lineTotal: number }[];
  erp: { erpOrderId: string | null; trackingNumber: string | null };
}

export interface ErpOrderDetails extends ErpOrderSummary {
  customer: ErpOrderSummary['customer'] & { phone: string | null };
  shippingAddress: { street: string; city: string; state: string; zipCode: string; country: string };
  payment: { method: string; status: string; gatewayOrderId: string | null; gatewayPaymentId: string | null };
  statusUpdatedAt: string | null;
}

export interface ErpItem {
  productId: string;
  name: string;
  description: string;
  category: string;
  images: string[];
  status: string;
  updatedAt: string;
  variants: {
    variantId: string;
    sku: string | null;
    name: string | null;
    size: string | null;
    flavor: string | null;
    offerPrice: number;
    actualPrice: number | null;
    stock: number;
    weight: number;
    image: string | null;
  }[];
}

export interface ErpPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export class ErpApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
    this.name = 'ErpApiError';
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<ErpEnvelope<T>> {
  const response = await fetch(`/api/erp/${path.replace(/^\/+/, '')}`, {
    ...init,
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {
      ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...init.headers,
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    const details = payload?.errors?.map((entry: { field?: string; message?: string }) => [entry.field, entry.message].filter(Boolean).join(': ')).filter(Boolean).join('; ');
    throw new ErpApiError(details || payload?.message || `ERP request failed (${response.status})`, response.status, payload?.errors?.[0]?.code);
  }
  return payload as ErpEnvelope<T>;
}

export const erpService = {
  listOrders(page = 1, limit = 25) {
    return request<ErpOrderSummary[]>(`orders?page=${page}&limit=${limit}`);
  },
  getOrder(orderId: string) {
    return request<ErpOrderDetails>(`orders/${encodeURIComponent(orderId)}`);
  },
  listItems(page = 1, limit = 50, search = '') {
    const query = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search.trim()) query.set('search', search.trim());
    return request<{ items: ErpItem[]; pagination: ErpPagination }>(`items?${query}`);
  },
  getItem(sku: string) {
    return request<{ productId: string; name: string; description: string; category: string; images: string[]; variant: ErpItem['variants'][number] }>(`items/${encodeURIComponent(sku)}`);
  },
  createItem(body: Record<string, unknown>) {
    return request('items', { method: 'POST', body: JSON.stringify(body) });
  },
  updateItem(sku: string, body: Record<string, unknown>) {
    return request(`items/${encodeURIComponent(sku)}`, { method: 'PATCH', body: JSON.stringify(body) });
  },
  updateStock(sku: string, body: { quantity: number; asOf: string }) {
    return request<{ quantity: number; previousQuantity: number; pendingOrderQuantity: number; applied: boolean }>(`stock/${encodeURIComponent(sku)}`, { method: 'PUT', body: JSON.stringify(body) });
  },
  sendOrderStatus(body: Record<string, unknown>) {
    return request('webhooks/order-status', { method: 'POST', body: JSON.stringify(body) });
  },
  uploadImage(file: File) {
    const form = new FormData();
    form.append('image', file, file.name);
    return request<{ url: string; bytes: number; contentType: string }>('images', { method: 'POST', body: form });
  },
};