import { forwardRef } from 'react';
import { handleImageError } from '../../utils/imageFallback';

// Forwards a ref to the card's root element so the menu grid can scroll a
// gesture-highlighted card into view (browsing by swipe shouldn't require a
// manual scroll to see what got highlighted).
const MenuCard = forwardRef(function MenuCard({ item, onSelect, highlighted = false }, ref) {
  return <article ref={ref} className={`menu-card${highlighted ? ' menu-card--gesture-selected' : ''}`} onClick={() => onSelect(item)}>
    <div className="menu-card__image"><img src={item.image} alt={item.name} onError={handleImageError} />{item.popular && <span className="badge">Bestseller</span>}{item.vegetarian && <span className="veg">●</span>}</div>
    <div className="menu-card__body"><h3>{item.name}</h3><p>{item.description}</p><div><strong>₹{item.price}</strong><button aria-label={`View ${item.name}`}>+</button></div></div>
  </article>;
});

export default MenuCard;
