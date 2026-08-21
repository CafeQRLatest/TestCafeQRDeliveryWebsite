'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { FiSearch, FiArrowLeft, FiStar, FiClock, FiMapPin, FiShoppingBag } from 'react-icons/fi';
import MenuItemCard from '@/components/MenuItemCard';
import CartDrawer from '@/components/CartDrawer';
import FloatingCartBar from '@/components/FloatingCartBar';
import VariantSelectorModal from '@/components/VariantSelectorModal';
import { fetchDeliverySettings, fetchMenu, resolveSlug } from '@/lib/apiClient';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://cafe-qr-backend.onrender.com/api';

// ─── MOCK DATA (used when backend returns no data / for offline dev) ─────────
const MOCK_RESTAURANT = {
  name: 'Hotel Paradise',
  tagline: 'Authentic Kerala & Arabian Cuisine',
  address: 'MG Road, Thrissur, Kerala',
  rating: 4.3,
  delivery_time: '15-20 min',
  min_order: 150,
};

const MOCK_MENU = [
  { id: 's1', category: 'Starters', name: 'Kerala Prawn Fry', description: 'Crispy prawns in Kerala masala', price: 280, is_veg: false, is_bestseller: true },
  { id: 's2', category: 'Starters', name: 'Chicken 65', description: 'Deep fried with curry leaves and coconut oil', price: 220, is_veg: false, is_bestseller: true },
  { id: 's3', category: 'Starters', name: 'Vegetable Cutlet', description: 'Mixed veggies with cashews', price: 120, is_veg: true, is_bestseller: false },
  { id: 'm1', category: 'Mains', name: 'Malabar Biryani', description: 'Fragrant rice with tender chicken and saffron', price: 320, is_veg: false, is_bestseller: true },
  { id: 'm2', category: 'Mains', name: 'Fish Molee', description: 'Tender fish in mild coconut milk curry', price: 290, is_veg: false, is_bestseller: false },
  { id: 'm3', category: 'Mains', name: 'Avial', description: 'Mixed vegetables in coconut-yoghurt gravy', price: 160, is_veg: true, is_bestseller: false },
  { id: 'm4', category: 'Mains', name: 'Palak Paneer', description: 'Cottage cheese in spiced spinach gravy', price: 200, is_veg: true, is_bestseller: false },
  { id: 'b1', category: 'Breads', name: 'Kerala Parotta', description: 'Flaky layered flatbread', price: 35, is_veg: true, is_bestseller: true },
  { id: 'b2', category: 'Breads', name: 'Appam', description: 'Soft fermented rice pancakes', price: 40, is_veg: true, is_bestseller: false },
  { id: 'v1', category: 'Beverages', name: 'Sulaimani', description: 'Spiced black tea with lemon', price: 60, is_veg: true, is_bestseller: false },
  { id: 'v2', category: 'Beverages', name: 'Tender Coconut', description: 'Fresh tender coconut water', price: 80, is_veg: true, is_bestseller: true },
];
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Helper to get display metadata and feature toggles based on branch posType
 */
