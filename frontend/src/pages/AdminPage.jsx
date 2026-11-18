import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { productApi } from '../api/productApi';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Alert from '../components/common/Alert';
import { formatCurrency, PLACEHOLDER_IMAGE } from '../utils/formatters';
import { Edit2, Plus, Package, Shield, Search, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';

export default function AdminPage() {
  const { isAuthenticated, isAdmin, openAuthModal } = useAuth();

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Pagination & Filter state
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Tab: 'manage' | 'create' | 'inventory'
  const [activeTab, setActiveTab] = useState('manage');

  // Currently editing product (null when not editing)
  const [editingProduct, setEditingProduct] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editAlert, setEditAlert] = useState({ type: '', text: '' });

  // Create Product Form state
  const [productName, setProductName] = useState('');
  const [productSku, setProductSku] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productCategoryId, setProductCategoryId] = useState('');
  const [productImageUrl, setProductImageUrl] = useState('');
  const [galleryImagesText, setGalleryImagesText] = useState('');
  const [productLoading, setProductLoading] = useState(false);
  const [productAlert, setProductAlert] = useState({ type: '', text: '' });

  // Inventory Form state
  const [invProductId, setInvProductId] = useState('');
  const [invQuantity, setInvQuantity] = useState('');
  const [invLoading, setInvLoading] = useState(false);
  const [invAlert, setInvAlert] = useState({ type: '', text: '' });

  // Load categories initially
  useEffect(() => {
    async function loadCategories() {
      try {
        const cats = await productApi.getCategories();
        if (cats && Array.isArray(cats)) {
          setCategories(cats);
          if (cats.length > 0 && !productCategoryId) {
            setProductCategoryId(cats[0].id);
          }
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    }
    if (isAuthenticated && isAdmin) {
      loadCategories();
    }
  }, [isAuthenticated, isAdmin]);

  // Load paginated products
  const fetchProducts = async (page = currentPage, size = pageSize, cat = selectedCategory) => {
    try {
      setLoadingProducts(true);
      const res = await productApi.getProducts(cat === 'all' ? null : cat, page, size);

      setProducts(res.content || []);
      setTotalPages(res.totalPages || 1);
      setTotalElements(res.totalElements || 0);
      setCurrentPage(res.number || page);
    } catch (err) {
      console.error('Error fetching admin products:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && isAdmin && activeTab === 'manage') {
      fetchProducts(currentPage, pageSize, selectedCategory);
    }
  }, [isAuthenticated, isAdmin, activeTab, currentPage, pageSize, selectedCategory]);

  // 1. Handle Start Edit
  const handleStartEdit = (product) => {
    setEditingProduct({
      id: product.id,
      name: product.name || '',
      sku: product.sku || '',
      description: product.description || '',
      price: product.price || '',
      categoryId: product.categoryId || (categories[0]?.id || 1),
      status: product.status || 'ACTIVE',
      primaryImageUrl: product.primaryImageUrl || '',
      galleryImagesText: Array.isArray(product.galleryImages)
        ? product.galleryImages.join('\n')
        : ''
    });
    setEditAlert({ type: '', text: '' });
  };

  // 2. Handle Save Edit (Update Product)
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;

    setEditAlert({ type: '', text: '' });
    setEditLoading(true);

    try {
      const galleryList = editingProduct.galleryImagesText
        .split('\n')
        .map((url) => url.trim())
        .filter((url) => url.length > 0);

      const payload = {
        name: editingProduct.name.trim(),
        sku: editingProduct.sku.trim() || `SKU-${Date.now()}`,
        description: editingProduct.description.trim(),
        price: Math.round(Number(editingProduct.price)),
        categoryId: parseInt(editingProduct.categoryId, 10),
        status: editingProduct.status || 'ACTIVE',
        primaryImageUrl: editingProduct.primaryImageUrl.trim() || PLACEHOLDER_IMAGE,
        galleryImages: galleryList.length > 0 ? galleryList : [editingProduct.primaryImageUrl || PLACEHOLDER_IMAGE]
      };

      await productApi.updateProduct(editingProduct.id, payload);

      setEditAlert({
        type: 'success',
        text: `Product "${payload.name}" updated successfully.`
      });

      // Refresh product table on current page
      await fetchProducts(currentPage, pageSize, selectedCategory);

      // Close edit form after short delay
      setTimeout(() => {
        setEditingProduct(null);
      }, 1200);
    } catch (err) {
      console.error('Failed to update product:', err);
      setEditAlert({
        type: 'error',
        text: err.response?.data?.message || 'Failed to update product. Please check required fields.'
      });
    } finally {
      setEditLoading(false);
    }
  };

  // 3. Handle Create Product
  const handleCreateProduct = async (e) => {
    e.preventDefault();
    setProductAlert({ type: '', text: '' });
    setProductLoading(true);

    try {
      const galleryList = galleryImagesText
        .split('\n')
        .map((url) => url.trim())
        .filter((url) => url.length > 0);

      const computedSku = productSku.trim() || `SKU-${Date.now()}`;

      const payload = {
        name: productName.trim(),
        sku: computedSku,
        description: productDescription.trim(),
        price: Math.round(Number(productPrice)),
        categoryId: parseInt(productCategoryId, 10),
        status: 'ACTIVE',
        primaryImageUrl: productImageUrl.trim() || PLACEHOLDER_IMAGE,
        galleryImages: galleryList.length > 0 ? galleryList : [productImageUrl.trim() || PLACEHOLDER_IMAGE]
      };

      const res = await productApi.createProduct(payload);
      const newId = res.id || res.productId;
      setInvProductId(newId);

      setProductAlert({
        type: 'success',
        text: `Product published successfully with SKU: ${computedSku}. ID: ${newId}`
      });

      setProductName('');
      setProductSku('');
      setProductDescription('');
      setProductPrice('');
      setProductImageUrl('');
      setGalleryImagesText('');

      // Refresh product table
      setCurrentPage(0);
      await fetchProducts(0, pageSize, selectedCategory);
    } catch (err) {
      setProductAlert({
        type: 'error',
        text: err.response?.data?.message || 'Failed to create product. Check admin permissions.'
      });
    } finally {
      setProductLoading(false);
    }
  };

  // 4. Handle Initialize Inventory
  const handleInitInventory = async (e) => {
    e.preventDefault();
    setInvAlert({ type: '', text: '' });
    setInvLoading(true);

    try {
      const payload = {
        productId: invProductId.trim(),
        initialAvailableQuantity: parseInt(invQuantity, 10)
      };

      await productApi.initInventory(payload);
      setInvAlert({
        type: 'success',
        text: `Provisioned ${invQuantity} units in Inventory Service.`
      });
      setInvQuantity('');
    } catch (err) {
      setInvAlert({
        type: 'error',
        text: err.response?.data?.message || 'Failed to initialize inventory stock.'
      });
    } finally {
      setInvLoading(false);
    }
  };

  // Helper to get category name
  const getCategoryName = (catId) => {
    const found = categories.find((c) => String(c.id) === String(catId));
    return found ? found.name : `Category ${catId}`;
  };

  // Client-side quick filter for current page results by name or SKU
  const displayedProducts = products.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q) ||
      p.id?.toLowerCase().includes(q)
    );
  });

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-white border border-neutral-900 text-center">
        <div className="w-10 h-10 mx-auto mb-4 flex items-center justify-center bg-black text-white">
          <Shield className="w-5 h-5" />
        </div>
        <h2 className="text-base font-black uppercase tracking-wider text-black">Administrator Portal</h2>
        <p className="text-xs text-neutral-500 mt-2 mb-2">
          Sign in with your administrator credentials (email & password).
        </p>
        <p className="text-[11px] font-mono text-neutral-400 mb-6 uppercase tracking-wider">
          Public registration is strictly disabled for admin accounts.
        </p>
        <button
          onClick={() => openAuthModal('admin')}
          className="w-full py-3 bg-black hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider transition"
        >
          Admin Sign In
        </button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-white border border-red-500 text-center">
        <h2 className="text-base font-black uppercase tracking-wider text-red-600">Access Denied</h2>
        <p className="text-xs text-neutral-600 mt-2">
          Your account does not possess the <code>ROLE_ADMIN</code> privilege required for this console.
        </p>
      </div>
    );
  }

  const startRecord = totalElements === 0 ? 0 : currentPage * pageSize + 1;
  const endRecord = Math.min((currentPage + 1) * pageSize, totalElements);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 mb-8 pb-4 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black uppercase tracking-wider text-black">Admin Console</h1>
            <span className="px-2 py-0.5 text-[10px] font-mono bg-black text-white font-bold uppercase">
              SINGLE-ADMIN STORE MANAGER
            </span>
          </div>
          <p className="text-xs text-neutral-400 font-mono mt-1">
            CATALOG MANAGEMENT, EDITING & INVENTORY PROVISIONING
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex border border-neutral-300">
          <button
            type="button"
            onClick={() => {
              setActiveTab('manage');
              setEditingProduct(null);
            }}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
              activeTab === 'manage' ? 'bg-black text-white' : 'bg-white text-neutral-600 hover:text-black'
            }`}
          >
            All Products ({totalElements.toLocaleString()})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('create');
              setEditingProduct(null);
            }}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition border-l border-neutral-300 ${
              activeTab === 'create' ? 'bg-black text-white' : 'bg-white text-neutral-600 hover:text-black'
            }`}
          >
            + Create Product
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('inventory');
              setEditingProduct(null);
            }}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition border-l border-neutral-300 ${
              activeTab === 'inventory' ? 'bg-black text-white' : 'bg-white text-neutral-600 hover:text-black'
            }`}
          >
            Initialize Stock
          </button>
        </div>
      </div>

      {/* TAB 1: MANAGE / EDIT ALL PRODUCTS (WITH SERVER PAGINATION & SEARCH) */}
      {activeTab === 'manage' && (
        <div>
          {editingProduct ? (
            /* INLINE EDIT FORM */
            <div className="bg-white p-8 border border-neutral-900 mb-8">
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-neutral-200">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider text-black">
                    Edit Product: {editingProduct.name}
                  </h2>
                  <p className="text-xs text-neutral-400 font-mono mt-0.5">
                    ID: {editingProduct.id}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-neutral-300 hover:border-black text-xs font-bold uppercase tracking-wider text-neutral-700 hover:text-black transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Products
                </button>
              </div>

              {editAlert.text && (
                <Alert
                  type={editAlert.type}
                  message={editAlert.text}
                  className="mb-6"
                  onClose={() => setEditAlert({ type: '', text: '' })}
                />
              )}

              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                      Product Name
                    </label>
                    <input
                      type="text"
                      required
                      value={editingProduct.name}
                      onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs border border-neutral-300 focus:border-black focus:outline-none transition font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                      SKU Code
                    </label>
                    <input
                      type="text"
                      required
                      value={editingProduct.sku}
                      onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs font-mono border border-neutral-300 focus:border-black focus:outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={editingProduct.description}
                    onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-neutral-300 focus:border-black focus:outline-none transition font-sans"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                      Price (₹ INR)
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      required
                      value={editingProduct.price}
                      onChange={(e) => setEditingProduct({ ...editingProduct, price: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs border border-neutral-300 focus:border-black focus:outline-none transition font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                      Category
                    </label>
                    <select
                      required
                      value={editingProduct.categoryId}
                      onChange={(e) => setEditingProduct({ ...editingProduct, categoryId: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs border border-neutral-300 focus:border-black focus:outline-none transition font-sans bg-white uppercase font-bold"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                      Status
                    </label>
                    <select
                      value={editingProduct.status}
                      onChange={(e) => setEditingProduct({ ...editingProduct, status: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs border border-neutral-300 focus:border-black focus:outline-none transition font-sans bg-white uppercase font-bold"
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                      <option value="ARCHIVED">ARCHIVED</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                    Primary Image URL
                  </label>
                  <input
                    type="url"
                    value={editingProduct.primaryImageUrl}
                    onChange={(e) => setEditingProduct({ ...editingProduct, primaryImageUrl: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-neutral-300 focus:border-black focus:outline-none transition font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                    Gallery Images (One URL per line)
                  </label>
                  <textarea
                    rows={3}
                    value={editingProduct.galleryImagesText}
                    onChange={(e) => setEditingProduct({ ...editingProduct, galleryImagesText: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-neutral-300 focus:border-black focus:outline-none transition font-sans font-mono"
                  />
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    className="py-2.5 px-5 border border-neutral-300 hover:border-black text-xs font-bold uppercase tracking-wider transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editLoading}
                    className="py-2.5 px-6 bg-black hover:bg-neutral-800 disabled:bg-neutral-300 text-white font-bold text-xs uppercase tracking-wider transition flex items-center gap-2"
                  >
                    {editLoading ? <LoadingSpinner size="sm" color="white" /> : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* ALL PRODUCTS TABLE WITH SERVER-SIDE PAGINATION & SEARCH */
            <div className="bg-white border border-neutral-200">
              {/* Table Controls Header */}
              <div className="p-4 sm:p-6 border-b border-neutral-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider text-black">
                    Product Catalog
                  </h2>
                  <p className="text-xs text-neutral-400 font-mono mt-0.5">
                    Showing {startRecord}-{endRecord} of {totalElements.toLocaleString()} Total Products
                  </p>
                </div>

                {/* Filters & Actions */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Filter page by name or SKU..."
                      className="pl-8 pr-3 py-1.5 text-xs border border-neutral-300 focus:border-black focus:outline-none transition w-48 sm:w-60 font-sans"
                    />
                  </div>

                  {/* Category Filter */}
                  <select
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      setCurrentPage(0);
                    }}
                    className="px-3 py-1.5 text-xs border border-neutral-300 focus:border-black focus:outline-none transition bg-white uppercase font-bold"
                  >
                    <option value="all">All Categories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  {/* Page Size Selector */}
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(0);
                    }}
                    className="px-3 py-1.5 text-xs border border-neutral-300 focus:border-black focus:outline-none transition bg-white uppercase font-bold"
                  >
                    <option value={20}>20 / Page</option>
                    <option value={50}>50 / Page</option>
                    <option value={100}>100 / Page</option>
                  </select>

                  {/* Create New Button */}
                  <button
                    type="button"
                    onClick={() => setActiveTab('create')}
                    className="flex items-center gap-2 py-1.5 px-3 bg-black hover:bg-neutral-800 text-white text-xs font-bold uppercase tracking-wider transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> New Product
                  </button>
                </div>
              </div>

              {loadingProducts ? (
                <div className="p-12 text-center">
                  <LoadingSpinner size="lg" />
                  <p className="text-xs text-neutral-400 font-mono mt-4">Loading catalog...</p>
                </div>
              ) : displayedProducts.length === 0 ? (
                <div className="p-12 text-center">
                  <Package className="w-8 h-8 mx-auto text-neutral-300 mb-2" />
                  <p className="text-xs font-bold uppercase text-neutral-600">No products found</p>
                  <p className="text-[11px] text-neutral-400 font-mono mt-1">
                    Try adjusting your search query or category filter.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-200 bg-neutral-50 text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                        <th className="py-3 px-4">Item</th>
                        <th className="py-3 px-4">SKU</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Price</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 text-xs">
                      {displayedProducts.map((p) => (
                        <tr key={p.id} className="hover:bg-neutral-50/50 transition">
                          {/* Item Thumbnail & Name */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={p.primaryImageUrl || PLACEHOLDER_IMAGE}
                                alt={p.name}
                                className="w-10 h-10 object-cover border border-neutral-200 bg-neutral-100 flex-shrink-0"
                                onError={(e) => {
                                  e.target.src = PLACEHOLDER_IMAGE;
                                }}
                              />
                              <div>
                                <p className="font-bold text-black line-clamp-1">{p.name}</p>
                                <p className="text-[10px] text-neutral-400 font-mono line-clamp-1">
                                  ID: {p.id}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* SKU */}
                          <td className="py-3 px-4 font-mono text-[11px] text-neutral-600">
                            {p.sku || 'N/A'}
                          </td>

                          {/* Category */}
                          <td className="py-3 px-4">
                            <span className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-neutral-100 text-neutral-700 border border-neutral-200">
                              {getCategoryName(p.categoryId)}
                            </span>
                          </td>

                          {/* Price */}
                          <td className="py-3 px-4 font-mono font-bold text-black">
                            {formatCurrency(p.price)}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4">
                            <span
                              className={`inline-block px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                                p.status === 'ACTIVE'
                                  ? 'bg-neutral-900 text-white'
                                  : 'bg-neutral-200 text-neutral-600'
                              }`}
                            >
                              {p.status || 'ACTIVE'}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(p)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 border border-black hover:bg-black text-black hover:text-white font-bold text-[10px] uppercase tracking-wider transition"
                            >
                              <Edit2 className="w-3 h-3" /> Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Server-Side Pagination Bar */}
              <div className="p-4 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-neutral-50/50">
                <p className="text-xs text-neutral-500 font-mono">
                  Page <span className="font-bold text-black">{currentPage + 1}</span> of{' '}
                  <span className="font-bold text-black">{totalPages}</span> ({totalElements.toLocaleString()} products)
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage === 0 || loadingProducts}
                    onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
                    className="flex items-center gap-1 px-3 py-1.5 border border-neutral-300 hover:border-black disabled:border-neutral-200 disabled:text-neutral-300 text-xs font-bold uppercase tracking-wider bg-white transition"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Previous
                  </button>

                  {/* Direct Jump or Page Indicators */}
                  <div className="hidden sm:flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      // Window around current page
                      let pageNum = currentPage;
                      if (currentPage < 3) {
                        pageNum = i;
                      } else if (currentPage > totalPages - 3) {
                        pageNum = totalPages - 5 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      if (pageNum < 0 || pageNum >= totalPages) return null;

                      return (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-7 h-7 text-xs font-mono font-bold border transition ${
                            currentPage === pageNum
                              ? 'bg-black text-white border-black'
                              : 'bg-white text-neutral-700 border-neutral-300 hover:border-black'
                          }`}
                        >
                          {pageNum + 1}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    disabled={currentPage >= totalPages - 1 || loadingProducts}
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))}
                    className="flex items-center gap-1 px-3 py-1.5 border border-neutral-300 hover:border-black disabled:border-neutral-200 disabled:text-neutral-300 text-xs font-bold uppercase tracking-wider bg-white transition"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CREATE PRODUCT */}
      {activeTab === 'create' && (
        <div className="bg-white p-8 border border-neutral-200">
          <h2 className="text-xs font-black uppercase tracking-wider text-black mb-1">
            Publish New Catalog Product
          </h2>
          <p className="text-xs text-neutral-400 mb-6 font-mono">
            Create and publish a new item to the active product catalog.
          </p>

          {productAlert.text && (
            <Alert
              type={productAlert.type}
              message={productAlert.text}
              className="mb-6"
              onClose={() => setProductAlert({ type: '', text: '' })}
            />
          )}

          <form onSubmit={handleCreateProduct} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                  Product Name
                </label>
                <input
                  type="text"
                  required
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="Classic Cotton T-Shirt"
                  className="w-full px-3.5 py-2 text-xs border border-neutral-300 focus:border-black focus:outline-none transition font-sans"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                  SKU Code (Unique ID)
                </label>
                <input
                  type="text"
                  value={productSku}
                  onChange={(e) => setProductSku(e.target.value)}
                  placeholder="SKU-TSHIRT-001 (or leave blank to auto-generate)"
                  className="w-full px-3.5 py-2 text-xs font-mono border border-neutral-300 focus:border-black focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                Description
              </label>
              <textarea
                rows={3}
                required
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                placeholder="Product description and specifications..."
                className="w-full px-3.5 py-2 text-xs border border-neutral-300 focus:border-black focus:outline-none transition font-sans"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                  Price (₹ INR)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  required
                  value={productPrice}
                  onChange={(e) => setProductPrice(e.target.value)}
                  placeholder="1499"
                  className="w-full px-3.5 py-2 text-xs border border-neutral-300 focus:border-black focus:outline-none transition font-sans"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                  Category
                </label>
                <select
                  required
                  value={productCategoryId}
                  onChange={(e) => setProductCategoryId(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-neutral-300 focus:border-black focus:outline-none transition font-sans bg-white uppercase font-bold"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                Primary Image URL
              </label>
              <input
                type="url"
                value={productImageUrl}
                onChange={(e) => setProductImageUrl(e.target.value)}
                placeholder="https://images.example.com/item.jpg"
                className="w-full px-3.5 py-2 text-xs border border-neutral-300 focus:border-black focus:outline-none transition font-sans"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                Gallery Image URLs (One URL per line)
              </label>
              <textarea
                rows={3}
                value={galleryImagesText}
                onChange={(e) => setGalleryImagesText(e.target.value)}
                placeholder="https://images.example.com/angle1.jpg&#10;https://images.example.com/angle2.jpg"
                className="w-full px-3.5 py-2 text-xs border border-neutral-300 focus:border-black focus:outline-none transition font-sans font-mono"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={productLoading}
                className="py-3 px-6 bg-black hover:bg-neutral-800 disabled:bg-neutral-300 text-white font-bold text-xs uppercase tracking-wider transition"
              >
                {productLoading ? <LoadingSpinner size="sm" color="white" /> : 'Publish Product'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: INITIALIZE STOCK */}
      {activeTab === 'inventory' && (
        <div className="bg-white p-8 border border-neutral-200">
          <h2 className="text-xs font-black uppercase tracking-wider text-black mb-1">
            Provision Inventory Units
          </h2>
          <p className="text-xs text-neutral-400 mb-6 font-mono">
            Initializes stock levels in PostgreSQL ledger and Redis hold tokens (Port 8081).
          </p>

          {invAlert.text && (
            <Alert
              type={invAlert.type}
              message={invAlert.text}
              className="mb-6"
              onClose={() => setInvAlert({ type: '', text: '' })}
            />
          )}

          <form onSubmit={handleInitInventory} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                Product ID (UUID)
              </label>
              <input
                type="text"
                required
                value={invProductId}
                onChange={(e) => setInvProductId(e.target.value)}
                placeholder="UUID identifier"
                className="w-full px-3.5 py-2 text-xs font-mono border border-neutral-300 focus:border-black focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                Initial Stock Quantity
              </label>
              <input
                type="number"
                min="1"
                required
                value={invQuantity}
                onChange={(e) => setInvQuantity(e.target.value)}
                placeholder="50"
                className="w-full px-3.5 py-2 text-xs border border-neutral-300 focus:border-black focus:outline-none transition font-sans"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={invLoading}
                className="py-3 px-6 bg-black hover:bg-neutral-800 disabled:bg-neutral-300 text-white font-bold text-xs uppercase tracking-wider transition"
              >
                {invLoading ? <LoadingSpinner size="sm" color="white" /> : 'Provision Stock'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
