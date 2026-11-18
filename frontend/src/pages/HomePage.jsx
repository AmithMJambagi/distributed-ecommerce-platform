import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import CategoryPills from '../components/product/CategoryPills';
import ProductCard from '../components/product/ProductCard';
import BuyNowModal from '../components/checkout/BuyNowModal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Alert from '../components/common/Alert';
import { productApi } from '../api/productApi';
import { inventoryApi } from '../api/inventoryApi';

const PAGE_SIZE = 12;

export default function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategory = searchParams.get('category') || 'all';

  const handleSelectCategory = (catId) => {
    if (!catId || catId === 'all') {
      setSearchParams({}, { replace: false });
    } else {
      setSearchParams({ category: String(catId) }, { replace: false });
    }
  };

  const [products, setProducts] = useState([]);
  const [stockMap, setStockMap] = useState({});
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  // Buy Now modal state
  const [buyNowProduct, setBuyNowProduct] = useState(null);

  // Synchronous refs to prevent race conditions during rapid scrolling
  const sentinelRef = useRef(null);
  const pageRef = useRef(0);
  const totalPagesRef = useRef(1);
  const isFetchingRef = useRef(false);

  // 1. Initial Load whenever category changes
  useEffect(() => {
    let active = true;

    async function loadInitial() {
      setLoading(true);
      setError('');
      setPage(0);
      pageRef.current = 0;
      isFetchingRef.current = true;

      try {
        const data = await productApi.getProducts(selectedCategory, 0, PAGE_SIZE);
        if (active) {
          const list = data?.content || [];
          setProducts(list);
          const totalP = data?.totalPages || 1;
          const totalE = data?.totalElements || list.length;
          setTotalPages(totalP);
          setTotalElements(totalE);
          totalPagesRef.current = totalP;

          // Fetch stock via Gateway ONLY for the first 12 items
          if (list.length > 0) {
            const ids = list.map((p) => p.id);
            inventoryApi.getBatchStock(ids).then((res) => {
              if (active && res) {
                setStockMap(res);
              }
            });
          }
        }
      } catch (err) {
        if (active) {
          console.error('Failed to load products:', err);
          setError('Could not load products. Please check if gateway_service is running on port 8000.');
        }
      } finally {
        if (active) {
          setLoading(false);
          isFetchingRef.current = false;
        }
      }
    }

    loadInitial();
    return () => {
      active = false;
      isFetchingRef.current = false;
    };
  }, [selectedCategory]);

  // 2. Load More function triggered when scrolled near bottom
  const loadMoreProducts = useCallback(async () => {
    if (isFetchingRef.current) return;
    if (pageRef.current >= totalPagesRef.current - 1) return;

    isFetchingRef.current = true;
    setLoadingMore(true);

    const nextPage = pageRef.current + 1;

    try {
      const data = await productApi.getProducts(selectedCategory, nextPage, PAGE_SIZE);
      const newItems = data?.content || [];

      if (newItems.length > 0) {
        setProducts((prev) => [...prev, ...newItems]);
        setPage(nextPage);
        pageRef.current = nextPage;

        // Fetch stock via Gateway ONLY for the newly scrolled-in 12 items
        const newIds = newItems.map((p) => p.id);
        inventoryApi.getBatchStock(newIds).then((res) => {
          if (res) {
            setStockMap((prev) => ({ ...prev, ...res }));
          }
        });
      }
    } catch (err) {
      console.error('Failed to load more products on scroll:', err);
    } finally {
      isFetchingRef.current = false;
      setLoadingMore(false);
    }
  }, [selectedCategory]);

  // 3. Dual Scroll triggers: IntersectionObserver on sentinel + Window scroll listener fallback
  useEffect(() => {
    const handleScroll = () => {
      if (isFetchingRef.current) return;
      if (pageRef.current >= totalPagesRef.current - 1) return;

      const scrollHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const clientHeight = window.innerHeight;

      if (scrollTop + clientHeight >= scrollHeight - 350) {
        loadMoreProducts();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    let observer = null;
    const sentinel = sentinelRef.current;
    if (sentinel) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            loadMoreProducts();
          }
        },
        { rootMargin: '300px', threshold: 0.1 }
      );
      observer.observe(sentinel);
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (observer && sentinel) {
        observer.unobserve(sentinel);
      }
    };
  }, [loadMoreProducts, loading, products.length]);

  const onCategoryClick = (catId) => {
    handleSelectCategory(catId);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const hasMore = page < totalPages - 1 || products.length < totalElements;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Category Navigation Bar */}
      <CategoryPills
        selectedCategory={selectedCategory}
        onSelectCategory={onCategoryClick}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 w-full">
        {error && <Alert type="error" message={error} className="mb-6" onClose={() => setError('')} />}

        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 mb-6 sm:mb-8 pb-4 border-b border-neutral-200">
          <div>
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-black">
              Catalog
            </h1>
            <p className="text-[11px] sm:text-xs font-mono text-neutral-500 uppercase tracking-wider mt-1">
              Showing {products.length} of {totalElements} {totalElements === 1 ? 'Item' : 'Items'}
            </p>
          </div>
          {totalPages > 1 && (
            <div className="text-[11px] sm:text-xs font-mono text-neutral-400">
              PAGE {page + 1} OF {totalPages}
            </div>
          )}
        </div>

        {/* Initial Loading State */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center">
            <LoadingSpinner size="lg" color="black" />
            <p className="text-xs font-mono text-neutral-400 uppercase tracking-widest mt-4">
              Loading Catalog...
            </p>
          </div>
        ) : products.length === 0 ? (
          /* Empty State */
          <div className="py-24 text-center border border-dashed border-neutral-300 p-8 sm:p-12">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-700">No Products Available</h3>
            <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
              No inventory entries found in this category.
            </p>
            <button
              onClick={() => handleSelectCategory('all')}
              className="mt-6 px-5 py-2.5 bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 transition"
            >
              Browse All Products
            </button>
          </div>
        ) : (
          /* Responsive Product Grid: 1 col (mobile), 2 cols (tablet), 3 cols (laptop), 4 cols (desktop) */
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  stockInfo={stockMap[product.id]}
                  onBuyNow={(prod) => setBuyNowProduct(prod)}
                />
              ))}
            </div>

            {/* Scroll Sentinel */}
            <div ref={sentinelRef} className="h-10 w-full" />

            {/* Loading Indicator while fetching next batch */}
            {loadingMore && (
              <div className="py-8 sm:py-12 flex flex-col items-center justify-center gap-2">
                <LoadingSpinner size="md" color="black" />
                <span className="text-[11px] font-mono uppercase tracking-widest text-neutral-500">
                  Loading Next Batch ({products.length} of {totalElements})...
                </span>
              </div>
            )}

            {/* Fallback button if scrolling hasn't triggered */}
            {hasMore && !loadingMore && (
              <div className="mt-8 text-center">
                <button
                  type="button"
                  onClick={loadMoreProducts}
                  className="px-6 py-2.5 border border-black bg-white hover:bg-black hover:text-white text-black text-xs font-bold uppercase tracking-wider transition"
                >
                  Load More Items
                </button>
              </div>
            )}

            {/* End of Catalog Notice */}
            {!hasMore && products.length > 0 && (
              <div className="mt-12 sm:mt-16 pt-6 sm:pt-8 border-t border-neutral-200 text-center">
                <span className="text-[11px] font-mono uppercase tracking-widest text-neutral-400">
                  All {totalElements} Products Loaded
                </span>
              </div>
            )}
          </>
        )}
      </main>

      {/* Buy Now Checkout Modal */}
      {buyNowProduct && (
        <BuyNowModal
          product={buyNowProduct}
          isOpen={Boolean(buyNowProduct)}
          onClose={() => setBuyNowProduct(null)}
        />
      )}
    </div>
  );
}
