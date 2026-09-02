import Button from '../common/Button';
import { handleImageError } from '../../utils/imageFallback';

export default function ProductModal({
  item,
  quantity,
  qtyMode,
  selectedOptions,
  onToggleOption,
  onQuantityChange,
  onToggleQtyMode,
  onClose,
  onAdd,
  dragActive,
}) {
  const price = (item.price + selectedOptions.reduce((sum, option) => sum + option.price, 0)) * quantity;

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className={`product-modal${qtyMode ? ' product-modal--qty' : ''}${dragActive ? ' product-modal--dragging' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={item.name}
      >
        <button className="modal-close" onClick={onClose}>
          ×
        </button>
        <div className="product-modal__image">
          <img src={item.image} alt="" onError={handleImageError} />
        </div>
        <div className="product-modal__content">
          <span className="eyebrow">{item.category}</span>
          <h2>{item.name}</h2>
          <p>{item.description}</p>

          <div className="customisations">
            <h3>Make it yours</h3>
            {item.options.map((option) => (
              <label key={option.id} className={selectedOptions.some((o) => o.id === option.id) ? 'selected' : ''}>
                <input
                  type="checkbox"
                  checked={selectedOptions.some((o) => o.id === option.id)}
                  onChange={() => onToggleOption(option)}
                />
                <span>{option.name}</span>
                <b>{option.price ? `+₹${option.price}` : 'Included'}</b>
              </label>
            ))}
          </div>

          <div className="product-modal__actions">
            <div className={`quantity${qtyMode ? ' quantity--gesture-active' : ''}`}>
              <button onClick={() => onQuantityChange(Math.max(1, quantity - 1))}>−</button>
              <b>{quantity}</b>
              <button onClick={() => onQuantityChange(quantity + 1)}>+</button>
            </div>
            <Button onClick={() => onAdd()}>Add · ₹{price}</Button>
          </div>

          <div className="gesture-tip">
            {qtyMode ? '↕ Flick to adjust quantity · pinch again to lock it in' : '🤙 Pinky-drag to the cart · pinch-hold to set quantity'}
          </div>
          <button type="button" className="gesture-toggle-qty" onClick={onToggleQtyMode}>
            {qtyMode ? 'Done adjusting' : 'Adjust quantity'}
          </button>
        </div>
      </section>
    </div>
  );
}
