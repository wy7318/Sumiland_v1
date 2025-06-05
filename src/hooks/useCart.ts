// src/hooks/useCart.ts
import { useState, useEffect } from 'react';

interface CartItem {
  id: string;
  item: any;
  selectedOptions: Record<string, any>;
  quantity: number;
  totalPrice: number;
  specialInstructions?: string;
}

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([]);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('restaurant_cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('restaurant_cart', JSON.stringify(cart));
  }, [cart]);

  const calculateItemPrice = (item: any, selectedOptions: Record<string, any>, quantity: number): number => {
    let basePrice = item.price;
    let optionsPrice = 0;

    Object.values(selectedOptions).forEach(optionSelections => {
      if (Array.isArray(optionSelections)) {
        // Multiple selection
        optionSelections.forEach(selection => {
          optionsPrice += selection.additional_price || 0;
        });
      } else if (optionSelections) {
        // Single selection
        optionsPrice += optionSelections.additional_price || 0;
      }
    });

    return (basePrice + optionsPrice) * quantity;
  };

  const addToCart = (item: any, selectedOptions: Record<string, any>, quantity: number = 1, specialInstructions?: string) => {
    const cartItem: CartItem = {
      id: `${item.item_id}_${Date.now()}_${Math.random()}`,
      item,
      selectedOptions,
      quantity,
      totalPrice: calculateItemPrice(item, selectedOptions, quantity),
      specialInstructions
    };
    
    setCart(prevCart => [...prevCart, cartItem]);
  };

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity === 0) {
      setCart(cart.filter(item => item.id !== itemId));
    } else {
      setCart(cart.map(item => 
        item.id === itemId 
          ? { 
              ...item, 
              quantity: newQuantity, 
              totalPrice: calculateItemPrice(item.item, item.selectedOptions, newQuantity)
            }
          : item
      ));
    }
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem('restaurant_cart');
  };

  const cartTotal = cart.reduce((total, item) => total + item.totalPrice, 0);
  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);

  return {
    cart,
    cartTotal,
    cartItemCount,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart
  };
}