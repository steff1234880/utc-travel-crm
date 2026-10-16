import React, { useState, useEffect } from 'react';
import {
  FileText,
  UploadCloud,
  Search,
  Filter,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Trash2,
  RefreshCw,
  X,
  FileCheck,
  Building,
  Plane,
  Train,
  Bus,
  ShieldAlert
} from 'lucide-react';
import { operationsService, OperationsDocument, Tour } from '../../../services/operationsService';

const DOCUMENT_TYPES = [
  'Flight Ticket',
  'Train Ticket',
  'Bus Ticket',
  'Hotel Voucher',
  'Booking Confirmation',
  'Customer Document',
  'Travel Document',
  'Package Document',
  'Operational File',
  'Other',
];

export default function DocumentManagement() {
  const [documents, setDocuments] = useState<OperationsDocument[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [documentTypeFilter, setDocumentTypeFilter] = useState('ALL');
  const [verificationFilter, setVerificationFilter] = useState('ALL');
  const [expiryTab, setExpiryTab] = useState<'ALL' | 'PENDING' | 'EXPIRING_SOON' | 'EXPIRED'>('ALL');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, limit: 10, totalPages: 1 });

  // Modal States
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [verifyingDoc, setVerifyingDoc] = useState<OperationsDocument | null>(null);
  const [docToDelete, setDocToDelete] = useState<OperationsDocument | null>(null);
  const [uploading, setUploading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Upload Form State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState({
    tourId: '',
    customerId: '',
    documentType: 'Flight Ticket',
    expiryDate: '',
    notes: '',
  });

  // Verify Form State
  const [verifyForm, setVerifyForm] = useState({
    status: 'Verified',
    rejectionReason: '',
  });

  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await operationsService.getDocuments({
        search,
        documentType: documentTypeFilter,
        verificationStatus: expiryTab === 'PENDING' ? 'Pending' : verificationFilter,
        expiryFilter: expiryTab === 'EXPIRING_SOON' ? 'EXPIRING_SOON' : expiryTab === 'EXPIRED' ? 'EXPIRED' : undefined,
        page,
        limit: 10,
      });
      setDocuments(data.documents);
      setPagination(data.pagination);
    } catch (err: any) {
      console.error('Error fetching documents:', err);
      setError('Failed to load documents list.');
    } finally {
      setLoading(false);
    }
  };

  const loadDropdowns = async () => {
    try {
      const [tRes, cRes] = await Promise.allSettled([
        operationsService.getTours({ limit: 100 }),
        operationsService.getCustomers(),
      ]);
      if (tRes.status === 'fulfilled') setTours(tRes.value.tours || []);
      if (cRes.status === 'fulfilled') setCustomers(cRes.value || []);
    } catch (e) {
      console.error('Error loading dropdown options:', e);
    }
  };

  useEffect(() => {
    loadDropdowns();
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [search, documentTypeFilter, verificationFilter, expiryTab, page]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        alert('File size exceeds maximum 10MB limit.');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setModalError('Please select a file to upload');
      return;
    }
    setUploading(true);
    setModalError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('documentType', uploadForm.documentType);
      if (uploadForm.tourId) formData.append('tourId', uploadForm.tourId);
      if (uploadForm.customerId) formData.append('customerId', uploadForm.customerId);
      if (uploadForm.expiryDate) formData.append('expiryDate', uploadForm.expiryDate);
      if (uploadForm.notes) formData.append('notes', uploadForm.notes);

      await operationsService.uploadDocument(formData);
      setSuccessMessage('Document uploaded successfully and queued for verification.');
      setShowUploadModal(false);
      setSelectedFile(null);
      setTimeout(() => setSuccessMessage(null), 4000);
      fetchDocuments();
    } catch (err: any) {
      setModalError(err?.response?.data?.error || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: OperationsDocument) => {
    try {
      await operationsService.downloadDocument(doc.id, doc.fileName);
    } catch (err) {
      alert('Failed to download document file.');
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyingDoc) return;

    try {
      await operationsService.verifyDocument(verifyingDoc.id, {
        verificationStatus: verifyForm.status,
        rejectionReason: verifyForm.rejectionReason,
      });
      setSuccessMessage(`Document status updated to ${verifyForm.status}.`);
      setVerifyingDoc(null);
      setTimeout(() => setSuccessMessage(null), 4000);
      fetchDocuments();
    } catch (err) {
      alert('Failed to update verification status.');
    }
  };

  const confirmDelete = async () => {
    if (!docToDelete) return;
    try {
      await operationsService.deleteDocument(docToDelete.id);
      setSuccessMessage('Document deleted successfully.');
      setDocToDelete(null);
      setTimeout(() => setSuccessMessage(null), 4000);
      fetchDocuments();
    } catch (err) {
      alert('Failed to delete document.');
    }
  };

  const getVerificationBadge = (status: string, expiryDate?: string | null) => {
    if (expiryDate && new Date(expiryDate) < new Date()) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full font-bold text-[10px] bg-rose-100 text-rose-800 border border-rose-300">
          <AlertTriangle className="w-3 h-3 mr-1 text-rose-600" /> Expired
        </span>
      );
    }
    switch (status) {
      case 'Verified':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" /> Verified
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full font-bold text-[10px] bg-rose-100 text-rose-800 border border-rose-300">
            <XCircle className="w-3 h-3 mr-1 text-rose-600" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full font-bold text-[10px] bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="w-3 h-3 mr-1 text-amber-600" /> Pending
          </span>
        );
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-lg border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-indigo-400 font-mono text-xs uppercase tracking-wider font-bold">
              <FileCheck className="w-4 h-4" /> Operations Management — Part 2
            </div>
            <h1 className="text-2xl font-black tracking-tight mt-1 flex items-center">
              Secure Operations Document Vault
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Encrypted storage abstraction for tickets, vouchers, and customer travel documents with verification and expiry alerts.
            </p>
          </div>

          <button
            onClick={() => {
              setSelectedFile(null);
              setModalError(null);
              setShowUploadModal(true);
            }}
            className="inline-flex items-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md transition-all shrink-0"
          >
            <UploadCloud className="w-4 h-4 mr-1.5" /> Upload Operations File
          </button>
        </div>

        {/* Tab Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-800 text-xs">
          {[
            { id: 'ALL', label: 'All Operations Documents' },
            { id: 'PENDING', label: 'Pending Verification' },
            { id: 'EXPIRING_SOON', label: 'Expiring Soon (7 Days)' },
            { id: 'EXPIRED', label: 'Expired Documents' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setExpiryTab(tab.id as any);
                setPage(1);
              }}
              className={`px-3 py-1.5 font-bold rounded-xl transition-colors ${
                expiryTab === tab.id
                  ? 'bg-indigo-600 text-white shadow'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center shadow-sm">
          <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600 shrink-0" />
          {successMessage}
        </div>
      )}

      {/* Main Content Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Filter Bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3 md:space-y-0 md:flex md:items-center md:justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search file name, code, tour ref, customer..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={documentTypeFilter}
              onChange={(e) => {
                setDocumentTypeFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
            >
              <option value="ALL">All Document Types</option>
              {DOCUMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <select
              value={verificationFilter}
              onChange={(e) => {
                setVerificationFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
            >
              <option value="ALL">All Verification Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Verified">Verified</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Table View */}
        {loading ? (
          <div className="p-16 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-500">Loading document vault records...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 font-semibold text-xs flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 mr-2" /> {error}
          </div>
        ) : documents.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">No Operations Documents Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No document records match your criteria. Click above to upload a document file.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Doc Code</th>
                  <th className="py-3 px-4">Document Type & File</th>
                  <th className="py-3 px-4">Tour / Customer</th>
                  <th className="py-3 px-4">Uploaded By</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4">Verification</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-600">{doc.documentCode}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{doc.fileName}</div>
                      <div className="text-[10px] text-slate-400">
                        {doc.documentType} • {(doc.fileSize / 1024).toFixed(1)} KB
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {doc.tour && <div className="font-bold text-indigo-700">{doc.tour.tourReference}</div>}
                      {doc.customer && (
                        <div className="text-slate-600 font-medium">
                          {doc.customer.firstName} {doc.customer.lastName || ''}
                        </div>
                      )}
                      {!doc.tour && !doc.customer && <span className="text-slate-400">General Operations</span>}
                    </td>
                    <td className="py-3 px-4">
                      {doc.uploadedBy && (
                        <div>
                          <div className="font-semibold text-slate-900">
                            {doc.uploadedBy.firstName} {doc.uploadedBy.lastName}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(doc.createdAt).toLocaleDateString('en-GB')}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-medium">
                      {doc.expiryDate ? (
                        <div className={new Date(doc.expiryDate) < new Date() ? 'text-rose-600 font-bold' : 'text-slate-800'}>
                          {new Date(doc.expiryDate).toLocaleDateString('en-GB')}
                        </div>
                      ) : (
                        <span className="text-slate-400">No Expiry</span>
                      )}
                    </td>
                    <td className="py-3 px-4">{getVerificationBadge(doc.verificationStatus, doc.expiryDate)}</td>
                    <td className="py-3 px-4 text-right space-x-1.5">
                      <button
                        onClick={() => handleDownload(doc)}
                        title="Authorized Secure Download"
                        className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-colors inline-flex items-center font-semibold text-[11px]"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setVerifyingDoc(doc);
                          setVerifyForm({
                            status: doc.verificationStatus === 'Pending' ? 'Verified' : doc.verificationStatus,
                            rejectionReason: doc.rejectionReason || '',
                          });
                        }}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors inline-flex items-center font-semibold text-[11px]"
                      >
                        Verify
                      </button>
                      <button
                        onClick={() => setDocToDelete(doc)}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition-colors inline-flex items-center font-semibold text-[11px]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs">
            <span className="text-xs text-slate-500">
              Page {page} of {pagination.totalPages || 1} ({pagination.total} documents)
            </span>
            <div className="flex space-x-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-bold disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page === pagination.totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-bold disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* UPLOAD DOCUMENT MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base">Upload Operations File</h3>
              <button onClick={() => setShowUploadModal(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
                {modalError}
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select File (PDF, JPEG, PNG, DOCX max 10MB) *</label>
                <input
                  type="file"
                  required
                  accept=".pdf,.jpg,.jpeg,.png,.docx,.doc"
                  onChange={handleFileChange}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Document Type *</label>
                <select
                  value={uploadForm.documentType}
                  onChange={(e) => setUploadForm({ ...uploadForm, documentType: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border rounded-xl font-medium"
                >
                  {DOCUMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Linked Tour (Optional)</label>
                  <select
                    value={uploadForm.tourId}
                    onChange={(e) => setUploadForm({ ...uploadForm, tourId: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border rounded-xl font-medium"
                  >
                    <option value="">-- No Specific Tour --</option>
                    {tours.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.tourReference} ({t.destination})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Linked Customer (Optional)</label>
                  <select
                    value={uploadForm.customerId}
                    onChange={(e) => setUploadForm({ ...uploadForm, customerId: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border rounded-xl font-medium"
                  >
                    <option value="">-- No Specific Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.firstName} {c.lastName || ''} ({c.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Expiry Date (Optional)</label>
                <input
                  type="date"
                  value={uploadForm.expiryDate}
                  onChange={(e) => setUploadForm({ ...uploadForm, expiryDate: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes / Description</label>
                <textarea
                  rows={2}
                  value={uploadForm.notes}
                  onChange={(e) => setUploadForm({ ...uploadForm, notes: e.target.value })}
                  placeholder="Document notes..."
                  className="w-full px-3.5 py-2 bg-slate-50 border rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2 bg-indigo-600 text-white font-bold rounded-xl disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Upload File'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VERIFY DOCUMENT MODAL */}
      {verifyingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base">Verify Document: {verifyingDoc.documentCode}</h3>
              <button onClick={() => setVerifyingDoc(null)}>
                <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            <form onSubmit={handleVerifySubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Verification Status *</label>
                <select
                  value={verifyForm.status}
                  onChange={(e) => setVerifyForm({ ...verifyForm, status: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border rounded-xl font-bold"
                >
                  <option value="Verified">Verified / Approved</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Pending">Pending Review</option>
                </select>
              </div>

              {verifyForm.status === 'Rejected' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Rejection Reason *</label>
                  <textarea
                    rows={3}
                    required
                    value={verifyForm.rejectionReason}
                    onChange={(e) => setVerifyForm({ ...verifyForm, rejectionReason: e.target.value })}
                    placeholder="Provide reason for rejection (e.g., Unclear image, Expired passport)..."
                    className="w-full px-3.5 py-2 bg-slate-50 border rounded-xl"
                  />
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setVerifyingDoc(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 text-white font-bold rounded-xl">
                  Save Verification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {docToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900">Delete Document?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete "{docToDelete.fileName}" ({docToDelete.documentCode})? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDocToDelete(null)}
                className="w-1/2 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="w-1/2 py-2 bg-red-600 text-white font-bold rounded-xl text-xs hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
