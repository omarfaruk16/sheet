'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Layers, ShoppingCart, User, BookOpen } from 'lucide-react';
import { cn } from './BottomNav';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getLocalSession } from '@/lib/userSession';

export default function HeaderMenu() {
  const pathname = usePathname();
  const [cartCount, setCartCount] = useState(0);
  const [currentUser, setCurrentUser] = useState<{ displayName: string | null; photoURL: string | null } | null>(null);

  useEffect(() => {
    const updateCount = () => {
      try {
        const cart = JSON.parse(localStorage.getItem('leafsheets_cart') || '[]');
        setCartCount(cart.length);
      } catch (e) {
        setCartCount(0);
      }
    };
    
    updateCount();
    
    // Poll for changes across tabs or in-page actions
    const interval = setInterval(updateCount, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const syncAuthState = () => {
      const fbUser = auth.currentUser;
      const localSession = getLocalSession();
      if (fbUser) {
        setCurrentUser({ displayName: fbUser.displayName, photoURL: fbUser.photoURL });
      } else if (localSession?.user) {
        setCurrentUser({ displayName: localSession.user.name || null, photoURL: null });
      } else {
        setCurrentUser(null);
      }
    };

    syncAuthState();

    const unsubscribe = onAuthStateChanged(auth, () => {
      syncAuthState();
    });

    const storageListener = (event: StorageEvent) => {
      if (event.key === 'leafsheets_user_session') {
        syncAuthState();
      }
    };

    window.addEventListener('storage', storageListener);
    const interval = setInterval(syncAuthState, 1000);

    return () => {
      unsubscribe();
      window.removeEventListener('storage', storageListener);
      clearInterval(interval);
    };
  }, []);

  // Hide on admin routes
  if (pathname.startsWith('/admin')) return null;

  const navItems = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Discover', href: '/products', icon: Layers },
  ];

  return (
    <header className="hidden md:block sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="font-bold text-2xl tracking-tighter text-green-600 flex items-center gap-2">
          <BookOpen className="w-6 h-6" />
          <span>OrbitSheet</span>
        </Link>
        
        <nav className="flex items-center gap-8">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "text-sm font-semibold transition-colors hover:text-green-600 flex items-center gap-2",
                  isActive ? "text-green-600" : "text-gray-600"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-6">
          <Link href="/cart" className="relative text-gray-600 hover:text-green-600 transition-colors">
            <ShoppingCart className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>
          {currentUser ? (
            <Link href="/profile" className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-green-600 transition-colors">
              {currentUser.photoURL ? (
                <img src={currentUser.photoURL} alt="Profile" className="w-6 h-6 rounded-full object-cover border border-gray-200" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                  <User className="w-4 h-4 text-gray-500" />
                </div>
              )}
              <span className="max-w-[120px] truncate">{currentUser.displayName || 'Profile'}</span>
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3 py-1.5 rounded-lg text-sm font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="px-3 py-1.5 rounded-lg text-sm font-semibold text-white bg-green-600 hover:bg-green-500 transition-colors"
              >
                Signup
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
