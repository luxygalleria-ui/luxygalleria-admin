'use client';

import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import axios, { isUnauthenticated } from '../../../services/apiClient';
import { Mail, Phone, Calendar, Check, Trash2, Search, Archive, RotateCcw } from 'lucide-react';

import {
  ContactStatus,
  IContact,
  FILTERS,
  STATUS_BADGE,
  STATUS_LABEL,
  normalizeContacts,
} from './contactUtils';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<IContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | ContactStatus>('ALL');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; contactId: string | null }>({ isOpen: false, contactId: null });
  const [deleting, setDeleting] = useState(false);

  // Debounce the search box so typing does not fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;

    const fetchContacts = async () => {
      setLoading(true);
      try {
        const params: Record<string, string> = {};
        if (statusFilter !== 'ALL') params.status = statusFilter;
        if (debouncedSearch) params.search = debouncedSearch;

        const res = await axios.get('/contacts', { params });
        if (!cancelled) {
          setContacts(normalizeContacts(res.data?.data));
        }
      } catch (err) {
        if (cancelled || isUnauthenticated(err)) return;
        console.error('Failed to fetch contacts', err);
        setContacts([]);
        toast.error('Failed to load messages');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchContacts();
    return () => { cancelled = true; };
  }, [statusFilter, debouncedSearch]);

  const unreadCount = useMemo(
    () => contacts.filter((c) => c.status === 'NEW').length,
    [contacts]
  );

  const setStatus = async (id: string, status: ContactStatus) => {
    const previous = contacts;
    // Optimistic: the row updates immediately, and rolls back if the call fails.
    setContacts((cs) => cs.map((c) => (c._id === id ? { ...c, status } : c)));
    try {
      await axios.put(`/contacts/${id}/status`, { status });
      toast.success(status === 'RESOLVED' ? 'Marked as resolved' : status === 'READ' ? 'Marked as read' : 'Marked as unread');
    } catch (err) {
      if (isUnauthenticated(err)) return;
      console.error(err);
      setContacts(previous);
      toast.error('Failed to update message');
    }
  };

  const confirmDelete = async () => {
    if (!deleteModal.contactId) return;
    setDeleting(true);
    try {
      const res = await axios.delete(`/contacts/${deleteModal.contactId}`);
      if (res.data.success) {
        toast.success('Message deleted');
        setContacts((cs) => cs.filter((c) => c._id !== deleteModal.contactId));
        setDeleteModal({ isOpen: false, contactId: null });
      }
    } catch (err) {
      if (isUnauthenticated(err)) return;
      console.error(err);
      toast.error('Error deleting message');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto mt-2 pb-12">
      <div className="bg-white rounded-[24px] p-6 lg:p-8 shadow-sm border border-slate-100/60 w-full transition-all duration-300">

        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h2 className="text-[18px] font-bold text-slate-800 flex items-center gap-2">
            <Mail className="text-blue-500" size={24} />
            Messages
          </h2>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <div className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-sm font-semibold">
                {unreadCount} Unread
              </div>
            )}
            <div className="bg-slate-100 text-slate-600 px-4 py-1.5 rounded-full text-sm font-semibold">
              {contacts.length} Shown
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <div className="flex flex-wrap items-center gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  statusFilter === f.key
                    ? 'bg-[#8B5E34] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="relative flex-1 min-w-[220px]">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, subject or message..."
              aria-label="Search messages"
              className="w-full h-[42px] pl-10 pr-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#8B5E34]/30 focus:border-[#8B5E34]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full py-12 text-center text-slate-500 font-medium">Loading messages...</div>
          ) : contacts.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-500 font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              {debouncedSearch || statusFilter !== 'ALL'
                ? 'No messages match this filter.'
                : 'No messages found yet.'}
            </div>
          ) : (
            contacts.map((contact) => (
              <div
                key={contact._id}
                className={`relative rounded-2xl p-6 border transition-all duration-200 ${
                  contact.status === 'NEW'
                    ? 'bg-white border-blue-200 shadow-[0_4px_20px_-4px_rgba(59,130,246,0.1)]'
                    : 'bg-slate-50 border-slate-200/60'
                }`}
              >
                {contact.status === 'NEW' && (
                  <span className="absolute -top-2 -right-2 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-500"></span>
                  </span>
                )}

                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">{contact.name}</h3>
                    <div className="flex items-center gap-1.5 text-slate-500 text-sm mt-1">
                      <Mail size={14} />
                      <a href={`mailto:${contact.email}`} className="hover:text-blue-600 hover:underline">{contact.email}</a>
                    </div>
                    {contact.phone && (
                      <div className="flex items-center gap-1.5 text-slate-500 text-sm mt-1">
                        <Phone size={14} />
                        <a href={`tel:${contact.phone}`} className="hover:text-blue-600 hover:underline">{contact.phone}</a>
                      </div>
                    )}
                  </div>
                  <span className={`shrink-0 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${STATUS_BADGE[contact.status] ?? STATUS_BADGE.NEW}`}>
                    {STATUS_LABEL[contact.status] ?? STATUS_LABEL.NEW}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-4">
                  <Calendar size={12} />
                  {Number.isNaN(new Date(contact.createdAt).getTime())
                    ? 'Date unknown'
                    : new Date(contact.createdAt).toLocaleString()}
                </div>

                {contact.subject && (
                  <div className="text-sm font-semibold text-slate-700 mb-2 bg-slate-100 px-3 py-1.5 rounded-lg inline-block">
                    {contact.subject}
                  </div>
                )}

                <div className="text-slate-600 text-sm leading-relaxed mb-6 bg-white p-4 rounded-xl border border-slate-100 whitespace-pre-wrap h-[120px] overflow-y-auto form-scrollbar">
                  {contact.message}
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                  {contact.status === 'NEW' ? (
                    <button
                      onClick={() => setStatus(contact._id, 'READ')}
                      className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                    >
                      <Check size={16} /> Mark Read
                    </button>
                  ) : (
                    <button
                      onClick={() => setStatus(contact._id, 'NEW')}
                      title="Mark as unread"
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                    >
                      <RotateCcw size={15} /> Unread
                    </button>
                  )}

                  {contact.status !== 'RESOLVED' && (
                    <button
                      onClick={() => setStatus(contact._id, 'RESOLVED')}
                      title="Mark as resolved"
                      className="w-[40px] h-[40px] shrink-0 flex items-center justify-center bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl transition-colors"
                    >
                      <Archive size={17} />
                    </button>
                  )}

                  <button
                    onClick={() => setDeleteModal({ isOpen: true, contactId: contact._id })}
                    title="Delete message"
                    className="w-[40px] h-[40px] shrink-0 flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-[24px] p-8 max-w-[400px] w-full shadow-2xl transform transition-all">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 className="text-red-500" size={28} />
            </div>
            <h3 className="text-[20px] font-bold text-center text-slate-900 mb-2">Delete Message?</h3>
            <p className="text-slate-500 text-center text-[15px] mb-8 leading-relaxed">
              Are you sure you want to delete this message? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal({ isOpen: false, contactId: null })}
                disabled={deleting}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 h-[48px] rounded-[14px] font-bold text-[15px] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className={`flex-1 bg-red-500 hover:bg-red-600 text-white h-[48px] rounded-[14px] font-bold text-[15px] transition-colors shadow-sm shadow-red-500/20 ${deleting ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
