import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { Phone, Mail, Clock, ShieldCheck, Heart, MessageCircle } from 'lucide-react';

export default function Footer() {
  const { data: footerData } = useQuery({
    queryKey: ['footer-content'],
    queryFn: async () => {
      const res = await api.get('/settings/footer').catch(() => null);
      return res?.data?.data || null;
    }
  });

  const displayPhone = footerData?.supportPhone || '+1 (800) 555-UTC1';
  const displayEmail = footerData?.supportEmail || 'support@utctravel.com';
  const companyBio = footerData?.companyBio || 'We craft unforgettable journeys with exceptional experiences at every step. From luxury customized escapes to guided group departures across Sri Lanka and global destinations.';
  const logoText = footerData?.logoText || 'Universal Travel Company';
  const logoSubtext = footerData?.logoSubtext || 'Ultimate Travel Companion';
  const copyrightText = footerData?.copyrightText || '© 2026 Universal Travel Company. All rights reserved.';
  
  const navColumns: any = footerData?.navColumns || {
    packages: [
      { label: 'Family Packages', url: '/packages' },
      { label: 'Honeymoon Packages', url: '/packages' },
      { label: 'Luxury Packages', url: '/packages' },
      { label: 'Group Tours', url: '/packages' },
      { label: 'View All Packages', url: '/packages' }
    ],
    support: [
      { label: 'About Universal Travel Company', url: '/about' },
      { label: 'Why Choose Us', url: '/about' },
      { label: 'Travel Blog', url: '/blog' },
      { label: 'Contact Us', url: '/contact' }
    ]
  };
  
  return (
    <footer className="bg-[#24060c] text-white pt-16 pb-12 border-t border-[#3d0a14]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Main Footer Links Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 text-xs">
          
          {/* Brand Bio */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center font-black text-xl text-white">
                UTC
              </div>
              <div>
                <span className="text-xl font-black tracking-wider block leading-none">{logoText}</span>
                <span className="text-[9px] font-medium text-amber-200 uppercase tracking-widest block mt-0.5">{logoSubtext}</span>
              </div>
            </div>

            <p className="text-slate-400 leading-relaxed font-normal max-w-sm">
              {companyBio}
            </p>

            <div className="flex items-center space-x-3 pt-2">
              {footerData?.facebookUrl && (
                <a href={footerData.facebookUrl} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-slate-300 hover:bg-white/20 transition-colors">f</a>
              )}
              {footerData?.twitterUrl && (
                <a href={footerData.twitterUrl} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-slate-300 hover:bg-white/20 transition-colors">t</a>
              )}
              {footerData?.instagramUrl && (
                <a href={footerData.instagramUrl} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-slate-300 hover:bg-white/20 transition-colors">ig</a>
              )}
              {footerData?.youtubeUrl && (
                <a href={footerData.youtubeUrl} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-slate-300 hover:bg-white/20 transition-colors">yt</a>
              )}
              {footerData?.linkedinUrl && (
                <a href={footerData.linkedinUrl} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-slate-300 hover:bg-white/20 transition-colors">in</a>
              )}
              {/* Fallback icons if no links configured */}
              {!footerData?.facebookUrl && !footerData?.twitterUrl && !footerData?.instagramUrl && !footerData?.youtubeUrl && !footerData?.linkedinUrl && (
                <>
                  <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-slate-300 hover:bg-white/20 cursor-pointer">f</span>
                  <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-slate-300 hover:bg-white/20 cursor-pointer">t</span>
                  <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-slate-300 hover:bg-white/20 cursor-pointer">ig</span>
                  <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-slate-300 hover:bg-white/20 cursor-pointer">yt</span>
                </>
              )}
            </div>
          </div>

          {/* Destinations */}
          <div className="space-y-3">
            <h4 className="font-bold text-amber-200 uppercase tracking-wider text-xs">Destinations</h4>
            <ul className="space-y-2 text-slate-400">
              <li><Link to="/destinations" className="hover:text-white transition-colors">Sri Lanka</Link></li>
              <li><Link to="/destinations" className="hover:text-white transition-colors">Maldives</Link></li>
              <li><Link to="/destinations" className="hover:text-white transition-colors">Dubai</Link></li>
              <li><Link to="/destinations" className="hover:text-white transition-colors">Thailand</Link></li>
              <li><Link to="/destinations" className="text-amber-300 font-bold hover:underline">View All Destinations</Link></li>
            </ul>
          </div>

          {/* Packages */}
          <div className="space-y-3">
            <h4 className="font-bold text-amber-200 uppercase tracking-wider text-xs">Packages</h4>
            <ul className="space-y-2 text-slate-400">
              {navColumns.packages?.map((item: any, index: number) => (
                <li key={index}>
                  <Link to={item.url} className={index === navColumns.packages.length - 1 ? "text-amber-300 font-bold hover:underline" : "hover:text-white transition-colors"}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* About & Support */}
          <div className="space-y-3">
            <h4 className="font-bold text-amber-200 uppercase tracking-wider text-xs">About & Support</h4>
            <ul className="space-y-2 text-slate-400">
              {navColumns.support?.map((item: any, index: number) => (
                <li key={index}>
                  <Link to={item.url} className="hover:text-white transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
              <li className="pt-2 text-slate-300 font-medium flex items-center">
                <Phone className="w-3.5 h-3.5 text-amber-300 mr-2 shrink-0" />
                <span>{displayPhone}</span>
              </li>
              <li className="text-slate-300 font-medium flex items-center">
                <Mail className="w-3.5 h-3.5 text-amber-300 mr-2 shrink-0" />
                <span>{displayEmail}</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Payment Methods & Copyright Strip */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-4">
          <p>{copyrightText}</p>

          <div className="flex items-center space-x-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">We Accept:</span>
            <span className="px-2 py-1 bg-white text-slate-900 font-black text-[9px] rounded">VISA</span>
            <span className="px-2 py-1 bg-white text-slate-900 font-black text-[9px] rounded">MasterCard</span>
            <span className="px-2 py-1 bg-white text-slate-900 font-black text-[9px] rounded">RuPay</span>
            <span className="px-2 py-1 bg-white text-slate-900 font-black text-[9px] rounded">UPI</span>
          </div>

          <div className="flex items-center space-x-4">
            <Link to="/terms" className="hover:text-white transition-colors">Privacy Policy</Link>
            <span>•</span>
            <Link to="/terms" className="hover:text-white transition-colors">Terms & Conditions</Link>
            <span>•</span>
            <Link to="/terms" className="hover:text-white transition-colors">Cookies Policy</Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
