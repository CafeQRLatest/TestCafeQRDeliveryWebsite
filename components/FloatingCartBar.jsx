'use client';
import { FiShoppingBag, FiArrowRight } from 'react-icons/fi';

export default function FloatingCartBar({ cart, onClick }) {
  const totalQty = cart.reduce((s, i) => s + i.qty, 0);
  const totalAmt = cart.reduce((s, i) => s + i.price * i.qty, 0);

  if (totalQty === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-5">
      <button
        onClick={onClick}
        className="bg-gradient-to-r from-[#f97316] via-[#ea580c] to-[#c2410c] hover:from-[#ea580c] hover:to-[#9a3412] text-white rounded-full px-5 py-2.5 sm:px-6 sm:py-3 flex items-center justify-between gap-3.5 shadow-2xl shadow-orange-500/40 border-2 border-orange-200/90 transition-all duration-300 transform hover:scale-105 active:scale-95 whitespace-nowrap min-w-[250px] sm:min-w-[280px]"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 sm:w-7 sm:h-7 bg-white text-[#ea580c] rounded-full flex items-center justify-center font-black text-xs shadow-md">
            {totalQty}
          </div>
          <span className="font-black text-xs sm:text-sm uppercase tracking-wider flex items-center gap-1.5">
            <FiShoppingBag size={14} />
            <span>VIEW CART</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-black text-xs sm:text-sm tracking-tight bg-white/20 px-2.5 py-0.5 rounded-full border border-white/25">
            ₹{totalAmt.toFixed(2)}
          </span>
          <FiArrowRight size={15} className="animate-pulse" />
        </div>
      </button>
    </div>
  );
}
