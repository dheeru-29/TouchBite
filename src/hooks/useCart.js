import { useCallback, useMemo, useState } from 'react';

const lineKey = (item, selectedOptions) => `${item.id}-${selectedOptions.map((option) => option.id).sort().join('-')}`;

export function useCart() {
  const [items, setItems] = useState([]);

  const addItem = useCallback((item, selectedOptions = [], quantity = 1) => {
    const key = lineKey(item, selectedOptions);
    setItems((current) => {
      const existing = current.find((entry) => entry.key === key);
      if (existing) return current.map((entry) => entry.key === key ? { ...entry, quantity: entry.quantity + quantity } : entry);
      return [...current, { ...item, key, selectedOptions, quantity }];
    });
  }, []);

  const changeQuantity = useCallback((key, amount) => {
    setItems((current) => current.flatMap((item) => item.key === key ? (item.quantity + amount > 0 ? [{ ...item, quantity: item.quantity + amount }] : []) : [item]));
  }, []);

  const removeItem = useCallback((key) => {
    setItems((current) => current.filter((item) => item.key !== key));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + (item.price + item.selectedOptions.reduce((a, option) => a + option.price, 0)) * item.quantity, 0);
    const tax = Math.round(subtotal * 0.05);
    return { subtotal, tax, total: subtotal + tax, count: items.reduce((sum, item) => sum + item.quantity, 0) };
  }, [items]);

  return useMemo(
    () => ({ items, addItem, changeQuantity, removeItem, clearCart, totals }),
    [items, addItem, changeQuantity, removeItem, clearCart, totals]
  );
}