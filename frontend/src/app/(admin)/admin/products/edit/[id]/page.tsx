'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, ArrowLeft, Link2, FileText, Upload, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { adminAxios } from '@/lib/adminAuth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface Chapter {
  name: string;
  pdfUrl: string;
  price: string;
  order: number;
  uploadMode: 'url' | 'file';
  uploading?: boolean;
  uploadedFileName?: string;
}

export default function EditProduct() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const coverImageInputRef = useRef<HTMLInputElement>(null);
  const demoPdfInputRef = useRef<HTMLInputElement>(null);
  const [coverImageUploading, setCoverImageUploading] = useState(false);
  const [demoPdfUploading, setDemoPdfUploading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    regularPrice: '',
    discountPrice: '',
    allChaptersPrice: '',
    category: '',
    description: '',
    coverImage: '',
    demoPdfUrl: '',
  });

  const [chapters, setChapters] = useState<Chapter[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catsRes, prodRes] = await Promise.all([
          adminAxios.get('/categories'),
          adminAxios.get(`/products/${id}`)
        ]);
        
        setCategories(catsRes.data);
        
        const p = prodRes.data;
        setFormData({
          title: p.title || '',
          description: p.description || '',
          regularPrice: p.regularPrice?.toString() || '',
          discountPrice: p.discountPrice?.toString() || '',
          allChaptersPrice: p.allChaptersPrice?.toString() || '',
          category: p.category?._id || p.category || '',
          coverImage: p.coverImage || '',
          demoPdfUrl: p.demoPdfUrl || '',
        });
        
        if (p.chapters && p.chapters.length > 0) {
          setChapters(p.chapters.map((c: any) => ({
            name: c.name || '',
            pdfUrl: c.pdfUrl || '',
            price: c.price?.toString() || '',
            order: c.order,
            uploadMode: 'url'
          })));
        } else {
          setChapters([{ name: '', pdfUrl: '', price: '', order: 1, uploadMode: 'url' }]);
        }
      } catch (error) {
        toast.error('Failed to load product data');
        router.push('/admin/products');
      } finally {
        setFetching(false);
      }
    };
    if (id) fetchData();
  }, [id, router]);

  const handleAddChapter = () => {
    setChapters([...chapters, { name: '', pdfUrl: '', price: '', order: chapters.length + 1, uploadMode: 'url' }]);
  };

  const handleRemoveChapter = (index: number) => {
    if (chapters.length === 1) return;
    setChapters(chapters.filter((_, i) => i !== index).map((c, i) => ({ ...c, order: i + 1 })));
  };

  const handleChapterChange = (index: number, field: keyof Chapter, value: any) => {
    const updated = [...chapters];
    (updated[index] as any)[field] = value;
    setChapters(updated);
  };

  const toggleUploadMode = (index: number) => {
    const updated = [...chapters];
    updated[index].uploadMode = updated[index].uploadMode === 'url' ? 'file' : 'url';
    updated[index].pdfUrl = '';
    updated[index].uploadedFileName = undefined;
    setChapters(updated);
  };

  const handlePdfFileUpload = async (index: number, file: File) => {
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are allowed');
      return;
    }

    const updated = [...chapters];
    updated[index].uploading = true;
    setChapters([...updated]);

    try {
      const fd = new FormData();
      fd.append('pdf', file);

      const adminToken = localStorage.getItem('leafsheets_admin_token') || localStorage.getItem('adminToken');
      const res = await fetch(`${API_URL}/products/upload`, {
        method: 'POST',
        headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {},
        body: fd,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Upload failed');
      }

      const data = await res.json();
      updated[index].pdfUrl = data.url;
      updated[index].uploadedFileName = file.name;
      updated[index].uploading = false;
      setChapters([...updated]);
      toast.success(`PDF uploaded: ${file.name}`);
    } catch (err: any) {
      updated[index].uploading = false;
      setChapters([...updated]);
      toast.error(err.message || 'Upload failed');
    }
  };

  const handleCoverImageUpload = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed');
      return;
    }

    setCoverImageUploading(true);

    try {
      const formDataObj = new FormData();
      formDataObj.append('image', file);

      const adminToken = localStorage.getItem('leafsheets_admin_token') || localStorage.getItem('adminToken');
      const res = await fetch(`${API_URL}/products/upload-image`, {
        method: 'POST',
        headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {},
        body: formDataObj,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Upload failed');
      }

      const data = await res.json();
      setFormData(prev => ({ ...prev, coverImage: data.url }));
      toast.success('Cover image uploaded successfully');
    } catch (err: any) {
      toast.error(err.message || 'Image upload failed');
    } finally {
      setCoverImageUploading(false);
    }
  };

  const handleDemoPdfUpload = async (file: File) => {
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are allowed');
      return;
    }

    setDemoPdfUploading(true);
    try {
      const formDataObj = new FormData();
      formDataObj.append('pdf', file);

      const adminToken = localStorage.getItem('leafsheets_admin_token') || localStorage.getItem('adminToken');
      const res = await fetch(`${API_URL}/products/upload`, {
        method: 'POST',
        headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {},
        body: formDataObj,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Upload failed');
      }

      const data = await res.json();
      setFormData(prev => ({ ...prev, demoPdfUrl: data.url }));
      toast.success('Demo PDF uploaded successfully');
    } catch (err: any) {
      toast.error(err.message || 'PDF upload failed');
    } finally {
      setDemoPdfUploading(false);
    }
  };

  const toGDriveViewUrl = (url: string) => {
    if (url.includes('/folders/')) return url;
    const fileMatch = url.match(/\/file\/d\/([^/]+)/);
    if (fileMatch) return `https://drive.google.com/file/d/${fileMatch[1]}/view`;
    return url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) { toast.error('Title is required'); return; }
    if (!formData.category) { toast.error('Category is required'); return; }
    if (!formData.regularPrice) { toast.error('Regular price is required'); return; }
    if (!formData.allChaptersPrice) { toast.error('Bundle price is required'); return; }
    if (!formData.coverImage.trim()) { toast.error('Cover image URL is required'); return; }
    if (chapters.some(c => !c.name.trim() || !c.pdfUrl.trim() || !c.price)) {
      toast.error('All chapter fields (name, PDF URL/file, price) are required');
      return;
    }
    if (chapters.some(c => c.uploading)) {
      toast.error('Please wait for all PDF uploads to complete');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim() || formData.title,
        regularPrice: Number(formData.regularPrice),
        discountPrice: formData.discountPrice ? Number(formData.discountPrice) : undefined,
        allChaptersPrice: Number(formData.allChaptersPrice),
        category: formData.category,
        coverImage: formData.coverImage.trim(),
        demoPdfUrl: formData.demoPdfUrl.trim() || undefined,
        chapters: chapters.map((c, i) => ({
          name: c.name.trim(),
          pdfUrl: c.uploadMode === 'url' ? toGDriveViewUrl(c.pdfUrl.trim()) : c.pdfUrl.trim(),
          price: Number(c.price),
          order: i + 1,
        })),
      };

      await adminAxios.put(`/products/${id}`, payload);
      toast.success('✅ Product updated successfully!');
      router.push('/admin/products');
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Failed to update product';
      toast.error(msg);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all text-sm';
  const labelCls = 'block text-sm font-semibold text-gray-700 mb-1.5';

  if (fetching) return <div className="p-10 text-center text-gray-500">Loading product...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Link href="/admin/products" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Edit Product</h2>
          <p className="text-sm text-gray-500 mt-0.5">Update the details of your PDF product</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-5">
          <h3 className="text-lg font-bold border-b border-gray-100 pb-3 flex items-center gap-2">
            <FileText className="w-5 h-5 text-green-600" /> Basic Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelCls}>Product Title *</label>
              <input
                type="text" required
                placeholder="e.g. HSC Biology Complete Notes"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Category *</label>
              <select
                required
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className={inputCls}
              >
                <option value="">— Select Category —</option>
                {categories.map((cat: any) => (
                  <option key={cat._id} value={cat._id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className={labelCls}>Description</label>
              <textarea
                rows={3}
                placeholder="Brief description of this product..."
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className={inputCls + ' resize-none'}
              />
            </div>
          </div>
        </section>

        <section className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-5">
          <h3 className="text-lg font-bold border-b border-gray-100 pb-3">💰 Pricing</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className={labelCls}>Regular Price (৳) *</label>
              <input type="number" min="0" step="0.01" required placeholder="0.00"
                value={formData.regularPrice}
                onChange={e => setFormData({ ...formData, regularPrice: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Discount / Sale Price (৳)</label>
              <input type="number" min="0" step="0.01" placeholder="0.00 (leave empty = no discount)"
                value={formData.discountPrice}
                onChange={e => setFormData({ ...formData, discountPrice: e.target.value })}
                className={inputCls}
              />
              <p className="text-xs text-gray-400 mt-1">Set this to show a strikethrough price + sale badge</p>
            </div>
            <div>
              <label className={labelCls}>All Chapters Bundle Price (৳) *</label>
              <input type="number" min="0" step="0.01" required placeholder="0.00"
                value={formData.allChaptersPrice}
                onChange={e => setFormData({ ...formData, allChaptersPrice: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>
        </section>

        <section className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-5">
          <h3 className="text-lg font-bold border-b border-gray-100 pb-3 flex items-center gap-2">
            🖼️ Media &amp; Links
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={labelCls.replace(' mb-1.5', '')}>Cover Image (URL or Upload) *</label>
              </div>
              <div className="relative mb-3">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="url" required
                  placeholder="https://... (any image URL)"
                  value={formData.coverImage}
                  onChange={e => setFormData({ ...formData, coverImage: e.target.value })}
                  className={inputCls + ' pl-9'}
                />
              </div>
              <input
                type="file"
                accept="image/*"
                ref={coverImageInputRef}
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleCoverImageUpload(file);
                }}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => coverImageInputRef.current?.click()}
                disabled={coverImageUploading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded-xl text-sm font-medium text-gray-700 transition-colors disabled:opacity-60"
              >
                {coverImageUploading ? (
                  <><span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" /> Uploading...</>
                ) : (
                  <><Upload className="w-4 h-4" /> Upload Image File</>
                )}
              </button>

              {formData.coverImage && (
                <div className="mt-3 w-24 h-32 rounded-lg overflow-hidden border border-gray-200 shadow-sm relative group">
                  <img src={formData.coverImage} alt="cover preview" className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, coverImage: '' })}
                    className="absolute top-1 right-1 bg-white/80 p-1 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={labelCls.replace(' mb-1.5', '')}>Demo PDF (URL or Upload)</label>
              </div>
              <div className="relative mb-3">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="url"
                  placeholder="https://drive.google.com/file/d/... or click upload"
                  value={formData.demoPdfUrl}
                  onChange={e => setFormData({ ...formData, demoPdfUrl: e.target.value })}
                  className={inputCls + ' pl-9'}
                />
              </div>
              <input
                type="file"
                accept="application/pdf"
                ref={demoPdfInputRef}
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleDemoPdfUpload(file);
                }}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => demoPdfInputRef.current?.click()}
                disabled={demoPdfUploading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded-xl text-sm font-medium text-gray-700 transition-colors disabled:opacity-60"
              >
                {demoPdfUploading ? (
                  <><span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" /> Uploading...</>
                ) : (
                  <><Upload className="w-4 h-4" /> Upload Demo PDF File</>
                )}
              </button>
              <p className="text-xs text-gray-400 mt-2">Provide a free preview chapter or table of contents</p>
            </div>
          </div>
        </section>

        <section className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-5">
          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
            <h3 className="text-lg font-bold flex items-center gap-2">
              📚 Chapters ({chapters.length})
            </h3>
            <button
              type="button"
              onClick={handleAddChapter}
              className="flex items-center gap-1.5 text-sm font-semibold text-green-700 bg-green-50 px-4 py-2 rounded-xl hover:bg-green-100 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Chapter
            </button>
          </div>

          <div className="space-y-4">
            {chapters.map((chapter, index) => (
              <div key={index} className="bg-gray-50 border border-gray-100 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Chapter {index + 1}</span>
                  {chapters.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveChapter(index)}
                      className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={labelCls}>Chapter Title *</label>
                    <input
                      type="text" required
                      placeholder={`e.g. Chapter ${index + 1}`}
                      value={chapter.name}
                      onChange={e => handleChapterChange(index, 'name', e.target.value)}
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className={labelCls.replace(' mb-1.5', '')}>
                        PDF {chapter.uploadMode === 'url' ? 'URL' : 'File'} *
                      </label>
                      <button
                        type="button"
                        onClick={() => toggleUploadMode(index)}
                        className="text-xs text-green-600 font-semibold hover:underline flex items-center gap-1"
                      >
                        {chapter.uploadMode === 'url' ? (
                          <><Upload className="w-3 h-3" /> Upload file</>
                        ) : (
                          <><Link2 className="w-3 h-3" /> Use URL</>
                        )}
                      </button>
                    </div>

                    {chapter.uploadMode === 'url' ? (
                      <div className="relative">
                        <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="url" required
                          placeholder="https://drive.google.com/file/d/..."
                          value={chapter.pdfUrl}
                          onChange={e => handleChapterChange(index, 'pdfUrl', e.target.value)}
                          className={inputCls + ' pl-9'}
                        />
                      </div>
                    ) : (
                      <div>
                        {/* Hidden real file input */}
                        <input
                          type="file"
                          accept="application/pdf"
                          ref={el => { fileInputRefs.current[index] = el; }}
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) handlePdfFileUpload(index, file);
                          }}
                          className="hidden"
                        />
                        {chapter.pdfUrl ? (
                          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
                            <FileText className="w-4 h-4 text-green-600 shrink-0" />
                            <span className="text-xs text-green-700 font-medium truncate flex-1">{chapter.uploadedFileName || 'PDF uploaded'}</span>
                            <button
                              type="button"
                              onClick={() => {
                                handleChapterChange(index, 'pdfUrl', '');
                                handleChapterChange(index, 'uploadedFileName', '');
                              }}
                              className="text-red-400 hover:text-red-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => fileInputRefs.current[index]?.click()}
                            disabled={chapter.uploading}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-500 hover:border-green-400 hover:text-green-600 transition-colors disabled:opacity-60"
                          >
                            {chapter.uploading ? (
                              <><span className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" /> Uploading...</>
                            ) : (
                              <><Upload className="w-4 h-4" /> Click to upload PDF</>
                            )}
                          </button>
                        )}
                        <input type="text" required value={chapter.pdfUrl} readOnly className="sr-only" />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className={labelCls}>Chapter Price (৳) *</label>
                    <input
                      type="number" required min="0" step="0.01"
                      placeholder="0.00"
                      value={chapter.price}
                      onChange={e => handleChapterChange(index, 'price', e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="flex justify-end gap-4 pt-2">
          <Link
            href="/admin/products"
            className="px-6 py-3 font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 font-semibold text-white bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-md shadow-green-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Saving...
              </>
            ) : (
              '💾 Save Changes'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
