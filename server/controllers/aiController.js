import { handleChatRequest } from '../services/ai/aiOrchestrator.js';

export async function processAIChat(req, res, next) {
  try {
    const { transcript, cartItems, sessionId } = req.body;

    if (!transcript || !String(transcript).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Transcript is required.',
      });
    }

    const result = await handleChatRequest({ transcript: String(transcript).trim(), cartItems, sessionId });

    return res.json({
      success: true,
      data: {
        response: result.response,
        transcript: result.transcript,
        intent: result.intent,
        menu: result.menuResult,
        rag: result.ragResult ? {
          sources: result.ragResult.sources,
          products: result.ragResult.products,
          error: result.ragResult.error || null,
        } : null,
        cart: result.actionResult?.cart || null,
        sessionId: result.sessionId,
      },
    });
  } catch (error) {
    console.error('[AI] Chat request failed:', error.message || error);
    return res.status(500).json({
      success: false,
      message: error.message || 'AI service is temporarily unavailable.',
    });
  }
}

export async function processVoiceQuery(req, res, next) {
  try {
    const { transcript, cartItems, sessionId } = req.body;

    if (!transcript || !String(transcript).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Transcript is required.',
      });
    }

    const result = await handleChatRequest({ transcript: String(transcript).trim(), cartItems, sessionId });

    return res.json({
      success: true,
      data: {
        speechResponse: result.response,
        uiCommand: null,
        transcript: result.transcript,
        intent: result.intent,
        menu: result.menuResult,
        rag: result.ragResult ? {
          sources: result.ragResult.sources,
          products: result.ragResult.products,
          error: result.ragResult.error || null,
        } : null,
        cart: result.actionResult?.cart || null,
        sessionId: result.sessionId,
      },
    });
  } catch (error) {
    console.error('[AI] Voice request failed:', error.message || error);
    return res.status(500).json({
      success: false,
      message: error.message || 'AI service is temporarily unavailable.',
    });
  }
}
