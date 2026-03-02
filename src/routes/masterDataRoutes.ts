import express from 'express';
import { getMasterDataTabs, createMasterDataTab, getMasterData, createMasterData, updateMasterData, deleteMasterData, deleteMasterDataTab } from '../controllers/masterDataController.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// --- NEW: Public route for the storefront to fetch filters ---
router.get('/public/tabs', getMasterDataTabs);
router.get('/public/:type', getMasterData);

// Only Admins can manage Master Data below this line
router.use(authenticate, authorizeRoles('admin'));

router.route('/tabs').get(getMasterDataTabs).post(createMasterDataTab);
router.route('/:type').get(getMasterData).post(createMasterData);
router.route('/:type/:id').put(updateMasterData).delete(deleteMasterData);

// Make sure you have the Tab Delete route
router.route('/admin/tabs/:tabId').delete(authenticate, authorizeRoles('admin'), deleteMasterDataTab);

// Standard record delete route (you likely already have this)
router.route('/admin/:type/:id').delete(authenticate, authorizeRoles('admin'), deleteMasterData);

export default router;