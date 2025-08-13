'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export default function Navigation() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/upload', label: 'Upload' },
    { href: '/edit', label: 'Edit' },
    { href: '/gallery', label: 'Gallery' },
  ];

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <nav className="bg-[#1b95e5] shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-200">
              <span className="text-[#1b95e5] font-bold text-xl">📸</span>
            </div>
            <span className="text-2xl font-bold text-white tracking-wide group-hover:text-blue-200 transition-colors duration-200">
              PhotoStream
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  pathname === item.href
                    ? 'text-[#1b95e5] bg-white shadow-md'
                    : 'text-white hover:text-blue-200 hover:bg-white/10'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* User Actions */}
          <div className="hidden md:flex items-center space-x-4">
            <button className="px-4 py-2 text-white text-sm font-medium hover:text-blue-200 transition-colors duration-200">
              Sign In
            </button>
            <button className="px-4 py-2 bg-white text-[#1b95e5] text-sm font-semibold rounded-lg hover:bg-blue-50 transition-all duration-200 shadow-md hover:shadow-lg">
              Get Started
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={toggleMobileMenu}
              className="text-white hover:text-blue-200 p-2 rounded-lg hover:bg-white/10 transition-all duration-200"
              aria-label="Toggle mobile menu"
            >
              <svg 
                className="w-6 h-6" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-[#1b95e5] border-t border-white/20 shadow-xl">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-lg text-base font-medium transition-all duration-200 ${
                    pathname === item.href
                      ? 'text-[#1b95e5] bg-white shadow-md'
                      : 'text-white hover:text-blue-200 hover:bg-white/10'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              
              {/* Mobile User Actions */}
              <div className="pt-4 pb-3 border-t border-white/20 space-y-2">
                <button className="w-full text-left px-3 py-2 text-white text-base font-medium hover:text-blue-200 transition-colors duration-200">
                  Sign In
                </button>
                <button className="w-full px-3 py-2 bg-white text-[#1b95e5] text-base font-semibold rounded-lg hover:bg-blue-50 transition-all duration-200 shadow-md">
                  Get Started
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Secondary Navigation Bar for Sports Aesthetic */}
      <div className="bg-[#1580c7] border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-10">
            <div className="flex items-center space-x-6 text-xs text-white/80">
              <span className="font-medium">📸 Photo Management</span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">Professional Quality</span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">Cloud Storage</span>
            </div>
            
            <div className="flex items-center space-x-4 text-xs text-white/60">
              <span className="hidden md:inline">Powered by Cloudinary</span>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>Live</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
