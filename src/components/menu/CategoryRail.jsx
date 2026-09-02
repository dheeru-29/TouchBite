import { categories } from '../../constants/categories';
export default function CategoryRail({ active, onChange }) {
  return <nav className="category-rail" aria-label="Menu categories">{categories.map((category) => <button key={category.id} onClick={() => onChange(category.id)} className={active === category.id ? 'active' : ''}><span>{category.icon}</span>{category.label}</button>)}</nav>;
}
