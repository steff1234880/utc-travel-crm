import { MessageCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

interface WhatsAppButtonProps {
  message?: string;
}

export default function WhatsAppButton({ message = 'Hello, I would like to enquire about a travel package.' }: WhatsAppButtonProps) {
  const { data } = useQuery({
    queryKey: ['homepage-content'],
    queryFn: async () => {
      const res = await api.get('/settings/homepage').catch(() => null);
      return res?.data?.data || null;
    }
  });

  const rawNumber = data?.whatsappNumber || import.meta.env.VITE_WHATSAPP_NUMBER || '1234567890';
  const phoneNumber = rawNumber.replace(/[^0-9]/g, '');
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

  return (
    <a 
      href={whatsappUrl} 
      target="_blank" 
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 bg-green-500 text-white p-4 rounded-full shadow-lg hover:bg-green-600 transition-all transform hover:scale-110 flex items-center justify-center"
      aria-label="Chat on WhatsApp"
    >
      <MessageCircle className="w-7 h-7" />
    </a>
  );
}
