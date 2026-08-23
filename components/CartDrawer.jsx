'use client';
import { useState, useEffect } from 'react';
import { FiX, FiMinus, FiPlus, FiShoppingBag } from 'react-icons/fi';

export default function CartDrawer({ open, onClose, cart, onAdd, onRemove, onCheckout }) {
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('delivery_remarks');
      if (saved) setRemarks(saved);
    } catch { }
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        onClick={onClose}
      />
      {/* Drawer */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out max-h-[85vh] flex flex-col ${open ? 'translate-y-0' : 'translate-y-full'
          }`}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-stone-200 rounded-full" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <FiShoppingBag className="text-brand-orange" size={20} />
            <h2 className="font-semibold text-stone-800">Your Cart</h2>
            <span className="text-xs bg-brand-orange text-white rounded-full w-5 h-5 flex items-center justify-center">
              {cart.reduce((s, i) => s + i.qty, 0)}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-stone-100 text-stone-500">
            <FiX size={18} />
          </button>
        </div>
        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
          {cart.length === 0 ? (
            <div className="py-12 text-center">
              <FiShoppingBag size={40} className="mx-auto text-stone-300 mb-3" />
              <p className="text-stone-400 text-sm">Your cart is empty</p>
              <p className="text-stone-300 text-xs mt-1">Add items to get started</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-stone-800 line-clamp-1">{item.name}</p>
                  <p className="text-xs text-stone-400 mt-0.5">₹{item.price.toFixed(2)} each</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onRemove(item.id)}
                    className="w-7 h-7 rounded-full border border-stone-200 flex items-center justify-center text-stone-500 hover:border-brand-orange hover:text-brand-orange transition-colors"
                  >
                    <FiMinus size={12} />
                  </button>
                  <span className="w-5 text-center text-sm font-semibold text-stone-800">{item.qty}</span>
                  <button
                    onClick={() => onAdd(item)}
                    className="w-7 h-7 rounded-full bg-brand-orange text-white flex items-center justify-center hover:bg-brand-orange-dark transition-colors"
                  >
                    <FiPlus size={12} />
                  </button>
                </div>
                <p className="w-16 text-right text-sm font-semibold text-stone-800">
                  ₹{(item.price * item.qty).toFixed(2)}
                </p>
              </div>
            ))
          )}
        </div>
        {/* Footer */}
        {cart.length > 0 && (
          <div className="px-5 py-4 border-t border-stone-100 bg-white space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-stone-500 text-sm font-semibold">Subtotal</span>
              <span className="font-bold text-stone-900 text-base">₹{total.toFixed(2)}</span>
            </div>
            <button
              onClick={onCheckout}
              className="w-full bg-gradient-to-r from-[#f97316] to-[#ea580c] hover:from-[#ea580c] hover:to-[#c2410c] text-white font-black py-3.5 rounded-2xl transition-all text-sm uppercase tracking-wider shadow-lg shadow-orange-500/25 transform hover:scale-[1.01] active:scale-[0.99]"
            >
              Proceed to Checkout
            </button>
          </div>
        )}
      </div>
    </>
  );
}
