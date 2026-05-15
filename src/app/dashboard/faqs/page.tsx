'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';

interface IFaq {
  _id: string;
  question: string;
  answer: string;
  isActive: boolean;
  order: number;
}

export default function FaqsPage() {
  const [faqs, setFaqs] = useState<IFaq[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean, faqId: string | null }>({ isOpen: false, faqId: null });

  // Form State
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [order, setOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);

  const fetchFaqs = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/v1/faqs/admin`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = res.data;
      if (data.success) {
        setFaqs(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch FAQs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaqs();
  }, []);

  const handleAddClick = () => {
    setEditingId(null);
    setQuestion('');
    setAnswer('');
    setOrder(0);
    setIsActive(true);
    setIsAddOpen(true);
  };

  const handleEditClick = (faq: IFaq) => {
    setEditingId(faq._id);
    setQuestion(faq.question);
    setAnswer(faq.answer);
    setOrder(faq.order);
    setIsActive(faq.isActive);
    setIsAddOpen(true);
  };

  const handleClosePanel = () => {
    setIsAddOpen(false);
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!question || !answer) {
      return toast.error('Question and answer are required');
    }
    setSaving(true);
    const token = localStorage.getItem('adminToken');

    const faqData = { question, answer, order, isActive };

    try {
      const url = editingId
        ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/v1/faqs/admin/${editingId}`
        : `${process.env.NEXT_PUBLIC_BACKEND_URL}/v1/faqs/admin`;
      const method = editingId ? 'put' : 'post';

      const res = await axios({
        method,
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        data: faqData
      });

      const data = res.data;
      if (data.success) {
        toast.success(editingId ? 'FAQ updated successfully' : 'FAQ created successfully');
        handleClosePanel();
        fetchFaqs();
      } else {
        toast.error(data.message || 'Failed to save FAQ');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error connecting to backend');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteModal({ isOpen: true, faqId: id });
  };

  const confirmDelete = async () => {
    if (!deleteModal.faqId) return;
    setDeleting(true);
    const token = localStorage.getItem('adminToken');
    try {
      const res = await axios.delete(`${process.env.NEXT_PUBLIC_BACKEND_URL}/v1/faqs/admin/${deleteModal.faqId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = res.data;
      if (data.success) {
        toast.success('FAQ deleted successfully');
        fetchFaqs();
        setDeleteModal({ isOpen: false, faqId: null });
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      console.error(err);
      toast.error('Error deleting FAQ');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto mt-2 pb-12">
      <div className="flex flex-col xl:flex-row gap-6 items-start">

        {/* Left Column: FAQs List */}
        <div className="flex-1 min-w-0 bg-white rounded-[24px] p-6 lg:p-8 shadow-sm border border-slate-100/60 w-full transition-all duration-300">

          <div className="flex items-center justify-between mb-8">
            <h2 className="text-[16px] font-medium text-slate-800">Frequently Asked Questions</h2>
            <button
              onClick={handleAddClick}
              className="bg-[#2563eb] hover:bg-blue-700 text-white px-6 py-2.5 rounded-[12px] font-medium text-[14px] flex items-center gap-2 transition-colors shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Add New FAQ
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-[#f8fafc]">
                  <th className="py-4 px-6 text-[13px] font-semibold text-slate-500 rounded-l-[12px] w-[30%]">Question</th>
                  <th className="py-4 px-6 text-[13px] font-semibold text-slate-500 w-[40%]">Answer</th>
                  <th className="py-4 px-6 text-[13px] font-semibold text-slate-500 w-[10%]">Order</th>
                  <th className="py-4 px-6 text-[13px] font-semibold text-slate-500 w-[10%]">Status</th>
                  <th className="py-4 px-6 text-[13px] font-semibold text-slate-500 rounded-r-[12px] w-[10%]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="py-8 text-center text-slate-500">Loading FAQs...</td></tr>
                ) : faqs.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-slate-500">No FAQs found. Add your first FAQ!</td></tr>
                ) : faqs.map((faq) => (
                  <tr key={faq._id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                    <td className="py-5 px-6 font-bold text-[#111827] text-[15px]">
                      {faq.question}
                    </td>
                    <td className="py-5 px-6 text-[14px] text-slate-700 font-medium leading-snug line-clamp-3">
                      {faq.answer}
                    </td>
                    <td className="py-5 px-6 font-bold text-slate-700">
                      {faq.order}
                    </td>
                    <td className="py-5 px-6">
                      <span className={`inline-flex items-center justify-center px-3 py-1 rounded-[6px] text-[11px] font-bold tracking-wide uppercase ${faq.isActive ? 'bg-[#dcfce7] text-[#16a34a]' : 'bg-[#fee2e2] text-[#dc2626]'}`}>
                        {faq.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td className="py-5 px-6">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditClick(faq)}
                          className="w-[34px] h-[34px] rounded-[8px] bg-[#eff6ff] text-[#3b82f6] hover:bg-blue-100 flex items-center justify-center transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button
                          onClick={() => handleDeleteClick(faq._id)}
                          className="w-[34px] h-[34px] rounded-[8px] bg-[#fef2f2] text-[#ef4444] hover:bg-red-100 flex items-center justify-center transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Add/Edit FAQ Form */}
        {isAddOpen && (
          <div className="w-full xl:w-[420px] shrink-0 bg-white shadow-sm border border-slate-100/60 rounded-[24px] xl:sticky xl:top-[120px] overflow-hidden flex flex-col xl:max-h-[calc(100vh-140px)] transition-all duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-6 lg:px-8 py-6 shrink-0 border-b border-slate-100/60">
              <h2 className="text-[20px] font-bold text-[#111827]">
                {editingId ? 'Edit FAQ' : 'Add New FAQ'}
              </h2>
              <button
                onClick={handleClosePanel}
                className="w-[32px] h-[32px] rounded-full bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            {/* Scrollable Form */}
            <div className="flex-1 overflow-y-auto px-6 lg:px-8 py-6 space-y-6 form-scrollbar">
              {/* Question */}
              <div>
                <label className="block text-[13px] font-bold text-[#111827] mb-2.5">Question</label>
                <input
                  type="text"
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  placeholder="e.g. How long does shipping take?"
                  className="w-full h-[48px] px-4 rounded-[12px] border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] transition-all text-[14px]"
                />
              </div>

              {/* Answer */}
              <div>
                <label className="block text-[13px] font-bold text-[#111827] mb-2.5">Answer</label>
                <textarea
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                  placeholder="Provide the answer here..."
                  className="w-full h-[150px] p-4 rounded-[12px] border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] transition-all text-[14px] resize-none"
                />
              </div>

              {/* Order */}
              <div>
                <label className="block text-[13px] font-bold text-[#111827] mb-2.5">Sort Order</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={order}
                  onChange={e => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setOrder(val ? parseInt(val, 10) : 0);
                  }}
                  placeholder="0"
                  className="w-full h-[48px] px-4 rounded-[12px] border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] transition-all text-[14px]"
                />
                <p className="text-[12px] text-slate-500 mt-1">Lower numbers appear first.</p>
              </div>

              {/* Status */}
              <div>
                <label className="block text-[13px] font-bold text-[#111827] mb-2.5">Status</label>
                <select
                  value={isActive ? 'ACTIVE' : 'INACTIVE'}
                  onChange={e => setIsActive(e.target.value === 'ACTIVE')}
                  className="w-full h-[48px] px-4 rounded-[12px] border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] transition-all text-[14px] appearance-none"
                >
                  <option value="ACTIVE">Active (Visible on website)</option>
                  <option value="INACTIVE">Inactive (Hidden)</option>
                </select>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className={`w-full ${editingId ? 'bg-[#10b981] hover:bg-emerald-600' : 'bg-[#2563eb] hover:bg-blue-700'} text-white h-[48px] rounded-[12px] font-bold text-[15px] transition-colors shadow-sm ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {saving ? 'Saving...' : (editingId ? 'Update FAQ' : 'Create FAQ')}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-[24px] p-8 max-w-[400px] w-full shadow-2xl transform transition-all">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </div>
            <h3 className="text-[20px] font-bold text-center text-slate-900 mb-2">Delete FAQ?</h3>
            <p className="text-slate-500 text-center text-[15px] mb-8 leading-relaxed">
              Are you sure you want to delete this FAQ? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal({ isOpen: false, faqId: null })}
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
