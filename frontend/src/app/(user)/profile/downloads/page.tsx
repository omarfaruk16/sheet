'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Search, DownloadCloud, Lock, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import { auth } from '@/lib/firebase';

export default function DownloadsLibrary() {
  const [search, setSearch] = useState('');
  const [library, setLibrary] = useState<any[]>([]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        const loadOrders = async () => {
          try {
            const token = await user.getIdToken();
            const res = await axios.get(process.env.NEXT_PUBLIC_API_URL + '/orders/my', {
              headers: { Authorization: `Bearer ${token}` }
            });
            
            // Flatten order items into a library list
            const items: any[] = [];
            res.data.forEach((order: any) => {
              order.items.forEach((item: any) => {
                items.push({
                  id: item._id,
                  title: item.productTitle || 'Generated PDF',
                  type: item.chapters.includes('all') ? 'Full Book' : 'Selected Chapters',
                  cover: item.productId?.coverImage || 'https://images.unsplash.com/photo-1544716278-e513176f20b5?w=400&q=80',
                  status: order.status,
                  date: new Date(order.createdAt).toLocaleDateString(),
                  url: item.downloadUrl ? `${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace('/api', '')}${item.downloadUrl}` : null
                });
              });
            });
            setLibrary(items);
          } catch(e) {}
        };

        loadOrders();
        // Poll every 3 seconds to catch real-time admin approvals
        intervalId = setInterval(loadOrders, 3000);
      }
    });

    return () => {
      unsubscribe();
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  const filtered = library.filter(item => item.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <div className="px-6 py-4 flex justify-between items-center bg-white sticky top-0 z-20 shadow-sm mb-6">
        <div className="flex items-center gap-4">
          <Link href="/profile" className="p-2 hover:bg-gray-100 rounded-full transition-colors -ml-2">
            <ArrowLeft className="w-6 h-6 text-gray-900" />
          </Link>
          <h1 className="text-lg font-bold text-gray-900">My Library</h1>
        </div>
      </div>

      <div className="px-6 space-y-6">
        
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search your downloads..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-green-500 transition-all shadow-sm"
          />
        </div>

        {/* Library Items */}
        <div className="space-y-4">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No sheets found in your library.</p>
            </div>
          ) : (
            filtered.map((item) => (
              <div key={item.id} className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex gap-4">
                <div className="w-20 h-28 shrink-0 rounded-2xl overflow-hidden relative border border-gray-50">
                  <Image src={item.cover} alt="cover" fill className="object-cover" />
                  {item.status === 'generating' && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
                      <Lock className="w-6 h-6 text-white opacity-70" />
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col py-1 w-full">
                  <h3 className="font-bold text-gray-900 text-sm mb-1 leading-tight">{item.title}</h3>
                  <p className="text-[10px] font-bold text-gray-500 mb-2 uppercase">{item.type}</p>
                  
                  <p className="text-[10px] text-gray-400 mb-2">Order Date: {item.date}</p>
                  
                  <div className="mt-auto flex justify-between items-end w-full">
                    {item.status === 'completed' && item.url ? (
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="w-full bg-green-50 hover:bg-green-100 text-green-700 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors border border-green-200">
                        <DownloadCloud className="w-4 h-4" /> Download PDF
                      </a>
                    ) : (
                      <div className="w-full bg-orange-50 text-orange-700 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 border border-orange-200">
                        <div className="w-3 h-3 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                        Generating... (Pending Admin)
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Help Note */}
        <div className="bg-blue-50 p-4 rounded-2xl flex items-start gap-3 mt-8">
          <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800 leading-relaxed">
            <strong>Secure Watermark:</strong> All purchased PDFs are personalized with your name, phone number, and a secure watermark to prevent piracy.
          </p>
        </div>

      </div>
    </div>
  );
}
