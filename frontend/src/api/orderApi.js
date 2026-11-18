import api from './client';
import { generateUUID } from '../utils/formatters';

export const orderApi = {
  /**
   * Checkout entire cart
   * @param {string} shippingAddress
   * @param {string} idempotencyKey
   */
  checkoutCart: async (shippingAddress, idempotencyKey = null) => {
    const key = idempotencyKey || generateUUID();
    const response = await api.post(
      '/api/v1/orders',
      { shippingAddress },
      {
        headers: {
          'Idempotency-Key': key
        }
      }
    );
    return response.data;
  },

  /**
   * Instant single item purchase ("Buy Now")
   * @param {string} productId
   * @param {number} quantity
   * @param {string} shippingAddress
   * @param {string} idempotencyKey
   */
  buyNow: async (productId, quantity, shippingAddress, idempotencyKey = null) => {
    const key = idempotencyKey || generateUUID();
    const response = await api.post(
      '/api/v1/orders/buy-now',
      { productId, quantity, shippingAddress },
      {
        headers: {
          'Idempotency-Key': key
        }
      }
    );
    return response.data;
  },

  /**
   * Fetch all past orders for the authenticated customer
   */
  getMyOrders: async () => {
    const response = await api.get('/api/v1/orders');
    return response.data;
  }
};
