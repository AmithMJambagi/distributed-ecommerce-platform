import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-black text-white border-t border-neutral-800 py-10 mt-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link to="/" className="font-black text-sm tracking-widest text-white uppercase">
            APEX<span className="font-light text-neutral-400">STORE</span>
          </Link>
          <span className="hidden sm:inline text-neutral-600">|</span>
          <nav className="flex items-center gap-6 text-[11px] font-bold uppercase tracking-wider text-neutral-300">
            <Link to="/" className="hover:text-white transition">
              Catalog
            </Link>
            <Link to="/orders" className="hover:text-white transition">
              Orders
            </Link>
            <Link to="/profile" className="hover:text-white transition">
              Account
            </Link>
          </nav>
        </div>

        {/* Minimal Copyright */}
        <p className="font-mono text-[11px] text-white-500 uppercase tracking-wider">
          © {new Date().getFullYear()} ApexStore Inc. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
