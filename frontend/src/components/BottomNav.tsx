'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Layers, ShoppingCart, Bookmark, User, FlaskConical } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import axios from 'axios';
import { getLocalSession } from '@/lib/userSession';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function BottomNav() {
  const pathname = usePathname();
  const [cartCount, setCartCount] = useState(0);
  const [libraryCount, setLibraryCount] = useState(0);

  useEffect(() => {
    // Poll cart length
    const updateCartCount = () => {
      const saved = localStorage.getItem('leafsheets_cart');
      if (saved) setCartCount(JSON.parse(saved).length);
      else setCartCount(0);
    };
    updateCartCount();
    const cartInterval = setInterval(updateCartCount, 1000);

    const loadLibraryCount = async (token: string) => {
      try {
        const res = await axios.get(API_URL + '/orders/my', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (Array.isArray(res.data)) {
          let count = 0;
          res.data.forEach((order: any) => {
            if (order.status === 'completed') {
              count += order.items.length;
            }
          });
          setLibraryCount(count);
        }
      } catch {
        setLibraryCount(0);
      }
    };

    const localSession = getLocalSession();
    if (localSession?.token) {
      loadLibraryCount(localSession.token);
    }

    // Fetch library count
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const token = await user.getIdToken();
        await loadLibraryCount(token);
      }
    });

    return () => {
      clearInterval(cartInterval);
      unsubscribe();
    };
  }, []);

  // Hide on admin routes
  if (pathname.startsWith('/admin')) return null;

  const navItems = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Sheets', href: '/products', icon: Layers },
    { name: 'Tests', href: '/model-tests', icon: FlaskConical },
    { name: 'Cart', href: '/cart', icon: ShoppingCart },
    { name: 'Library', href: '/profile/downloads', icon: Bookmark },
    { name: 'Me', href: '/profile', icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3 pb-safe z-50">
      <div className="max-w-md mx-auto flex justify-between items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 group w-16"
            >
              <div className="relative">
                <Icon 
                  className={cn(
                    "w-6 h-6 transition-all duration-200", 
                    isActive ? "text-green-500 scale-110" : "text-gray-400 group-hover:text-gray-600"
                  )} 
                />
                {item.name === 'Library' && libraryCount > 0 && (
                  <span className="absolute -top-1 -right-2 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                    {libraryCount}
                  </span>
                )}
                {item.name === 'Cart' && cartCount > 0 && (
                  <span className="absolute -top-1 -right-2 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                    {cartCount}
                  </span>
                )}
              </div>
              <span className={cn(
                "text-[10px] font-medium transition-colors",
                isActive ? "text-green-500" : "text-gray-500 group-hover:text-gray-700"
              )}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