function getBusinessCategoryInfo(posType = 'Restaurant') {
  const norm = String(posType || '').toUpperCase();
  
  const isBoutique = norm.includes('BOUTIQUE') || norm.includes('FASHION') || norm.includes('APPAREL') || norm.includes('CLOTH');
  const isGrocery = norm.includes('GROCERY') || norm.includes('SUPERMARKET') || norm.includes('MART');
  const isBakery = norm.includes('BAKERY') || norm.includes('BAKE') || norm.includes('PASTRY') || norm.includes('CAKE');
  const isSalon = norm.includes('SALON') || norm.includes('SPA') || norm.includes('BEAUTY');
  const isRetail = norm.includes('OTHER') || norm.includes('RETAIL') || norm.includes('STORE');
  const isFood = !isBoutique && !isGrocery && !isSalon && !isRetail;

  if (isBoutique) {
    return {
      isFood: false,
      heroEmoji: '👗',
      placeholderEmoji: '👗',
      searchPlaceholder: 'Search boutique items…',
      categoryLabel: 'Boutique & Fashion',
      showVegFilter: false,
      showVegBadge: false,
    };
  } else if (isGrocery) {
    return {
      isFood: false,
      heroEmoji: '🛒',
      placeholderEmoji: '📦',
      searchPlaceholder: 'Search groceries & items…',
      categoryLabel: 'Grocery & Mart',
      showVegFilter: false,
      showVegBadge: false,
    };
  } else if (isBakery) {
    return {
      isFood: true,
      heroEmoji: '🥐',
      placeholderEmoji: '🧁',
      searchPlaceholder: 'Search bakes & treats…',
      categoryLabel: 'Bakery & Pastry',
      showVegFilter: true,
      showVegBadge: true,
    };
  } else if (isSalon) {
    return {
      isFood: false,
      heroEmoji: '💇',
      placeholderEmoji: '🧴',
      searchPlaceholder: 'Search services & products…',
      categoryLabel: 'Salon & Spa',
      showVegFilter: false,
      showVegBadge: false,
    };
  } else if (isRetail) {
    return {
      isFood: false,
      heroEmoji: '🛍️',
      placeholderEmoji: '📦',
      searchPlaceholder: 'Search products…',
      categoryLabel: 'Retail & General Store',
      showVegFilter: false,
      showVegBadge: false,
    };
  } else {
    // Restaurant / Cafe / QSR
    return {
      isFood: true,
      heroEmoji: '🍽️',
      placeholderEmoji: '🥘',
      searchPlaceholder: 'Search menu…',
      categoryLabel: posType || 'Restaurant',
      showVegFilter: true,
      showVegBadge: true,
    };
  }
}

