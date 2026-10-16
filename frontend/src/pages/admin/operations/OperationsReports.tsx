import React, { useState, useEffect } from 'react';
import {
  PieChart,
  Download,
  Filter,
  RefreshCw,
  Compass,
  UserCheck,
  Plane,
  Building,
  Building2,
  Receipt,
  FileText,
  CheckCircle2
} from 'lucide-react';
import { operationsService, CoordinatorEmployee, Tour } from '../../../services/operationsService';

const REPORTS = [
  { id: 'tours', label: '1. Tour Operations Report', icon: Compass },
  { id: 'coordinators', label: '2. Coordinator Workload Report', icon: UserCheck },
  { id: 'tickets', label: '3. Ticket Status Report', icon: Plane },
  { id: 'hotels', label: '4. Hotel Reservation Report', icon: Building },
  { id: 'vendors', label: '5. Vendor Report', icon: Building2 },
  { id: 'costs', label: '6. Operational Cost Report', icon: Receipt },
  { id: 'documents', label: '7. Document Status Report', icon: FileText },
  { id: 'completion', label: '8. Tour Completion Report', icon: CheckCircle2 },
];

export default function OperationsReports() {
  const [activeReport, setActiveReport] = useState('tours');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [destinationFilter, setDestinationFilter] = useState('');
  const [coordinatorFilter, setCoordinatorFilter] = useState('');

  // Dropdown options
  const [coordinators, setCoordinators] = useState<CoordinatorEmployee[]>([]);

  useEffect(() => {
    operationsService.getCoordinators().then(setCoordinators).catch(console.error);
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {};
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (destinationFilter) params.destination = destinationFilter;
      if (coordinatorFilter) params.coordinatorId = coordinatorFilter;

      const data = await operationsService.getReport(activeReport, params);
      setReportData(data);
    } catch (err) {
      console.error('Error fetching operations report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeReport, dateFrom, dateTo, statusFilter, destinationFilter, coordinatorFilter]);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const params: Record<string, any> = {};
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (destinationFilter) params.destination = destinationFilter;
      if (coordinatorFilter) params.coordinatorId = coordinatorFilter;

      await operationsService.downloadReportCsv(activeReport, params);
    } catch (err) {
      alert('Failed to export CSV report.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-lg border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-blue-400 font-mono text-xs uppercase tracking-wider font-bold">
              <PieChart className="w-4 h-4" /> Operations Analytics & Reporting
            </div>
            <h1 className="text-2xl font-black tracking-tight mt-1 flex items-center">
              Operations Reports & CSV Export Center
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Generate 8 real-time operational reports with filters and one-click Decimal-safe INR CSV exports.
            </p>
          </div>

          <button
            onClick={handleExportCsv}
            disabled={exporting}
            className="inline-flex items-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all shrink-0 disabled:opacity-50"
          >
            <Download className="w-4 h-4 mr-1.5" /> {exporting ? 'Exporting CSV...' : 'Export Selected Report (CSV)'}
          </button>
        </div>

        {/* Report Selector Tabs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-3 border-t border-slate-800 text-xs">
          {REPORTS.map((r) => {
            const Icon = r.icon;
            const isActive = activeReport === r.id;
            return (
              <button
                key={r.id}
                onClick={() => setActiveReport(r.id)}
                className={`flex items-center p-2.5 rounded-xl font-bold transition-all text-left truncate ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4 mr-2 shrink-0" />
                <span className="truncate">{r.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-bold text-slate-600">From:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-1.5 bg-white border rounded-xl text-xs"
              />
            </div>

            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-600">To:</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-1.5 bg-white border rounded-xl text-xs"
              />
            </div>

            {activeReport === 'tours' && (
              <select
                value={coordinatorFilter}
                onChange={(e) => setCoordinatorFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border rounded-xl text-xs font-semibold"
              >
                <option value="">All Coordinators</option>
                {coordinators.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName}
                  </option>
                ))}
              </select>
            )}
          </div>

          <button
            onClick={fetchReport}
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl flex items-center"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
          </button>
        </div>

        {/* Report Data Display */}
        {loading ? (
          <div className="p-16 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-500">Generating report query from PostgreSQL...</p>
          </div>
        ) : !reportData ? (
          <div className="p-16 text-center text-slate-400 text-xs">No data available for this report.</div>
        ) : (
          <div className="p-6 space-y-4 text-xs">
            {/* 1. Tour Operations Report */}
            {activeReport === 'tours' && reportData.tours && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b text-slate-600 font-bold uppercase text-[10px]">
                      <th className="py-3 px-4">Tour Ref</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Destination</th>
                      <th className="py-3 px-4">Travel Dates</th>
                      <th className="py-3 px-4">Travellers</th>
                      <th className="py-3 px-4">Coordinator</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.tours.map((t: any) => (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono font-bold text-indigo-600">{t.tourReference}</td>
                        <td className="py-3 px-4 font-semibold">{t.customer?.firstName} {t.customer?.lastName}</td>
                        <td className="py-3 px-4 font-semibold text-slate-800">{t.destination}</td>
                        <td className="py-3 px-4">
                          {new Date(t.startDate).toLocaleDateString('en-GB')} - {new Date(t.endDate).toLocaleDateString('en-GB')}
                        </td>
                        <td className="py-3 px-4 font-bold text-center">{t.travellerCount}</td>
                        <td className="py-3 px-4">
                          {t.coordinator ? `${t.coordinator.firstName} ${t.coordinator.lastName}` : 'Unassigned'}
                        </td>
                        <td className="py-3 px-4 font-bold">{t.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 2. Coordinator Workload Report */}
            {activeReport === 'coordinators' && reportData.coordinators && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b text-slate-600 font-bold uppercase text-[10px]">
                      <th className="py-3 px-4">Emp ID</th>
                      <th className="py-3 px-4">Coordinator Name</th>
                      <th className="py-3 px-4">Department / Designation</th>
                      <th className="py-3 px-4 text-center">Active Tours</th>
                      <th className="py-3 px-4 text-center">Upcoming</th>
                      <th className="py-3 px-4 text-center">Ongoing</th>
                      <th className="py-3 px-4 text-center">Completed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.coordinators.map((c: any) => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono font-bold text-indigo-600">{c.employeeId}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{c.coordinatorName}</td>
                        <td className="py-3 px-4">{c.designation} ({c.department})</td>
                        <td className="py-3 px-4 text-center font-bold text-emerald-600">{c.activeTours}</td>
                        <td className="py-3 px-4 text-center font-semibold text-slate-700">{c.upcomingTours}</td>
                        <td className="py-3 px-4 text-center font-semibold text-blue-600">{c.ongoingTours}</td>
                        <td className="py-3 px-4 text-center text-slate-500">{c.completedTours}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 3. Ticket Status Report */}
            {activeReport === 'tickets' && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 border rounded-xl flex space-x-6 text-xs font-bold">
                  <div>Total Tickets: <span className="text-indigo-600">{reportData.summary?.totalTickets}</span></div>
                  <div>Flights: <span className="text-blue-600">{reportData.summary?.flightsCount}</span></div>
                  <div>Trains: <span className="text-emerald-600">{reportData.summary?.trainsCount}</span></div>
                  <div>Buses: <span className="text-amber-600">{reportData.summary?.busesCount}</span></div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b text-slate-600 font-bold uppercase text-[10px]">
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Passenger Name</th>
                        <th className="py-3 px-4">Tour Ref</th>
                        <th className="py-3 px-4">Carrier / Operator</th>
                        <th className="py-3 px-4">PNR</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportData.flights?.map((f: any) => (
                        <tr key={f.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-bold text-blue-600">Flight</td>
                          <td className="py-3 px-4 font-semibold">{f.passengerName}</td>
                          <td className="py-3 px-4 font-mono">{f.tour?.tourReference}</td>
                          <td className="py-3 px-4">{f.airline} {f.flightNumber}</td>
                          <td className="py-3 px-4 font-mono font-bold">{f.pnr}</td>
                          <td className="py-3 px-4 font-semibold text-emerald-700">{f.ticketStatus}</td>
                        </tr>
                      ))}
                      {reportData.trains?.map((t: any) => (
                        <tr key={t.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-bold text-emerald-600">Train</td>
                          <td className="py-3 px-4 font-semibold">{t.passengerName}</td>
                          <td className="py-3 px-4 font-mono">{t.tour?.tourReference}</td>
                          <td className="py-3 px-4">{t.operator} {t.trainNumber}</td>
                          <td className="py-3 px-4 font-mono font-bold">{t.pnr}</td>
                          <td className="py-3 px-4 font-semibold text-emerald-700">{t.ticketStatus}</td>
                        </tr>
                      ))}
                      {reportData.buses?.map((b: any) => (
                        <tr key={b.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-bold text-amber-600">Bus</td>
                          <td className="py-3 px-4 font-semibold">{b.passengerName}</td>
                          <td className="py-3 px-4 font-mono">{b.tour?.tourReference}</td>
                          <td className="py-3 px-4">{b.operator} {b.busNumber || ''}</td>
                          <td className="py-3 px-4 font-mono font-bold">{b.pnr}</td>
                          <td className="py-3 px-4 font-semibold text-emerald-700">{b.ticketStatus}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 4. Hotel Reservation Report */}
            {activeReport === 'hotels' && reportData.hotels && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b text-slate-600 font-bold uppercase text-[10px]">
                      <th className="py-3 px-4">Hotel Name</th>
                      <th className="py-3 px-4">Destination</th>
                      <th className="py-3 px-4">Tour Ref</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Check-In / Out</th>
                      <th className="py-3 px-4">Confirmation #</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.hotels.map((h: any) => (
                      <tr key={h.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-bold text-slate-900">{h.hotelName}</td>
                        <td className="py-3 px-4">{h.destination}</td>
                        <td className="py-3 px-4 font-mono font-semibold text-indigo-600">{h.tour?.tourReference || '-'}</td>
                        <td className="py-3 px-4">{h.customer?.firstName} {h.customer?.lastName}</td>
                        <td className="py-3 px-4">
                          {new Date(h.checkInDate).toLocaleDateString('en-GB')} - {new Date(h.checkOutDate).toLocaleDateString('en-GB')}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold">{h.confirmationNumber || '-'}</td>
                        <td className="py-3 px-4 font-bold">{h.reservationStatus}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 5. Vendor Report */}
            {activeReport === 'vendors' && reportData.vendors && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b text-slate-600 font-bold uppercase text-[10px]">
                      <th className="py-3 px-4">Vendor Code</th>
                      <th className="py-3 px-4">Company Name</th>
                      <th className="py-3 px-4">Service Type</th>
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-4 text-center">Hotels</th>
                      <th className="py-3 px-4 text-center">Transport</th>
                      <th className="py-3 px-4 text-center">Costs</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.vendors.map((v: any) => (
                      <tr key={v.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono font-bold text-indigo-600">{v.vendorCode}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{v.companyName}</td>
                        <td className="py-3 px-4 font-medium">{v.serviceType}</td>
                        <td className="py-3 px-4">{v.contactPerson || '-'} ({v.phone || '-'})</td>
                        <td className="py-3 px-4 text-center font-bold">{v._count?.hotelReservations || 0}</td>
                        <td className="py-3 px-4 text-center font-bold">{v._count?.transportReservations || 0}</td>
                        <td className="py-3 px-4 text-center font-bold">{v._count?.operationalCosts || 0}</td>
                        <td className="py-3 px-4 font-bold">{v.isActive ? 'Active' : 'Inactive'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 6. Operational Cost Report */}
            {activeReport === 'costs' && reportData.costs && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 border rounded-xl flex space-x-6 text-xs font-bold">
                  <div>Total Estimated: <span className="text-indigo-600">₹{reportData.totalEstimated?.toLocaleString('en-IN')}</span></div>
                  <div>Total Actual: <span className="text-emerald-600">₹{reportData.totalActual?.toLocaleString('en-IN')}</span></div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b text-slate-600 font-bold uppercase text-[10px]">
                        <th className="py-3 px-4">Cost Ref</th>
                        <th className="py-3 px-4">Category & Description</th>
                        <th className="py-3 px-4">Tour Ref</th>
                        <th className="py-3 px-4">Vendor</th>
                        <th className="py-3 px-4 text-right">Estimated (₹)</th>
                        <th className="py-3 px-4 text-right">Actual (₹)</th>
                        <th className="py-3 px-4">Payment Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportData.costs.map((c: any) => (
                        <tr key={c.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-mono font-bold text-indigo-600">{c.costReference}</td>
                          <td className="py-3 px-4 font-bold">{c.description} ({c.costCategory})</td>
                          <td className="py-3 px-4 font-mono">{c.tour?.tourReference || '-'}</td>
                          <td className="py-3 px-4">{c.vendor?.companyName || '-'}</td>
                          <td className="py-3 px-4 text-right font-mono">₹{Number(c.estimatedCost).toLocaleString('en-IN')}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold">₹{Number(c.actualCost).toLocaleString('en-IN')}</td>
                          <td className="py-3 px-4 font-bold">{c.paymentStatus}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 7. Document Status Report */}
            {activeReport === 'documents' && reportData.documents && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b text-slate-600 font-bold uppercase text-[10px]">
                      <th className="py-3 px-4">Doc Code</th>
                      <th className="py-3 px-4">Type & File Name</th>
                      <th className="py-3 px-4">Tour Ref</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Uploaded By</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.documents.map((d: any) => (
                      <tr key={d.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono font-bold text-indigo-600">{d.documentCode}</td>
                        <td className="py-3 px-4 font-bold">{d.fileName} ({d.documentType})</td>
                        <td className="py-3 px-4 font-mono">{d.tour?.tourReference || '-'}</td>
                        <td className="py-3 px-4">{d.customer ? `${d.customer.firstName} ${d.customer.lastName || ''}`.trim() : '-'}</td>
                        <td className="py-3 px-4">{d.uploadedBy?.firstName} {d.uploadedBy?.lastName}</td>
                        <td className="py-3 px-4 font-bold">{d.verificationStatus}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 8. Tour Completion Report */}
            {activeReport === 'completion' && reportData.tours && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b text-slate-600 font-bold uppercase text-[10px]">
                      <th className="py-3 px-4">Tour Ref</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Destination</th>
                      <th className="py-3 px-4">Completion Date</th>
                      <th className="py-3 px-4">Travellers</th>
                      <th className="py-3 px-4">Coordinator</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.tours.map((t: any) => (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono font-bold text-indigo-600">{t.tourReference}</td>
                        <td className="py-3 px-4 font-semibold">{t.customer?.firstName} {t.customer?.lastName}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{t.destination}</td>
                        <td className="py-3 px-4 font-medium">{new Date(t.endDate).toLocaleDateString('en-GB')}</td>
                        <td className="py-3 px-4 text-center font-bold">{t.travellerCount}</td>
                        <td className="py-3 px-4">{t.coordinator ? `${t.coordinator.firstName} ${t.coordinator.lastName}` : 'Unassigned'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
