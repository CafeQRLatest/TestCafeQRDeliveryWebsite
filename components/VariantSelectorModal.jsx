'use client';
import { useState, useMemo, useEffect } from 'react';
import { FiX, FiPlus, FiMinus } from 'react-icons/fi';

export default function VariantSelectorModal({ item, isOpen, onClose, cart = [], onUpdateVariants }) {
  // Extract variant options & prices from item payload
  const variantOptions = useMemo(() => {
    if (!item) return [];
    const pricings = Array.isArray(item.variantPricings) ? item.variantPricings : [];
    const mappings = Array.isArray(item.variantMappings) ? item.variantMappings : [];

    // 1. If variantPricings exist, use option override prices
    if (pricings.length > 0) {
      return pricings
        .filter(p => p.isAvailable !== false && p.variantOption)
        .map(p => {
          const opt = p.variantOption;
          const price = p.overridePrice !== null && p.overridePrice !== undefined
            ? Number(p.overridePrice)
            : (Number(item.price || 0) + Number(opt.additionalPrice || 0));
          return {
            id: opt.id,
            name: opt.name,
            price: price
          };
        });
    }

    // 2. Fallback: map from variantMappings options
    const options = [];
    mappings.forEach(m => {
      const opts = m.variantGroup?.options || [];
      opts.forEach(o => {
        const price = Number(item.price || 0) + Number(o.additionalPrice || 0);
        options.push({
          id: o.id,
          name: o.name,
          price: price
        });
      });
    });

    return options;
  }, [item]);

  const [quantities, setQuantities] = useState({});

  useEffect(() => {
    if (!item || variantOptions.length === 0 || !isOpen) return;

    const initialMap = {};
    let hasAnyInCart = false;

    variantOptions.forEach(opt => {
      const key = `${item.id}_${opt.id}`;
      const inCart = (cart || []).find(c => (c.cartItemId || c.id) === key || (c.productId === item.id && c.variantId === opt.id));
      const qty = inCart ? Number(inCart.qty || 0) : 0;
      initialMap[opt.id] = qty;
      if (qty > 0) hasAnyInCart = true;
    });

    // If no variants of this item are currently in cart, default the first option to 1
    if (!hasAnyInCart && variantOptions.length > 0) {
      initialMap[variantOptions[0].id] = 1;
    }

    setQuantities(initialMap);
  }, [item, variantOptions, cart, isOpen]);

  if (!isOpen || !item) return null;

  const totalItems = Object.values(quantities).reduce((s, q) => s + (Number(q) || 0), 0);
  const totalPrice = variantOptions.reduce((s, opt) => s + (opt.price * (quantities[opt.id] || 0)), 0);

  const handleQtyChange = (optId, delta) => {
    setQuantities(prev => {
      const current = prev[optId] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [optId]: next };
    });
  };

  const handleSave = () => {
    if (onUpdateVariants) {
      onUpdateVariants(item, quantities, variantOptions);
    }
    onClose();
  };

  const categoryName = item.category || item.categoryName || 'Menu Item';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl animate-slide-up max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-100">
          <div>
            <h3 className="font-bold text-stone-800 text-base">{item.name}</h3>
            <p className="text-xs text-stone-400 font-medium">{categoryName}</p>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:bg-stone-200 transition-colors"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Subheader & Options List */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          <div className="text-xs font-bold text-stone-400 uppercase tracking-wider">
            VARIANTS / OPTIONS
          </div>
          {variantOptions.map((opt) => {
            const qty = quantities[opt.id] || 0;
            const isSelected = qty > 0;
            return (
              <div
                key={opt.id}
                className={`flex items-center justify-between p-3.5 rounded-xl border-2 transition-all ${
                  isSelected
                    ? 'border-brand-orange bg-orange-50/40 shadow-sm'
                    : 'border-stone-100 bg-stone-50/40'
                }`}
              >
                <div>
                  <h4 className="font-bold text-stone-800 text-sm">{opt.name}</h4>
                  <p className="font-semibold text-stone-900 text-xs mt-0.5">₹{opt.price.toFixed(2)}</p>
                </div>
                {/* Stepper (+ / -) */}
                <div className="flex items-center gap-2 border border-stone-200 rounded-lg p-1 bg-white shadow-sm">
                  <button
                    onClick={() => handleQtyChange(opt.id, -1)}
                    className="w-7 h-7 rounded-md border border-stone-200 text-stone-600 flex items-center justify-center hover:bg-stone-100 transition-colors"
                  >
                    <FiMinus size={12} />
                  </button>
                  <span className="w-5 text-center text-sm font-bold text-stone-800">{qty}</span>
                  <button
                    onClick={() => handleQtyChange(opt.id, 1)}
                    className="w-7 h-7 rounded-md bg-brand-orange text-white flex items-center justify-center hover:bg-brand-orange-dark transition-colors"
                  >
                    <FiPlus size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary & Footer Action Button */}
        <div className="p-4 border-t border-stone-100 bg-white">
          <div className="flex items-center justify-between px-1 mb-3 text-xs font-bold text-stone-700">
            <span>{totalItems} item{totalItems !== 1 ? 's' : ''} selected</span>
            <span className="font-extrabold text-stone-900 text-sm">₹{totalPrice.toFixed(2)}</span>
          </div>
          <button
            onClick={handleSave}
            className="w-full bg-brand-orange text-white font-bold text-sm py-3.5 px-4 rounded-xl shadow-lg shadow-orange-500/20 hover:bg-brand-orange-dark transition-all flex items-center justify-center"
          >
            {totalItems > 0 ? `Update Cart (${totalItems})` : 'Update Cart'}
          </button>
        </div>
      </div>
    </div>
  );
}
