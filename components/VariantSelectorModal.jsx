'use client';
import { useState, useMemo, useEffect } from 'react';
import { FiX, FiCheck } from 'react-icons/fi';

export default function VariantSelectorModal({ item, isOpen, onClose, onAddToCart }) {
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

  const [selectedOption, setSelectedOption] = useState(null);

  useEffect(() => {
    if (variantOptions.length > 0) {
      setSelectedOption(variantOptions[0]);
    } else {
      setSelectedOption(null);
    }
  }, [variantOptions]);

  if (!isOpen || !item) return null;

  const handleAdd = () => {
    if (!selectedOption) return;
    const variantItem = {
      ...item,
      cartItemId: `${item.id}_${selectedOption.id}`,
      variantId: selectedOption.id,
      variantName: selectedOption.name,
      price: selectedOption.price,
      displayName: `${item.name} (${selectedOption.name})`
    };
    onAddToCart(variantItem);
    onClose();
  };

  const finalPrice = selectedOption ? selectedOption.price : Number(item.price || 0);

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
            <p className="text-xs text-stone-400">Select option / size</p>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:bg-stone-200 transition-colors"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Options List */}
        <div className="p-4 overflow-y-auto space-y-2 flex-1">
          <div className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
            Available Options
          </div>
          {variantOptions.map((opt) => {
            const isSelected = selectedOption?.id === opt.id;
            return (
              <div
                key={opt.id}
                onClick={() => setSelectedOption(opt)}
                className={`flex items-center justify-between p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-brand-orange bg-orange-50/50 shadow-sm'
                    : 'border-stone-100 bg-stone-50/50 hover:border-stone-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    isSelected ? 'border-brand-orange bg-brand-orange text-white' : 'border-stone-300'
                  }`}>
                    {isSelected && <FiCheck size={12} strokeWidth={3} />}
                  </div>
                  <span className="font-semibold text-stone-800 text-sm">{opt.name}</span>
                </div>
                <span className="font-bold text-stone-900 text-sm">₹{opt.price.toFixed(2)}</span>
              </div>
            );
          })}
        </div>

        {/* Footer Action Button */}
        <div className="p-4 border-t border-stone-100 bg-white">
          <button
            onClick={handleAdd}
            className="w-full bg-brand-orange text-white font-bold text-sm py-3.5 px-4 rounded-xl shadow-lg shadow-orange-500/20 hover:bg-brand-orange-dark transition-all flex items-center justify-between"
          >
            <span>Add Item</span>
            <span>₹{finalPrice.toFixed(2)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
