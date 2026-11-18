import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, 
  User, 
  Package, 
  Settings, 
  Shield, 
  LogOut, 
  ChevronDown 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

export default function Navbar() {
  const { user, isAuthenticated, isAdmin, logout, openAuthModal } = useAuth();
  const { totalCount, openDrawer } = useCart();
  const navigate = useNavigate();

  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    navigate(isAdmin ? '/admin' : '/');
  };

  return (
    <nav className="sticky top-0 z-40 bg-white border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-10">
          <Link to={isAdmin ? "/admin" : "/"} className="flex items-center gap-2">
            <span className="font-black text-xl tracking-wider text-black">
              APEX<span className="font-light text-neutral-400">STORE</span>
            </span>
            {isAdmin && (
              <span className="px-1.5 py-0.5 text-[9px] font-mono bg-black text-white font-bold uppercase tracking-wider">
                ADMIN
              </span>
            )}
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-8 text-xs font-semibold tracking-wider uppercase">
            {!isAdmin ? (
              /* CUSTOMER LINKS */
              <>
                <Link
                  to="/"
                  className="text-neutral-900 hover:text-black border-b-2 border-transparent hover:border-black py-5 transition"
                >
                  Catalog
                </Link>

                {isAuthenticated && (
                  <Link
                    to="/orders"
                    className="text-neutral-600 hover:text-black border-b-2 border-transparent hover:border-black py-5 transition flex items-center gap-1.5"
                  >
                    <Package className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Orders</span>
                  </Link>
                )}
              </>
            ) : (
              /* ADMIN ONLY LINK */
              <Link
                to="/admin"
                className="text-black border-b-2 border-black py-5 transition flex items-center gap-1.5"
              >
                <Shield className="w-3.5 h-3.5 text-black" />
                <span>Admin Console</span>
              </Link>
            )}
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Cart Button: ONLY VISIBLE TO CUSTOMERS (Hidden for Admin) */}
          {!isAdmin && (
            <button
              type="button"
              onClick={openDrawer}
              className="group relative flex items-center gap-2 px-3.5 py-2 border border-black bg-white hover:bg-black text-black hover:text-white text-xs font-bold tracking-wider uppercase transition-colors duration-150"
              aria-label="View Shopping Cart"
            >
              <ShoppingBag className="w-4 h-4 text-black group-hover:text-white transition-colors" />
              <span className="hidden sm:inline">Cart</span>
              <span className="text-xs font-mono font-bold text-black group-hover:text-white transition-colors">
                {totalCount}
              </span>
            </button>
          )}

          {/* User Profile / Auth Button */}
          {isAuthenticated ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2 py-2 px-3 border border-neutral-300 hover:border-black text-neutral-900 text-xs font-semibold tracking-wider uppercase transition bg-white"
              >
                <div className="w-5 h-5 flex items-center justify-center bg-neutral-100 border border-neutral-200 text-neutral-800">
                  {isAdmin ? <Shield className="w-3 h-3 text-black" /> : <User className="w-3 h-3" />}
                </div>
                <span className="max-w-[120px] truncate hidden sm:inline">
                  {user?.fullName || user?.email || (isAdmin ? 'Admin' : 'Account')}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
              </button>

              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                  <div className="absolute right-0 mt-1 w-56 bg-white border border-neutral-900 shadow-xl py-1.5 z-20">
                    <div className="px-4 py-2.5 border-b border-neutral-100 bg-neutral-50">
                      <div className="flex items-center gap-2 mb-0.5">
                        {isAdmin ? <Shield className="w-3.5 h-3.5 text-black" /> : <User className="w-3.5 h-3.5 text-neutral-500" />}
                        <p className="text-xs font-bold text-neutral-900 truncate">
                          {user?.fullName || (isAdmin ? 'Store Administrator' : 'User')}
                        </p>
                      </div>
                      <p className="text-[11px] text-neutral-400 truncate font-mono">
                        {user?.email}
                      </p>
                      {isAdmin && (
                        <span className="inline-block mt-1 px-1.5 py-0.5 text-[9px] font-mono uppercase bg-black text-white font-bold">
                          ROLE_ADMIN (Console Access)
                        </span>
                      )}
                    </div>

                    {!isAdmin ? (
                      /* CUSTOMER DROPDOWN LINKS */
                      <>
                        <Link
                          to="/orders"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 hover:text-black uppercase tracking-wider transition"
                        >
                          <Package className="w-3.5 h-3.5 text-neutral-400" />
                          <span>My Orders</span>
                        </Link>

                        <Link
                          to="/profile"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 hover:text-black uppercase tracking-wider transition"
                        >
                          <Settings className="w-3.5 h-3.5 text-neutral-400" />
                          <span>Account Settings</span>
                        </Link>
                      </>
                    ) : (
                      /* ADMIN DROPDOWN LINKS */
                      <Link
                        to="/admin"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 hover:text-black uppercase tracking-wider transition"
                      >
                        <Shield className="w-3.5 h-3.5 text-neutral-400" />
                        <span>Admin Console</span>
                      </Link>
                    )}

                    <div className="border-t border-neutral-100 my-1" />

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 hover:text-black uppercase tracking-wider transition"
                    >
                      <LogOut className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => openAuthModal('email')}
              className="flex items-center gap-2 py-2 px-4 bg-black hover:bg-neutral-800 text-white text-xs font-bold tracking-wider uppercase transition border border-black shadow-none"
            >
              <User className="w-3.5 h-3.5 text-neutral-300" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
