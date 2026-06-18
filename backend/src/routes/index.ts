import { Router } from 'express';
import authRoutes from './auth';
import userRoutes from './users';
import roleRoutes from './roles';
import permissionRoutes from './permissions';
import dispatchScheduleRoutes from './dispatchSchedules';
import weightAdjustmentRoutes from './weightAdjustments';
import deliveryScheduleRoutes from './deliverySchedule';
import customerRoutes from './customers';
import driverInvoiceRoutes from './driverInvoices';
import deliveryDataRoutes from './deliveryData';
import accountantInvoiceRoutes from './accountantInvoices';
import vehicleRoutes from './vehicles';
import supplierRoutes from './suppliers';
import reconcileJobRoutes from './reconcileJobs';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/roles', roleRoutes);
router.use('/permissions', permissionRoutes);
router.use('/dispatch-schedules', dispatchScheduleRoutes);
router.use('/weight-adjustments', weightAdjustmentRoutes);
router.use('/delivery-schedules', deliveryScheduleRoutes);
router.use('/customers', customerRoutes);
router.use('/driver-invoices', driverInvoiceRoutes);
router.use('/delivery-data', deliveryDataRoutes);
router.use('/accountant-invoices', accountantInvoiceRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/reconcile-jobs', reconcileJobRoutes);

export default router;
