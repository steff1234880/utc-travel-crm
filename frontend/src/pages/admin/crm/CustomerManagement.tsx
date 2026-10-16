import React, { useEffect, useState } from 'react';
import api from '../../../services/api';
import { Search, Mail, Phone, Eye, Trash2, AlertCircle, X, Compass, Briefcase, Calendar, MessageCircle, RefreshCw } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export default function CustomerManagement() {
  const location = useLocation();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Delete modal state
  const [deletingCustomer, setDeletingCustomer] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // View modal state
  const [viewCustomer, setViewCustomer] = useState<any | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  // Toast / notification feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    location.state?.message ? { type: 'success', message: location.state.message } : null
  );

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/crm/customers', { params: { search } });
      setCustomers(data.data || []);
    } catch (error) {
      console.error('Failed to fetch customers', error);
      setFeedback({ type: 'error', message: 'Failed to load customers list' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDeleteModal = (customer: any) => {
    setDeletingCustomer(customer);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingCustomer?.id) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await api.delete(`/crm/customers/${deletingCustomer.id}`);
      if (res.data.success) {
        setFeedback({ type: 'success', message: res.data.message || 'Customer deleted successfully' });
        setDeletingCustomer(null);
        fetchCustomers();
      }
    } catch (err: any) {
      console.error('Failed to delete customer', err);
      const errMsg = err?.response?.data?.error || 'Failed to delete customer. Please try again.';
      setDeleteError(errMsg);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenViewModal = async (customerId: string) => {
    setViewLoading(true);
    setViewCustomer(null);
    try {
      const { data } = await api.get(`/crm/customers/${customerId}`);
      setViewCustomer(data.data);
    } catch (err: any) {
      console.error('Failed to fetch customer details', err);
      setFeedback({ type: 'error', message: err?.response?.data?.error || 'Failed to fetch customer details' });
    } finally {
      setViewLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500 mt-1">Manage all client contacts, view details, and track activity history.</p>
        </div>
        <button
          onClick={fetchCustomers}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg shadow-sm transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {feedback && (
        <div className={`mb-6 p-4 rounded-xl text-sm flex items-center justify-between border ${
          feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="font-bold text-lg leading-none ml-4">&times;</button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search customers by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Created</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">Loading customers...</td></tr>
              ) : customers.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">No customers found.</td></tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">
                        {customer.firstName} {customer.lastName || ''}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">ID: {customer.id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                        <Mail className="w-4 h-4 text-gray-400" /> {customer.email}
                      </div>
                      {customer.phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="w-4 h-4 text-gray-400" /> {customer.phone}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(customer.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* View Button */}
                        <button
                          onClick={() => handleOpenViewModal(customer.id)}
                          title="Quick View Customer Details"
                          className="inline-flex items-center justify-center p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <Link
                          to={`/admin/crm/customers/${customer.id}`}
                          title="Open Full Customer Page"
                          className="inline-flex items-center justify-center p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-xs font-medium"
                        >
                          View
                        </Link>
                        {/* Delete Button */}
                        <button
                          onClick={() => handleOpenDeleteModal(customer)}
                          title="Delete Customer"
                          className="inline-flex items-center justify-center p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingCustomer && (
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

            <div className="p-3 bg-gray-50 rounded-lg mb-4 text-xs text-gray-700 border border-gray-100">
              <span className="font-semibold text-gray-900">Customer: </span>
              {deletingCustomer.firstName} {deletingCustomer.lastName || ''} ({deletingCustomer.email})
            </div>

            {deleteError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div>{deleteError}</div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setDeletingCustomer(null); setDeleteError(null); }}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Quick View Modal */}
      {(viewCustomer || viewLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">Customer Details</h3>
              <button
                onClick={() => setViewCustomer(null)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {viewLoading ? (
              <div className="py-12 text-center text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                Loading customer details...
              </div>
            ) : viewCustomer ? (
              <div className="space-y-6">
                {/* Header Profile */}
                <div className="flex items-center gap-4 bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <div className="w-12 h-12 rounded-full bg-blue-600 text-white font-bold text-xl flex items-center justify-center">
                    {viewCustomer.firstName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-900">{viewCustomer.firstName} {viewCustomer.lastName || ''}</h4>
                    <p className="text-xs text-gray-500">ID: {viewCustomer.id}</p>
                  </div>
                </div>

                {/* Contact Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="text-xs text-gray-400 font-semibold uppercase">Email</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">{viewCustomer.email || 'N/A'}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="text-xs text-gray-400 font-semibold uppercase">Phone</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">{viewCustomer.phone || 'N/A'}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="text-xs text-gray-400 font-semibold uppercase">WhatsApp</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">{viewCustomer.whatsappNumber || viewCustomer.phone || 'N/A'}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="text-xs text-gray-400 font-semibold uppercase">Created Date</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">{new Date(viewCustomer.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Related Summaries */}
                <div className="space-y-4 pt-2">
                  <div>
                    <h5 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1.5">
                      <Compass className="w-4 h-4 text-blue-600" /> Enquiries ({viewCustomer.enquiries?.length || 0})
                    </h5>
                    {viewCustomer.enquiries && viewCustomer.enquiries.length > 0 ? (
                      <div className="space-y-2">
                        {viewCustomer.enquiries.map((enq: any) => (
                          <div key={enq.id} className="p-3 bg-gray-50 rounded-lg text-xs flex justify-between items-center border border-gray-100">
                            <div>
                              <span className="font-semibold text-blue-600 mr-2">{enq.referenceNumber}</span>
                              <span className="text-gray-600">{enq.destination || 'No destination'}</span>
                            </div>
                            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-medium">{enq.status}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">No enquiries associated.</p>
                    )}
                  </div>

                  <div>
                    <h5 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4 text-indigo-600" /> Bookings & Tours ({(viewCustomer.tours?.length || 0) + (viewCustomer.bookingPreps?.length || 0) + (viewCustomer.groupTourBookings?.length || 0)})
                    </h5>
                    {(viewCustomer.tours?.length || 0) + (viewCustomer.bookingPreps?.length || 0) + (viewCustomer.groupTourBookings?.length || 0) > 0 ? (
                      <div className="space-y-2">
                        {viewCustomer.tours?.map((t: any) => (
                          <div key={t.id} className="p-3 bg-gray-50 rounded-lg text-xs flex justify-between items-center border border-gray-100">
                            <span className="font-medium text-gray-900">Tour: {t.tourReference} ({t.destination})</span>
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium">{t.status}</span>
                          </div>
                        ))}
                        {viewCustomer.bookingPreps?.map((b: any) => (
                          <div key={b.id} className="p-3 bg-gray-50 rounded-lg text-xs flex justify-between items-center border border-gray-100">
                            <span className="font-medium text-gray-900">Booking Prep: {b.bookingReference}</span>
                            <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-medium">{b.status}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">No bookings or tours associated.</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                  <Link
                    to={`/admin/crm/customers/${viewCustomer.id}`}
                    className="text-xs font-medium text-blue-600 hover:underline"
                  >
                    Open Full Details Page →
                  </Link>
                  <button
                    onClick={() => setViewCustomer(null)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
