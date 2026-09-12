import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import {
  getItemsHandler,
  getLocationsHandler,
  getCategoriesHandler
} from './reference.controller';

const router = Router();

// All reference endpoints require authentication
router.use(authenticate);

router.get('/items', getItemsHandler);
router.get('/locations', getLocationsHandler);
router.get('/categories', getCategoriesHandler);

export default router;
