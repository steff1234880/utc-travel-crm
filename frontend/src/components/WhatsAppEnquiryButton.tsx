import { MessageCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

interface WhatsAppEnquiryButtonProps {
  phoneNumber?: string;
  message?: string;
  packageName?: string;
  className?: string;
  variant?: 'solid' | 'outline' | 'floating';
}

export default function WhatsAppEnquiryButton({
  phoneNumber = '1234567890', // In production, this comes from env vars
  message,
  packageName,
  className = '',
  variant = 'solid'
}: WhatsAppEnquiryButtonProps) {
  const { data } = useQuery({
    queryKey: ['homepage-content'],
    queryFn: async () => {
      const res = await api.get('/settings/homepage').catch(() => null);
      return res?.data?.data || null;
    }
  });

  // Construct the pre-filled message
  let defaultMessage = "Hi, I would like to enquire about Universal Travel Company services.";
  if (packageName) {
    defaultMessage = `Hi, I am interested in the "${packageName}" package. Can you provide more details?`;
  }
  
  const finalMessage = encodeURIComponent(message || defaultMessage);
  const rawNumber = data?.whatsappNumber || phoneNumber;
  const cleanNumber = rawNumber.replace(/[^0-9]/g, '');
  const whatsappUrl = `https://wa.me/${cleanNumber}?text=${finalMessage}`;

  if (variant === 'floating') {
    return (
      <a 
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`fixed bottom-6 right-6 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all z-50 flex items-center justify-center ${className}`}
        aria-label="Contact us on WhatsApp"
      >
        <MessageCircle className="w-8 h-8" />
      </a>
    );
  }

  if (variant === 'outline') {
    return (
      <a 
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center justify-center border-2 border-green-500 text-green-600 hover:bg-green-50 px-6 py-3 rounded-xl font-bold transition-colors ${className}`}
      >
        <MessageCircle className="w-5 h-5 mr-2" />
        WhatsApp Us
      </a>
    );
  }

  return (
    <a 
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-bold transition-colors shadow-md ${className}`}
    >
      <MessageCircle className="w-5 h-5 mr-2" />
      WhatsApp Enquiry
    </a>
  );
}
