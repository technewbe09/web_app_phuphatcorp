import { Router } from 'express';
import {
  innerCityCustomerController,
  innerCityCustomerCreateSchema,
  innerCityCustomerUpdateSchema,
  innerCityCustomerDeleteSchema,
} from '../controllers/innerCityCustomerController';
import { validate } from '../middleware/validate';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', innerCityCustomerController.getAll);
router.post('/', ...validate(innerCityCustomerCreateSchema), innerCityCustomerController.create);
router.put('/:id', ...validate(innerCityCustomerUpdateSchema), innerCityCustomerController.update);
router.delete('/:id', ...validate(innerCityCustomerDeleteSchema), innerCityCustomerController.remove);

export default router;
