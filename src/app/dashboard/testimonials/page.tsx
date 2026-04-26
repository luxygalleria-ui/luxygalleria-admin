'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

interface ITestimonial {
  _id: string;
  clientName: string;
  clientRole: string;
  review: string;
  rating: number;
  imageUrl?: string;
  status: string;
}

export default function TestimonialsPage() {
  const [testimonials, setTestimonials] = useState<ITestimonial[]>([]);
  const [isAddReviewOpen, setIsAddReviewOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, reviewId: string | null}>({ isOpen: false, reviewId: null });

  // Form State
  const [clientName, setClientName] = useState('');
  const [clientRole, setClientRole] = useState('');
  const [review, setReview] = useState('');
  const [rating, setRating] = useState(5);
  const [imageUrl, setImageUrl] = useState('');
  const [status, setStatus] = useState('ACTIVE');

  const fetchTestimonials = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/v1/testimonials');
      const data = await res.json();
      if (data.success) {
        setTestimonials(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch testimonials', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const handleAddClick = () => {
    setEditingId(null);
    setClientName('');
    setClientRole('');
    setReview('');
    setRating(5);
    setImageUrl('');
    setStatus('ACTIVE');
    setIsAddReviewOpen(true);
  };

  const handleEditClick = (testimonial: ITestimonial) => {
    setEditingId(testimonial._id);
    setClientName(testimonial.clientName);
    setClientRole(testimonial.clientRole);
    setReview(testimonial.review);
    setRating(testimonial.rating);
    setImageUrl(testimonial.imageUrl || '');
    setStatus(testimonial.status);
    setIsAddReviewOpen(true);
  };

  const handleClosePanel = () => {
    setIsAddReviewOpen(false);
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!clientName || !clientRole || !review) {
      return toast.error('Client name, role, and review are required');
    }
    setSaving(true);
    const token = localStorage.getItem('adminToken');
    
    const testimonialData = { clientName, clientRole, review, rating, imageUrl, status };

    try {
      const url = editingId 
        ? `http://localhost:5000/api/v1/testimonials/${editingId}` 
        : 'http://localhost:5000/api/v1/testimonials';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(testimonialData)
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success(editingId ? 'Review updated successfully' : 'Review created successfully');
        handleClosePanel();
        fetchTestimonials();
      } else {
        toast.error(data.message || 'Failed to save review');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error connecting to backend');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteModal({ isOpen: true, reviewId: id });
  };

  const confirmDelete = async () => {
    if(!deleteModal.reviewId) return;
    setDeleting(true);
    const token = localStorage.getItem('adminToken');
    try {
      const res = await fetch(`http://localhost:5000/api/v1/testimonials/${deleteModal.reviewId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Review deleted successfully');
        fetchTestimonials();
        setDeleteModal({ isOpen: false, reviewId: null });
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      console.error(err);
      toast.error('Error deleting review');
    } finally {
      setDeleting(false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch(status.toUpperCase()) {
      case 'ACTIVE':
        return 'bg-[#dcfce7] text-[#16a34a]';
      case 'INACTIVE':
        return 'bg-[#fee2e2] text-[#dc2626]';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(star => (
          <svg 
            key={`display-star-${star}`} 
            xmlns="http://www.w3.org/2000/svg" 
            width="14" 
            height="14" 
            viewBox="0 0 24 24" 
            fill={star <= rating ? "#eab308" : "#e2e8f0"} 
            stroke="none"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-[1600px] mx-auto mt-2 pb-12">
      <div className="flex flex-col xl:flex-row gap-6 items-start">
        
        {/* Left Column: Testimonials List */}
        <div className="flex-1 min-w-0 bg-white rounded-[24px] p-6 lg:p-8 shadow-sm border border-slate-100/60 w-full transition-all duration-300">
          
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-[16px] font-medium text-slate-800">Client Testimonials</h2>
            <button 
              onClick={handleAddClick}
              className="bg-[#2563eb] hover:bg-blue-700 text-white px-6 py-2.5 rounded-[12px] font-medium text-[14px] flex items-center gap-2 transition-colors shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Add New Review
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-[#f8fafc]">
                  <th className="py-4 px-6 text-[13px] font-semibold text-slate-500 rounded-l-[12px] w-[25%]">Client</th>
                  <th className="py-4 px-6 text-[13px] font-semibold text-slate-500 w-[35%]">Review</th>
                  <th className="py-4 px-6 text-[13px] font-semibold text-slate-500 w-[15%]">Rating</th>
                  <th className="py-4 px-6 text-[13px] font-semibold text-slate-500 w-[10%]">Status</th>
                  <th className="py-4 px-6 text-[13px] font-semibold text-slate-500 rounded-r-[12px] w-[15%]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="py-8 text-center text-slate-500">Loading reviews...</td></tr>
                ) : testimonials.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-slate-500">No reviews found. Add your first review!</td></tr>
                ) : testimonials.map((testimonial) => (
                  <tr key={testimonial._id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                    <td className="py-5 px-6">
                      <div className="flex items-center gap-3">
                        {testimonial.imageUrl ? (
                          <img src={testimonial.imageUrl} alt={testimonial.clientName} className="w-[40px] h-[40px] rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-[40px] h-[40px] rounded-full flex items-center justify-center text-white font-bold text-[16px] shrink-0 bg-[#3b82f6]">
                            {testimonial.clientName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="font-bold text-[#111827] text-[15px]">{testimonial.clientName}</span>
                          <span className="text-[13px] text-slate-400 font-medium">{testimonial.clientRole}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-5 px-6 text-[15px] text-slate-700 font-medium leading-snug">
                      {testimonial.review}
                    </td>
                    <td className="py-5 px-6">
                      {renderStars(testimonial.rating)}
                    </td>
                    <td className="py-5 px-6">
                      <span className={`inline-flex items-center justify-center px-3 py-1 rounded-[6px] text-[11px] font-bold tracking-wide uppercase ${getStatusStyle(testimonial.status)}`}>
                        {testimonial.status}
                      </span>
                    </td>
                    <td className="py-5 px-6">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleEditClick(testimonial)}
                          className="w-[34px] h-[34px] rounded-[8px] bg-[#eff6ff] text-[#3b82f6] hover:bg-blue-100 flex items-center justify-center transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(testimonial._id)}
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

        {/* Right Column: Add/Edit Review Form */}
        {isAddReviewOpen && (
          <div className="w-full xl:w-[420px] shrink-0 bg-white shadow-sm border border-slate-100/60 rounded-[24px] xl:sticky xl:top-[120px] overflow-hidden flex flex-col xl:max-h-[calc(100vh-140px)] transition-all duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-6 lg:px-8 py-6 shrink-0">
              <h2 className="text-[20px] font-bold text-[#111827]">
                {editingId ? 'Edit Review' : 'Add New Review'}
              </h2>
              <button 
                onClick={handleClosePanel}
                className="w-[32px] h-[32px] rounded-full bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            {/* Scrollable Form */}
            <div className="flex-1 overflow-y-auto px-6 lg:px-8 pb-8 space-y-6 form-scrollbar">
              {/* Client Name */}
              <div>
                <label className="block text-[13px] font-bold text-[#111827] mb-2.5">Client Name</label>
                <input 
                  type="text" 
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  className="w-full h-[48px] px-4 rounded-[12px] border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] transition-all text-[14px]" 
                />
              </div>

              {/* Client Subtitle/Type */}
              <div>
                <label className="block text-[13px] font-bold text-[#111827] mb-2.5">Role / Title</label>
                <input 
                  type="text" 
                  value={clientRole}
                  onChange={e => setClientRole(e.target.value)}
                  placeholder="e.g. Verified Buyer"
                  className="w-full h-[48px] px-4 rounded-[12px] border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] transition-all text-[14px]" 
                />
              </div>

              {/* Review Text */}
              <div>
                <label className="block text-[13px] font-bold text-[#111827] mb-2.5">Review Message</label>
                <textarea 
                  value={review}
                  onChange={e => setReview(e.target.value)}
                  placeholder="Write the client's review here..."
                  className="w-full h-[100px] p-4 rounded-[12px] border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] transition-all text-[14px] resize-none" 
                />
              </div>

              {/* Rating */}
              <div>
                <label className="block text-[13px] font-bold text-[#111827] mb-2.5">Rating (1-5 Stars)</label>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-1 cursor-pointer">
                    {[1, 2, 3, 4, 5].map(star => (
                      <svg 
                        key={`form-star-${star}`} 
                        onClick={() => setRating(star)}
                        xmlns="http://www.w3.org/2000/svg" 
                        width="22" 
                        height="22" 
                        viewBox="0 0 24 24" 
                        fill={star <= rating ? "#eab308" : "#e2e8f0"} 
                        stroke="none"
                        className="transition-colors hover:fill-[#eab308]"
                      >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                      </svg>
                    ))}
                  </div>
                  <span className="text-[15px] font-bold text-[#111827]">
                    {rating} Stars
                  </span>
                </div>
              </div>

              {/* Profile Image URL */}
              <div>
                <label className="block text-[13px] font-bold text-[#111827] mb-2.5">Profile Image URL (Optional)</label>
                <input 
                  type="text" 
                  value={imageUrl}
                  onChange={e => setImageUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full h-[48px] px-4 rounded-[12px] border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] transition-all text-[14px]" 
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-[13px] font-bold text-[#111827] mb-2.5">Status</label>
                <select 
                  value={status}
                  onChange={e => setStatus(e.target.value)}
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
                  {saving ? 'Saving...' : (editingId ? 'Update Review' : 'Create Review')}
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
            <h3 className="text-[20px] font-bold text-center text-slate-900 mb-2">Delete Review?</h3>
            <p className="text-slate-500 text-center text-[15px] mb-8 leading-relaxed">
              Are you sure you want to delete this client review? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteModal({ isOpen: false, reviewId: null })}
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
