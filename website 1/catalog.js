(function (root) {
  'use strict';
  const products = [
    { id: 'infinity-cube', name: 'Infinity cube', price: 250 },
    { id: 'castle', name: 'Castle', price: 210 },
    { id: 'spiral-big', name: 'Spiral cone · big', price: 260 },
    { id: 'spiral-small', name: 'Spiral cone · small', price: 210 },
    { id: 'hawk-tag', name: 'Hawk backpack tag', price: 175 },
    { id: 'two-sided-word', name: 'Two-sided word', price: 275 }
  ];
  if (typeof module !== 'undefined') module.exports = products;
  else root.HawkCatalog = products;
})(typeof window !== 'undefined' ? window : globalThis);
