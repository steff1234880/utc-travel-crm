import { Router } from 'express';
import { authenticate, requireModuleAccess } from '../middleware/authMiddleware';
import { documentUpload } from '../middleware/uploadMiddleware';
import {
  getOperationsDashboardStats,
  getTours,
  createTour,
  getTourById,
  updateTour,
  deleteTour,
  getCoordinatorsList,
  assignTourCoordinator,
  removeTourCoordinator,
  getTourChecklist,
  updateChecklistTask,
  addChecklistTask,
  getFlightTickets,
  createFlightTicket,
  updateFlightTicket,
  deleteFlightTicket,
  getTrainTickets,
  getTrainTicketById,
  createTrainTicket,
  updateTrainTicket,
  deleteTrainTicket,
  getBusTickets,
  getBusTicketById,
  createBusTicket,
  updateBusTicket,
  deleteBusTicket,
  getHotelReservations,
  createHotelReservation,
  updateHotelReservation,
  deleteHotelReservation,
} from '../controllers/operationsController';

import {
  getVendors,
  createVendor,
  getVendorById,
  updateVendor,
  updateVendorStatus,
} from '../controllers/vendorController';

import {
  getOperationalCosts,
  createOperationalCost,
  getOperationalCostById,
  updateOperationalCost,
  updateCostStatus,
  deleteOperationalCost,
} from '../controllers/operationalCostController';

import {
  getTransportReservations,
  createTransportReservation,
  getTransportById,
  updateTransportReservation,
  updateTransportStatus,
} from '../controllers/transportController';

import {
  getDocuments,
  uploadDocument,
  getDocumentById,
  downloadDocument,
  verifyDocument,
  deleteDocument,
} from '../controllers/operationsDocumentController';

import {
  getTourOperationsReport,
  getCoordinatorWorkloadReport,
  getTicketStatusReport,
  getHotelReservationReport,
  getVendorReport,
  getOperationalCostReport,
  getDocumentStatusReport,
  getTourCompletionReport,
} from '../controllers/operationsReportController';

const router = Router();

// Protect all operations routes with authentication
router.use(authenticate);

// Protect specific sub-paths with their respective required modules
router.use('/dashboard', requireModuleAccess('Operations'));
router.use('/tours', requireModuleAccess('Operations'));
router.use('/coordinators', requireModuleAccess('Operations'));
router.use('/checklist', requireModuleAccess('Operations'));
router.use('/tickets', requireModuleAccess('Tickets'));
router.use('/hotels', requireModuleAccess('Hotels'));
router.use('/vendors', requireModuleAccess('Vendors'));
router.use('/costs', requireModuleAccess('Operations'));
router.use('/transport', requireModuleAccess('Tickets'));
router.use('/documents', requireModuleAccess('Operations'));
router.use('/reports', requireModuleAccess('Reports'));

// 1. Dashboard
router.get('/dashboard', getOperationsDashboardStats);

// 2. Tour Management
router.get('/tours', getTours);
router.post('/tours', createTour);
router.get('/tours/:id', getTourById);
router.put('/tours/:id', updateTour);
router.delete('/tours/:id', deleteTour);

// 3. Coordinator Assignment
router.get('/coordinators', getCoordinatorsList);
router.post('/tours/:id/coordinator', assignTourCoordinator);
router.delete('/tours/:id/coordinator', removeTourCoordinator);

// 4. Checklist & Tasks
router.get('/tours/:id/checklist', getTourChecklist);
router.post('/tours/:id/checklist', addChecklistTask);
router.put('/checklist/:taskId', updateChecklistTask);

// 5. Flight Tickets
router.get('/tickets/flight', getFlightTickets);
router.post('/tickets/flight', createFlightTicket);
router.put('/tickets/flight/:ticketId', updateFlightTicket);
router.delete('/tickets/flight/:ticketId', deleteFlightTicket);

// 6. Train Tickets
router.get('/tickets/train', getTrainTickets);
router.get('/tickets/train/:ticketId', getTrainTicketById);
router.post('/tickets/train', createTrainTicket);
router.put('/tickets/train/:ticketId', updateTrainTicket);
router.delete('/tickets/train/:ticketId', deleteTrainTicket);

// 7. Bus Tickets
router.get('/tickets/bus', getBusTickets);
router.get('/tickets/bus/:ticketId', getBusTicketById);
router.post('/tickets/bus', createBusTicket);
router.put('/tickets/bus/:ticketId', updateBusTicket);
router.delete('/tickets/bus/:ticketId', deleteBusTicket);

// 8. Hotel Reservations
router.get('/hotels', getHotelReservations);
router.post('/hotels', createHotelReservation);
router.put('/hotels/:id', updateHotelReservation);
router.delete('/hotels/:id', deleteHotelReservation);

// 9. Vendor Management (Part 2)
router.get('/vendors', getVendors);
router.post('/vendors', createVendor);
router.get('/vendors/:id', getVendorById);
router.put('/vendors/:id', updateVendor);
router.patch('/vendors/:id/status', updateVendorStatus);

// 10. Operational Costs (Part 2)
router.get('/costs', getOperationalCosts);
router.post('/costs', createOperationalCost);
router.get('/costs/:id', getOperationalCostById);
router.put('/costs/:id', updateOperationalCost);
router.patch('/costs/:id/status', updateCostStatus);
router.delete('/costs/:id', deleteOperationalCost);

// 11. Transport Reservations (Part 2)
router.get('/transport', getTransportReservations);
router.post('/transport', createTransportReservation);
router.get('/transport/:id', getTransportById);
router.put('/transport/:id', updateTransportReservation);
router.patch('/transport/:id/status', updateTransportStatus);

// 12. Operations Document Management (Part 2)
router.get('/documents', getDocuments);
router.post('/documents', documentUpload.single('file'), uploadDocument);
router.get('/documents/:id', getDocumentById);
router.get('/documents/:id/download', downloadDocument);
router.patch('/documents/:id/verify', verifyDocument);
router.delete('/documents/:id', deleteDocument);

// 13. Operations Reports (Part 2)
router.get('/reports/tours', getTourOperationsReport);
router.get('/reports/coordinators', getCoordinatorWorkloadReport);
router.get('/reports/tickets', getTicketStatusReport);
router.get('/reports/hotels', getHotelReservationReport);
router.get('/reports/vendors', getVendorReport);
router.get('/reports/costs', getOperationalCostReport);
router.get('/reports/documents', getDocumentStatusReport);
router.get('/reports/completion', getTourCompletionReport);

export default router;
