'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import axios from '../../../services/apiClient';

interface IVideoTestimonial {
  _id: string;
  clientName: string;
  role: string;
  youtubeUrl: string;
  youtubeId: string;
  thumbnailUrl: string;
  displayOrder: number;
  isActive: boolean;
}

export default function VideoTestimonialsPage() {
  const [testimonials, setTestimonials] = useState<IVideoTestimonial[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; testimonialId: string | null }>({ isOpen: false, testimonialId: null });

  // Form State
  const [clientName, setClientName] = useState('');
  const [role, setRole] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [displayOrder, setDisplayOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);

  // Drag and Drop State
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const fetchTestimonials = async () => {
    try {
      const res = await axios.get('/video-testimonials');
      const data = res.data;
      if (data.success) {
        setTestimonials(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch video testimonials', err);
      toast.error('Failed to load video testimonials');
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
    setRole('');
    setYoutubeUrl('');
    // Auto-calculate next display order
    const nextOrder = testimonials.length > 0 ? Math.max(...testimonials.map(t => t.displayOrder || 0)) + 1 : 1;
    setDisplayOrder(nextOrder);
    setIsActive(true);
    setIsAddOpen(true);
  };

  const handleEditClick = (testimonial: IVideoTestimonial) => {
    setEditingId(testimonial._id);
    setClientName(testimonial.clientName);
    setRole(testimonial.role);
    setYoutubeUrl(testimonial.youtubeUrl);
    setDisplayOrder(testimonial.displayOrder);
    setIsActive(testimonial.isActive);
    setIsAddOpen(true);
  };

  const handleClosePanel = () => {
    setIsAddOpen(false);
    setEditingId(null);
  };

  // Helper to get YouTube ID on the frontend for live preview
  const getYoutubeId = (url: string): string | null => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/|live\/)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleSubmit = async () => {
    if (!clientName.trim()) {
      return toast.error('Client name is required');
    }
    if (!role.trim()) {
      return toast.error('Role is required');
    }
    if (!youtubeUrl.trim()) {
      return toast.error('YouTube URL is required');
    }
    
    const ytId = getYoutubeId(youtubeUrl);
    if (!ytId) {
      return toast.error('Invalid YouTube URL. Please enter a valid YouTube link.');
    }

    setSaving(true);
    const token = localStorage.getItem('adminToken');
    const payload = { clientName, role, youtubeUrl, displayOrder, isActive };

    try {
      const url = editingId 
        ? `/video-testimonials/${editingId}` 
        : `/video-testimonials`;
      const method = editingId ? 'put' : 'post';

      const res = await axios({
        method,
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        data: payload
      });
      
      const data = res.data;
      if (data.success) {
        toast.success(editingId ? 'Video testimonial updated' : 'Video testimonial created');
        handleClosePanel();
        fetchTestimonials();
      } else {
        toast.error(data.message || 'Failed to save testimonial');
      }
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message || 'Error connecting to backend';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteModal({ isOpen: true, testimonialId: id });
  };

  const confirmDelete = async () => {
    if (!deleteModal.testimonialId) return;
    setDeleting(true);
    const token = localStorage.getItem('adminToken');
    try {
      const res = await axios.delete(`/video-testimonials/${deleteModal.testimonialId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = res.data;
      if (data.success) {
        toast.success('Video testimonial deleted');
        fetchTestimonials();
        setDeleteModal({ isOpen: false, testimonialId: null });
      } else {
        toast.error(data.message || 'Failed to delete testimonial');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Error deleting testimonial');
    } finally {
      setDeleting(false);
    }
  };

  // Inline active status toggler
  const handleToggleActive = async (testimonial: IVideoTestimonial) => {
    const token = localStorage.getItem('adminToken');
    const updatedStatus = !testimonial.isActive;
    
    // Optimistic UI update
    setTestimonials(prev => prev.map(t => t._id === testimonial._id ? { ...t, isActive: updatedStatus } : t));

    try {
      const res = await axios.put(`/video-testimonials/${testimonial._id}`, 
        { isActive: updatedStatus },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (!res.data.success) {
        // Rollback
        setTestimonials(prev => prev.map(t => t._id === testimonial._id ? { ...t, isActive: !updatedStatus } : t));
        toast.error('Failed to update status');
      } else {
        toast.success(`Testimonial is now ${updatedStatus ? 'active' : 'inactive'}`);
      }
    } catch (err) {
      console.error(err);
      // Rollback
      setTestimonials(prev => prev.map(t => t._id === testimonial._id ? { ...t, isActive: !updatedStatus } : t));
      toast.error('Failed to update status');
    }
  };

  // Drag and drop event handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = async (targetIndex: number) => {
    setDragOverIndex(null);
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      return;
    }

    const items = [...testimonials];
    const [draggedItem] = items.splice(draggedIndex, 1);
    items.splice(targetIndex, 0, draggedItem);

    // Reassign displayOrder values sequentially (1-based index)
    const updatedItems = items.map((item, idx) => ({
      ...item,
      displayOrder: idx + 1
    }));

    // Update frontend state immediately (Optimistic update)
    setTestimonials(updatedItems);
    setDraggedIndex(null);

    const token = localStorage.getItem('adminToken');
    toast.loading('Saving new order...', { id: 'order-sort-toast' });

    try {
      await Promise.all(
        updatedItems.map(item => 
          axios.put(`/video-testimonials/${item._id}`, 
            { displayOrder: item.displayOrder },
            { headers: { 'Authorization': `Bearer ${token}` } }
          )
        )
      );
      toast.success('Sorting order saved', { id: 'order-sort-toast' });
    } catch (err) {
      console.error('Failed to save display order to backend', err);
      toast.error('Failed to save reorder. Reverting...', { id: 'order-sort-toast' });
      fetchTestimonials();
    }
  };

  const getStatusStyle = (active: boolean) => {
    return active 
      ? 'bg-[#dcfce7] text-[#16a34a] border border-[#bbf7d0]'
      : 'bg-[#fee2e2] text-[#dc2626] border border-[#fecaca]';
  };

  const previewYoutubeId = getYoutubeId(youtubeUrl);

  return (
    <div className="max-w-[1600px] mx-auto mt-2 pb-12">
      <div className="flex flex-col xl:flex-row gap-6 items-start">
        
        {/* Left Column: Video Testimonials List */}
        <div className="flex-1 min-w-0 bg-white rounded-[24px] p-6 lg:p-8 shadow-sm border border-slate-100/60 w-full transition-all duration-300">
          
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-[18px] font-bold text-slate-900">Video Testimonials</h2>
              <p className="text-[13px] text-slate-500 mt-1">Manage video testimonials and drag rows to change their display order on the homepage.</p>
            </div>
            <button 
              onClick={handleAddClick}
              className="bg-[#8B5E34] hover:bg-[#6B5344] text-white px-6 py-2.5 rounded-[12px] font-semibold text-[14px] flex items-center gap-2 transition-colors shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Add Video Testimonial
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-[#f8fafc]">
                  <th className="py-4 px-6 text-[13px] font-semibold text-slate-500 rounded-l-[12px] w-[5%] text-center">Sort</th>
                  <th className="py-4 px-6 text-[13px] font-semibold text-slate-500 w-[20%]">Video / Client</th>
                  <th className="py-4 px-6 text-[13px] font-semibold text-slate-500 w-[40%]">YouTube URL</th>
                  <th className="py-4 px-6 text-[13px] font-semibold text-slate-500 w-[10%] text-center">Order</th>
                  <th className="py-4 px-6 text-[13px] font-semibold text-slate-500 w-[10%] text-center">Status</th>
                  <th className="py-4 px-6 text-[13px] font-semibold text-slate-500 rounded-r-[12px] w-[15%] text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex justify-center items-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-[#8B5E34]"></div>
                      <span>Loading video testimonials...</span>
                    </div>
                  </td></tr>
                ) : testimonials.length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-slate-500">
                    No video testimonials found. Click the button to add your first one!
                  </td></tr>
                ) : testimonials.map((testimonial, index) => (
                  <tr 
                    key={testimonial._id} 
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={() => handleDrop(index)}
                    onDragEnd={() => { setDraggedIndex(null); setDragOverIndex(null); }}
                    className={`border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-all ${
                      draggedIndex === index ? 'opacity-40 bg-slate-100' : ''
                    } ${
                      dragOverIndex === index ? 'border-t-4 border-t-[#8B5E34] bg-amber-50/20' : ''
                    }`}
                  >
                    {/* Drag Handle */}
                    <td className="py-4 px-6 text-center cursor-grab active:cursor-grabbing">
                      <div className="flex justify-center text-slate-400 hover:text-[#8B5E34] transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="19" r="1"></circle></svg>
                      </div>
                    </td>

                    {/* Video Thumbnail and Client Details */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-4">
                        <div className="relative group shrink-0 w-[80px] h-[45px] rounded-[6px] overflow-hidden bg-slate-100 border border-slate-200">
                          <img 
                            src={testimonial.thumbnailUrl} 
                            alt={testimonial.clientName} 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // fallback if maxres or hq is not reachable
                              (e.target as HTMLImageElement).src = 'https://img.youtube.com/vi/' + testimonial.youtubeId + '/0.jpg';
                            }}
                          />
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 text-[14px] leading-snug">{testimonial.clientName}</span>
                          <span className="text-[12px] text-slate-400 font-medium">{testimonial.role}</span>
                        </div>
                      </div>
                    </td>

                    {/* YouTube URL Link */}
                    <td className="py-4 px-6 text-[13px] text-slate-600 truncate max-w-[250px]">
                      <a 
                        href={testimonial.youtubeUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="hover:underline text-blue-600 flex items-center gap-1.5"
                      >
                        <span className="truncate">{testimonial.youtubeUrl}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                      </a>
                    </td>

                    {/* Display Order */}
                    <td className="py-4 px-6 text-center text-[14px] font-bold text-slate-700">
                      {testimonial.displayOrder}
                    </td>

                    {/* Toggle Switch Status */}
                    <td className="py-4 px-6 text-center">
                      <button 
                        onClick={() => handleToggleActive(testimonial)}
                        className={`inline-flex items-center justify-center px-3 py-1 rounded-[6px] text-[11px] font-bold tracking-wide uppercase cursor-pointer hover:opacity-85 transition-opacity ${getStatusStyle(testimonial.isActive)}`}
                        title="Click to toggle status"
                      >
                        {testimonial.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleEditClick(testimonial)}
                          className="w-[34px] h-[34px] rounded-[8px] bg-slate-50 text-slate-600 hover:bg-[#8B5E34]/10 hover:text-[#8B5E34] flex items-center justify-center transition-colors"
                          title="Edit"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(testimonial._id)}
                          className="w-[34px] h-[34px] rounded-[8px] bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center transition-colors"
                          title="Delete"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Add/Edit Video Testimonial Form */}
        {isAddOpen && (
          <div className="w-full xl:w-[420px] shrink-0 bg-white shadow-sm border border-slate-100/60 rounded-[24px] xl:sticky xl:top-[120px] overflow-hidden flex flex-col xl:max-h-[calc(100vh-140px)] transition-all duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-6 lg:px-8 py-6 border-b border-slate-50 shrink-0">
              <h2 className="text-[18px] font-bold text-slate-900">
                {editingId ? 'Edit Video Link' : 'Add Video Link'}
              </h2>
              <button 
                onClick={handleClosePanel}
                className="w-[32px] h-[32px] rounded-full bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            {/* Scrollable Form */}
            <div className="flex-1 overflow-y-auto px-6 lg:px-8 py-6 space-y-5">
              {/* Client Name */}
              <div>
                <label className="block text-[13px] font-bold text-slate-700 mb-2">Client Name</label>
                <input 
                  type="text" 
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  placeholder="e.g. Liam Harrison"
                  className="w-full h-[46px] px-4 rounded-[12px] border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#8B5E34]/20 focus:border-[#8B5E34] transition-all text-[14px]" 
                />
              </div>

              {/* Role / Subtitle */}
              <div>
                <label className="block text-[13px] font-bold text-slate-700 mb-2">Role / Designation</label>
                <input 
                  type="text" 
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  placeholder="e.g. VIP Collector / London, UK"
                  className="w-full h-[46px] px-4 rounded-[12px] border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#8B5E34]/20 focus:border-[#8B5E34] transition-all text-[14px]" 
                />
              </div>

              {/* YouTube URL */}
              <div>
                <label className="block text-[13px] font-bold text-slate-700 mb-2">YouTube URL</label>
                <input 
                  type="text" 
                  value={youtubeUrl}
                  onChange={e => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full h-[46px] px-4 rounded-[12px] border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#8B5E34]/20 focus:border-[#8B5E34] transition-all text-[14px]" 
                />
              </div>

              {/* Live Preview Section if YouTube ID is extractable */}
              {previewYoutubeId && (
                <div className="bg-slate-50 border border-slate-200/60 rounded-[14px] p-4">
                  <span className="block text-[11px] font-bold text-[#8B5E34] uppercase tracking-wider mb-2">YouTube Preview Detected</span>
                  <div className="aspect-video relative rounded-lg overflow-hidden border border-slate-200 shadow-sm bg-black">
                    <img 
                      src={`https://img.youtube.com/vi/${previewYoutubeId}/hqdefault.jpg`} 
                      alt="YouTube Preview" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${previewYoutubeId}/0.jpg`;
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <div className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg">
                        <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <span className="block text-[12px] text-slate-500 mt-2 text-center truncate">Video ID: {previewYoutubeId}</span>
                </div>
              )}

              {/* Display Order */}
              <div>
                <label className="block text-[13px] font-bold text-slate-700 mb-2">Display Order (Sorting)</label>
                <input 
                  type="number" 
                  value={displayOrder}
                  onChange={e => setDisplayOrder(Number(e.target.value))}
                  placeholder="e.g. 1"
                  className="w-full h-[46px] px-4 rounded-[12px] border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#8B5E34]/20 focus:border-[#8B5E34] transition-all text-[14px]" 
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-[13px] font-bold text-slate-700 mb-2">Status</label>
                <select 
                  value={isActive ? 'ACTIVE' : 'INACTIVE'}
                  onChange={e => setIsActive(e.target.value === 'ACTIVE')}
                  className="w-full h-[46px] px-4 rounded-[12px] border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#8B5E34]/20 focus:border-[#8B5E34] transition-all text-[14px] appearance-none"
                >
                  <option value="ACTIVE">Active (Show on homepage)</option>
                  <option value="INACTIVE">Inactive (Hide from homepage)</option>
                </select>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button 
                  onClick={handleSubmit}
                  disabled={saving}
                  className={`w-full bg-[#8B5E34] hover:bg-[#6B5344] text-white h-[46px] rounded-[12px] font-bold text-[14px] transition-colors shadow-sm ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {saving ? (
                    <div className="flex justify-center items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                      <span>Saving...</span>
                    </div>
                  ) : (editingId ? 'Update Testimonial' : 'Create Testimonial')}
                </button>
              </div>
            </div>
          </div>
        )}
        
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-[24px] p-8 max-w-[400px] w-full shadow-2xl transform transition-all border border-slate-100">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </div>
            <h3 className="text-[20px] font-bold text-center text-slate-900 mb-2">Delete Testimonial?</h3>
            <p className="text-slate-500 text-center text-[14px] mb-8 leading-relaxed">
              Are you sure you want to delete this video testimonial? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteModal({ isOpen: false, testimonialId: null })}
                disabled={deleting}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 h-[46px] rounded-[14px] font-semibold text-[14px] transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                disabled={deleting}
                className={`flex-1 bg-red-500 hover:bg-red-600 text-white h-[46px] rounded-[14px] font-semibold text-[14px] transition-colors shadow-sm shadow-red-500/20 ${deleting ? 'opacity-70 cursor-not-allowed' : ''}`}
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
