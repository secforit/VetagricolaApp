import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1">
        <div className="p-4 md:p-8 max-w-[1440px] mx-auto">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}
