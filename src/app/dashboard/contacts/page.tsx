'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import axios from '../../../services/apiClient';
import { Mail, Phone, Calendar, Check, Trash2 } from 'lucide-react';

interface IContact {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<IContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, contactId: string | null}>({ isOpen: false, contactId: null });
  const [deleting, setDeleting] = useState(false);

  const fetchContacts = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.get(`/contacts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = res.data;
      if (data.success) {
        setContacts(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch contacts', err);
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.put(`/contacts/${id}/read`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.data.success) {
        toast.success('Marked as read');
        setContacts(contacts.map(c => c._id === id ? { ...c, isRead: true } : c));
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to mark as read');
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteModal({ isOpen: true, contactId: id });
  };

  const confirmDelete = async () => {
    if(!deleteModal.contactId) return;
    setDeleting(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.delete(`/contacts/${deleteModal.contactId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.data.success) {
        toast.success('Contact message deleted');
        setContacts(contacts.filter(c => c._id !== deleteModal.contactId));
        setDeleteModal({ isOpen: false, contactId: null });
      }
    } catch (err) {
      console.error(err);
      toast.error('Error deleting message');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto mt-2 pb-12">
      <div className="bg-white rounded-[24px] p-6 lg:p-8 shadow-sm border border-slate-100/60 w-full transition-all duration-300">
        
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-[18px] font-bold text-slate-800 flex items-center gap-2">
            <Mail className="text-blue-500" size={24} />
            Contact Form Submissions
          </h2>
          <div className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-sm font-semibold">
            {contacts.length} Total
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full py-12 text-center text-slate-500 font-medium">Loading messages...</div>
          ) : contacts.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-500 font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              No messages found yet.
            </div>
          ) : (
            contacts.map((contact) => (
              <div 
                key={contact._id} 
                className={`relative rounded-2xl p-6 border transition-all duration-200 ${
                  contact.isRead 
                    ? 'bg-slate-50 border-slate-200/60' 
                    : 'bg-white border-blue-200 shadow-[0_4px_20px_-4px_rgba(59,130,246,0.1)]'
                }`}
              >
                {!contact.isRead && (
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
                </div>

                <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-4">
                  <Calendar size={12} />
                  {new Date(contact.createdAt).toLocaleString()}
                </div>

                {contact.subject && (
                  <div className="text-sm font-semibold text-slate-700 mb-2 bg-slate-100 px-3 py-1.5 rounded-lg inline-block">
                    {contact.subject}
                  </div>
                )}
                
                <div className="text-slate-600 text-sm leading-relaxed mb-6 bg-white p-4 rounded-xl border border-slate-100 whitespace-pre-wrap h-[120px] overflow-y-auto form-scrollbar">
                  {contact.message}
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                  {!contact.isRead ? (
                    <button 
                      onClick={() => handleMarkAsRead(contact._id)}
                      className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 px-4 py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                    >
                      <Check size={16} /> Mark as Read
                    </button>
                  ) : (
                    <div className="flex-1 text-slate-400 text-sm font-medium flex items-center justify-center gap-2">
                      <Check size={16} /> Read
                    </div>
                  )}
                  <button 
                    onClick={() => handleDeleteClick(contact._id)}
                    className="w-[40px] h-[40px] flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-colors"
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
