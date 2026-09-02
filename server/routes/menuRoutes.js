import { Router } from 'express';
import { getCategories, getMenu, getProduct } from '../controllers/menuController.js';
const router = Router();
router.get('/categories', getCategories); router.get('/menu', getMenu); router.get('/menu/:id', getProduct);
export default router;
