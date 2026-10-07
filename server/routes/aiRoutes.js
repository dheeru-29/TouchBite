import express from 'express';
import { processAIChat, processVoiceQuery } from '../controllers/aiController.js';

const router = express.Router();
router.post('/chat', processAIChat);
router.post('/voice', processVoiceQuery);

export default router;