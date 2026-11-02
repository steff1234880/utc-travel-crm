import { Outlet, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import WhatsAppButton from '../components/WhatsAppButton';
import GlobalLoadingAnimation from '../components/common/GlobalLoadingAnimation';
import { trackMetaEvent, initMetaPixel } from '../utils/metaPixel';
import api from '../services/api';

export default function PublicLayout() {
  const location = useLocation();
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // Initialize Meta Pixel if configured
  useEffect(() => {
    api.get('/meta/config').then(res => {
      const pixelId = res.data?.data?.config?.pixelId;
      if (pixelId) {
        initMetaPixel(pixelId);
      }
    }).catch(() => {});
  }, []);

  // Track PageView on route changes
  useEffect(() => {
    trackMetaEvent('PageView', {
      path: location.pathname,
      search: location.search,
      title: document.title,
    });
  }, [location.pathname]);

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
