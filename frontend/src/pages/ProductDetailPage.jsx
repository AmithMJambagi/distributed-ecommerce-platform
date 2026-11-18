import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, ShieldCheck, Truck, RotateCcw, Package, Clock, Shield } from 'lucide-react';
import { productApi } from '../api/productApi';
import { inventoryApi } from '../api/inventoryApi';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, PLACEHOLDER_IMAGE } from '../utils/formatters';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Alert from '../components/common/Alert';
import BuyNowModal from '../components/checkout/BuyNowModal';
import ProductCard from '../components/product/ProductCard';

export default function ProductDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isAuthenticated, openAuthModal } = useAuth();

  // Instant render using passed state from catalog card (zero flicker transition)
  const passedProduct = location.state?.product?.id === id ? location.state.product : null;
  const passedStock = location.state?.product?.id === id ? location.state.stockInfo : null;

  const [product, setProduct] = useState(passedProduct);
  const [stockInfo, setStockInfo] = useState(passedStock || { availableStock: null, isInStock: true });
  const [loading, setLoading] = useState(!passedProduct);
  const [error, setError] = useState('');

  // Gallery state - use galleryImages if provided, otherwise fallback to primaryImageUrl.
  // In DummyJSON, `thumbnail.webp` is just a low-res thumbnail crop of `1.webp`.
  // Including both makes the exact same image appear twice in the thumbnail gallery.
  const getDeduplicatedImages = (prod) => {
    if (!prod) return [];
    
    const gallery = Array.isArray(prod.galleryImages) ? prod.galleryImages.filter(Boolean) : [];
    if (gallery.length > 0) {
      // If full-size gallery photos exist, use them directly as the gallery
      return [...new Set(gallery.map((u) => u.trim()))];
    }

    // If no gallery images exist, fallback to the single primary image
    return prod.primaryImageUrl ? [prod.primaryImageUrl.trim()] : [];
  };

  const initialImages = getDeduplicatedImages(passedProduct);
  const [allImages, setAllImages] = useState(initialImages);
  const [activeImage, setActiveImage] = useState(
    initialImages[0] || passedProduct?.primaryImageUrl || ''
  );

  // Purchase state
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);
  const [isBuyNowOpen, setIsBuyNowOpen] = useState(false);

  // Related products
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [relatedStockMap, setRelatedStockMap] = useState({});

  useEffect(() => {
    let active = true;

    async function loadProductAndStock() {
      // If we don't already have product in state, show loader
      if (!product || product.id !== id) {
        setLoading(true);
      }
      setError('');

      try {
        const data = await productApi.getProductById(id);
        if (active && data) {
          setProduct(data);

          // Assemble gallery images with strict deduplication
          const imageList = getDeduplicatedImages(data);
          if (imageList.length === 0) {
            imageList.push(PLACEHOLDER_IMAGE);
          }

          setAllImages(imageList);
          if (!activeImage || !imageList.includes(activeImage)) {
            setActiveImage(imageList[0]);
          }

          // Fetch real inventory stock
          const stock = await inventoryApi.getStock(id);
          if (active && stock) {
            setStockInfo(stock);
            if (stock.isInStock === false) {
              setQuantity(0);
            } else {
              setQuantity(1);
            }
          }

          // Fetch related products for bottom scrolling section
          try {
            const relData = await productApi.getProducts(data.categoryId || 'all', 0, 8);
            const items = relData?.content || (Array.isArray(relData) ? relData : []);
            const filtered = items.filter((p) => p.id !== id).slice(0, 4);
            if (active && filtered.length > 0) {
              setRelatedProducts(filtered);
              const relIds = filtered.map((p) => p.id);
              inventoryApi.getBatchStock(relIds).then((batchStock) => {
                if (active && batchStock) {
                  setRelatedStockMap(batchStock);
                }
              });
            }
          } catch (relErr) {
            console.warn('Could not load related products:', relErr);
          }
        }
      } catch (err) {
        if (active) {
          console.error('Failed to load product details:', err);
          const rawMsg = err.response?.data?.message || '';
          const status = err.response?.status;

          if (status === 404) {
            setError('The requested product does not exist in the catalog or has been moved.');
          } else if (rawMsg.includes('@class') || rawMsg.includes('Could not read JSON') || status >= 500) {
            setError('Product catalog is currently synchronizing. Please refresh or check back shortly.');
          } else {
            setError(rawMsg || 'Product details are currently unavailable.');
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    if (id) {
      loadProductAndStock();
    }

    return () => {
      active = false;
    };
  }, [id]);

  // Stock status determination:
  // Strictly rely on isInStock boolean as the source of truth for availability.
  const isOutOfStock =
    stockInfo !== undefined && stockInfo !== null
      ? stockInfo.isInStock === false
      : false;

  // Only display exact stock count if it is strictly < 5 (low stock urgency)
  const rawAvailable = stockInfo?.availableStock;
  const isLowStock =
    !isOutOfStock &&
    rawAvailable !== null &&
    rawAvailable !== undefined &&
    Number(rawAvailable) > 0 &&
    Number(rawAvailable) < 5;
  const availableStock = isLowStock ? Number(rawAvailable) : null;

  const handleAddToCart = async () => {
    if (isOutOfStock) return;

    if (!isAuthenticated) {
      openAuthModal('email');
      return;
    }

    setAddingToCart(true);
    try {
      const ok = await addToCart(product.id, quantity);
      if (ok) {
        setAddedSuccess(true);
        setTimeout(() => setAddedSuccess(false), 2000);
      }
    } catch (err) {
      console.error('Error adding to cart:', err);
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = () => {
    if (isOutOfStock) return;

    if (!isAuthenticated) {
      openAuthModal('email');
      return;
    }
    setIsBuyNowOpen(true);
  };

  if (loading && !product) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center bg-white">
        <LoadingSpinner size="lg" color="black" />
        <p className="text-xs font-mono text-neutral-400 uppercase tracking-widest mt-4">
          Loading Product Details...
        </p>
      </div>
    );
  }

  if (error && !product) {
    const isNotFound = error.includes('does not exist');
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="border border-neutral-900 p-10 bg-white">
          <h2 className="text-base font-black uppercase tracking-wider text-black">
            {isNotFound ? 'Product Not Found' : 'Catalog Notice'}
          </h2>
          <p className="text-xs text-neutral-500 mt-2 mb-6">
            {error}
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-black hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Catalog</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Breadcrumb Navigation */}
      <div className="border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-neutral-400">
          <Link to="/" className="hover:text-black transition">
            Catalog
          </Link>
          <span>/</span>
          <span className="text-neutral-900 font-bold truncate max-w-xs">{product.name}</span>
        </div>
      </div>

      {/* Main Content Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 pb-16 border-b border-neutral-200">
          {/* Left Column: Gallery Showcase (7 cols) */}
          <div className="lg:col-span-7 flex flex-col-reverse sm:flex-row gap-4">
            {/* Gallery Thumbnails Column (if more than 1 image) */}
            {allImages.length > 1 && (
              <div className="flex sm:flex-col gap-3 overflow-x-auto sm:overflow-y-auto max-h-[580px] no-scrollbar shrink-0">
                {allImages.map((imgUrl, index) => {
                  const isActive = activeImage === imgUrl;
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setActiveImage(imgUrl)}
                      className={`relative w-16 h-16 sm:w-20 sm:h-20 border bg-neutral-50 p-1.5 transition shrink-0 ${
                        isActive
                          ? 'border-black ring-1 ring-black'
                          : 'border-neutral-200 hover:border-neutral-400 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={imgUrl}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.currentTarget.src = PLACEHOLDER_IMAGE;
                        }}
                      />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Main Primary Image Viewer */}
            <div className="flex-1 border border-neutral-200 bg-neutral-50/50 aspect-square max-h-[580px] flex items-center justify-center p-8 relative overflow-hidden group">
              <img
                src={activeImage}
                alt={product.name}
                className={`w-full h-full object-contain transition-transform duration-300 ${
                  isOutOfStock ? 'opacity-50 grayscale' : 'group-hover:scale-105'
                }`}
                onError={(e) => {
                  e.currentTarget.src = PLACEHOLDER_IMAGE;
                }}
              />

              {/* Stock Status Tag */}
              {isOutOfStock ? (
                <span className="absolute top-4 left-4 bg-neutral-900 text-white border border-neutral-900 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider font-bold">
                  Out of Stock
                </span>
              ) : isLowStock ? (
                <span className="absolute top-4 left-4 bg-white text-neutral-900 border border-neutral-900 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider font-bold">
                  Only {availableStock} Left
                </span>
              ) : (
                <span className="absolute top-4 left-4 bg-white text-neutral-900 border border-neutral-200 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider">
                  In Stock
                </span>
              )}
            </div>
          </div>

          {/* Right Column: Product Information & Purchase CTAs (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-8">
            <div className="space-y-6">
              {/* Product Header */}
              <div className="border-b border-neutral-200 pb-6">
                {product.sku && (
                  <p className="text-[11px] font-mono text-neutral-400 uppercase tracking-widest mb-1.5">
                    SKU: {product.sku}
                  </p>
                )}
                <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight uppercase">
                  {product.name}
                </h1>
                <div className="mt-4 flex items-baseline gap-4">
                  <span className="text-2xl sm:text-3xl font-black text-neutral-900">
                    {formatCurrency(product.price)}
                  </span>
                  <span className="text-xs text-neutral-400 font-mono uppercase tracking-wider">
                    {isOutOfStock ? 'Currently Unavailable' : 'Tax Included'}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-black mb-2">
                  Overview
                </h3>
                <p className="text-xs text-neutral-600 leading-relaxed whitespace-pre-line">
                  {product.description || 'Curated minimalist piece from verified inventory catalog.'}
                </p>
              </div>

              {/* Quantity Selector: strictly constrained by inventory */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-black">
                    Quantity
                  </label>
                  {isOutOfStock ? (
                    <span className="text-[11px] font-mono text-red-600 uppercase font-bold">
                      Out of stock in warehouse
                    </span>
                  ) : availableStock > 0 ? (
                    <span className="text-[11px] font-mono text-neutral-500 uppercase">
                      STOCK: {availableStock} UNITS
                    </span>
                  ) : null}
                </div>

                <div className="inline-flex items-center border border-black bg-white">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={isOutOfStock || quantity <= 1}
                    className="px-3.5 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    -
                  </button>
                  <span className="px-5 py-2 text-xs font-mono font-bold text-black border-x border-black min-w-[50px] text-center">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const maxLimit = Math.min(10, Math.max(0, availableStock));
                      setQuantity((q) => Math.min(maxLimit, q + 1));
                    }}
                    disabled={isOutOfStock || quantity >= Math.min(10, Math.max(0, availableStock))}
                    className="px-3.5 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    +
                  </button>
                </div>

                {!isOutOfStock && quantity >= Math.min(10, Math.max(0, availableStock)) && (
                  <p className="text-[11px] font-mono text-neutral-500 mt-1.5">
                    {availableStock < 10
                      ? `Reached maximum available inventory (${availableStock} units) for this item.`
                      : 'Reached maximum limit of 10 units per order.'}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={isOutOfStock || addingToCart}
                  className={`w-full py-4 border text-xs font-bold uppercase tracking-widest transition flex items-center justify-center gap-2 ${
                    isOutOfStock
                      ? 'border-neutral-200 bg-neutral-100 text-neutral-400 cursor-not-allowed'
                      : 'border-black bg-white hover:bg-neutral-100 text-black'
                  }`}
                >
                  {addingToCart ? (
                    <LoadingSpinner size="sm" color="black" />
                  ) : addedSuccess ? (
                    <>
                      <Check className="w-4 h-4 text-black" />
                      <span>Added to Shopping Cart</span>
                    </>
                  ) : isOutOfStock ? (
                    <span>Out of Stock</span>
                  ) : (
                    <span>Add to Cart</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleBuyNow}
                  disabled={isOutOfStock}
                  className={`w-full py-4 text-xs font-bold uppercase tracking-widest transition ${
                    isOutOfStock
                      ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                      : 'bg-black hover:bg-neutral-800 text-white'
                  }`}
                >
                  {isOutOfStock ? 'Item Out of Stock' : 'Buy Now'}
                </button>
              </div>

              {/* Direct Application Details */}
              <div className="border-t border-neutral-200 pt-6 space-y-3 text-xs text-neutral-600 font-sans">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-4 h-4 text-black shrink-0" />
                  <span>Razorpay payment gateway integration</span>
                </div>
                <div className="flex items-center gap-3">
                  <Package className="w-4 h-4 text-black shrink-0" />
                  <span>Real-time stock reservation upon checkout</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Product Information Section */}
        {product.description && (
          <div className="py-12 border-b border-neutral-200">
            <h2 className="text-xs font-black uppercase tracking-widest text-black mb-4">
              Description
            </h2>
            <p className="text-sm text-neutral-700 leading-relaxed max-w-3xl">
              {product.description}
            </p>
          </div>
        )}

        {/* More Curated Products / Related Items Section */}
        {relatedProducts.length > 0 && (
          <div className="py-16">
            <div className="flex items-baseline justify-between mb-8 pb-4 border-b border-neutral-200">
              <div>
                <h2 className="text-lg font-black uppercase tracking-wider text-black">
                  More Curated Pieces
                </h2>
                <p className="text-xs text-neutral-400 font-mono mt-1">
                  ITEMS COMPLEMENTING YOUR SELECTION
                </p>
              </div>
              <Link
                to="/"
                className="text-xs font-bold uppercase tracking-wider text-neutral-600 hover:text-black flex items-center gap-1 transition"
              >
                <span>View Full Catalog</span>
                <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {relatedProducts.map((relProduct) => (
                <ProductCard
                  key={relProduct.id}
                  product={relProduct}
                  stockInfo={relatedStockMap[relProduct.id]}
                  onBuyNow={(prod) => setIsBuyNowOpen(true)}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Buy Now Modal */}
      {isBuyNowOpen && (
        <BuyNowModal
          product={{ ...product, price: product.price, availableStock }}
          isOpen={isBuyNowOpen}
          onClose={() => setIsBuyNowOpen(false)}
        />
      )}
    </div>
  );
}
