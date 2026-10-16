import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { 
  ArrowLeft, User, Phone, Mail, Calendar, MessageCircle, 
  Trash2, AlertCircle, FileText, Compass, Briefcase, DollarSign, CheckCircle2, XCircle, Activity
} from 'lucide-react';
import { Timeline, TimelineEvent } from '../../../components/common/Timeline';
import { timelineService } from '../../../services/timelineService';

interface CustomerDetailData {
  id: string;
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  whatsappNumber?: string;
  createdAt: string;
  updatedAt: string;
  enquiries?: any[];
  salesLeads?: any[];
  quotations?: any[];
  bookingPreps?: any[];
  tours?: any[];
  groupTourBookings?: any[];
  payments?: any[];
}

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<CustomerDetailData | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (id) fetchCustomer();
  }, [id]);

  const fetchCustomer = async () => {
    setLoading(true);
    setError(null);
    try {
      const [customerRes, timelineRes] = await Promise.all([
        api.get(`/crm/customers/${id}`),
        timelineService.getTimeline('CUSTOMER', id!)
      ]);
      setCustomer(customerRes.data.data);
      setTimelineEvents(timelineRes);
    } catch (err: any) {
      console.error('Failed to fetch customer details', err);
      setError(err?.response?.data?.error || 'Failed to load customer details');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!id) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await api.delete(`/crm/customers/${id}`);
      if (res.data.success) {
        setIsDeleteModalOpen(false);
        navigate('/admin/crm/customers', { state: { message: 'Customer deleted successfully' } });
      }
    } catch (err: any) {
      console.error('Failed to delete customer', err);
      const errMsg = err?.response?.data?.error || 'Failed to delete customer. Please try again.';
      setDeleteError(errMsg);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto text-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-500">Loading customer details...</p>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <Link to="/admin/crm/customers" className="inline-flex items-center text-sm text-gray-500 hover:text-blue-600 mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Customers
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-700">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
          <h3 className="text-lg font-semibold">{error || 'Customer Not Found'}</h3>
          <p className="text-sm mt-1">The requested customer record could not be found or fetched.</p>
        </div>
      </div>
    );
  }

  const fullName = `${customer.firstName} ${customer.lastName || ''}`.trim();
  const totalEnquiries = customer.enquiries?.length || 0;
  const totalBookings = (customer.bookingPreps?.length || 0) + (customer.tours?.length || 0) + (customer.groupTourBookings?.length || 0);
  const totalQuotations = customer.quotations?.length || 0;
  const totalSalesLeads = customer.salesLeads?.length || 0;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link to="/admin/crm/customers" className="inline-flex items-center text-sm text-gray-500 hover:text-blue-600 mb-2">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Customers
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xl">
              {customer.firstName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{fullName}</h1>
              <p className="text-xs text-gray-400">ID: {customer.id}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { setDeleteError(null); setIsDeleteModalOpen(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-lg text-sm font-medium transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Delete Customer
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-800">×</button>
        </div>
      )}

      {/* Profile Overview Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">Customer Profile & Contact Info</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold">Email</p>
              <p className="text-sm font-medium text-gray-900 mt-0.5">{customer.email || 'N/A'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold">Phone</p>
              <p className="text-sm font-medium text-gray-900 mt-0.5">{customer.phone || 'N/A'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-lg">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold">WhatsApp</p>
              <p className="text-sm font-medium text-gray-900 mt-0.5">{customer.whatsappNumber || customer.phone || 'N/A'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold">Created Date</p>
              <p className="text-sm font-medium text-gray-900 mt-0.5">{new Date(customer.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
          <p className="text-2xl font-bold text-blue-600">{totalEnquiries}</p>
          <p className="text-xs text-gray-500 font-medium mt-1">Enquiries</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
          <p className="text-2xl font-bold text-indigo-600">{totalBookings}</p>
          <p className="text-xs text-gray-500 font-medium mt-1">Bookings & Tours</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
          <p className="text-2xl font-bold text-purple-600">{totalQuotations}</p>
          <p className="text-xs text-gray-500 font-medium mt-1">Quotations</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
          <p className="text-2xl font-bold text-amber-600">{totalSalesLeads}</p>
          <p className="text-xs text-gray-500 font-medium mt-1">Sales Leads</p>
        </div>
      </div>

      {/* Related Sections */}
      <div className="space-y-8">
        {/* Related Enquiries */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Compass className="w-4 h-4 text-blue-600" /> Related Enquiries ({totalEnquiries})
            </h3>
          </div>
          {customer.enquiries && customer.enquiries.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3">Reference</th>
                    <th className="px-6 py-3">Destination</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Travel Date</th>
                    <th className="px-6 py-3">Created Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {customer.enquiries.map((enq) => (
                    <tr key={enq.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-blue-600">
                        <Link to={`/admin/crm/enquiries/${enq.id}`}>{enq.referenceNumber}</Link>
                      </td>
                      <td className="px-6 py-3 text-gray-700">{enq.destination || 'N/A'}</td>
                      <td className="px-6 py-3">
                        <span className="inline-flex px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700">
                          {enq.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-500">{enq.travelDate || 'N/A'}</td>
                      <td className="px-6 py-3 text-gray-500">{new Date(enq.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center text-sm text-gray-400">No related enquiries found for this customer.</div>
          )}
        </div>

        {/* Related Bookings & Tours */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-indigo-600" /> Related Bookings & Tours ({totalBookings})
            </h3>
          </div>
          {totalBookings > 0 ? (
            <div className="p-6 space-y-4">
              {customer.tours && customer.tours.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Tours ({customer.tours.length})</h4>
                  <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
                    {customer.tours.map((t) => (
                      <div key={t.id} className="p-3 bg-gray-50 flex justify-between items-center text-sm">
                        <div>
                          <p className="font-medium text-gray-900">{t.tourReference || 'Tour Record'}</p>
                          <p className="text-xs text-gray-500">{t.destination} • Status: {t.status}</p>
                        </div>
                        <span className="text-xs text-gray-400">{new Date(t.createdAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {customer.bookingPreps && customer.bookingPreps.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Booking Preparations ({customer.bookingPreps.length})</h4>
                  <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
                    {customer.bookingPreps.map((b) => (
                      <div key={b.id} className="p-3 bg-gray-50 flex justify-between items-center text-sm">
                        <div>
                          <p className="font-medium text-gray-900">{b.bookingReference || 'Booking Record'}</p>
                          <p className="text-xs text-gray-500">Status: {b.status}</p>
                        </div>
                        <span className="text-xs text-gray-400">{new Date(b.createdAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {customer.groupTourBookings && customer.groupTourBookings.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Group Tour Bookings ({customer.groupTourBookings.length})</h4>
                  <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
                    {customer.groupTourBookings.map((g) => (
                      <div key={g.id} className="p-3 bg-gray-50 flex justify-between items-center text-sm">
                        <div>
                          <p className="font-medium text-gray-900">{g.groupTour?.title || 'Group Tour'}</p>
                          <p className="text-xs text-gray-500">Booking Code: {g.bookingCode} • Status: {g.bookingStatus}</p>
                        </div>
                        <span className="text-xs text-gray-400">{new Date(g.createdAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 text-center text-sm text-gray-400">No related bookings or tours found for this customer.</div>
          )}
        </div>
      </div>

      {/* Unified Timeline */}
      <div className="bg-slate-900 rounded-xl shadow-lg border border-slate-800 overflow-hidden mt-8">
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" /> Customer Activity Timeline
          </h3>
        </div>
        <div className="p-6 max-h-[600px] overflow-y-auto">
          <Timeline events={timelineEvents} loading={loading} />
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Delete Customer</h3>
                <p className="text-xs text-gray-500">Action cannot be undone</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete this customer?
            </p>

            {deleteError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div>{deleteError}</div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setIsDeleteModalOpen(false); setDeleteError(null); }}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteCustomer}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
