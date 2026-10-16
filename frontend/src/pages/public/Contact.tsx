import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';

const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  subject: z.string().min(3, 'Subject must be at least 3 characters'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

type ContactFormData = z.infer<typeof contactSchema>;

export default function Contact() {
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const { data: homeContent } = useQuery({
    queryKey: ['homepage-content'],
    queryFn: async () => {
      const res = await api.get('/settings/homepage').catch(() => null);
      return res?.data?.data || null;
    }
  });

  const displayPhone = homeContent?.supportPhone || '+1 (555) 123-4567';
  const displayWhatsApp = homeContent?.whatsappNumber || '+1 (555) 987-6543';
  const displayEmail = homeContent?.content?.supportEmail || 'info@utctravel.com';

  const onSubmit = async (data: ContactFormData) => {
    setSubmitStatus('submitting');
    try {
      await api.post('/contact', data);
      setSubmitStatus('success');
      reset();
    } catch (error) {
      setSubmitStatus('error');
    }
  };

  return (
    <div className="bg-slate-50 py-16 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl font-extrabold text-slate-900 mb-4">Contact Us</h1>
          <p className="text-lg text-slate-600">Have questions about a customized tour? Our travel experts are ready to assist you.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          
          {/* Contact Form */}
          <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl">
            <h2 className="text-2xl font-bold text-slate-900 mb-8">Send an Enquiry</h2>
            
            {submitStatus === 'success' && (
              <div className="bg-green-50 text-green-800 p-4 rounded-lg mb-6 border border-green-200">
                Thank you! Your enquiry has been sent successfully. We will get back to you shortly.
              </div>
            )}
            
            {submitStatus === 'error' && (
              <div className="bg-red-50 text-red-800 p-4 rounded-lg mb-6 border border-red-200">
                Failed to send enquiry. Please try again later.
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                <input {...register('name')} className="w-full border-slate-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3 border" placeholder="John Doe" />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                  <input type="email" {...register('email')} className="w-full border-slate-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3 border" placeholder="john@example.com" />
                  {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <input {...register('phone')} className="w-full border-slate-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3 border" placeholder="+1 (555) 000-0000" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subject *</label>
                <input {...register('subject')} className="w-full border-slate-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3 border" placeholder="Paris Summer Tour" />
                {errors.subject && <p className="text-red-500 text-sm mt-1">{errors.subject.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Message *</label>
                <textarea {...register('message')} rows={5} className="w-full border-slate-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3 border" placeholder="Tell us about your dream trip..."></textarea>
                {errors.message && <p className="text-red-500 text-sm mt-1">{errors.message.message}</p>}
              </div>

              <button 
                type="submit" 
                disabled={submitStatus === 'submitting'}
                className="w-full bg-blue-600 text-white font-bold py-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400"
              >
                {submitStatus === 'submitting' ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>

          {/* Contact Details */}
          <div className="flex flex-col justify-center">
            <div className="space-y-8">
              <div className="flex items-start">
                <div className="flex-shrink-0 bg-blue-100 p-4 rounded-full">
                  <MapPin className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-1">Office Location</h3>
                  <p className="text-slate-600">123 Travel Avenue, Suite 400<br/>New York, NY 10001, USA</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0 bg-blue-100 p-4 rounded-full">
                  <Phone className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-1">Phone & WhatsApp</h3>
                  <p className="text-slate-600">Tel: {displayPhone}<br/>WA: {displayWhatsApp}</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 bg-blue-100 p-4 rounded-full">
                  <Mail className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-1">Email</h3>
                  <p className="text-slate-600">{displayEmail}</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 bg-blue-100 p-4 rounded-full">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-1">Working Hours</h3>
                  <p className="text-slate-600">Monday - Friday: 9:00 AM - 6:00 PM<br/>Saturday: 10:00 AM - 2:00 PM</p>
                </div>
              </div>
            </div>
            
            <div className="mt-12 bg-slate-200 rounded-3xl h-64 w-full flex items-center justify-center overflow-hidden">
               {/* Google Maps Placeholder */}
               <p className="text-slate-500 font-medium">Google Maps Integration</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