function OrderPageInner({ slugHandle, branchHandle }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryRestaurantId = searchParams.get('r');
  const orderType = searchParams.get('t') || 'DELIVERY';
  const queryOrgId = searchParams.get('orgId') || searchParams.get('branchId') || '';

  const targetHandle = slugHandle || queryRestaurantId;
  const targetBranch = branchHandle || queryOrgId;

  const [resolvedIds, setResolvedIds] = useState({
    clientId: queryRestaurantId || null,
    orgId: queryOrgId || '',
    clientSlug: slugHandle || null,
    branchSlug: branchHandle || null
  });

  const [restaurant, setRestaurant] = useState(null);
  const [menu, setMenu] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [cart, setCart] = useState([]);  // [{ id, name, price, qty }]
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedVariantItem, setSelectedVariantItem] = useState(null);
  const [search, setSearch] = useState('');
  const [vegOnly, setVegOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const categoryRefs = useRef({});

  const restaurantId = resolvedIds.clientId || targetHandle;
  const orgId = resolvedIds.orgId || targetBranch;

  const categoryInfo = getBusinessCategoryInfo(restaurant?.posType);

  // ── Persist cart to sessionStorage so it survives page refresh ──
  useEffect(() => {
    if (!restaurantId) return;
    try {
      const saved = sessionStorage.getItem(`cart_${restaurantId}`);
      if (saved) setCart(JSON.parse(saved));
    } catch { }
  }, [restaurantId]);

  useEffect(() => {
    if (!restaurantId) return;
    try { sessionStorage.setItem(`cart_${restaurantId}`, JSON.stringify(cart)); } catch { }
  }, [cart, restaurantId]);

  // ── Fetch restaurant + menu ──────────────────────────────────────
  useEffect(() => {
    if (!targetHandle) {
      router.replace('/');
      return;
    }
    setLoading(true);
    setError(null);

    const fetchData = async () => {
      try {
        let activeClientId = targetHandle;
        let activeOrgId = targetBranch;

        // Resolve slug if handle is not a raw UUID or if custom slug route is used
        try {
          const res = await resolveSlug(targetHandle, targetBranch);
          const rData = res.data?.data || res.data;
          if (rData?.clientId) {
            activeClientId = rData.clientId;
            activeOrgId = rData.orgId || activeOrgId;
            setResolvedIds({
              clientId: rData.clientId,
              orgId: rData.orgId || '',
              clientSlug: rData.clientSlug,
              branchSlug: rData.branchSlug
            });
          }
        } catch (slugErr) {
          console.warn('[CafeQR] Slug resolve skipped or failed, using direct ID', slugErr);
        }

        // Try real backend settings and menu calls via apiClient
        const [rRes, mRes] = await Promise.all([
          fetchDeliverySettings(activeClientId, activeOrgId),
          fetchMenu(activeClientId, activeOrgId),
        ]);

        const rData = rRes.data?.data || rRes.data;
        const mData = mRes.data?.data || mRes.data;

        // map backend keys to frontend expected keys
        const formattedRestaurant = {
          name: rData.restaurantName || rData.name || 'Our Restaurant',
          tagline: rData.tagline || 'Delivery & Takeaway',
          address: rData.address || '',
          brandColor: rData.brandColor || '#f97316',
          logoUrl: rData.logoUrl || '',
          bannerUrl: rData.bannerUrl || null,
          rating: rData.rating || 4.5,
          delivery_time: rData.estimatedDeliveryMinutes ? `${rData.estimatedDeliveryMinutes} min` : '40 min',
          min_order: rData.minOrderAmount || 0,
          posType: rData.posType || 'Restaurant',
          // Tax settings
          taxEnabled: rData.taxEnabled || false,
          taxLabelGlobal: rData.taxLabelGlobal || 'GST',
          taxRates: rData.taxRates || [],
          taxDefaultId: rData.taxDefaultId || null,
          pricesIncludeTax: rData.pricesIncludeTax || false,
          taxSplitEnabled: rData.taxSplitEnabled || true,
          currencyDecimalPlaces: rData.currencyDecimalPlaces ?? 2,
          deliveryRadiusKm: rData.deliveryRadiusKm || null,
          branchLatitude: rData.branchLatitude || null,
          branchLongitude: rData.branchLongitude || null,
          // Payment settings
          onlinePaymentEnabled: !!rData.onlinePaymentEnabled,
          razorpayKeyId: rData.razorpayKeyId || null,
        };

        const items = Array.isArray(mData) ? mData : (mData.items || mData.products || []);
        const cats = [...new Set(items.map(i => i.category || i.categoryName || 'Other'))];

        setRestaurant(formattedRestaurant);
        try {
          sessionStorage.setItem(`restaurant_${restaurantId}`, JSON.stringify(formattedRestaurant));
        } catch (e) {
          console.warn('Failed to save restaurant settings to sessionStorage', e);
        }
        setMenu(items);
        setCategories(cats);
        setActiveCategory(cats[0] || null);
      } catch (err) {
        // Fall back to mock data gracefully
        console.warn('[CafeQR] Backend unreachable — using mock data', err);
        const cats = [...new Set(MOCK_MENU.map(i => i.category))];
        setRestaurant(MOCK_RESTAURANT);
        setMenu(MOCK_MENU);
        setCategories(cats);
        setActiveCategory(cats[0]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [restaurantId, orderType, orgId, router]);

  // ── Cart helpers ─────────────────────────────────────────────────
  const addItem = (item) => setCart(prev => {
    const key = item.cartItemId || item.id;
    const existing = prev.find(i => (i.cartItemId || i.id) === key);
    if (existing) return prev.map(i => (i.cartItemId || i.id) === key ? { ...i, qty: i.qty + 1 } : i);
    return [...prev, {
      id: key,
      cartItemId: key,
      productId: item.productId || item.id,
      name: item.displayName || item.name,
      variantName: item.variantName || null,
      variantId: item.variantId || null,
      price: Number(item.price),
      qty: 1,
      taxRate: item.taxRate,
      isPackagedGood: item.isPackagedGood
    }];
  });

  const removeItem = (id) => setCart(prev => {
    const existing = prev.find(i => i.id === id || i.cartItemId === id);
    if (!existing || existing.qty === 1) return prev.filter(i => i.id !== id && i.cartItemId !== id);
    return prev.map(i => (i.id === id || i.cartItemId === id) ? { ...i, qty: i.qty - 1 } : i);
  });

  const getQty = (id) => cart.filter(i => (i.productId || i.id) === id || (i.cartItemId || i.id) === id).reduce((sum, i) => sum + i.qty, 0);

  const scrollToCategory = (cat) => {
    setActiveCategory(cat);
    categoryRefs.current[cat]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // ── Filtering ────────────────────────────────────────────────────
  const filtered = menu.filter(i => {
    const matchSearch = !search ||
      (i.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (i.description || '').toLowerCase().includes(search.toLowerCase());
    const isVeg = i.isVeg ?? i.is_veg ?? (i.productType === 'VEG' || i.productType === 'Vegetarian');
    const matchVeg = !vegOnly || !categoryInfo.showVegFilter || isVeg;
    return matchSearch && matchVeg;
  });

  const grouped = categories.reduce((acc, cat) => {
    acc[cat] = filtered.filter(i => (i.category || i.categoryName || 'Other') === cat);
    return acc;
  }, {});

  // ── Loading state ────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-stone-50">
      {/* Skeleton header */}
      <div className="bg-white">
        <div className="h-40 bg-stone-200 animate-pulse" />
        <div className="px-4 py-4 space-y-2">
          <div className="h-5 w-40 bg-stone-200 rounded animate-pulse" />
          <div className="h-4 w-56 bg-stone-100 rounded animate-pulse" />
          <div className="h-3 w-48 bg-stone-100 rounded animate-pulse" />
        </div>
      </div>
      <div className="px-4 mt-4 space-y-3">
        {[1, 2, 3, 4].map(n => (
          <div key={n} className="bg-white rounded-xl p-4 flex gap-4">
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 bg-stone-200 rounded animate-pulse" />
              <div className="h-3 w-full bg-stone-100 rounded animate-pulse" />
              <div className="h-4 w-1/4 bg-stone-200 rounded animate-pulse" />
            </div>
            <div className="w-20 h-20 bg-stone-200 rounded-xl animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="text-5xl">😕</span>
      <h2 className="font-bold text-stone-800 text-lg">Could not load items</h2>
      <p className="text-stone-400 text-sm">{error}</p>
      <button onClick={() => window.location.reload()} className="bg-brand-orange text-white px-6 py-3 rounded-xl font-semibold text-sm">
        Try Again
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50">

      {/* Restaurant / Store Hero */}
      <div className="bg-white">
        <div className="relative w-full h-44 sm:h-52 md:h-64 overflow-hidden bg-stone-900">
          {restaurant?.bannerUrl ? (
            <img
              src={restaurant.bannerUrl}
              alt={restaurant.name || 'Hero Banner'}
              className="w-full h-full object-cover object-center transform transition-transform duration-700 hover:scale-105"
              loading="eager"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-orange-400 to-red-500 relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center justify-center opacity-20">
                <span className="text-8xl">{categoryInfo.heroEmoji}</span>
              </div>
            </div>
          )}

          {/* Dark gradient overlay to guarantee text and button readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />

          {/* Back button */}
          <button
            onClick={() => router.back()}
            className="absolute top-4 left-4 bg-black/40 backdrop-blur-md text-white p-2.5 rounded-full hover:bg-black/60 transition-all z-10 shadow-sm"
          >
            <FiArrowLeft size={18} />
          </button>
          <div className="absolute top-4 right-4 z-10">
            <span className="bg-black/40 backdrop-blur-md text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm">
              {orderType === 'DELIVERY' ? '🚴 Delivery' : '🛖 Takeaway'}
            </span>
          </div>
        </div>
        <div className="px-4 py-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-stone-900">{restaurant?.name}</h1>
                {categoryInfo.categoryLabel && (
                  <span className="bg-orange-50 text-brand-orange border border-orange-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {categoryInfo.categoryLabel}
                  </span>
                )}
              </div>
              <p className="text-stone-500 text-sm mt-0.5">{restaurant?.tagline || restaurant?.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-2 text-sm text-stone-500">
            <span className="flex items-center gap-1">
              <FiStar size={13} className="text-amber-400 fill-amber-400" />
              <span className="font-semibold text-stone-700">{restaurant?.rating}</span>
            </span>
            <span className="text-stone-300">|</span>
            <span className="flex items-center gap-1">
              <FiClock size={13} />
              {restaurant?.delivery_time || restaurant?.deliveryTime || '20-35 min'}
            </span>
            <span className="text-stone-300">|</span>
            <span className="flex items-center gap-1 truncate">
              <FiMapPin size={13} />
              {(restaurant?.address || '').split(',')[0]}
            </span>
          </div>
          {restaurant?.min_order && (
            <p className="text-xs text-stone-400 mt-1.5">Min. order ₹{restaurant.min_order}</p>
          )}
        </div>
      </div>

      {/* Search + Filter Bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-stone-100">
        <div className="flex items-center gap-2 px-4 pt-2.5 pb-2">
          <div className="flex items-center gap-2 bg-stone-100 rounded-xl px-3.5 py-2.5 flex-1">
            <FiSearch size={15} className="text-stone-400 flex-shrink-0" />
            <input
              type="text"
              placeholder={categoryInfo.searchPlaceholder}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent flex-1 text-sm text-stone-700 outline-none placeholder-stone-400 min-w-0"
            />
          </div>
          {categoryInfo.showVegFilter && (
            <button
              onClick={() => setVegOnly(v => !v)}
              className={`flex-shrink-0 text-xs font-semibold px-3 py-2.5 rounded-xl border-2 transition-colors ${vegOnly ? 'bg-green-500 text-white border-green-500' : 'border-stone-200 text-stone-500 bg-white'
                }`}
            >
              🥦 Veg
            </button>
          )}
        </div>

        {/* Category pills (hidden during search) */}
        {!search && (
          <div className="flex gap-2 px-4 pb-2.5 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => { setActiveCategory(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className={`flex-shrink-0 text-xs font-semibold px-4 py-2 rounded-full border transition-colors ${!activeCategory ? 'bg-brand-orange text-white border-brand-orange' : 'bg-white text-stone-600 border-stone-200'
                }`}
            >All</button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => scrollToCategory(cat)}
                className={`flex-shrink-0 text-xs font-semibold px-4 py-2 rounded-full border transition-colors ${activeCategory === cat
                    ? 'bg-brand-orange text-white border-brand-orange'
                    : 'bg-white text-stone-600 border-stone-200 hover:border-brand-orange hover:text-brand-orange'
                  }`}
              >{cat}</button>
            ))}
          </div>
        )}
      </div>

      {/* Menu / Catalog Items */}
      <div className="pb-28">
        {search || vegOnly ? (
          <div className="bg-white mx-4 mt-3 rounded-xl px-4">
            <p className="text-xs text-stone-400 pt-3 pb-1">{filtered.length} items</p>
            {filtered.map(item => (
              <MenuItemCard
                key={item.id}
                item={item}
                qty={getQty(item.id)}
                onAdd={addItem}
                onRemove={removeItem}
                onSelectVariant={setSelectedVariantItem}
                showVegBadge={categoryInfo.showVegBadge}
                defaultEmoji={categoryInfo.placeholderEmoji}
              />
            ))}
            {filtered.length === 0 && (
              <div className="py-12 text-center">
                <p className="text-stone-400 text-sm">No items found</p>
              </div>
            )}
          </div>
        ) : (
          categories.map(cat => (
            grouped[cat]?.length > 0 && (
              <div key={cat} ref={el => { if (el) categoryRefs.current[cat] = el; }}>
                <div className="px-4 pt-4 pb-1.5">
                  <h2 className="font-bold text-stone-700 text-base">{cat}</h2>
                  <p className="text-xs text-stone-400">{grouped[cat].length} items</p>
                </div>
                <div className="bg-white mx-4 rounded-xl px-4">
                  {grouped[cat].map(item => (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      qty={getQty(item.id)}
                      onAdd={addItem}
                      onRemove={removeItem}
                      onSelectVariant={setSelectedVariantItem}
                      showVegBadge={categoryInfo.showVegBadge}
                      defaultEmoji={categoryInfo.placeholderEmoji}
                    />
                  ))}
                </div>
              </div>
            )
          ))
        )}
      </div>

      {/* Floating cart + drawer */}
      <FloatingCartBar cart={cart} onClick={() => setCartOpen(true)} />
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        onAdd={addItem}
        onRemove={removeItem}
        restaurantName={restaurant?.name}
        minOrder={restaurant?.min_order}
        onCheckout={() => {
          setCartOpen(false);
          // Pass cart via sessionStorage so checkout page can read it
          try { sessionStorage.setItem(`cart_${restaurantId}`, JSON.stringify(cart)); } catch { }
          router.push(`/checkout?r=${restaurantId}&t=${orderType}${orgId ? `&orgId=${orgId}` : ''}`);
        }}
      />

      {/* Variant Selector Modal */}
      <VariantSelectorModal
        item={selectedVariantItem}
        isOpen={!!selectedVariantItem}
        onClose={() => setSelectedVariantItem(null)}
        onAddToCart={addItem}
      />
    </div>
  );
}

export default function OrderPage({ slugHandle, branchHandle }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-brand-orange border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <OrderPageInner slugHandle={slugHandle} branchHandle={branchHandle} />
    </Suspense>
  );
}
