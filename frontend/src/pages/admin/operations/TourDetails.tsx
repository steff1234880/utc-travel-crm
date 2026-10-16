import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Compass,
  Calendar,
  MapPin,
  Users,
  UserCheck,
  CheckSquare,
  Plane,
  Train,
  Bus,
  Building,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  UserPlus,
  UserX,
  X,
  RefreshCw,
  ChevronDown,
  Activity
} from 'lucide-react';
import { Timeline, TimelineEvent } from '../../../components/common/Timeline';
import { timelineService } from '../../../services/timelineService';
import {
  operationsService,
  Tour,
  OperationalTask,
  FlightTicket,
  TrainTicket,
  BusTicket,
  HotelReservation,
  CoordinatorEmployee
} from '../../../services/operationsService';

export default function TourDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [tour, setTour] = useState<Tour | null>(null);
  const [coordinators, setCoordinators] = useState<CoordinatorEmployee[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<
    'OVERVIEW' | 'CHECKLIST' | 'FLIGHTS' | 'TRAINS' | 'BUSES' | 'HOTELS' | 'COORDINATOR'
  >('OVERVIEW');

  // Modals
  const [showCoordinatorModal, setShowCoordinatorModal] = useState(false);
  const [showRemoveCoordinatorModal, setShowRemoveCoordinatorModal] = useState(false);
  const [isSubmittingCoordinator, setIsSubmittingCoordinator] = useState(false);
  const [coordinatorSuccessMsg, setCoordinatorSuccessMsg] = useState<string | null>(null);

  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showFlightModal, setShowFlightModal] = useState(false);
  const [showTrainModal, setShowTrainModal] = useState(false);
  const [showBusModal, setShowBusModal] = useState(false);
  const [showHotelModal, setShowHotelModal] = useState(false);

  // Form states
  const [coordinatorForm, setCoordinatorForm] = useState({ coordinatorId: '', notes: '' });
  const [taskForm, setTaskForm] = useState({ task: '', category: 'GENERAL', assignedEmployeeId: '', dueDate: '', notes: '' });

  const [flightForm, setFlightForm] = useState({
    passengerName: '',
    tourTravellerId: '',
    bookingReference: '',
    airline: '',
    flightNumber: '',
    departureAirport: '',
    arrivalAirport: '',
    departureDateTime: '',
    arrivalDateTime: '',
    pnr: '',
    ticketNumber: '',
    ticketStatus: 'Requested' as const,
    internalNotes: '',
  });

  const [trainForm, setTrainForm] = useState({
    passengerName: '',
    tourTravellerId: '',
    operator: '',
    trainNumber: '',
    departureLocation: '',
    arrivalLocation: '',
    departureDateTime: '',
    arrivalDateTime: '',
    pnr: '',
    seatNumber: '',
    trainClass: '',
    ticketStatus: 'Requested' as const,
    internalNotes: '',
  });

  const [busForm, setBusForm] = useState({
    passengerName: '',
    tourTravellerId: '',
    operator: '',
    busNumber: '',
    departureLocation: '',
    arrivalLocation: '',
    departureDateTime: '',
    arrivalDateTime: '',
    pnr: '',
    seatNumber: '',
    busClass: '',
    ticketStatus: 'Requested' as const,
    internalNotes: '',
  });

  const [hotelForm, setHotelForm] = useState({
    hotelName: '',
    destination: '',
    bookingReference: '',
    vendorReference: '',
    roomType: '',
    numberOfRooms: 1,
    numberOfGuests: 1,
    checkInDate: '',
    checkOutDate: '',
    mealPlan: '',
    confirmationNumber: '',
    reservationStatus: 'Requested' as const,
    internalNotes: '',
  });

  const fetchTourDetails = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [tourData, events] = await Promise.all([
        operationsService.getTourById(id),
        timelineService.getTimeline('TOUR', id)
      ]);
      setTour(tourData);
      setTimelineEvents(events);
    } catch (err: any) {
      console.error('Error fetching tour details:', err);
      setError('Failed to load tour details.');
    } fontally: {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTourDetails();
    operationsService.getCoordinators().then(setCoordinators).catch(console.error);
  }, [id]);

  const handleUpdateStatus = async (newStatus: string) => {
    if (!id || !tour) return;
    try {
      await operationsService.updateTour(id, { status: newStatus });
      fetchTourDetails();
    } catch (err) {
      alert('Failed to update tour status');
    }
  };

  // Coordinator Assignment
  const handleAssignCoordinator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !coordinatorForm.coordinatorId || isSubmittingCoordinator) return;
    setIsSubmittingCoordinator(true);
    try {
      await operationsService.assignCoordinator(id, coordinatorForm);
      setShowCoordinatorModal(false);
      setCoordinatorForm({ coordinatorId: '', notes: '' });
      setCoordinatorSuccessMsg('Coordinator assigned successfully!');
      setTimeout(() => setCoordinatorSuccessMsg(null), 4000);
      await fetchTourDetails();
      const coords = await operationsService.getCoordinators();
      setCoordinators(coords);
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to assign coordinator');
    } finally {
      setIsSubmittingCoordinator(false);
    }
  };

  const handleOpenRemoveModal = () => {
    setShowRemoveCoordinatorModal(true);
  };

  const confirmRemoveCoordinator = async () => {
    if (!id || isSubmittingCoordinator) return;
    setIsSubmittingCoordinator(true);
    try {
      await operationsService.removeCoordinator(id);
      setShowRemoveCoordinatorModal(false);
      setCoordinatorSuccessMsg('Coordinator removed from tour successfully.');
      setTimeout(() => setCoordinatorSuccessMsg(null), 4000);
      await fetchTourDetails();
      const coords = await operationsService.getCoordinators();
      setCoordinators(coords);
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to remove coordinator');
    } finally {
      setIsSubmittingCoordinator(false);
    }
  };

  // Checklist Task actions
  const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await operationsService.updateChecklistTask(taskId, { status: newStatus });
      fetchTourDetails();
    } catch (err) {
      alert('Failed to update task status');
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !taskForm.task) return;
    try {
      await operationsService.addChecklistTask(id, taskForm);
      setShowAddTaskModal(false);
      setTaskForm({ task: '', category: 'GENERAL', assignedEmployeeId: '', dueDate: '', notes: '' });
      fetchTourDetails();
    } catch (err) {
      alert('Failed to add checklist task');
    }
  };

  // Ticket submissions
  const handleAddFlight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await operationsService.createFlightTicket({ ...flightForm, tourId: id });
      setShowFlightModal(false);
      fetchTourDetails();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to add flight ticket');
    }
  };

  const handleAddTrain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await operationsService.createTrainTicket({ ...trainForm, tourId: id });
      setShowTrainModal(false);
      fetchTourDetails();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to add train ticket');
    }
  };

  const handleAddBus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await operationsService.createBusTicket({ ...busForm, tourId: id });
      setShowBusModal(false);
      fetchTourDetails();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to add bus ticket');
    }
  };

  const handleAddHotel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !tour) return;
    try {
      await operationsService.createHotelReservation({
        ...hotelForm,
        tourId: id,
        customerId: tour.customerId,
        destination: hotelForm.destination || tour.destination,
      });
      setShowHotelModal(false);
      fetchTourDetails();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to add hotel reservation');
    }
  };

  const handleDeleteFlight = async (ticketId: string) => {
    if (!confirm('Delete this flight ticket?')) return;
    await operationsService.deleteFlightTicket(ticketId);
    fetchTourDetails();
  };

  const handleDeleteTrain = async (ticketId: string) => {
    if (!confirm('Delete this train ticket?')) return;
    await operationsService.deleteTrainTicket(ticketId);
    fetchTourDetails();
  };

  const handleDeleteBus = async (ticketId: string) => {
    if (!confirm('Delete this bus ticket?')) return;
    await operationsService.deleteBusTicket(ticketId);
    fetchTourDetails();
  };

  const handleDeleteHotel = async (hotelId: string) => {
    if (!confirm('Delete this hotel reservation?')) return;
    await operationsService.deleteHotelReservation(hotelId);
    fetchTourDetails();
  };

  if (loading) {
    return (
      <div className="p-16 text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
        <p className="text-sm font-semibold text-slate-500">Loading tour operational file...</p>
      </div>
    );
  }

  if (error || !tour) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <Link to="/admin/operations/tours" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 font-semibold">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Tours
        </Link>
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 flex items-center">
          <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
          <span>{error || 'Tour not found.'}</span>
        </div>
      </div>
    );
  }

  const completedTasksCount = tour.checklistTasks?.filter((t) => t.status === 'Completed').length || 0;
  const totalTasksCount = tour.checklistTasks?.length || 0;
  const checklistProgress = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link to="/admin/operations/tours" className="inline-flex items-center text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Tour List
        </Link>

        {/* Status Dropdown */}
        <div className="flex items-center space-x-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status:</span>
          <select
            value={tour.status}
            onChange={(e) => handleUpdateStatus(e.target.value)}
            className="px-3.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-extrabold text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Upcoming">Upcoming</option>
            <option value="Preparation">Preparation</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Ongoing">Ongoing</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
            <option value="Postponed">Postponed</option>
          </select>
        </div>
      </div>

      {/* Main Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-lg border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <span className="text-xs font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 px-3 py-1 rounded-lg">
                {tour.tourReference}
              </span>
              {tour.bookingPrep && (
                <span className="text-xs font-mono font-bold bg-slate-800 text-slate-300 px-3 py-1 rounded-lg">
                  Booking Ref: {tour.bookingPrep.bookingRef}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-black tracking-tight mt-2 flex items-center">
              <MapPin className="w-6 h-6 mr-2 text-rose-400" />
              {tour.destination}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Customer: <span className="text-white font-semibold">{tour.customer?.firstName} {tour.customer?.lastName}</span> ({tour.customer?.email})
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex flex-wrap items-center gap-4 bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/50">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Travel Dates</div>
              <div className="text-xs font-bold text-white mt-0.5">
                {new Date(tour.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} -{' '}
                {new Date(tour.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
            </div>

            <div className="h-8 w-[1px] bg-slate-700"></div>

            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Travellers</div>
              <div className="text-xs font-bold text-white mt-0.5 flex items-center">
                <Users className="w-3.5 h-3.5 mr-1 text-indigo-400" /> {tour.travellerCount} Persons
              </div>
            </div>

            {tour.bookingPrep && (
              <>
                <div className="h-8 w-[1px] bg-slate-700"></div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Payment</div>
                  <div className="text-xs font-bold text-white mt-0.5 flex items-center gap-1.5">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                      (tour.bookingPrep as any).paymentStatus === 'PAID' ? 'bg-emerald-500/20 text-emerald-300' :
                      (tour.bookingPrep as any).paymentStatus === 'PARTIALLY_PAID' ? 'bg-amber-500/20 text-amber-300' :
                      'bg-rose-500/20 text-rose-300'
                    }`}>
                      {(tour.bookingPrep as any).paymentStatus}
                    </span>
                    <span className="text-slate-300">
                      ₹{(tour.bookingPrep as any).totalReceived?.toLocaleString()} / ₹{(tour.bookingPrep as any).totalAmount?.toLocaleString()}
                    </span>
                  </div>
                </div>
              </>
            )}

            <div className="h-8 w-[1px] bg-slate-700"></div>

            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Coordinator</div>
              <div className="text-xs font-bold text-white mt-0.5">
                {tour.coordinator ? `${tour.coordinator.firstName} ${tour.coordinator.lastName}` : 'Unassigned'}
              </div>
            </div>
          </div>
        </div>

        {/* Operational Checklist Progress Bar */}
        <div className="space-y-1.5 pt-2 border-t border-slate-800">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-slate-300">Checklist Preparation Progress</span>
            <span className="text-emerald-400 font-bold">{checklistProgress}% ({completedTasksCount}/{totalTasksCount} Completed)</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${checklistProgress}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center space-x-1 border-b border-slate-200 overflow-x-auto pb-1">
        {[
          { key: 'OVERVIEW', label: 'Overview & Info', icon: Compass },
          { key: 'CHECKLIST', label: `Checklist (${completedTasksCount}/${totalTasksCount})`, icon: CheckSquare },
          { key: 'FLIGHTS', label: `Flights (${tour.flightTickets?.length || 0})`, icon: Plane },
          { key: 'TRAINS', label: `Trains (${tour.trainTickets?.length || 0})`, icon: Train },
          { key: 'BUSES', label: `Buses (${tour.busTickets?.length || 0})`, icon: Bus },
          { key: 'HOTELS', label: `Hotels (${tour.hotelReservations?.length || 0})`, icon: Building },
          { key: 'COORDINATOR', label: 'Coordinator & History', icon: UserCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center px-4 py-3 font-bold text-xs rounded-t-xl transition-colors whitespace-nowrap border-b-2 ${
                isActive
                  ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: OVERVIEW */}
      {activeTab === 'OVERVIEW' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Customer & Tour Info */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center">
              <Users className="w-5 h-5 mr-2 text-indigo-600" /> Customer Information
            </h3>
            {tour.customer && (
              <div className="space-y-2 text-sm text-slate-700">
                <div>
                  <span className="text-slate-400 font-medium">Name:</span>{' '}
                  <span className="font-bold text-slate-900">{tour.customer.firstName} {tour.customer.lastName}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Email:</span>{' '}
                  <span className="font-semibold text-blue-600">{tour.customer.email}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Phone:</span>{' '}
                  <span className="font-semibold text-slate-900">{tour.customer.phone || 'N/A'}</span>
                </div>
              </div>
            )}

            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 pt-4 flex items-center">
              <Compass className="w-5 h-5 mr-2 text-indigo-600" /> Package & Booking Info
            </h3>
            <div className="space-y-2 text-sm text-slate-700">
              <div>
                <span className="text-slate-400 font-medium">Package:</span>{' '}
                <span className="font-semibold text-slate-900">{tour.package?.title || tour.package?.packageName || 'Custom Itinerary'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Quotation Reference:</span>{' '}
                <span className="font-mono text-slate-800">{tour.bookingPrep?.quotationId || tour.quotationId || 'Direct Booking'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Operational Notes:</span>
                <p className="mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-normal">
                  {tour.operationalNotes || 'No notes added for this tour yet.'}
                </p>
              </div>
            </div>
          </div>

          {/* Travellers List */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
              <span className="flex items-center">
                <Users className="w-5 h-5 mr-2 text-indigo-600" /> Traveller Manifest ({tour.travellers?.length || 0})
              </span>
            </h3>

            {tour.travellers?.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No individual travellers listed.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {tour.travellers?.map((trav, i) => (
                  <div key={trav.id} className="py-3 text-xs space-y-1">
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>{i + 1}. {trav.name}</span>
                      <span className="text-slate-500 font-normal">{trav.gender || ''} {trav.age ? `(${trav.age} yrs)` : ''}</span>
                    </div>
                    {(trav.phone || trav.email) && (
                      <div className="text-slate-500">
                        {trav.phone && <span className="mr-3">Phone: {trav.phone}</span>}
                        {trav.email && <span>Email: {trav.email}</span>}
                      </div>
                    )}
                    {trav.passportNumber && (
                      <div className="text-slate-500">Passport: <span className="font-mono font-semibold text-slate-700">{trav.passportNumber}</span></div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: OPERATIONAL CHECKLIST */}
      {activeTab === 'CHECKLIST' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Operational Preparation Checklist</h2>
              <p className="text-xs text-slate-500">Persisted 14 core operational milestones for tour execution</p>
            </div>

            <button
              onClick={() => setShowAddTaskModal(true)}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white font-semibold text-xs rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Add Custom Task
            </button>
          </div>

          <div className="space-y-3">
            {tour.checklistTasks?.map((task) => {
              const isDone = task.status === 'Completed';
              return (
                <div
                  key={task.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isDone ? 'bg-emerald-50/50 border-emerald-200' : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <button
                      onClick={() => handleTaskStatusChange(task.id, isDone ? 'Pending' : 'Completed')}
                      className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                        isDone ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 hover:border-blue-500'
                      }`}
                    >
                      {isDone && <CheckCircle2 className="w-4 h-4" />}
                    </button>

                    <div>
                      <div className={`text-sm font-bold ${isDone ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                        {task.task}
                      </div>
                      <div className="flex items-center space-x-3 text-xs text-slate-500 mt-1">
                        <span className="font-semibold text-slate-600 uppercase text-[10px] bg-slate-100 px-2 py-0.5 rounded">
                          {task.category}
                        </span>
                        {task.assignedEmployee && (
                          <span>Assigned: <strong className="text-slate-800">{task.assignedEmployee.firstName} {task.assignedEmployee.lastName}</strong></span>
                        )}
                        {task.dueDate && (
                          <span>Due: <strong>{new Date(task.dueDate).toLocaleDateString('en-GB')}</strong></span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0">
                    <select
                      value={task.status}
                      onChange={(e) => handleTaskStatusChange(task.id, e.target.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border focus:outline-none ${
                        isDone
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : task.status === 'In Progress'
                          ? 'bg-blue-100 text-blue-800 border-blue-300'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB CONTENT: FLIGHT TICKETS */}
      {activeTab === 'FLIGHTS' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Flight Ticket Bookings</h2>
              <p className="text-xs text-slate-500">Manage airline PNRs, ticket numbers & flight schedules</p>
            </div>

            <button
              onClick={() => setShowFlightModal(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white font-semibold text-xs rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Add Flight Ticket
            </button>
          </div>

          {tour.flightTickets?.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-8">No flight tickets recorded for this tour yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tour.flightTickets?.map((t) => (
                <div key={t.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-slate-900 text-sm flex items-center">
                      <Plane className="w-4 h-4 mr-2 text-blue-600" />
                      {t.airline} ({t.flightNumber})
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">
                      {t.ticketStatus}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-white p-3 rounded-lg border border-slate-200">
                    <div><strong>Passenger:</strong> {t.passengerName}</div>
                    <div><strong>PNR:</strong> <span className="font-mono text-blue-700 font-bold">{t.pnr}</span></div>
                    <div><strong>Route:</strong> {t.departureAirport} → {t.arrivalAirport}</div>
                    <div><strong>Ticket #:</strong> {t.ticketNumber || '-'}</div>
                    <div><strong>Dep:</strong> {new Date(t.departureDateTime).toLocaleString('en-GB')}</div>
                    <div><strong>Arr:</strong> {new Date(t.arrivalDateTime).toLocaleString('en-GB')}</div>
                  </div>

                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => handleDeleteFlight(t.id)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-xs flex items-center font-semibold"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: TRAIN TICKETS */}
      {activeTab === 'TRAINS' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Train Ticket Bookings</h2>
              <p className="text-xs text-slate-500">Manage railway reservations, train numbers & seats</p>
            </div>

            <button
              onClick={() => setShowTrainModal(true)}
              className="flex items-center px-4 py-2 bg-emerald-600 text-white font-semibold text-xs rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Add Train Ticket
            </button>
          </div>

          {tour.trainTickets?.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-8">No train tickets recorded for this tour yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tour.trainTickets?.map((t) => (
                <div key={t.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-slate-900 text-sm flex items-center">
                      <Train className="w-4 h-4 mr-2 text-emerald-600" />
                      {t.operator} - Train #{t.trainNumber}
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                      {t.ticketStatus}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-white p-3 rounded-lg border border-slate-200">
                    <div><strong>Passenger:</strong> {t.passengerName}</div>
                    <div><strong>PNR:</strong> <span className="font-mono text-emerald-700 font-bold">{t.pnr}</span></div>
                    <div><strong>Stations:</strong> {t.departureLocation} → {t.arrivalLocation}</div>
                    <div><strong>Seat/Class:</strong> {t.seatNumber || '-'} ({t.trainClass || 'Std'})</div>
                  </div>

                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => handleDeleteTrain(t.id)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-xs flex items-center font-semibold"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: BUS TICKETS */}
      {activeTab === 'BUSES' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Bus Ticket Bookings</h2>
              <p className="text-xs text-slate-500">Manage bus operators, boarding points & seats</p>
            </div>

            <button
              onClick={() => setShowBusModal(true)}
              className="flex items-center px-4 py-2 bg-purple-600 text-white font-semibold text-xs rounded-xl hover:bg-purple-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Add Bus Ticket
            </button>
          </div>

          {tour.busTickets?.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-8">No bus tickets recorded for this tour yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tour.busTickets?.map((t) => (
                <div key={t.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-slate-900 text-sm flex items-center">
                      <Bus className="w-4 h-4 mr-2 text-purple-600" />
                      {t.operator} {t.busNumber ? `(${t.busNumber})` : ''}
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-100 text-purple-800">
                      {t.ticketStatus}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-white p-3 rounded-lg border border-slate-200">
                    <div><strong>Passenger:</strong> {t.passengerName}</div>
                    <div><strong>PNR:</strong> <span className="font-mono text-purple-700 font-bold">{t.pnr}</span></div>
                    <div><strong>Route:</strong> {t.departureLocation} → {t.arrivalLocation}</div>
                    <div><strong>Seat:</strong> {t.seatNumber || '-'}</div>
                  </div>

                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => handleDeleteBus(t.id)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-xs flex items-center font-semibold"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: HOTEL RESERVATIONS */}
      {activeTab === 'HOTELS' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Hotel & Accommodation Reservations</h2>
              <p className="text-xs text-slate-500">Track check-in/out, meal plans & confirmation numbers</p>
            </div>

            <button
              onClick={() => setShowHotelModal(true)}
              className="flex items-center px-4 py-2 bg-amber-600 text-white font-semibold text-xs rounded-xl hover:bg-amber-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Add Hotel Reservation
            </button>
          </div>

          {tour.hotelReservations?.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-8">No hotel reservations linked to this tour yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tour.hotelReservations?.map((h) => (
                <div key={h.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-slate-900 text-sm flex items-center">
                      <Building className="w-4 h-4 mr-2 text-amber-600" />
                      {h.hotelName} ({h.destination})
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
                      {h.reservationStatus}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-white p-3 rounded-lg border border-slate-200">
                    <div><strong>Check-in:</strong> {new Date(h.checkInDate).toLocaleDateString('en-GB')}</div>
                    <div><strong>Check-out:</strong> {new Date(h.checkOutDate).toLocaleDateString('en-GB')}</div>
                    <div><strong>Room Type:</strong> {h.roomType || 'Standard'}</div>
                    <div><strong>Rooms / Guests:</strong> {h.numberOfRooms} Rooms, {h.numberOfGuests} Guests</div>
                    <div><strong>Meal Plan:</strong> {h.mealPlan || 'CP'}</div>
                    <div><strong>Confirmation #:</strong> <span className="font-mono font-bold text-amber-800">{h.confirmationNumber || '-'}</span></div>
                  </div>

                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => handleDeleteHotel(h.id)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-xs flex items-center font-semibold"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: COORDINATOR & HISTORY */}
      {activeTab === 'COORDINATOR' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          {coordinatorSuccessMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center">
              <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600 shrink-0" />
              {coordinatorSuccessMsg}
            </div>
          )}

          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Tour Coordinator Assignment</h2>
              <p className="text-xs text-slate-500">Current assigned employee, workload metrics, and complete historic audit log</p>
            </div>

            <div className="flex items-center space-x-2">
              {tour.coordinator && (
                <button
                  onClick={handleOpenRemoveModal}
                  className="flex items-center px-3.5 py-2 bg-rose-50 text-rose-700 font-semibold text-xs rounded-xl hover:bg-rose-100 transition-colors border border-rose-200"
                >
                  <UserX className="w-4 h-4 mr-1.5" /> Remove Assignment
                </button>
              )}
              <button
                onClick={() => setShowCoordinatorModal(true)}
                className="flex items-center px-4 py-2 bg-indigo-600 text-white font-semibold text-xs rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
              >
                <UserPlus className="w-4 h-4 mr-1.5" /> {tour.coordinator ? 'Reassign Coordinator' : 'Assign Coordinator'}
              </button>
            </div>
          </div>

          {/* Active Coordinator Card */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-md shrink-0">
                {tour.coordinator ? tour.coordinator.firstName.charAt(0) : '?'}
              </div>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                    Current Coordinator
                  </span>
                  {tour.coordinator && (
                    <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-md">
                      ID: {tour.coordinator.employeeId}
                    </span>
                  )}
                </div>
                <div className="text-lg font-bold text-slate-900">
                  {tour.coordinator ? `${tour.coordinator.firstName} ${tour.coordinator.lastName}` : 'No Coordinator Assigned'}
                </div>
                {tour.coordinator && (
                  <div className="text-xs text-slate-600 flex flex-wrap items-center gap-3 pt-0.5">
                    {tour.coordinator.designation?.name && (
                      <span><strong>Designation:</strong> {tour.coordinator.designation.name}</span>
                    )}
                    {tour.coordinator.department?.name && (
                      <span><strong>Department:</strong> {tour.coordinator.department.name}</span>
                    )}
                    {tour.coordinator.user?.email && (
                      <span><strong>Email:</strong> {tour.coordinator.user.email}</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {tour.coordinator && (
              <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs space-y-1 self-start md:self-auto min-w-[200px]">
                <div className="text-[10px] font-bold uppercase text-slate-400">Assignment Status</div>
                <div className="font-bold text-emerald-600 flex items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Active on this Tour
                </div>
              </div>
            )}
          </div>

          {/* History Log */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Assignment History & Audit Trail</h3>
            {tour.coordinatorAssignments?.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 bg-slate-50 rounded-xl px-4 border border-dashed border-slate-200">
                No previous coordinator assignment history recorded for this tour.
              </p>
            ) : (
              <div className="space-y-2.5">
                {tour.coordinatorAssignments?.map((hist) => {
                  const isCurrentActive = hist.status === 'ACTIVE';
                  const isReassigned = hist.status === 'REASSIGNED';
                  return (
                    <div
                      key={hist.id}
                      className={`p-4 rounded-xl border text-xs flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                        isCurrentActive
                          ? 'bg-emerald-50/40 border-emerald-200'
                          : isReassigned
                          ? 'bg-amber-50/30 border-amber-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2 font-bold text-slate-900 text-sm">
                          <span>
                            {hist.employee?.firstName} {hist.employee?.lastName}
                          </span>
                          {hist.employee?.employeeId && (
                            <span className="text-xs font-mono font-normal text-slate-500">
                              ({hist.employee.employeeId})
                            </span>
                          )}
                          {hist.employee?.designation?.name && (
                            <span className="text-xs font-normal text-slate-400">
                              • {hist.employee.designation.name}
                            </span>
                          )}
                        </div>
                        <div className="text-slate-500 text-xs">
                          Assigned by <span className="font-semibold text-slate-700">{hist.assignedBy?.firstName} {hist.assignedBy?.lastName}</span>
                          {hist.assignedBy?.employeeId && ` (${hist.assignedBy.employeeId})`}
                        </div>
                        {hist.notes && (
                          <div className="text-slate-600 italic bg-white/80 p-2 rounded-lg border border-slate-200/60 mt-1">
                            "{hist.notes}"
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0 space-y-1">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full font-extrabold uppercase text-[10px] border ${
                            isCurrentActive
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : isReassigned
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : 'bg-rose-100 text-rose-800 border-rose-300'
                          }`}
                        >
                          {hist.status}
                        </span>
                        <div className="text-[10px] text-slate-500 font-medium">
                          <strong>Assigned:</strong> {new Date(hist.assignedAt).toLocaleString('en-GB')}
                        </div>
                        {hist.unassignedAt && (
                          <div className="text-[10px] text-slate-400">
                            <strong>Unassigned:</strong> {new Date(hist.unassignedAt).toLocaleString('en-GB')}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ASSIGN / REASSIGN COORDINATOR MODAL */}
      {showCoordinatorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {tour.coordinator ? 'Reassign Tour Coordinator' : 'Assign Tour Coordinator'}
                </h3>
                <p className="text-xs text-slate-500">Select active employee and view current workload</p>
              </div>
              <button onClick={() => setShowCoordinatorModal(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            <form onSubmit={handleAssignCoordinator} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Employee *</label>
                <select
                  required
                  value={coordinatorForm.coordinatorId}
                  onChange={(e) => setCoordinatorForm({ ...coordinatorForm, coordinatorId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">-- Choose Eligible Employee --</option>
                  {coordinators.map((c) => {
                    const activeCount = c.activeTours ?? c._count?.toursCoordinated ?? 0;
                    return (
                      <option key={c.id} value={c.id}>
                        {c.firstName} {c.lastName} ({c.employeeId}) {c.designation?.name ? `— ${c.designation.name}` : ''} | Active Tours: {activeCount} (Upcoming: {c.upcomingTours ?? 0}, Ongoing: {c.ongoingTours ?? 0})
                      </option>
                    );
                  })}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Employee workload is calculated in real-time from active database tours.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Assignment Notes (Optional)</label>
                <textarea
                  rows={3}
                  value={coordinatorForm.notes}
                  onChange={(e) => setCoordinatorForm({ ...coordinatorForm, notes: e.target.value })}
                  placeholder="E.g., Assigned as primary coordinator for group travel logistics..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCoordinatorModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCoordinator}
                  className="px-5 py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
                >
                  {isSubmittingCoordinator ? 'Processing...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REMOVE COORDINATOR CONFIRMATION POPUP */}
      {showRemoveCoordinatorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <UserX className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Remove Coordinator?</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to remove this coordinator from the tour?
              </p>
            </div>

            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRemoveCoordinatorModal(false)}
                className="w-1/2 py-2.5 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 transition-colors shadow-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingCoordinator}
                onClick={confirmRemoveCoordinator}
                className="w-1/2 py-2.5 bg-red-600 text-white font-bold rounded-xl text-xs hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50"
              >
                {isSubmittingCoordinator ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD CUSTOM TASK MODAL */}
      {showAddTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-900">Add Operational Task</h3>
              <button onClick={() => setShowAddTaskModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleAddTask} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Task Description *</label>
                <input
                  type="text"
                  required
                  value={taskForm.task}
                  onChange={(e) => setTaskForm({ ...taskForm, task: e.target.value })}
                  className="w-full px-3.5 py-2 border rounded-xl text-sm"
                  placeholder="e.g. Verify customized permits"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                <input
                  type="text"
                  value={taskForm.category}
                  onChange={(e) => setTaskForm({ ...taskForm, category: e.target.value })}
                  className="w-full px-3.5 py-2 border rounded-xl text-sm"
                />
              </div>
              <button type="submit" className="w-full py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-sm">
                Save Task
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ADD FLIGHT TICKET MODAL */}
      {showFlightModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl border shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-900 flex items-center"><Plane className="w-5 h-5 mr-2 text-blue-600" /> Add Flight Ticket</h3>
              <button onClick={() => setShowFlightModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleAddFlight} className="space-y-3 text-xs">
              <input type="text" required placeholder="Passenger Name *" value={flightForm.passengerName} onChange={(e) => setFlightForm({ ...flightForm, passengerName: e.target.value })} className="w-full p-2.5 border rounded-xl" />
              <div className="grid grid-cols-2 gap-2">
                <input type="text" required placeholder="Airline *" value={flightForm.airline} onChange={(e) => setFlightForm({ ...flightForm, airline: e.target.value })} className="p-2.5 border rounded-xl" />
                <input type="text" required placeholder="Flight Number *" value={flightForm.flightNumber} onChange={(e) => setFlightForm({ ...flightForm, flightNumber: e.target.value })} className="p-2.5 border rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="text" required placeholder="Departure Airport *" value={flightForm.departureAirport} onChange={(e) => setFlightForm({ ...flightForm, departureAirport: e.target.value })} className="p-2.5 border rounded-xl" />
                <input type="text" required placeholder="Arrival Airport *" value={flightForm.arrivalAirport} onChange={(e) => setFlightForm({ ...flightForm, arrivalAirport: e.target.value })} className="p-2.5 border rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="datetime-local" required value={flightForm.departureDateTime} onChange={(e) => setFlightForm({ ...flightForm, departureDateTime: e.target.value })} className="p-2.5 border rounded-xl" />
                <input type="datetime-local" required value={flightForm.arrivalDateTime} onChange={(e) => setFlightForm({ ...flightForm, arrivalDateTime: e.target.value })} className="p-2.5 border rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="text" required placeholder="PNR *" value={flightForm.pnr} onChange={(e) => setFlightForm({ ...flightForm, pnr: e.target.value })} className="p-2.5 border rounded-xl" />
                <input type="text" placeholder="Ticket Number" value={flightForm.ticketNumber} onChange={(e) => setFlightForm({ ...flightForm, ticketNumber: e.target.value })} className="p-2.5 border rounded-xl" />
              </div>
              <button type="submit" className="w-full py-2.5 bg-blue-600 text-white font-bold rounded-xl text-sm">Save Flight Ticket</button>
            </form>
          </div>
        </div>
      )}

      {/* ADD TRAIN TICKET MODAL */}
      {showTrainModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl border shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-900 flex items-center"><Train className="w-5 h-5 mr-2 text-emerald-600" /> Add Train Ticket</h3>
              <button onClick={() => setShowTrainModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleAddTrain} className="space-y-3 text-xs">
              <input type="text" required placeholder="Passenger Name *" value={trainForm.passengerName} onChange={(e) => setTrainForm({ ...trainForm, passengerName: e.target.value })} className="w-full p-2.5 border rounded-xl" />
              <div className="grid grid-cols-2 gap-2">
                <input type="text" required placeholder="Railway Operator *" value={trainForm.operator} onChange={(e) => setTrainForm({ ...trainForm, operator: e.target.value })} className="p-2.5 border rounded-xl" />
                <input type="text" required placeholder="Train Number *" value={trainForm.trainNumber} onChange={(e) => setTrainForm({ ...trainForm, trainNumber: e.target.value })} className="p-2.5 border rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="text" required placeholder="Departure Station *" value={trainForm.departureLocation} onChange={(e) => setTrainForm({ ...trainForm, departureLocation: e.target.value })} className="p-2.5 border rounded-xl" />
                <input type="text" required placeholder="Arrival Station *" value={trainForm.arrivalLocation} onChange={(e) => setTrainForm({ ...trainForm, arrivalLocation: e.target.value })} className="p-2.5 border rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="datetime-local" required value={trainForm.departureDateTime} onChange={(e) => setTrainForm({ ...trainForm, departureDateTime: e.target.value })} className="p-2.5 border rounded-xl" />
                <input type="datetime-local" required value={trainForm.arrivalDateTime} onChange={(e) => setTrainForm({ ...trainForm, arrivalDateTime: e.target.value })} className="p-2.5 border rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="text" required placeholder="PNR / Ref *" value={trainForm.pnr} onChange={(e) => setTrainForm({ ...trainForm, pnr: e.target.value })} className="p-2.5 border rounded-xl" />
                <input type="text" placeholder="Seat / Berth" value={trainForm.seatNumber} onChange={(e) => setTrainForm({ ...trainForm, seatNumber: e.target.value })} className="p-2.5 border rounded-xl" />
              </div>
              <button type="submit" className="w-full py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-sm">Save Train Ticket</button>
            </form>
          </div>
        </div>
      )}

      {/* ADD BUS TICKET MODAL */}
      {showBusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl border shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-900 flex items-center"><Bus className="w-5 h-5 mr-2 text-purple-600" /> Add Bus Ticket</h3>
              <button onClick={() => setShowBusModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleAddBus} className="space-y-3 text-xs">
              <input type="text" required placeholder="Passenger Name *" value={busForm.passengerName} onChange={(e) => setBusForm({ ...busForm, passengerName: e.target.value })} className="w-full p-2.5 border rounded-xl" />
              <div className="grid grid-cols-2 gap-2">
                <input type="text" required placeholder="Bus Operator *" value={busForm.operator} onChange={(e) => setBusForm({ ...busForm, operator: e.target.value })} className="p-2.5 border rounded-xl" />
                <input type="text" placeholder="Bus Number" value={busForm.busNumber} onChange={(e) => setBusForm({ ...busForm, busNumber: e.target.value })} className="p-2.5 border rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="text" required placeholder="Boarding Point *" value={busForm.departureLocation} onChange={(e) => setBusForm({ ...busForm, departureLocation: e.target.value })} className="p-2.5 border rounded-xl" />
                <input type="text" required placeholder="Dropoff Point *" value={busForm.arrivalLocation} onChange={(e) => setBusForm({ ...busForm, arrivalLocation: e.target.value })} className="p-2.5 border rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="datetime-local" required value={busForm.departureDateTime} onChange={(e) => setBusForm({ ...busForm, departureDateTime: e.target.value })} className="p-2.5 border rounded-xl" />
                <input type="datetime-local" required value={busForm.arrivalDateTime} onChange={(e) => setBusForm({ ...busForm, arrivalDateTime: e.target.value })} className="p-2.5 border rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="text" required placeholder="PNR / Ticket Ref *" value={busForm.pnr} onChange={(e) => setBusForm({ ...busForm, pnr: e.target.value })} className="p-2.5 border rounded-xl" />
                <input type="text" placeholder="Seat Number" value={busForm.seatNumber} onChange={(e) => setBusForm({ ...busForm, seatNumber: e.target.value })} className="p-2.5 border rounded-xl" />
              </div>
              <button type="submit" className="w-full py-2.5 bg-purple-600 text-white font-bold rounded-xl text-sm">Save Bus Ticket</button>
            </form>
          </div>
        </div>
      )}

      {/* ADD HOTEL RESERVATION MODAL */}
      {showHotelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl border shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-900 flex items-center"><Building className="w-5 h-5 mr-2 text-amber-600" /> Add Hotel Reservation</h3>
              <button onClick={() => setShowHotelModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleAddHotel} className="space-y-3 text-xs">
              <input type="text" required placeholder="Hotel Name *" value={hotelForm.hotelName} onChange={(e) => setHotelForm({ ...hotelForm, hotelName: e.target.value })} className="w-full p-2.5 border rounded-xl" />
              <input type="text" placeholder="Destination" value={hotelForm.destination || tour.destination} onChange={(e) => setHotelForm({ ...hotelForm, destination: e.target.value })} className="w-full p-2.5 border rounded-xl" />
              <div className="grid grid-cols-2 gap-2">
                <input type="date" required value={hotelForm.checkInDate} onChange={(e) => setHotelForm({ ...hotelForm, checkInDate: e.target.value })} className="p-2.5 border rounded-xl" />
                <input type="date" required value={hotelForm.checkOutDate} onChange={(e) => setHotelForm({ ...hotelForm, checkOutDate: e.target.value })} className="p-2.5 border rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="text" placeholder="Room Type" value={hotelForm.roomType} onChange={(e) => setHotelForm({ ...hotelForm, roomType: e.target.value })} className="p-2.5 border rounded-xl" />
                <input type="text" placeholder="Confirmation Number" value={hotelForm.confirmationNumber} onChange={(e) => setHotelForm({ ...hotelForm, confirmationNumber: e.target.value })} className="p-2.5 border rounded-xl" />
              </div>
              <button type="submit" className="w-full py-2.5 bg-amber-600 text-white font-bold rounded-xl text-sm">Save Hotel Reservation</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
