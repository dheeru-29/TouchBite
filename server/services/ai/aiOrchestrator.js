import { extractMenuIntent, generateActionResponse, generateChatResponse, generateGroundedResponse } from './llmService.js';
import { executeMenuIntent } from './menuQueryService.js';
import { inferSafeMenuIntent, validateMenuIntent } from './menuIntent.js';
import { formatRetrievedContext, formatSources, retrieveKnowledge } from './ragService.js';
import { addConversationTurn, formatConversationContext, getOrCreateSession } from './conversationMemory.js';
import Product from '../../models/Product.js';

function looksLikeMenuRequest(transcript) {
  return /\b(menu|burgers?|chicken|meals?|fries?|sides?|beverages?|drinks?|desserts?|vegetarian|vegan|products?|food|available|cheapest|price|under|over|ingredient|allergen|nutrition|preparation|customi[sz]|contain|onion|dairy|rs\.?|inr)\b|₹/i.test(transcript);
}

// NEW: Deterministic fallback for semantic knowledge questions
function getDeterministicKnowledgeIntent(transcript) {
  const lower = transcript.toLowerCase();
  const knowledgePatterns = ['tell me about', 'what is', 'what can i customize', 'which burger has', 'which item has', 'describe', 'what options', 'what customizations', 'does it have', 'how can i customi'];
  if (knowledgePatterns.some((p) => lower.includes(p))) {
    return { intent: 'KNOWLEDGE_QUERY', query: transcript };
  }
  return null;
}

function getExplicitPriceRange(transcript) {
  const text = transcript.toLowerCase();
  const maxMatch = text.match(/\b(?:under|below|less than|up to|within)\s*(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)/i);
  const minMatch = text.match(/\b(?:over|above|more than|at least)\s*(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)/i);
  return {
    ...(maxMatch ? { maxPrice: Number(maxMatch[1]) } : {}),
    ...(minMatch ? { minPrice: Number(minMatch[1]) } : {}),
  };
}

function isExplicitMenuSearch(transcript) {
  return /\b(show|find|recommend|suggest|list|options?|items?|food|menu|available)\b/i.test(transcript)
    && !/\b(add|put|remove|delete|update|change|cart|customi[sz]|ingredient|allergen|nutrition|describe|description)\b/i.test(transcript);
}

function isBroadMenuRequest(transcript) {
  const namesCategory = /\b(burgers?|chicken|meals?|fries|sides?|beverages?|drinks?|desserts?)\b/i.test(transcript);
  return !namesCategory && /\b(food|menu|all (?:available )?(?:items?|options?)|every (?:item|option))\b/i.test(transcript);
}

function formatMenuResponse(menuResult) {
  if (menuResult.intent.intent === 'LIST_CATEGORIES') {
    return menuResult.categories.length
      ? `Menu categories: ${menuResult.categories.join(', ')}.`
      : 'There are no menu categories available right now.';
  }
  if (!menuResult.products.length) return 'No available items matched that request.';
  if (menuResult.intent.intent === 'GET_PRODUCT') {
    const product = menuResult.products[0];
    return `${product.name} · ₹${product.price}. ${product.description}`;
  }

  const { filters = {} } = menuResult.intent;
  const priceLabel = filters.maxPrice !== undefined
    ? ` priced at ₹${filters.maxPrice} or less`
    : filters.minPrice !== undefined
      ? ` priced at ₹${filters.minPrice} or more`
      : '';
  const examples = menuResult.products.slice(0, 3)
    .map((product) => `${product.name} (₹${product.price})`)
    .join(', ');
  return `Found ${menuResult.products.length} available item${menuResult.products.length === 1 ? '' : 's'}${priceLabel}. Starting with: ${examples}. Browse the cards to see every match.`;
}

