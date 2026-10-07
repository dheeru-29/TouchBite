import React from 'react';
import { handleImageError } from '../../utils/imageFallback';

export const VoiceAssistantBar = ({
  transcript,
  voiceState,
  aiResponse,
  progressLabel,
  products = [],
  selectedIndex = 0,
  onSelectedIndexChange,
  onProductSelect,
  onDismiss,
}) => {
  const productRefs = React.useRef([]);
  const isActive = voiceState === 'COMMAND_LISTENING' || voiceState === 'PROCESSING' || voiceState === 'SPEAKING';

  React.useEffect(() => {
    const selected = productRefs.current[selectedIndex];
    selected?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [selectedIndex, products.length]);

  if (!isActive && !aiResponse && !products.length) return null;

  return (
    <section className="voice-assistant-bar" aria-live="polite" aria-label="Voice assistant">
      {(isActive || transcript) && (
        <header className="voice-assistant-bar__header">
          <span className={`voice-assistant-bar__indicator voice-assistant-bar__indicator--${voiceState.toLowerCase()}`} />
          <strong>{voiceState === 'COMMAND_LISTENING' ? 'Listening' : voiceState === 'PROCESSING' ? progressLabel : 'TouchBite'}</strong>
          {transcript && voiceState === 'COMMAND_LISTENING' && (
            <span className="voice-assistant-bar__transcript">{transcript}</span>
          )}
        </header>
      )}

      {aiResponse && (
        <div className="voice-assistant-bar__answer">
          {aiResponse.replace(/\*\*|__|`/g, '').split(/\n+/).filter(Boolean).map((line, index) => (
            <p className={index === 0 ? 'voice-assistant-bar__response' : 'voice-assistant-bar__summary'} key={`${index}-${line}`}>
              {line}
            </p>
          ))}
        </div>
      )}

      {products.length > 0 && (
        <div className="voice-assistant-bar__results">
          <div className="voice-assistant-bar__results-heading">
            <p className="voice-assistant-bar__hint">{products.length} matching item{products.length === 1 ? '' : 's'} · Swipe to browse, flick up to select</p>
            <button type="button" className="voice-assistant-bar__close" onClick={onDismiss} aria-label="Close search results">×</button>
          </div>
          <div className="voice-assistant-bar__items">
            {products.map((product, index) => (
              <button
                ref={(element) => { productRefs.current[index] = element; }}
                className={`voice-assistant-bar__item${index === selectedIndex ? ' voice-assistant-bar__item--selected' : ''}`}
                key={product.id}
                type="button"
                aria-current={index === selectedIndex ? 'true' : undefined}
                onFocus={() => onSelectedIndexChange?.(index)}
                onMouseEnter={() => onSelectedIndexChange?.(index)}
                onClick={() => onProductSelect?.(product)}
              >
                <img src={product.image} alt={product.name} onError={handleImageError} />
                <span className="voice-assistant-bar__item-copy">
                  <strong>{product.name}</strong>
                  <span>₹{product.price}</span>
                  <small>{product.description}</small>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default VoiceAssistantBar;