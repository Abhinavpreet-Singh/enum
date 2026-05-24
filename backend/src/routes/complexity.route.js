import { Router } from 'express';
import {
  analyzeCodeComplexity,
  checkJobStatus,
  getAnalyzerHealth,
  getMLStats,
  exportMLData,
} from '../controllers/complexity.controller.js';

const router = Router();

// Analyze code complexity (rate-limited per user)
router.post('/analyze', analyzeCodeComplexity);

// Check async job status
router.get('/job/:queueType/:jobId', checkJobStatus);

// Health check
router.get('/health', getAnalyzerHealth);

// ML classifier statistics
router.get('/ml/stats', getMLStats);

// Export training data as CSV
router.get('/ml/export', exportMLData);

export default router;
