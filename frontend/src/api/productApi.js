import api from './client';

export const productApi = {
  /**
   * Fetch paginated products optionally filtered by categoryId
   * Normalizes Spring PageImpl whether nested in .page or flat at root
   * @param {number|string|null} categoryId
   * @param {number} page
   * @param {number} size
   */
  getProducts: async (categoryId = null, page = 0, size = 12) => {
    const params = { page, size };
    if (categoryId && categoryId !== 'all') {
      params.categoryId = categoryId;
    }
    const response = await api.get('/api/v1/products', { params });
    const data = response.data;
    const content = data?.content || (Array.isArray(data) ? data : []);
    const totalPages = data?.page?.totalPages ?? data?.totalPages ?? 1;
    const totalElements = data?.page?.totalElements ?? data?.totalElements ?? content.length;
    const number = data?.page?.number ?? data?.number ?? page;

    return {
      content,
      totalPages,
      totalElements,
      number
    };
  },

  /**
   * Fetch all products without pagination limit
   */
  getAllProducts: async () => {
    try {
      const response = await api.get('/api/v1/products/all');
      return response.data;
    } catch (err) {
      const response = await api.get('/api/v1/products', { params: { size: 2000 } });
      return response.data?.content || response.data || [];
    }
  },

  /**
   * Fetch all product categories
   */
  getCategories: async () => {
    const response = await api.get('/api/v1/products/categories');
    return response.data;
  },

  /**
   * Fetch a single product by ID
   * @param {string} id
   */
  getProductById: async (id) => {
    const response = await api.get(`/api/v1/products/${id}`);
    return response.data;
  },

  /**
   * Admin: Create a new product in the catalog
   * @param {Object} data { name, description, sku, price, categoryId, status, primaryImageUrl, galleryImages }
   */
  createProduct: async (data) => {
    const response = await api.post('/api/v1/products', data);
    return response.data;
  },

  /**
   * Admin: Update an existing product in the catalog
   * @param {string} id
   * @param {Object} data { name, description, sku, price, categoryId, status, primaryImageUrl, galleryImages }
   */
  updateProduct: async (id, data) => {
    const response = await api.put(`/api/v1/products/${id}`, data);
    return response.data;
  },

  /**
   * Admin: Initialize stock for a product in inventory service
   * @param {Object} data { productId, initialAvailableQuantity }
   */
  initInventory: async (data) => {
    const response = await api.post('/api/v1/inventory/init', data);
    return response.data;
  }
};
