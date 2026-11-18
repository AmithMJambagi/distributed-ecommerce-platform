import api from './client';

export const inventoryApi = {
  /**
   * Fetch inventory details for a single product via Gateway
   * @param {string} productId
   * @returns {Promise<{ availableStock: number, isInStock: boolean }>}
   */
  getStock: async (productId) => {
    if (!productId) {
      return { availableStock: 0, isInStock: false };
    }

    try {
      const res = await api.get(`/api/v1/inventory/${productId}`);
      if (res && res.data) {
        const rawStock = res.data.availableStock;
        const availableStock = rawStock !== null && rawStock !== undefined ? Math.max(0, Number(rawStock)) : null;
        return {
          availableStock,
          isInStock: Boolean(res.data.isInStock)
        };
      }
    } catch (err) {
      console.warn(`Could not fetch inventory for ${productId}:`, err?.message);
    }

    // Default to in stock if unavailable to avoid blocking UI on network glitches
    return { availableStock: null, isInStock: true };
  },

  /**
   * Fetch inventory in batch for product IDs via Gateway
   * @param {string[]} productIds
   * @returns {Promise<Record<string, { availableStock: number | null, isInStock: boolean }>>}
   */
  getBatchStock: async (productIds) => {
    if (!productIds || productIds.length === 0) {
      return {};
    }

    // Default every requested product to in stock initially
    const resultMap = {};
    productIds.forEach((id) => {
      resultMap[id] = { availableStock: null, isInStock: true };
    });

    try {
      const res = await api.post('/api/v1/inventory/batch', productIds);
      if (Array.isArray(res.data)) {
        res.data.forEach((item) => {
          const rawStock = item.availableStock;
          const availableStock = rawStock !== null && rawStock !== undefined ? Math.max(0, Number(rawStock)) : null;
          resultMap[item.productId] = {
            availableStock,
            isInStock: Boolean(item.isInStock)
          };
        });
        return resultMap;
      }
    } catch (err) {
      console.warn('Batch inventory fetch failed via gateway:', err?.message);
    }

    return resultMap;
  }
};
