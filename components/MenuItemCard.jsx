'use client';
import { FiPlus, FiMinus, FiStar, FiZap } from 'react-icons/fi';

export default function MenuItemCard({ item, qty, onAdd, onRemove, onSelectVariant, showVegBadge = true, defaultEmoji = '🍔' }) {
  const imageUrl = item.imageUrl || item.image_url;
  const isVeg = item.isVeg ?? item.is_veg ?? (item.productType === 'VEG' || item.productType === 'Vegetarian');
  const hasVariants = item.hasVariants || item.has_variants || (Array.isArray(item.variantMappings) && item.variantMappings.length > 0);
  const isBestseller = item.is_bestseller || item.isBestseller;

  const handleCardClick = () => {
    if (hasVariants) {
      if (onSelectVariant) onSelectVariant(item);
      else onAdd(item);
    } else {
      onAdd(item);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="group relative bg-white rounded-2xl border border-stone-200/90 hover:border-orange-400 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden cursor-pointer select-none"
    >
      {/* ── CARD TOP: IMAGE BANNER (ONLY RENDER IF IMAGE URL IS PRESENT) ── */}
      {imageUrl ? (
        <div className="relative w-full h-24 sm:h-28 bg-stone-100 overflow-hidden shrink-0">
          <img
            src={imageUrl}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            loading="lazy"
          />

          {/* Top Floating Badges Overlay */}
          <div className="absolute top-1.5 left-1.5 z-10 flex items-center gap-1">
            {showVegBadge && (
              <div className="bg-white/95 backdrop-blur-md border border-stone-200/80 px-1.5 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${isVeg ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                <span className={`text-[8px] font-black uppercase tracking-wider ${isVeg ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {isVeg ? 'VEG' : 'NON-VEG'}
                </span>
              </div>
            )}
          </div>

          <div className="absolute top-1.5 right-1.5 z-10 flex items-center gap-1">
            {isBestseller && (
              <div className="bg-amber-400 text-stone-950 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs flex items-center gap-0.5 border border-amber-300">
                <FiStar size={8} className="fill-current" />
                <span>BEST</span>
              </div>
            )}

            {hasVariants && !isBestseller && (
              <div className="bg-purple-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs flex items-center gap-0.5 border border-purple-400">
                <FiZap size={8} />
                <span>CUSTOM</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Top Badges Row when NO Image */
        <div className="flex items-center justify-between px-2.5 pt-2.5 pb-0.5">
          {showVegBadge && (
            <div className="bg-stone-50 border border-stone-200 px-1.5 py-0.5 rounded-full flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${isVeg ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <span className={`text-[8px] font-black uppercase tracking-wider ${isVeg ? 'text-emerald-700' : 'text-rose-700'}`}>
                {isVeg ? 'VEG' : 'NON-VEG'}
              </span>
            </div>
          )}

          <div className="flex items-center gap-1 ml-auto">
            {isBestseller && (
              <div className="bg-amber-50 text-amber-900 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-0.5 border border-amber-300">
                <FiStar size={8} className="fill-current text-amber-600" />
                <span>BEST</span>
              </div>
            )}

            {hasVariants && !isBestseller && (
              <div className="bg-purple-50 text-purple-800 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-0.5 border border-purple-200">
                <FiZap size={8} />
                <span>CUSTOM</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CARD MIDDLE: TITLE & DESCRIPTION ── */}
      <div className={`p-2.5 sm:p-3 flex-1 flex flex-col justify-between ${!imageUrl ? 'pt-0.5' : ''}`}>
        <div>
          <h3 className="text-xs sm:text-sm font-extrabold text-stone-900 group-hover:text-[#ea580c] transition-colors leading-snug line-clamp-1">
            {item.name}
          </h3>

          {item.description ? (
            <p className="text-[10px] sm:text-xs text-stone-500 mt-0.5 line-clamp-1 font-medium leading-normal">
              {item.description}
            </p>
          ) : null}
        </div>

        {/* ── CARD BOTTOM: PRICE & QTY ACTION PILL (NO ADD BUTTON) ── */}
        <div className="flex items-center justify-between gap-1.5 mt-2 pt-2 border-t border-stone-100">
          <div>
            <span className="text-xs sm:text-sm font-black text-[#ea580c] tracking-tight">
              ₹{Number(item.price).toFixed(2)}
            </span>
            {hasVariants && (
              <span className="text-[9px] text-stone-400 font-bold ml-1 uppercase inline-block">
                + options
              </span>
            )}
          </div>

          {qty > 0 && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-[#f97316] text-white px-2 py-0.5 rounded-lg shadow-sm flex items-center gap-1.5 animate-in zoom-in-95 duration-150 shrink-0"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(item.id);
                }}
                className="w-4 h-4 rounded bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-colors text-[10px] font-black"
                aria-label="Decrease quantity"
              >
                <FiMinus size={9} />
              </button>
              <span className="text-[11px] font-black min-w-[10px] text-center">{qty}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (hasVariants && onSelectVariant) {
                    onSelectVariant(item);
                  } else {
                    onAdd(item);
                  }
                }}
                className="w-4 h-4 rounded bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-colors text-[10px] font-black"
                aria-label="Increase quantity"
              >
                <FiPlus size={9} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
