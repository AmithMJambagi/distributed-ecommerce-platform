import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatCurrency, PLACEHOLDER_IMAGE } from '../../utils/formatters';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { inventoryApi } from '../../api/inventoryApi';
import LoadingSpinner from '../common/LoadingSpinner';

export default function ProductCard({ product, stockInfo: initialStock, onBuyNow }) {
  const { addToCart } = useCart();
  const { isAuthenticated, openAuthModal } = useAuth();
  const navigate = useNavigate();

  const [stockInfo, setStockInfo] = useState(initialStock);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  // Sync if prop updates
  useEffect(() => {
    if (initialStock !== undefined) {
      setStockInfo(initialStock);
    }
  }, [initialStock]);



  // Stock status determination:
  // Strictly rely on isInStock boolean as the source of truth for availability.
  const isOutOfStock =
    stockInfo !== undefined && stockInfo !== null
      ? stockInfo.isInStock === false
      : false;

  // Only display exact stock count if it is strictly <= 5 (low stock urgency)
  const rawAvailable = stockInfo?.availableStock;
  const isLowStock =
    !isOutOfStock &&
    rawAvailable !== null &&
    rawAvailable !== undefined &&
    Number(rawAvailable) > 0 &&
    Number(rawAvailable) <= 5;
  const availableQuantity = isLowStock ? Number(rawAvailable) : null;

  const handleAddToCart = async (e) => {
    e.stopPropagation();
    if (isOutOfStock) return;

    if (!isAuthenticated) {
      openAuthModal('email');
      return;
    }

    setAdding(true);
    try {
      const success = await addToCart(product.id, 1);
      if (success) {
        setAdded(true);
        setTimeout(() => setAdded(false), 1500);
      }
    } catch (err) {
      console.error('Failed to add product to cart', err);
    } finally {
      setAdding(false);
    }
  };

  const handleBuyNow = (e) => {
    e.stopPropagation();
    if (isOutOfStock) return;

    if (!isAuthenticated) {
      openAuthModal('email');
      return;
    }
    onBuyNow({ ...product, availableStock: availableQuantity });
  };

  const productUrl = `/product/${product.id}`;

  return (
    <div className={`bg-white border flex flex-col justify-between group transition-colors duration-200 ${
      isOutOfStock ? 'border-neutral-300 opacity-90' : 'border-neutral-200 hover:border-black'
    }`}>
      {/* Product Image Frame */}
      <Link
        to={productUrl}
        state={{ product, stockInfo }}
        className="relative aspect-square w-full bg-neutral-50 overflow-hidden flex items-center justify-center p-6 border-b border-neutral-100 block cursor-pointer"
      >
        <img
          src={product.primaryImageUrl || PLACEHOLDER_IMAGE}
          alt={product.name}
          loading="lazy"
          className={`object-contain w-full h-full transition-transform duration-300 ${
            isOutOfStock ? 'opacity-40 grayscale' : 'group-hover:scale-105'
          }`}
          onError={(e) => {
            e.currentTarget.src = PLACEHOLDER_IMAGE;
          }}
        />

        {/* Stock Badge */}
        {isOutOfStock ? (
          <span className="absolute top-3 left-3 bg-neutral-900 text-white border border-neutral-900 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider font-bold">
            Out of Stock
          </span>
        ) : isLowStock ? (
          <span className="absolute top-3 left-3 bg-white text-neutral-900 border border-neutral-900 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider font-bold">
            Only {availableQuantity} Left
          </span>
        ) : (
          <span className="absolute top-3 left-3 bg-white text-neutral-900 border border-neutral-200 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider">
            In Stock
          </span>
        )}
      </Link>

      {/* Product Details */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <Link to={productUrl} state={{ product, stockInfo }} className="block">
            <h3 className="font-bold text-sm text-neutral-900 tracking-tight line-clamp-1 hover:underline transition-all">
              {product.name}
            </h3>
          </Link>
          <p className="text-xs text-neutral-500 mt-1 line-clamp-2 leading-relaxed">
            {product.description || 'Curated item from verified catalog.'}
          </p>
        </div>

        {/* Pricing and Action Buttons */}
        <div className="mt-5 pt-4 border-t border-neutral-100">
          <div className="flex items-baseline justify-between mb-4">
            <span className="text-lg font-black text-neutral-900">
              {formatCurrency(product.price)}
            </span>
            <span className="text-[11px] text-neutral-400 font-mono uppercase">
              {isOutOfStock ? 'Sold Out' : 'Tax Included'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isOutOfStock || adding}
              className={`py-2.5 px-3 border text-xs font-bold uppercase tracking-wider transition text-center ${
                isOutOfStock
                  ? 'border-neutral-200 bg-neutral-100 text-neutral-400 cursor-not-allowed'
                  : 'border-black bg-white hover:bg-neutral-100 text-black'
              }`}
            >
              {adding ? (
                <LoadingSpinner size="sm" color="black" />
              ) : added ? (
                'Added'
              ) : isOutOfStock ? (
                'Out of Stock'
              ) : (
                'Add to Cart'
              )}
            </button>

            <button
              type="button"
              onClick={handleBuyNow}
              disabled={isOutOfStock}
              className={`py-2.5 px-3 text-xs font-bold uppercase tracking-wider transition text-center ${
                isOutOfStock
                  ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                  : 'bg-black hover:bg-neutral-800 text-white'
              }`}
            >
              {isOutOfStock ? 'Sold Out' : 'Buy Now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
