import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { cartApi } from '../api/cartApi';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { isAuthenticated, openAuthModal } = useAuth();
  const [items, setItems] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Calculate total item count
  const totalCount = items.reduce((sum, item) => sum + (item.quantity || 0), 0);

  // Fetch cart from backend
  const fetchCart = useCallback(async () => {
    if (!isAuthenticated) {
      setItems([]);
      setTotalAmount(0);
      return;
    }
    try {
      setLoading(true);
      const data = await cartApi.getCart();
      if (data && data.items) {
        setItems(data.items);
        setTotalAmount(data.totalAmount || 0);
      } else {
        setItems([]);
        setTotalAmount(0);
      }
    } catch (err) {
      console.error('Failed to fetch cart:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Synchronize cart whenever auth state changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchCart();
    } else {
      setItems([]);
      setTotalAmount(0);
    }
  }, [isAuthenticated, fetchCart]);

  // Add item to cart
  const addToCart = async (productId, quantity = 1) => {
    if (!isAuthenticated) {
      openAuthModal('login');
      return false;
    }
    try {
      setLoading(true);
      await cartApi.addToCart(productId, quantity);
      await fetchCart();
      setIsDrawerOpen(true);
      return true;
    } catch (err) {
      console.error('Error adding to cart:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update item quantity
  const updateQuantity = async (productId, newQuantity) => {
    if (!isAuthenticated) return;
    if (newQuantity <= 0) {
      return removeItem(productId);
    }
    try {
      setLoading(true);
      await cartApi.updateCartItem(productId, newQuantity);
      await fetchCart();
    } catch (err) {
      console.error('Error updating quantity:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Remove item
  const removeItem = async (productId) => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      await cartApi.removeCartItem(productId);
      await fetchCart();
    } catch (err) {
      console.error('Error removing item:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const clearCart = () => {
    setItems([]);
    setTotalAmount(0);
  };

  const openDrawer = () => setIsDrawerOpen(true);
  const closeDrawer = () => setIsDrawerOpen(false);
  const toggleDrawer = () => setIsDrawerOpen((prev) => !prev);

  return (
    <CartContext.Provider
      value={{
        items,
        totalAmount,
        totalCount,
        isDrawerOpen,
        loading,
        fetchCart,
        addToCart,
        updateQuantity,
        removeItem,
        clearCart,
        openDrawer,
        closeDrawer,
        toggleDrawer
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
