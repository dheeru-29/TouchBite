import { categories } from '../../constants/categories';

export default function CategoryMenu({ open, activeIndex, progress = 0, onPick }) {
  return (
    <div className={`category-menu${open ? ' category-menu--open' : ''}`} aria-hidden={!open}>
      <div className="category-menu__header">Departments</div>
      <div className="category-menu__list">
        {categories.map((category, index) => {
          const isActive = index === activeIndex;
          return (
            <button
              key={category.id}
              type="button"
              className={`category-menu__item${isActive ? ' active' : ''}`}
              onClick={() => onPick?.(category.id)}
            >
              {isActive && <span className="category-menu__progress" style={{ width: `${progress}%` }} />}
              <span className="category-menu__icon">{category.icon}</span>
              {category.label}
            </button>
          );
        })}
      </div>
      <div className="category-menu__footer">
        <p>↕ Flick to browse</p>
        <p>👍 Hold to confirm</p>
        <p>💍 Ring finger to close</p>
      </div>
    </div>
  );
}
