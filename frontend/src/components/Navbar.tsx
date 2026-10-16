import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { Menu, X, PhoneCall, Compass, ShieldCheck } from 'lucide-react';
import EnquiryModal from './EnquiryModal';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isEnquiryModalOpen, setIsEnquiryModalOpen] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const { data: homeContent } = useQuery({
    queryKey: ['homepage-content'],
    queryFn: async () => {
      const res = await api.get('/settings/homepage').catch(() => null);
      return res?.data?.data || null;
    }
  });

  const displayPhone = homeContent?.supportPhone || homeContent?.whatsappNumber || '+91 98765 43210';
  const telLink = displayPhone.replace(/[^0-9+]/g, '');

  const isPackageDetail = location.pathname.startsWith('/packages/') && location.pathname !== '/packages';
  const isTransparentHeroPage = location.pathname === '/' || isPackageDetail;
  
  // Dynamic styling for premium look
  const navbarClasses = (isTransparentHeroPage && !isScrolled && !isOpen)
    ? 'bg-transparent text-white border-transparent'
    : 'bg-white text-slate-900 shadow-md border-slate-100';

  const logoBg = (isTransparentHeroPage && !isScrolled && !isOpen) ? 'bg-white/20 border-white/30 text-white' : 'bg-[#8b182b] border-[#8b182b] text-white';
  const logoText = (isTransparentHeroPage && !isScrolled && !isOpen) ? 'text-white' : 'text-[#8b182b]';
  const logoSubtext = (isTransparentHeroPage && !isScrolled && !isOpen) ? 'text-white/80' : 'text-slate-500';
  
  const linkBase = "text-[13px] font-bold uppercase tracking-wider transition-colors";
  const linkHover = (isTransparentHeroPage && !isScrolled && !isOpen) ? "hover:text-amber-300" : "hover:text-[#8b182b]";

  return (
    <>
      <nav className={`fixed w-full top-0 z-50 transition-all duration-300 border-b ${navbarClasses}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20 sm:h-24">
            
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3 sm:space-x-4 group">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl backdrop-blur-md border flex items-center justify-center font-black text-xl sm:text-2xl transition-all shadow-sm ${logoBg}`}>
                UTC
              </div>
              <div>
                <span className={`text-xl sm:text-2xl font-black tracking-tight block leading-none ${logoText}`}>Universal Travel Company</span>
                <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-widest sm:tracking-[0.2em] block mt-1 ${logoSubtext}`}>Ultimate Travel Companion</span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden lg:flex items-center space-x-8">
              <Link to="/" className={`${linkBase} ${location.pathname === '/' ? ((isTransparentHeroPage && !isScrolled) ? 'text-amber-300' : 'text-[#8b182b]') : linkHover}`}>Home</Link>
              <Link to="/packages" className={`${linkBase} ${location.pathname === '/packages' ? ((isTransparentHeroPage && !isScrolled) ? 'text-amber-300' : 'text-[#8b182b]') : linkHover}`}>Packages</Link>
              <Link to="/blog" className={`${linkBase} ${linkHover}`}>Travel Guide</Link>
              <Link to="/about" className={`${linkBase} ${linkHover}`}>About</Link>
              <Link to="/contact" className={`${linkBase} ${linkHover}`}>Contact</Link>
            </div>

            {/* Actions */}
            <div className="hidden lg:flex items-center space-x-5">
              <a
                href={`tel:${telLink}`}
                className={`flex items-center space-x-2.5 transition-colors group ${(isTransparentHeroPage && !isScrolled && !isOpen) ? 'text-white' : 'text-slate-700'}`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${(isTransparentHeroPage && !isScrolled && !isOpen) ? 'bg-white/20 group-hover:bg-amber-400' : 'bg-slate-100 group-hover:bg-[#8b182b] group-hover:text-white'}`}>
                  <PhoneCall className="w-4 h-4" />
                </div>
                <div className="text-left leading-tight hidden xl:block">
                  <span className="block text-[9px] uppercase font-bold tracking-wider opacity-70">Talk to Expert</span>
                  <span className="font-bold text-sm tracking-wide">{displayPhone}</span>
                </div>
              </a>

              <button
                onClick={() => { setIsCustomMode(true); setIsEnquiryModalOpen(true); }}
                className="px-6 py-3.5 bg-[#8b182b] hover:bg-[#a31c33] text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-[#8b182b]/30 hover:shadow-[#8b182b]/50 transform hover:-translate-y-0.5"
              >
                Plan My Trip
              </button>
            </div>

            {/* Mobile Hamburger */}
            <div className="flex items-center lg:hidden">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-2.5 rounded-xl transition-colors ${(isTransparentHeroPage && !isScrolled && !isOpen) ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-800'}`}
              >
                {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>

          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {isOpen && (
          <div className="lg:hidden bg-white text-slate-900 border-t border-slate-100 px-5 pt-4 pb-8 space-y-4 text-sm font-bold uppercase tracking-wider shadow-2xl absolute w-full left-0 top-full">
            <Link to="/" className={`block py-2 ${location.pathname === '/' ? 'text-[#8b182b]' : 'text-slate-600'}`} onClick={() => setIsOpen(false)}>Home</Link>
            <Link to="/packages" className="block py-2 text-slate-600" onClick={() => setIsOpen(false)}>Packages</Link>
            <Link to="/blog" className="block py-2 text-slate-600" onClick={() => setIsOpen(false)}>Travel Guide</Link>
            <Link to="/about" className="block py-2 text-slate-600" onClick={() => setIsOpen(false)}>About</Link>
            <Link to="/contact" className="block py-2 text-slate-600" onClick={() => setIsOpen(false)}>Contact</Link>
            <div className="pt-4 border-t border-slate-100 flex flex-col gap-4">
              <a href={`tel:${telLink}`} className="flex items-center justify-center gap-2 py-3 bg-slate-50 rounded-xl text-[#8b182b]">
                <PhoneCall className="w-5 h-5" />
                <span>{displayPhone}</span>
              </a>
              <button
                onClick={() => {
                  setIsCustomMode(true);
                  setIsEnquiryModalOpen(true);
                  setIsOpen(false);
                }}
                className="w-full py-4 bg-[#8b182b] text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-[#8b182b]/30"
              >
                Customise My Trip
              </button>
            </div>
          </div>
        )}
      </nav>

      <EnquiryModal isOpen={isEnquiryModalOpen} onClose={() => setIsEnquiryModalOpen(false)} isCustomMode={isCustomMode} />
    </>
  );
}
