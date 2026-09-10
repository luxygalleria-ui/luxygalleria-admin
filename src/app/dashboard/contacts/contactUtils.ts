export type ContactStatus = 'NEW' | 'READ' | 'RESOLVED';

export interface IContact {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  status: ContactStatus;
  createdAt: string;
}

export const FILTERS: { key: 'ALL' | ContactStatus; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'NEW', label: 'Unread' },
  { key: 'READ', label: 'Read' },
  { key: 'RESOLVED', label: 'Resolved' },
];

export const STATUS_BADGE: Record<ContactStatus, string> = {
  NEW: 'bg-blue-50 text-blue-600',
  READ: 'bg-slate-100 text-slate-500',
  RESOLVED: 'bg-emerald-50 text-emerald-600',
};

export const STATUS_LABEL: Record<ContactStatus, string> = {
  NEW: 'Unread',
  READ: 'Read',
  RESOLVED: 'Resolved',
};

export const STATUSES: ContactStatus[] = ['NEW', 'READ', 'RESOLVED'];

/**
 * Rows reach us from the API, so treat every field as optional: legacy records
 * predate the `status` field, and a failed request can yield a non-array body.
 * Normalising here means no render site has to guard individually.
 */
export const normalizeContacts = (raw: unknown): IContact[] =>
  (Array.isArray(raw) ? raw : [])
    .filter((c): c is Record<string, unknown> => !!c && typeof c === 'object')
    .map((c) => ({
      ...(c as unknown as IContact),
      _id: String(c._id ?? ''),
      name: String(c.name ?? '').trim() || 'Unknown sender',
      email: String(c.email ?? ''),
      phone: c.phone ? String(c.phone) : undefined,
      subject: c.subject ? String(c.subject) : undefined,
      message: String(c.message ?? ''),
      status: STATUSES.includes(c.status as ContactStatus) ? (c.status as ContactStatus) : 'NEW',
      createdAt: String(c.createdAt ?? ''),
    }));
