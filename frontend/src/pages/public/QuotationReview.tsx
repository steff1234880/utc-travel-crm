import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, XCircle, FileText, AlertCircle, Loader } from 'lucide-react';

const QuotationReview = () => {
  const { id } = useParams();
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    fetchQuotation();
  }, [id]);

  const fetchQuotation = async () => {
    try {
      const response = await fetch(`/api/crm/quotations/public/${id}`);
      const data = await response.json();
      if (data.success) {
        setQuote(data.data);
      } else {
        setError(data.error || 'Quotation not found');
      }
    } catch (err) {
      setError('Failed to fetch quotation. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (status: 'ACCEPTED' | 'REJECTED') => {
    if (!confirm(`Are you sure you want to ${status.toLowerCase()} this quotation?`)) return;
    
    setSubmitting(true);
    try {
      const response = await fetch(`/api/crm/quotations/public/${id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, remarks })
      });
      const data = await response.json();
      if (data.success) {
        setQuote(data.data);
      } else {
        alert(data.error || 'Failed to submit response');
      }
    } catch (err) {
      alert('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-gray-500">
          <Loader className="w-8 h-8 animate-spin text-blue-600" />
          <p>Loading your quotation securely...</p>
        </div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Unavailable</h2>
          <p className="text-gray-600">{error || 'This quotation could not be found or has been removed.'}</p>
        </div>
      </div>
    );
  }

  const isExpired = new Date() > new Date(quote.validityDate);
  const canRespond = quote.status === 'SENT' && !isExpired;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Status Banners */}
        {quote.status === 'ACCEPTED' && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 text-green-700">
            <CheckCircle className="w-6 h-6" />
            <div>
              <p className="font-bold">Quotation Accepted</p>
              <p className="text-sm">Thank you! We have received your acceptance. Our team will contact you shortly to proceed.</p>
            </div>
          </div>
        )}
        
        {quote.status === 'REJECTED' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
            <XCircle className="w-6 h-6" />
            <div>
              <p className="font-bold">Quotation Declined</p>
              <p className="text-sm">You have declined this quotation. If you'd like to discuss revisions, please contact us.</p>
            </div>
          </div>
        )}

        {quote.status === 'DRAFT' && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3 text-orange-700">
            <AlertCircle className="w-6 h-6" />
            <div>
              <p className="font-bold">Quotation in Draft</p>
              <p className="text-sm">This quotation is not yet finalized. Please wait for the final version to be sent.</p>
            </div>
          </div>
        )}

        {isExpired && quote.status === 'SENT' && (
          <div className="bg-gray-100 border border-gray-300 rounded-xl p-4 flex items-center gap-3 text-gray-700">
            <AlertCircle className="w-6 h-6" />
            <div>
              <p className="font-bold">Quotation Expired</p>
              <p className="text-sm">This quotation expired on {new Date(quote.validityDate).toLocaleDateString()}. Please request a new quote.</p>
            </div>
          </div>
        )}

        {/* Invoice Body */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 p-8 text-white flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">Universal Travel Company</h1>
              <p className="text-blue-100">Your Ultimate Travel Partner</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold mb-1">QUOTATION</h2>
              <p className="text-blue-100 font-mono">{quote.quotationNumber}</p>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Prepared For</h3>
                <p className="font-bold text-gray-900">{quote.customer?.firstName} {quote.customer?.lastName}</p>
                <p className="text-gray-600">{quote.customer?.email}</p>
                {quote.customer?.phone && <p className="text-gray-600">{quote.customer?.phone}</p>}
              </div>
              <div className="md:text-right text-sm">
                <div className="grid grid-cols-2 gap-2 max-w-xs ml-auto">
                  <span className="text-gray-500 font-medium">Issue Date:</span>
                  <span className="text-gray-900">{new Date(quote.createdAt).toLocaleDateString()}</span>
                  <span className="text-gray-500 font-medium">Valid Until:</span>
                  <span className="text-gray-900">{new Date(quote.validityDate).toLocaleDateString()}</span>
                  {quote.destination && (
                    <>
                      <span className="text-gray-500 font-medium">Destination:</span>
                      <span className="text-gray-900">{quote.destination}</span>
                    </>
                  )}
                  {quote.travelDates && (
                    <>
                      <span className="text-gray-500 font-medium">Travel Dates:</span>
                      <span className="text-gray-900">{quote.travelDates}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="mb-8">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b-2 border-gray-100">
                    <th className="pb-3 font-bold text-gray-900">Description</th>
                    <th className="pb-3 font-bold text-gray-900 text-right">Qty</th>
                    <th className="pb-3 font-bold text-gray-900 text-right">Unit Price</th>
                    <th className="pb-3 font-bold text-gray-900 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {quote.items?.map((item: any) => (
                    <tr key={item.id}>
                      <td className="py-4">
                        <p className="font-medium text-gray-900">{item.title}</p>
                        {item.description && <p className="text-sm text-gray-500 mt-1">{item.description}</p>}
                      </td>
                      <td className="py-4 text-right text-gray-600">{item.quantity}</td>
                      <td className="py-4 text-right text-gray-600">₹{item.unitPrice.toLocaleString()}</td>
                      <td className="py-4 text-right font-medium text-gray-900">₹{item.totalPrice.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-full max-w-sm space-y-3 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Base Total</span>
                  <span>₹{quote.basePrice?.toLocaleString()}</span>
                </div>
                {quote.additionalCharges > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Additional Charges</span>
                    <span>₹{quote.additionalCharges.toLocaleString()}</span>
                  </div>
                )}
                {quote.taxes > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Taxes</span>
                    <span>₹{quote.taxes.toLocaleString()}</span>
                  </div>
                )}
                {quote.discounts > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Discounts</span>
                    <span>-₹{quote.discounts.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold text-gray-900 border-t border-gray-100 pt-3">
                  <span>Grand Total</span>
                  <span>₹{quote.finalAmount?.toLocaleString()} {quote.currency}</span>
                </div>
              </div>
            </div>

            {/* Terms */}
            <div className="mt-12 pt-8 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
              <div>
                <h4 className="font-bold text-gray-900 mb-2">Payment Terms</h4>
                <p className="text-gray-600 whitespace-pre-wrap">{quote.paymentTerms || 'Payment due upon acceptance.'}</p>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-2">Terms & Conditions</h4>
                <p className="text-gray-600 whitespace-pre-wrap">{quote.termsConditions || 'Standard booking terms apply. Prices subject to availability.'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Panel */}
        {canRespond && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Your Response</h3>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Optional Notes / Requests</label>
              <textarea 
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                rows={3}
                placeholder="Any special requests or reason for declining?"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => handleRespond('ACCEPTED')}
                disabled={submitting}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <CheckCircle className="w-5 h-5" /> Accept Quotation
              </button>
              <button
                onClick={() => handleRespond('REJECTED')}
                disabled={submitting}
                className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <XCircle className="w-5 h-5" /> Decline Quotation
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default QuotationReview;
