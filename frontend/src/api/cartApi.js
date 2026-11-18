import api from './client';

export const cartApi = {
  /**
   * Fetch the current user's cart
   */
  getCart: async () => {
    const response = await api.get('/api/v1/cart');
    return response.data;
  },

  /**
   * Add an item to the user's cart
   * @param {string} productId
   * @param {number} quantity
   */
  addToCart: async (productId, quantity = 1) => {
    const response = await api.post('/api/v1/cart/items', { productId, quantity });
    return response.data;
  },

  /**
   * Update the quantity of an item in the cart
   * @param {string} productId
   * @param {number} quantity
   */
  updateCartItem: async (productId, quantity) => {
    const response = await api.put('/api/v1/cart/items', { productId, quantity });
    return response.data;
  },

  /**
   * Remove an item from the cart
   * @param {string} productId
   */
  removeCartItem: async (productId) => {
    const response = await api.delete(`/api/v1/cart/items/${productId}`);
    return response.data;
  }
};
