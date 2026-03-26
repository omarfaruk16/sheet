import BottomNav from '@/components/BottomNav';
import HeaderMenu from '@/components/HeaderMenu';

export const metadata = {
  title: 'LeafSheets - Your Premium PDF Library',
  description: 'Download premium guides, sheets, and books.',
};

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-24 md:pb-0">
      <HeaderMenu />
      <main className="max-w-md mx-auto md:max-w-5xl bg-white min-h-screen shadow-2xl overflow-hidden relative">
        {children}
      </main>
      {/* Mobile-only bottom nav */}
      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
