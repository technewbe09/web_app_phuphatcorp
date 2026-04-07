import { Router } from 'express';
import authRoutes from './auth';
import userRoutes from './users';
import tripCodeRoutes from './tripCodes';
import vehicleRoutes from './vehicles';
import driverRoutes from './drivers';
import roleRoutes from './roles';
import permissionRoutes from './permissions';
import dispatchScheduleRoutes from './dispatchSchedules';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/trip-codes', tripCodeRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/drivers', driverRoutes);
router.use('/roles', roleRoutes);
router.use('/permissions', permissionRoutes);
router.use('/dispatch-schedules', dispatchScheduleRoutes);

export default router;
