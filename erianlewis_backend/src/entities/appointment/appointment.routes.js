import express from 'express';
import { verifyToken, adminMiddleware, landlordOrAgentMiddleware } from '../../core/middlewares/authMiddleware.js';
import {
  getAvailability,
  saveAvailability,
  getBlockedDates,
  addBlockedDate,
  deleteBlockedDate,
  createAppointment,
  getMyAppointments,
  getAvailableSlots,
  updateAppointmentStatus,
  deleteAppointment,
  getAllAppointments,
} from './appointment.controller.js';

const router = express.Router();

// ─── AVAILABILITY (landlord/agent only) ──────
router.get ('/availability',      verifyToken, landlordOrAgentMiddleware, getAvailability);
router.post('/availability',      verifyToken, landlordOrAgentMiddleware, saveAvailability);

// ─── BLOCKED DATES (landlord/agent only) ─────
router.get   ('/blocked-dates',     verifyToken, landlordOrAgentMiddleware, getBlockedDates);
router.post  ('/blocked-dates',     verifyToken, landlordOrAgentMiddleware, addBlockedDate);
router.delete('/blocked-dates/:id', verifyToken, landlordOrAgentMiddleware, deleteBlockedDate);

// ─── APPOINTMENTS ─────────────────────────────
// Public — anyone can book (optionally logged in)
router.post('/book',         createAppointment);

// Get available slots for a property on a date (public)
router.get ('/available-slots', getAvailableSlots);

// Owner — manage their own appointments
router.get   ('/my',        verifyToken, landlordOrAgentMiddleware, getMyAppointments);
router.put ('/:id/status', verifyToken, landlordOrAgentMiddleware, updateAppointmentStatus);
router.delete('/:id',        verifyToken, landlordOrAgentMiddleware, deleteAppointment);

// Admin — all appointments
router.get('/all', verifyToken, adminMiddleware, getAllAppointments);

export default router;