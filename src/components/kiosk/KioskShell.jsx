import React, { useEffect, useRef, useState } from 'react';
import GestureBar from './GestureBar';
import { useVoiceAssistant } from '../../hooks/useVoiceAssistant';
import { speak, stop } from '../../utils/textToSpeech';
import { aiApi } from '../../services/aiApi';
import { toMenuItem } from '../../services/api';
import VoiceAssistantBar from './VoiceAssistantBar';

export default function KioskShell({
  children,
  cartCount,
  onCart,
  onHome,
  showCart = true,
  gestureStatus = {},
  onVoiceCommand,
  cartItems = [],
  onCartUpdate,
  onProductSelect,
  assistantResults = [],
  onAssistantResultsChange,
  assistantSelectedIndex = 0,
  onAssistantSelectedIndexChange,
}) {
  const { dragActive, cursor, dragLabel } = gestureStatus;
  const cartItemsRef = useRef(cartItems);
  cartItemsRef.current = cartItems;
  const [aiResponse, setAiResponse] = useState('');
  const [progressLabel, setProgressLabel] = useState('Thinking');
  const hadAssistantResultsRef = useRef(false);

  const getProgressLabel = (command) => {
    if (/\b(add|put|place)\b.*\b(cart|basket)\b/i.test(command)) return 'Adding to cart';
    if (/\b(remove|delete)\b.*\b(cart|basket)\b/i.test(command)) return 'Removing from cart';
    if (/\b(update|change|make)\b.*\b(cart|quantity|items?)\b/i.test(command)) return 'Updating cart';
    if (/\b(cart|subtotal|total|basket)\b/i.test(command)) return 'Checking your cart';
    if (/\b(ingredient|allergen|nutrition|describe|description|customi[sz]|what is|tell me about)\b/i.test(command)) return 'Checking item details';
    if (/\b(menu|food|items?|options?|under|below|price|recommend|suggest|show|find)\b/i.test(command)) return 'Searching the menu';
    return 'Thinking';
  };
  
  const cartSnapshotKey = (items) => JSON.stringify(items.map((item) => ({ key: item.key, quantity: item.quantity, selectedOptions: item.selectedOptions })));

  const { voiceState, transcript, pauseForSpeech, resumeWakeListening, startListening } = useVoiceAssistant(handleCommandRecognized);

  async function handleCommandRecognized(commandText) {
    try {
      setAiResponse('');
      onAssistantResultsChange?.([]);
      onAssistantSelectedIndexChange?.(0);
      setProgressLabel(getProgressLabel(commandText));
      if (onVoiceCommand) {
        await onVoiceCommand(commandText, cartItems);
        return;
      }

      const requestCartKey = cartSnapshotKey(cartItems);
      const data = await aiApi.chat(commandText, cartItems, localStorage.getItem('touchbite_session') || 'kiosk_1');

      if (data.response) {
        setAiResponse(data.response);
        const products = data.menu?.products || data.rag?.products || [];
        onAssistantResultsChange?.(products.map(toMenuItem));
        onAssistantSelectedIndexChange?.(0);
        
        // Detect if the user wants to end the conversation
        const isClosing = /quit|stop|cancel|exit|goodbye|bye|no thanks|that'?s it|that'?s all|done/i.test(commandText) || 
                          /enjoy your day|have a good day|goodbye/i.test(data.response);

        const spoken = speak(data.response, { 
          onStart: pauseForSpeech, 
          onEnd: () => {
            setTimeout(() => {
              if (isClosing) {
                resumeWakeListening(); // Return to background wake-word mode
              } else {
                startListening(); // Re-open mic for continuous conversation
              }
            }, 300);
          } 
        });
        
        if (!spoken) {
          if (isClosing) resumeWakeListening();
          else startListening();
        }
      }

      if (data.cart && onCartUpdate && requestCartKey === cartSnapshotKey(cartItemsRef.current)) {
        onCartUpdate(Array.isArray(data.cart) ? data.cart : (data.cart.items || []));
      }
    } catch (error) {
      console.error('Failed to process voice command:', error);
      resumeWakeListening();
    }
  }

  useEffect(() => () => stop(), []);

  useEffect(() => {
    if (voiceState === 'WAKE_LISTENING' || voiceState === 'IDLE') {
      setAiResponse('');
      onAssistantResultsChange?.([]);
      onAssistantSelectedIndexChange?.(0);
    }
  }, [voiceState, onAssistantResultsChange, onAssistantSelectedIndexChange]);

  useEffect(() => {
    if (hadAssistantResultsRef.current && !assistantResults.length) setAiResponse('');
    hadAssistantResultsRef.current = assistantResults.length > 0;
  }, [assistantResults.length]);

  // Keep-Awake Effect to prevent idle timeouts during conversation
  useEffect(() => {
    let keepAwakeInterval;
    
    if (voiceState === 'COMMAND_LISTENING' || voiceState === 'PROCESSING' || voiceState === 'SPEAKING') {
      keepAwakeInterval = setInterval(() => {
        window.dispatchEvent(new Event('mousemove'));
        window.dispatchEvent(new Event('touchstart'));
        window.dispatchEvent(new Event('keydown'));
      }, 5000);
    }

    return () => clearInterval(keepAwakeInterval);
  }, [voiceState]);

  return (
    <main className="kiosk-shell">
      <header className="topbar">
        <button className="brand" onClick={onHome} aria-label="TouchBite home">
          <span className="brand__mark">T</span>
          <span>
            TOUCH<span>BITE</span>
          </span>
        </button>
        <div className="topbar__right">
          <span className="language">
            EN <small>⌄</small>
          </span>
          {showCart && (
            <button
              className="cart-button"
              onClick={onCart}
              aria-label={`Open cart, ${cartCount} items`}
            >
              <span>🛍</span>
              <b>{cartCount}</b>
              <em>Cart</em>
            </button>
          )}
        </div>
      </header>

      {children}

      <VoiceAssistantBar 
        transcript={transcript} 
        voiceState={voiceState} 
        aiResponse={aiResponse} 
        products={assistantResults}
        selectedIndex={assistantSelectedIndex}
        onSelectedIndexChange={onAssistantSelectedIndexChange}
        onProductSelect={(product) => {
          setAiResponse('');
          onAssistantResultsChange?.([]);
          onAssistantSelectedIndexChange?.(0);
          onProductSelect?.(product);
        }}
        onDismiss={() => {
          setAiResponse('');
          onAssistantResultsChange?.([]);
          onAssistantSelectedIndexChange?.(0);
        }}
        progressLabel={progressLabel}
      />

      {dragActive && cursor && (
        <div
          className="drag-ghost"
          style={{ left: `${cursor.x}vw`, top: `${cursor.y}vh` }}
        >
          {dragLabel || '🛍'}
        </div>
      )}

      <GestureBar {...gestureStatus} />
    </main>
  );
}