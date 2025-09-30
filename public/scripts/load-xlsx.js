/**
 * XLSX Library Loader
 * Loads the SheetJS XLSX library for Excel export functionality
 */

(function() {
  'use strict';
  
  // Check if XLSX is already loaded
  if (typeof window !== 'undefined' && window.XLSX) {
    console.log('✅ XLSX library already loaded');
    return;
  }
  
  // Load XLSX from CDN with fallback
  const loadXLSX = () => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    script.async = true;
    
    script.onload = () => {
      console.log('✅ XLSX library loaded successfully from CDN');
      // Trigger custom event to notify components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('xlsxLoaded'));
      }
    };
    
    script.onerror = () => {
      console.error('❌ Failed to load XLSX from CDN, trying local fallback...');
      // Try local fallback if CDN fails
      loadLocalXLSX();
    };
    
    document.head.appendChild(script);
  };
  
  // Fallback to local XLSX if CDN fails
  const loadLocalXLSX = () => {
    const script = document.createElement('script');
    script.src = '/scripts/xlsx.min.js';
    script.async = true;
    
    script.onload = () => {
      console.log('✅ XLSX library loaded successfully from local fallback');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('xlsxLoaded'));
      }
    };
    
    script.onerror = () => {
      console.error('❌ Failed to load XLSX library from both CDN and local fallback');
      console.error('Excel export functionality will not be available');
    };
    
    document.head.appendChild(script);
  };
  
  // Start loading when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadXLSX);
  } else {
    loadXLSX();
  }
})();







