'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Trash2, ShieldCheck, ChevronRight } from 'lucide-react';

export default function CartPage() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('leafsheets_cart');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const validItems = parsed.filter((it: any) => it && it.productId);
        if (validItems.length !== parsed.length) {
          localStorage.setItem('leafsheets_cart', JSON.stringify(validItems));
        }
        setItems(validItems);
      } catch (e) {
        setItems([]);
      }
    }
  }, []);

  const handleClear = (id: string) => {
    const newItems = items.filter(it => it.id !== id);
    setItems(newItems);
    localStorage.setItem('leafsheets_cart', JSON.stringify(newItems));
  };

  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const tax = subtotal * 0.05; // 5% mock tax
  const total = subtotal + tax;

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center justify-center text-center">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <ShoppingCart className="w-10 h-10 text-gray-300" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
        <p className="text-gray-500 mb-8 max-w-[250px]">Looks like you haven't added any premium sheets to your cart yet.</p>
        <Link href="/" className="bg-green-500 text-white font-bold py-3 px-8 rounded-full hover:bg-green-400 transition-colors shadow-sm">
          Discover Sheets
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <div className="px-6 py-4 flex justify-between items-center bg-white sticky top-0 z-20 shadow-sm mb-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-gray-100 rounded-full transition-colors -ml-2">
            <ArrowLeft className="w-6 h-6 text-gray-900" />
          </Link>
          <h1 className="text-lg font-bold text-gray-900">Cart</h1>
        </div>
      </div>

      <div className="px-6 space-y-4">
        {/* Cart Items */}
        {items.map((item) => (
          <div key={item.id} className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex gap-4 relative">
            <button 
              onClick={() => handleClear(item.id)}
              className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <div className="w-20 h-28 shrink-0 rounded-2xl overflow-hidden relative border border-gray-50">
              <Image src={item.cover} alt="cover" fill className="object-cover" />
            </div>
            <div className="flex flex-col py-1">
              <h3 className="font-bold text-gray-900 text-sm mb-1 pr-6 leading-tight">{item.productTitle}</h3>
              <p className="text-[10px] text-gray-500 mb-2">HSC Category</p>
              
              <div className="bg-green-50 rounded-xl p-2 mb-2 inline-block">
                <p className="text-[9px] font-bold text-green-700">Digital PDF • {item.chapters.includes('all') ? 'Full Book' : 'Selected Chapters'}</p>
                {item.customization?.watermark && (
                  <p className="text-[9px] text-green-600">Personalized: {item.customization.watermark}</p>
                )}
              </div>
              
              <div className="mt-auto flex items-end justify-between w-full">
                <span className="text-lg font-black text-green-500">৳{item.price.toFixed(2)}</span>
              </div>
            </div>
          </div>
        ))}

        {/* Support Card */}
        <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-3xl flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-blue-500 shrink-0" />
          <div>
            <h4 className="text-[11px] font-bold text-blue-900">Secure Download</h4>
            <p className="text-[10px] text-blue-700/80 leading-tight">Your customized PDFs will be available instantly upon order completion.</p>
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mt-4">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Payment Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium text-gray-900">৳{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Platform Fee (5%)</span>
              <span className="font-medium text-gray-900">৳{tax.toFixed(2)}</span>
            </div>
            <div className="w-full h-[1px] bg-gray-100 my-2"></div>
            <div className="flex justify-between items-center">
              <span className="font-bold text-gray-900">Total</span>
              <span className="text-xl font-black text-green-500">৳{total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Bottom Navigation / Proceed to Checkout */}
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 max-w-5xl mx-auto bg-white border-t border-gray-100 p-4 pb-safe z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <Link 
          href="/checkout"
          className="w-full bg-gray-900 text-white font-bold py-4 px-6 rounded-2xl shadow-xl shadow-gray-900/20 transition-transform active:scale-95 flex items-center justify-between"
        >
          <span>Checkout — ৳{total.toFixed(2)}</span>
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <ChevronRight className="w-5 h-5 text-white" />
          </div>
        </Link>
      </div>

    </div>
  );
}

// Needed to avoid error on empty cart rendering logic above
import { ShoppingCart } from 'lucide-react';