export async function handleChatRequest({ transcript, cartItems = [], sessionId }) {
  const trimmedTranscript = String(transcript || '').trim();

  if (!trimmedTranscript) {
    throw new Error('Transcript is required.');
  }

  console.log('[AI] Received transcript:', trimmedTranscript);

  try {
    const session = getOrCreateSession(sessionId);
    const conversationContext = formatConversationContext(session.messages);
    let intent = null;
    let menuResult = null;
    let ragResult = null;
    let actionResult = null;

    try {
      intent = validateMenuIntent(await extractMenuIntent({ transcript: trimmedTranscript, conversationContext }));
    } catch (error) {
      // FIX: Try semantic knowledge fallback before structural menu fallback
      const knowledgeFallback = getDeterministicKnowledgeIntent(trimmedTranscript);
      
      if (knowledgeFallback) {
        intent = knowledgeFallback;
        console.warn(`[AI] Structured intent unavailable; deterministic knowledge fallback activated: ${intent.intent}`);
      } else if (looksLikeMenuRequest(trimmedTranscript)) {
        intent = inferSafeMenuIntent(trimmedTranscript);
        if (!intent) throw new Error('Menu search is temporarily unavailable because structured menu interpretation failed. Please try again shortly.');
        console.warn('[AI] Structured intent unavailable; using safe local menu filter fallback.');
      } else {
        console.warn('[AI] Menu intent path unavailable, using normal chat:', error.message || error);
      }
    }

    const explicitPriceRange = getExplicitPriceRange(trimmedTranscript);
    if (explicitPriceRange.maxPrice !== undefined || explicitPriceRange.minPrice !== undefined) {
      if (intent?.intent === 'SEARCH_MENU' || ((intent?.intent === 'CHAT' || intent?.intent === 'KNOWLEDGE_QUERY' || !intent) && isExplicitMenuSearch(trimmedTranscript))) {
        intent = {
          ...(intent || inferSafeMenuIntent(trimmedTranscript)),
          intent: 'SEARCH_MENU',
          filters: { ...(intent?.filters || {}), ...explicitPriceRange, available: true },
          limit: 50,
        };
        if (isBroadMenuRequest(trimmedTranscript)) {
          intent.filters.category = null;
          intent.filters.search = null;
          if (!/\b(vegetarian|vegan|veg)\b/i.test(trimmedTranscript)) intent.filters.vegetarian = null;
        }
      }
    }
    if (intent?.intent === 'SEARCH_MENU') {
      const requestedCount = trimmedTranscript.match(/\b(?:show|list|give me|top)\s+(\d+)\b/i);
      intent.limit = requestedCount ? Math.min(Number(requestedCount[1]), 50) : 50;
      if (intent.filters.maxPrice !== undefined || intent.filters.minPrice !== undefined) {
        intent.sort = { field: 'price', order: /\b(most expensive|highest price)\b/i.test(trimmedTranscript) ? 'desc' : 'asc' };
      }
    }

    if (intent?.intent === 'SEARCH_MENU' || intent?.intent === 'GET_PRODUCT' || intent?.intent === 'LIST_CATEGORIES') {
      menuResult = await executeMenuIntent(intent);
    }

    if (intent?.intent === 'KNOWLEDGE_QUERY') {
      console.log('[AI] Intent: KNOWLEDGE_QUERY');
      console.log(`[AI] RAG query: ${intent.query || trimmedTranscript}`);
      console.log('[AI] RAG retrieval started');
      
      try {
        const documents = await retrieveKnowledge({ query: trimmedTranscript, topK: 4 });
        console.log(`[AI] Retrieved documents: ${documents.length}`);

        const productIds = documents
          .filter((document) => document.sourceType === 'product')
          .map((document) => document.sourceId);
        const products = productIds.length
          ? await Product.find({ _id: { $in: productIds }, available: true })
            .select('name description price category image vegetarian popular customizationOptions')
            .lean()
          : [];
        const productsById = new Map(products.map((product) => [String(product._id), product]));
        const rankedProducts = productIds.map((productId) => productsById.get(productId)).filter(Boolean);
        ragResult = { intent, documents, products: rankedProducts, sources: formatSources(documents) };
        if (documents.length) {
          console.log('[AI] Retrieved sources:');
          documents.forEach((doc, i) => {
            // Logs the product name or defaults to generic document title
            console.log(`  ${i + 1}. ${doc.metadata?.productName || doc.title || 'Menu Document'}`);
          });
          console.log('[AI] RAG context prepared');
          console.log('[AI] Generating grounded response with OpenRouter');

          ragResult.response = await generateGroundedResponse({
            transcript: trimmedTranscript,
            retrievedContext: formatRetrievedContext(documents),
            conversationContext,
          });
        } else {
          console.log('[AI] No documents retrieved. Returning safe refusal.');
          ragResult.response = 'I do not have enough TouchBite menu information to answer that accurately.';
        }
      } catch (error) {
        console.error('[AI] Knowledge retrieval failed:', error.message || error);
        ragResult = {
          intent,
          documents: [],
          sources: [],
          response: 'TouchBite knowledge search is temporarily unavailable. Please try again shortly.',
          error: 'Knowledge retrieval unavailable',
        };
      }
    }

    if (intent?.intent === 'ACTION_REQUEST') {
      actionResult = await generateActionResponse({ transcript: trimmedTranscript, cartItems, conversationContext });
    }

    const response = menuResult
      ? formatMenuResponse(menuResult)
      : ragResult
        ? ragResult.response
        : actionResult
          ? actionResult.response
          : await generateChatResponse({ transcript: trimmedTranscript, conversationContext });

    addConversationTurn(session.sessionId, { user: trimmedTranscript, assistant: response });

    console.log('[AI] LLM response generated successfully.');

    return {
      transcript: trimmedTranscript,
      response,
      intent: menuResult?.intent || ragResult?.intent || intent || null,
      menuResult,
      ragResult,
      actionResult,
      sessionId: session.sessionId,
    };
  } catch (error) {
    console.error('[AI] LLM orchestration failed:', error.message || error);
    throw error;
  }
}