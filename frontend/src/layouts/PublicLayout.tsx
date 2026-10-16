import { Outlet, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import WhatsAppButton from '../components/WhatsAppButton';
import GlobalLoadingAnimation from '../components/common/GlobalLoadingAnimation';

export default function PublicLayout() {
  const location = useLocation();
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // Initial site visit luxury preloader presentation
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialLoaded(true);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  // Route transition smooth loader
  useEffect(() => {
    if (!initialLoaded) return;
    setIsNavigating(true);
    const timer = setTimeout(() => {
      setIsNavigating(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [location.pathname, initialLoaded]);

  const showLoader = !initialLoaded || isNavigating;

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-900">
      <GlobalLoadingAnimation isLoading={showLoader} />
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
