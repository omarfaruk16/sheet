'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, ArrowLeft, FileText, Upload, X, FlaskConical } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { adminAxios } from '@/lib/adminAuth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface TestItem {
  name: string;
  questionsDocxUrl: string;
  solutionPdfUrl: string;
  price: string;
  order: number;
  questionsUploading?: boolean;
  solutionsUploading?: boolean;
  questionsFileName?: string;
  solutionsFileName?: string;
}
export default function AddModelTest() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const docxInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const pdfInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const coverImageInputRef = useRef<HTMLInputElement>(null);
  const demoPdfInputRef = useRef<HTMLInputElement>(null);
  const [coverImageUploading, setCoverImageUploading] = useState(false);
  const [demoPdfUploading, setDemoPdfUploading] = useState(false);
  const [demoPdfFileName, setDemoPdfFileName] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    regularPrice: '',
    discountPrice: '',
    allItemsPrice: '',
    category: '',
    description: '',
    coverImage: '',
    demoPdfUrl: '',
  });

  const [items, setItems] = useState<TestItem[]>([
    { name: '', questionsDocxUrl: '', solutionPdfUrl: '', price: '', order: 1 },
  ]);

  useEffect(() => {
    adminAxios.get('/categories')
      .then(r => setCategories(r.data))
      .catch(() => toast.error('Failed to load categories'));
  }, []);

  const handleAddItem = () => {
    setItems([...items, { name: '', questionsDocxUrl: '', solutionPdfUrl: '', price: '', order: items.length + 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index).map((c, i) => ({ ...c, order: i + 1 })));
  };

  const handleItemChange = (index: number, field: keyof TestItem, value: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    setItems(updated);
  };

  const getAdminToken = () =>
    localStorage.getItem('leafsheets_admin_token') || localStorage.getItem('adminToken') || '';

  const handleDocxUpload = async (index: number, file: File) => {
    if (!file) return;
    const updated = [...items];
    updated[index].questionsUploading = true;
    setItems([...updated]);
    try {
      const fd = new FormData();
      fd.append('docx', file);;
      const res = await fetch(`${API_URL}/model-tests/upload-docx`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getAdminToken()}` },
        body: fd,
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Upload failed');
      const data = await res.json();
      updated[index].questionsDocxUrl = data.url;
      updated[index].questionsFileName = file.name;
      updated[index].questionsUploading = false;
      setItems([...updated]);
      toast.success(`Questions DOCX uploaded: ${file.name}`);
    } catch (err: any) {
      updated[index].questionsUploading = false;
      setItems([...updated]);
      toast.error(err.message || 'DOCX upload failed');
    }
  };

  const handlePdfUpload = async (index: number, file: File) => {
    if (!file) return;
    if (file.type !== 'application/pdf') { toast.error('Only PDF files allowed'); return; }
    const updated = [...items];
    updated[index].solutionsUploading = true;
    setItems([...updated]);
    try {
      const fd = new FormData();
      fd.append('pdf', file);
      const res = await fetch(`${API_URL}/model-tests/upload-pdf`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getAdminToken()}` },
        body: fd,
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Upload failed');
      const data = await res.json();
      updated[index].solutionPdfUrl = data.url;
      updated[index].solutionsFileName = file.name;
      updated[index].solutionsUploading = false;
      setItems([...updated]);
      toast.success(`Solutions PDF uploaded: ${file.name}`);
    } catch (err: any) {
      updated[index].solutionsUploading = false;
      setItems([...updated]);
      toast.error(err.message || 'PDF upload failed');
    }
  };

  const handleCoverImageUpload = async (file: File) => {
    if (!file || !file.type.startsWith('image/')) { toast.error('Only image files allowed'); return; }
    setCoverImageUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch(`${API_URL}/model-tests/upload-image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getAdminToken()}` },
        body: fd,
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Upload failed');
      const data = await res.json();
      setFormData(prev => ({ ...prev, coverImage: data.url }));
      toast.success('Cover image uploaded');
    } catch (err: any) {
      toast.error(err.message || 'Image upload failed');
    } finally {
      setCoverImageUploading(false);
    }
  };

  const handleDemoPdfUpload = async (file: File) => {
    if (!file || file.type !== 'application/pdf') { toast.error('Only PDF files allowed for demo'); return; }
    setDemoPdfUploading(true);
    try {
      const fd = new FormData();
      fd.append('pdf', file);
      const res = await fetch(`${API_URL}/model-tests/upload-pdf`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getAdminToken()}` },
        body: fd,
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Upload failed');
      const data = await res.json();
      setFormData(prev => ({ ...prev, demoPdfUrl: data.url }));
      setDemoPdfFileName(file.name);
      toast.success(`Demo PDF uploaded: ${file.name}`);
    } catch (err: any) {
      toast.error(err.message || 'Demo PDF upload failed');
    } finally {
      setDemoPdfUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) { toast.error('Title is required'); return; }
    if (!formData.category) { toast.error('Category is required'); return; }
    if (!formData.regularPrice) { toast.error('Regular price is required'); return; }
    if (!formData.allItemsPrice) { toast.error('All items price is required'); return; }
    if (!formData.coverImage.trim()) { toast.error('Cover image is required'); return; }
    if (items.some(it => !it.name.trim() || !it.questionsDocxUrl || !it.solutionPdfUrl || !it.price)) {
      toast.error('All item fields (name, questions DOCX, solutions PDF, price) are required');
      return;
    }
    if (items.some(it => it.questionsUploading || it.solutionsUploading)) {
      toast.error('Please wait for all uploads to complete');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim() || formData.title,
        regularPrice: Number(formData.regularPrice),
        discountPrice: formData.discountPrice ? Number(formData.discountPrice) : undefined,
        allItemsPrice: Number(formData.allItemsPrice),
        category: formData.category,
        coverImage: formData.coverImage.trim(),
        demoPdfUrl: formData.demoPdfUrl.trim() || undefined,
        items: items.map((it, i) => ({
          name: it.name.trim(),
          questionsDocxUrl: it.questionsDocxUrl,
          solutionPdfUrl: it.solutionPdfUrl,
          price: Number(it.price),
          order: i + 1,
        })),
      };
      await adminAxios.post('/model-tests', payload);
      toast.success('✅ Model test created!');
      router.push('/admin/model-tests');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to create model test');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all text-sm';
  const labelCls = 'block text-sm font-semibold text-gray-700 mb-1.5';

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/model-tests" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-purple-600" /> Add New Model Test
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Fill in the details below to create a new model test</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ─── Basic Info ─────────────────────────────────────────────── */}
        <section className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-5">
          <h3 className="text-lg font-bold border-b border-gray-100 pb-3 flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-600" /> Basic Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelCls}>Model Test Title *</label>
              <input type="text" required placeholder="e.g. SSC Math Full Model Test 2024"
                value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })}
                className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Category *</label>
              <select required value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className={inputCls}>
                <option value="">— Select Category —</option>
                {categories.map((cat: any) => (
                  <option key={cat._id} value={cat._id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Description</label>
              <textarea rows={3} placeholder="Brief description of this model test..."
                value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                className={inputCls + ' resize-none'} />
            </div>
          </div>
        </section>

        {/* ─── Pricing ─────────────────────────────────────────────────── */}
        <section className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-5">
          <h3 className="text-lg font-bold border-b border-gray-100 pb-3">💰 Pricing</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className={labelCls}>Regular Price (৳) *</label>
              <input type="number" min="0" step="0.01" required placeholder="0.00"
                value={formData.regularPrice} onChange={e => setFormData({ ...formData, regularPrice: e.target.value })}
                className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Discount / Sale Price (৳)</label>
              <input type="number" min="0" step="0.01" placeholder="0.00 (leave empty = no discount)"
                value={formData.discountPrice} onChange={e => setFormData({ ...formData, discountPrice: e.target.value })}
                className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>All Items Bundle Price (৳) *</label>
              <input type="number" min="0" step="0.01" required placeholder="0.00"
                value={formData.allItemsPrice} onChange={e => setFormData({ ...formData, allItemsPrice: e.target.value })}
                className={inputCls} />
            </div>
          </div>
        </section>

        {/* ─── Cover Image ──────────────────────────────────────────────── */}
        <section className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-5">
          <h3 className="text-lg font-bold border-b border-gray-100 pb-3">🖼️ Cover Image &amp; Demo</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cover Image */}
            <div>
              <label className={labelCls}>Cover Image URL or Upload *</label>
              <input type="url" required placeholder="https://... (any image URL)"
                value={formData.coverImage} onChange={e => setFormData({ ...formData, coverImage: e.target.value })}
                className={inputCls + ' mb-3'} />
              <input type="file" accept="image/*" ref={coverImageInputRef}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleCoverImageUpload(f); }}
                className="hidden" />
              <button type="button" onClick={() => coverImageInputRef.current?.click()} disabled={coverImageUploading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded-xl text-sm font-medium text-gray-700 transition-colors disabled:opacity-60">
                {coverImageUploading ? <><span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" /> Uploading...</> : <><Upload className="w-4 h-4" /> Upload Image File</>}
              </button>
              {formData.coverImage && (
                <div className="mt-3 w-24 h-32 rounded-lg overflow-hidden border border-gray-200 shadow-sm relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={formData.coverImage} alt="preview" className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
                  <button type="button" onClick={() => setFormData({ ...formData, coverImage: '' })}
                    className="absolute top-1 right-1 bg-white/80 p-1 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Demo PDF */}
            <div>
              <label className={labelCls}>Demo PDF (optional)</label>
              <input type="url" placeholder="https://... or upload below"
                value={formData.demoPdfUrl} onChange={e => setFormData({ ...formData, demoPdfUrl: e.target.value })}
                className={inputCls + ' mb-3'} />
              <input type="file" accept="application/pdf" ref={demoPdfInputRef}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleDemoPdfUpload(f); }}
                className="hidden" />
              <button type="button" onClick={() => demoPdfInputRef.current?.click()} disabled={demoPdfUploading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded-xl text-sm font-medium text-gray-700 transition-colors disabled:opacity-60">
                {demoPdfUploading
                  ? <><span className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" /> Uploading...</>
                  : <><FileText className="w-4 h-4 text-red-500" /> Upload Demo PDF</>}
              </button>
              {formData.demoPdfUrl && (
                <div className="mt-3 flex items-center gap-2 p-2.5 bg-red-50 border border-red-100 rounded-xl">
                  <FileText className="w-4 h-4 text-red-500 shrink-0" />
                  <span className="text-xs text-red-700 font-medium truncate flex-1">{demoPdfFileName || 'Demo PDF set'}</span>
                  <button type="button" onClick={() => { setFormData({ ...formData, demoPdfUrl: '' }); setDemoPdfFileName(''); }}
                    className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ─── Test Items ───────────────────────────────────────────────── */}
        <section className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-5">
          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-purple-600" /> Test Items ({items.length})
            </h3>
            <button type="button" onClick={handleAddItem}
              className="flex items-center gap-1.5 text-sm font-semibold text-purple-700 bg-purple-50 px-4 py-2 rounded-xl hover:bg-purple-100 transition-colors">
              <Plus className="w-4 h-4" /> Add Item
            </button>
          </div>

          <div className="space-y-5">
            {items.map((item, index) => (
              <div key={index} className="bg-gray-50 border border-gray-100 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-600 uppercase tracking-wider bg-purple-50 px-3 py-1 rounded-full">Item {index + 1}</span>
                  {items.length > 1 && (
                    <button type="button" onClick={() => handleRemoveItem(index)}
                      className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Name */}
                  <div>
                    <label className={labelCls}>Item Name *</label>
                    <input type="text" required placeholder={`e.g. Set ${index + 1}`}
                      value={item.name} onChange={e => handleItemChange(index, 'name', e.target.value)}
                      className={inputCls} />
                  </div>

                  {/* Questions DOCX */}
                  <div>
                    <label className={labelCls}>Questions (DOCX) *</label>
                    <input type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      ref={el => { docxInputRefs.current[index] = el; }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleDocxUpload(index, f); }}
                      className="hidden" />
                    {item.questionsDocxUrl ? (
                      <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                        <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="text-xs text-blue-700 font-medium truncate flex-1">{item.questionsFileName || 'DOCX uploaded'}</span>
                        <button type="button" onClick={() => handleItemChange(index, 'questionsDocxUrl', '')} className="text-red-400 hover:text-red-600">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => docxInputRefs.current[index]?.click()} disabled={item.questionsUploading}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors disabled:opacity-60">
                        {item.questionsUploading ? <><span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /> Uploading...</> : <><FileText className="w-4 h-4" /> Upload DOCX</>}
                      </button>
                    )}
                    <input type="text" required value={item.questionsDocxUrl} readOnly className="sr-only" />
                  </div>

                  {/* Solutions PDF */}
                  <div>
                    <label className={labelCls}>Solutions (PDF) *</label>
                    <input type="file" accept="application/pdf"
                      ref={el => { pdfInputRefs.current[index] = el; }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) handlePdfUpload(index, f); }}
                      className="hidden" />
                    {item.solutionPdfUrl ? (
                      <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
                        <FileText className="w-4 h-4 text-green-600 shrink-0" />
                        <span className="text-xs text-green-700 font-medium truncate flex-1">{item.solutionsFileName || 'PDF uploaded'}</span>
                        <button type="button" onClick={() => handleItemChange(index, 'solutionPdfUrl', '')} className="text-red-400 hover:text-red-600">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => pdfInputRefs.current[index]?.click()} disabled={item.solutionsUploading}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-500 hover:border-green-400 hover:text-green-600 transition-colors disabled:opacity-60">
                        {item.solutionsUploading ? <><span className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" /> Uploading...</> : <><FileText className="w-4 h-4" /> Upload PDF</>}
                      </button>
                    )}
                    <input type="text" required value={item.solutionPdfUrl} readOnly className="sr-only" />
                  </div>

                  {/* Price */}
                  <div>
                    <label className={labelCls}>Price (৳) *</label>
                    <input type="number" required min="0" step="0.01" placeholder="0.00"
                      value={item.price} onChange={e => handleItemChange(index, 'price', e.target.value)}
                      className={inputCls} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Submit ───────────────────────────────────────────────────── */}
        <div className="flex justify-end gap-4 pt-2">
          <Link href="/admin/model-tests" className="px-6 py-3 font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            Cancel
          </Link>
          <button type="submit" disabled={loading}
            className="px-8 py-3 font-semibold text-white bg-gradient-to-r from-purple-600 to-violet-600 rounded-xl hover:from-purple-700 hover:to-violet-700 transition-all shadow-md shadow-purple-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2">
            {loading ? (
              <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>Creating...</>
            ) : '🚀 Create Model Test'}
          </button>
        </div>
      </form>
    </div>
  );
}
