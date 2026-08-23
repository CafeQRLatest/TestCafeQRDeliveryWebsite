'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { FiSearch, FiArrowLeft, FiStar, FiClock, FiMapPin, FiShoppingBag, FiMail, FiCheck, FiLock, FiArrowRight, FiUser, FiLogOut, FiX, FiPhone, FiPhoneCall, FiBox, FiPackage, FiChevronDown, FiInstagram, FiFacebook, FiTwitter, FiGlobe } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import MenuItemCard from '@/components/MenuItemCard';
import CartDrawer from '@/components/CartDrawer';
import FloatingCartBar from '@/components/FloatingCartBar';
import VariantSelectorModal from '@/components/VariantSelectorModal';
import { fetchDeliverySettings, fetchMenu, resolveSlug, fetchReviews, submitReview } from '@/lib/apiClient';

/**
 * Dynamic Category Info Resolver based on Store/Branch posType
 */
function getBusinessCategoryInfo(posType = 'Restaurant') {
  const displayLabel = String(posType || 'Restaurant').trim();
  const norm = displayLabel.toUpperCase();

  const isBoutique = norm.includes('BOUTIQUE') || norm.includes('FASHION') || norm.includes('APPAREL') || norm.includes('CLOTH');
  const isGrocery = norm.includes('GROCERY') || norm.includes('SUPERMARKET') || norm.includes('MART');
  const isBakery = norm.includes('BAKERY') || norm.includes('BAKE') || norm.includes('PASTRY') || norm.includes('CAKE');
  const isSalon = norm.includes('SALON') || norm.includes('SPA') || norm.includes('BEAUTY');
  const isFood = norm.includes('RESTAURANT') || norm.includes('CAFE') || norm.includes('QSR') || norm.includes('BISTRO') || norm.includes('FOOD') || norm.includes('BAR') || norm.includes('DINING');

  let defaultHeroImage = '/images/isometric_side_hero.png';
  let placeholderEmoji = '📦';
  let heroEmoji = '📦';
  let showVegFilter = false;

  if (isBoutique) {
    heroEmoji = '👗'; placeholderEmoji = '👗'; defaultHeroImage = '/images/isometric_side_hero.png';
  } else if (isGrocery) {
    heroEmoji = '🛒'; placeholderEmoji = '📦'; defaultHeroImage = '/images/grocery_showcase.png';
  } else if (isBakery) {
    heroEmoji = '🥐'; placeholderEmoji = '🧁'; defaultHeroImage = '/images/grocery_showcase.png'; showVegFilter = true;
  } else if (isSalon) {
    heroEmoji = '💇'; placeholderEmoji = '🧴'; defaultHeroImage = '/images/isometric_side_hero.png';
  } else if (isFood) {
    heroEmoji = '🍽️'; placeholderEmoji = '🥘'; defaultHeroImage = '/images/isometric_side_hero.png'; showVegFilter = true;
  }

  return {
    heroEmoji,
    placeholderEmoji,
    defaultHeroImage,
    categoryLabel: displayLabel,
    searchPlaceholder: `Search ${displayLabel} items…`,
    showVegFilter
  };
}

function OrderPageInner({ slugHandle, branchHandle }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryRestaurantId = searchParams.get('r') || '48278854-f080-4681-b6e7-54cebd11b7f7';
  const orderType = searchParams.get('t') || 'DELIVERY';
  const queryOrgId = searchParams.get('orgId') || searchParams.get('branchId') || '';

  const targetHandle = slugHandle || queryRestaurantId;
  const targetBranch = branchHandle || queryOrgId;

  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'menu' | 'about' | 'location'
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [resolvedIds, setResolvedIds] = useState({
    clientId: queryRestaurantId || '48278854-f080-4681-b6e7-54cebd11b7f7',
    orgId: queryOrgId || '',
    clientSlug: slugHandle || null,
    branchSlug: branchHandle || null
  });

  const [storeInfo, setStoreInfo] = useState({
    name: 'sayooj rerstauarant',
    branchName: 'kozhikode',
    tagline: 'YOUR NEIGHBORHOOD STORE & DIRECT DELIVERY',
    address: 'MG Road, Thrissur, Kerala',
    rating: 4.8,
    delivery_time: '15-20 min',
    min_order: 150,
    posType: 'Restaurant',
    bannerUrl: null,
    logoUrl: null,
    reviewsEnabled: true,
  });

  const [reviewsData, setReviewsData] = useState({
    reviewsEnabled: true,
    averageRating: 5.0,
    totalReviews: 0,
    reviews: []
  });
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    customerName: '',
    customerEmail: '',
    comment: ''
  });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewMsg, setReviewMsg] = useState('');

  const [menu, setMenu] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedVariantItem, setSelectedVariantItem] = useState(null);
  const [search, setSearch] = useState('');
  const [vegOnly, setVegOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const categoryRefs = useRef({});
  const dropdownRef = useRef(null);
  const restaurantId = resolvedIds.clientId || targetHandle;
  const orgId = resolvedIds.orgId || targetBranch;

  const categoryInfo = getBusinessCategoryInfo(storeInfo?.posType);

  // ── Persistent Cart Loading & Auto-sync ──
  useEffect(() => {
    if (!restaurantId || typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(`cart_${restaurantId}`) || sessionStorage.getItem(`cart_${restaurantId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCart(parsed);
        }
      }
    } catch (e) {
      console.warn('Failed to load persisted cart', e);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (!restaurantId || typeof window === 'undefined') return;
    try {
      if (cart.length > 0) {
        localStorage.setItem(`cart_${restaurantId}`, JSON.stringify(cart));
        sessionStorage.setItem(`cart_${restaurantId}`, JSON.stringify(cart));
      } else {
        localStorage.removeItem(`cart_${restaurantId}`);
        sessionStorage.removeItem(`cart_${restaurantId}`);
      }
    } catch (e) {
      console.warn('Failed to persist cart', e);
    }
  }, [cart, restaurantId]);

  // ── Close profile dropdown when clicking outside ──
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    };
    if (profileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileMenuOpen]);

  // ── Authentication & OTP state ──
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [userEmail, setUserEmail] = useState('');

  const [email, setEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // ── Customer Profile state ──
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    phone: '',
    address: '',
    landmark: '',
    city: '',
    pincode: '',
    dietaryPreference: 'ALL',
    deliveryNotes: ''
  });
  const [profileMsg, setProfileMsg] = useState('');

  useEffect(() => {
    if (userEmail && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`profile_${userEmail}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          setProfileForm(prev => ({ ...prev, ...parsed }));
        }
      } catch (e) { }
    }
  }, [userEmail, showProfileModal]);

  const handleSaveProfile = (e) => {
    if (e) e.preventDefault();
    if (userEmail && typeof window !== 'undefined') {
      try {
        localStorage.setItem(`profile_${userEmail}`, JSON.stringify(profileForm));
        setProfileMsg('Customer profile saved successfully!');
        setTimeout(() => {
          setProfileMsg('');
          setShowProfileModal(false);
        }, 1200);
      } catch (e) {
        setProfileMsg('Failed to save profile details.');
      }
    }
  };

  // ── 1. Check existing customer session ──
  useEffect(() => {
    // Use AbortController to guarantee we never hang waiting for session
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000); // 3s max wait

    fetch('/api/auth/session', { signal: controller.signal })
      .then(res => {
        if (res.ok) {
          return res.json().then(data => {
            setIsAuthenticated(true);
            setActiveTab('menu');
            if (data?.email) setUserEmail(data.email);
          });
        } else {
          setIsAuthenticated(false);
          setActiveTab('home');
        }
      })
      .catch(() => {
        setIsAuthenticated(false);
        setActiveTab('home');
      })
      .finally(() => {
        clearTimeout(timeout);
        setCheckingSession(false);
      });
  }, []);


  // ── Countdown timer for OTP resend ──
  useEffect(() => {
    if (resendTimer <= 0) return;
    const id = setTimeout(() => setResendTimer(s => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendTimer]);



  // ── 2. Fetch Branch-Wise Settings & Products ──
  useEffect(() => {
    if (!targetHandle) return;

    const loadBranchData = async () => {
      setLoading(true);
      const safetyTimer = setTimeout(() => setLoading(false), 2500);
      try {
        let activeClientId = targetHandle;
        let activeOrgId = targetBranch;

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
        } catch (e) {
          console.warn('[CafeQR] Direct ID resolution used', e);
        }

        // Fetch Branch Settings & Menu in Parallel
        const [settingsRes, menuRes] = await Promise.allSettled([
          fetchDeliverySettings(activeClientId, activeOrgId),
          fetchMenu(activeClientId, activeOrgId)
        ]);

        if (settingsRes.status === 'fulfilled') {
          const rData = settingsRes.value?.data?.data || settingsRes.value?.data;
          if (rData) {
            const clientNameVal = rData.clientName || rData.restaurantName || (rData.name && rData.name.toLowerCase() !== (rData.branchName || '').toLowerCase() ? rData.name : null) || 'sayooj rerstauarant';
            const branchNameVal = rData.branchName || rData.name || 'kozhikode';
            setStoreInfo({
              name: clientNameVal,
              branchName: branchNameVal,
              tagline: rData.tagline || 'YOUR NEIGHBORHOOD STORE & DIRECT DELIVERY',
              address: rData.address || 'Local Outlet Address',
              phone: rData.phone || rData.whatsappNumber || null,
              whatsappNumber: rData.whatsappNumber || rData.phone || null,
              instagramUrl: rData.instagramUrl || null,
              facebookUrl: rData.facebookUrl || null,
              twitterUrl: rData.twitterUrl || null,
              openingHours: rData.openingHours || 'Open Daily: 10:00 AM - 11:00 PM',
              rating: rData.rating || 4.8,
              delivery_time: rData.estimatedDeliveryMinutes ? `${rData.estimatedDeliveryMinutes} min` : '15-25 min',
              min_order: rData.minOrderAmount || 0,
              posType: rData.posType || 'Restaurant',
              bannerUrl: rData.bannerUrl || null,
              logoUrl: rData.logoUrl || null,
              taxEnabled: rData.taxEnabled || false,
              taxLabelGlobal: rData.taxLabelGlobal || 'Tax',
              taxRates: rData.taxRates || [],
              taxDefaultId: rData.taxDefaultId || null,
              pricesIncludeTax: rData.pricesIncludeTax || false,
              taxSplitEnabled: rData.taxSplitEnabled || true,
              currencyDecimalPlaces: rData.currencyDecimalPlaces ?? 2,
              deliveryRadiusKm: rData.deliveryRadiusKm || null,
              branchLatitude: rData.branchLatitude || null,
              branchLongitude: rData.branchLongitude || null,
              onlinePaymentEnabled: !!rData.onlinePaymentEnabled,
              razorpayKeyId: rData.razorpayKeyId || null,
              reviewsEnabled: rData.reviewsEnabled !== false,
            });
          }
        }

        if (menuRes.status === 'fulfilled') {
          const mData = menuRes.value?.data?.data || menuRes.value?.data;
          const items = Array.isArray(mData) ? mData : (mData?.items || mData?.products || []);

          if (items && items.length > 0) {
            setMenu(items);
            const cats = Array.from(new Set(items.map(i => i.category || i.categoryName || 'General'))).filter(Boolean);
            setCategories(cats);
            if (cats.length > 0) setActiveCategory('ALL');
          } else {
            setMenu([]);
            setCategories([]);
            setActiveCategory(null);
          }
        }
      } catch (e) {
        console.error('Error loading branch delivery data', e);
      } finally {
        clearTimeout(safetyTimer);
        setLoading(false);
      }
    };

    // Run immediately — don't wait for session check
    loadBranchData();
  }, [targetHandle, targetBranch]);


  const loadReviews = async () => {
    if (!restaurantId) return;
    setLoadingReviews(true);
    try {
      const res = await fetchReviews(restaurantId, orgId);
      const data = res.data?.data || res.data;
      if (data) {
        setReviewsData({
          reviewsEnabled: data.reviewsEnabled !== false,
          averageRating: data.averageRating || 5.0,
          totalReviews: data.totalReviews || (data.reviews ? data.reviews.length : 0),
          reviews: Array.isArray(data.reviews) ? data.reviews : []
        });
      }
    } catch (e) {
      console.warn('Failed to load reviews', e);
    } finally {
      setLoadingReviews(false);
    }
  };

  useEffect(() => {
    if (restaurantId && (activeTab === 'reviews' || activeTab === 'home')) {
      loadReviews();
    }
  }, [restaurantId, orgId, activeTab]);

  const handleCreateReview = async (e) => {
    if (e) e.preventDefault();
    if (!reviewForm.customerName.trim()) {
      setReviewMsg('Please enter your name');
      return;
    }
    setSubmittingReview(true);
    setReviewMsg('');
    try {
      await submitReview(restaurantId, {
        orgId: orgId,
        customerName: reviewForm.customerName.trim(),
        customerEmail: reviewForm.customerEmail.trim() || userEmail || '',
        rating: reviewForm.rating,
        comment: reviewForm.comment.trim()
      });
      setReviewMsg('Thank you! Your review has been submitted.');
      setTimeout(() => {
        setShowReviewModal(false);
        setReviewForm({ rating: 5, customerName: '', customerEmail: '', comment: '' });
        setReviewMsg('');
        loadReviews();
      }, 1200);
    } catch (err) {
      setReviewMsg(err?.message || 'Failed to submit review. Please try again.');
    } finally {
      setSubmittingReview(false);
    }
  };

  // ── OTP Handlers ──
  const sendOtp = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setAuthError('Enter a valid email address');
      return;
    }
    setAuthLoading(true); setAuthError('');
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) { setAuthError(data.message || data.error || 'Could not send OTP'); return; }
      setOtpSent(true);
      setResendTimer(60);
    } catch {
      setAuthError('Network error. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp || otp.length < 6) { setAuthError('Enter the 6-digit OTP'); return; }
    setAuthLoading(true); setAuthError('');
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok) { setAuthError(data.error || 'Incorrect OTP. Please try again.'); return; }
      setOtpVerified(true);
      setUserEmail(email);
      setTimeout(() => {
        setIsAuthenticated(true);
        setShowLoginModal(false);
        setActiveTab('menu');
      }, 500);
    } catch {
      setAuthError('Verification failed. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const fetchCustomerOrders = async () => {
    if (!userEmail || !restaurantId) return;
    setLoadingOrders(true);
    try {
      const res = await fetch(`/api/delivery/orders?clientId=${restaurantId}&email=${encodeURIComponent(userEmail)}`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data?.data || data?.orders || []);
        setCustomerOrders(list);
      }
    } catch (e) {
      console.warn('Failed to fetch orders', e);
    } finally {
      setLoadingOrders(false);
    }
  };

  // ── Cart Handlers ──
  const addItem = (item) => setCart(prev => {
    const key = item.cartItemId || item.id;
    const existing = prev.find(i => (i.cartItemId || i.id) === key);
    if (existing) return prev.map(i => (i.cartItemId || i.id) === key ? { ...i, qty: i.qty + 1 } : i);
    return [...prev, {
      id: key,
      cartItemId: key,
      productId: item.productId || item.id,
      name: item.name,
      price: Number(item.price),
      qty: 1,
      variantId: item.variantId || null,
      variantName: item.variantName || null,
    }];
  });

  const removeItem = (id) => setCart(prev => {
    const existing = prev.find(i => (i.cartItemId || i.id) === id);
    if (!existing) return prev;
    if (existing.qty === 1) return prev.filter(i => (i.cartItemId || i.id) !== id);
    return prev.map(i => (i.cartItemId || i.id) === id ? { ...i, qty: i.qty - 1 } : i);
  });

  const updateVariantQuantities = (item, quantitiesMap, variantOptions) => {
    setCart(prev => {
      let updated = [...prev];
      Object.entries(quantitiesMap).forEach(([varId, qty]) => {
        const variantObj = variantOptions.find(v => String(v.id) === String(varId));
        if (!variantObj) return;
        const key = `${item.id}_var_${varId}`;
        updated = updated.filter(i => (i.cartItemId || i.id) !== key);
        if (qty > 0) {
          updated.push({
            id: key,
            cartItemId: key,
            productId: item.id,
            name: item.name,
            variantId: varId,
            variantName: variantObj.variantName || variantObj.name,
            price: Number(variantObj.price || item.price),
            qty: qty,
          });
        }
      });
      return updated;
    });
  };

  const getQty = (id) => {
    return cart.filter(i => i.productId === id || i.id === id).reduce((sum, i) => sum + i.qty, 0);
  };

  const categoryScrollRef = useRef(null);

  const scrollCategoryLeft = () => {
    if (categoryScrollRef.current) {
      categoryScrollRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollCategoryRight = () => {
    if (categoryScrollRef.current) {
      categoryScrollRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  const selectCategoryFilter = (cat) => {
    setActiveCategory(cat);
    if (cat !== 'ALL' && categoryRefs.current[cat]) {
      const top = categoryRefs.current[cat].getBoundingClientRect().top + window.scrollY - 140;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  // ── Menu Filtering ──
  const filtered = menu.filter(i => {
    const matchSearch = !search ||
      (i.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (i.description || '').toLowerCase().includes(search.toLowerCase());
    const isVeg = i.isVeg ?? i.is_veg ?? (i.productType === 'VEG' || i.productType === 'Vegetarian');
    const matchVeg = !vegOnly || !categoryInfo.showVegFilter || isVeg;
    const catName = (i.category || i.categoryName || 'General');
    const matchCategory = !activeCategory || activeCategory === 'ALL' || catName === activeCategory;
    return matchSearch && matchVeg && matchCategory;
  });

  const displayCategories = (!activeCategory || activeCategory === 'ALL')
    ? categories
    : categories.filter(c => c === activeCategory);

  const grouped = displayCategories.reduce((acc, cat) => {
    acc[cat] = filtered.filter(i => (i.category || i.categoryName || 'General') === cat);
    return acc;
  }, {});

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fffdfa]">
        <div className="w-10 h-10 border-4 border-[#f97316] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fffdfa] text-stone-900 font-sans w-full max-w-full overflow-x-hidden flex flex-col justify-between">
      
      {/* ── TOP NAVBAR (BRANCH LOGO LEFT, CENTER NAV, RIGHT PROFILE) ── */}
      <header className="sticky top-0 z-40 bg-[#fffdfa]/95 backdrop-blur-md border-b border-[#fed7aa] px-2 sm:px-6 py-2 sm:py-2.5 shadow-xs w-full max-w-full shrink-0">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-1.5 sm:gap-4">
            
            {/* Left Branch Logo */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {storeInfo.logoUrl ? (
                <img src={storeInfo.logoUrl} alt={storeInfo.name} className="h-7 sm:h-10 w-auto max-w-[85px] sm:max-w-[130px] object-contain rounded-lg" />
              ) : (
                <div className="w-10 sm:w-24 hidden sm:block shrink-0" />
              )}
            </div>

            {/* Center Navigation Links (Scrollable & Responsive on Mobile) */}
            <nav className="flex items-center justify-center gap-1 sm:gap-6 text-[10px] sm:text-xs font-black tracking-wider sm:tracking-widest text-[#7c2d12] uppercase overflow-x-auto scrollbar-hide py-1 px-1 flex-1 min-w-0">
              <button onClick={() => setActiveTab('home')} className={`transition-colors whitespace-nowrap px-1.5 sm:px-2 py-0.5 shrink-0 ${activeTab === 'home' ? 'text-[#f97316] border-b-2 border-[#f97316]' : 'hover:text-[#f97316]'}`}>ABOUT</button>
              <button onClick={() => !isAuthenticated ? setShowLoginModal(true) : setActiveTab('menu')} className={`transition-colors whitespace-nowrap px-1.5 sm:px-2 py-0.5 shrink-0 ${activeTab === 'menu' ? 'text-[#f97316] border-b-2 border-[#f97316]' : 'hover:text-[#f97316]'}`}>PRODUCTS</button>
              {storeInfo.reviewsEnabled !== false && (
                <button onClick={() => { setActiveTab('reviews'); loadReviews(); }} className={`transition-colors whitespace-nowrap px-1.5 sm:px-2 py-0.5 shrink-0 ${activeTab === 'reviews' ? 'text-[#f97316] border-b-2 border-[#f97316]' : 'hover:text-[#f97316]'}`}>REVIEWS</button>
              )}
              <button onClick={() => setActiveTab('location')} className={`transition-colors whitespace-nowrap px-1.5 sm:px-2 py-0.5 shrink-0 ${activeTab === 'location' ? 'text-[#f97316] border-b-2 border-[#f97316]' : 'hover:text-[#f97316]'}`}>CONTACT</button>
            </nav>

            {/* Right: Profile / Sign In Action Button */}
            <div className="flex items-center gap-2 shrink-0 relative">
              {isAuthenticated ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setProfileMenuOpen(v => !v)}
                    className="flex items-center gap-1.5 bg-white border border-[#fed7aa] hover:border-[#f97316] px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full shadow-sm text-stone-800 transition-all"
                  >
                    <div className="w-6 h-6 sm:w-7 sm:h-7 bg-[#f97316] text-white rounded-full flex items-center justify-center font-black text-xs uppercase shadow-sm">
                      {userEmail ? userEmail[0].toUpperCase() : <FiUser size={13} />}
                    </div>
                    <span className="hidden md:inline-block text-xs font-bold text-[#7c2d12] max-w-[100px] truncate">
                      {userEmail}
                    </span>
                    <FiChevronDown size={13} className={`text-stone-500 transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Profile Dropdown Menu */}
                  {profileMenuOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-orange-200 shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
                      <div className="px-4 py-3 border-b border-orange-100 bg-orange-50/60">
                        <p className="text-[10px] font-black text-[#ea580c] uppercase tracking-wider">SIGNED IN AS</p>
                        <p className="text-xs font-bold text-stone-800 truncate mt-0.5">{userEmail}</p>
                      </div>
                      <div className="py-1">
                        <button
                          onClick={() => {
                            setProfileMenuOpen(false);
                            setActiveTab('profile');
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs font-bold text-stone-700 hover:bg-orange-50 flex items-center gap-2.5"
                        >
                          <FiUser size={15} className="text-[#f97316]" />
                          <span>My Profile</span>
                        </button>
                        <button
                          onClick={() => {
                            setProfileMenuOpen(false);
                            setActiveTab('orders');
                            fetchCustomerOrders();
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs font-bold text-stone-700 hover:bg-orange-50 flex items-center gap-2.5"
                        >
                          <FiPackage size={15} className="text-[#f97316]" />
                          <span>My Orders</span>
                        </button>
                        <button
                          onClick={() => {
                            setProfileMenuOpen(false);
                            document.cookie = 'delivery_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                            setIsAuthenticated(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2.5 border-t border-stone-100 mt-1 pt-2"
                        >
                          <FiLogOut size={15} />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="bg-white border-2 border-[#f97316] hover:bg-orange-50 text-[#f97316] text-[10px] sm:text-xs font-black px-2.5 py-1 sm:px-4 sm:py-1.5 rounded-full uppercase tracking-wider transition-all flex items-center gap-1 shadow-sm shrink-0"
                >
                  <FiUser size={12} />
                  <span>SIGN IN</span>
                </button>
              )}
            </div>

          </div>
        </header>

      {/* ── HOME TAB CONTENT ── */}
      {activeTab === 'home' && (
        <div className="flex-1 flex flex-col justify-between w-full min-h-[calc(100vh-65px)]">
          <section className="relative bg-[#fffdfa] border-b border-[#fed7aa] overflow-hidden py-12 sm:py-20 px-4 sm:px-6 w-full flex-1 flex flex-col justify-center items-center">
            <div className="absolute inset-0 opacity-25 pointer-events-none" style={{ backgroundImage: `linear-gradient(#fed7aa 1px, transparent 1px), linear-gradient(90deg, #fed7aa 1px, transparent 1px)`, backgroundSize: `40px 40px` }} />
            <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center text-center py-6 sm:py-12 px-2">
              
              {/* Client Brand Name */}
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-[#ea580c] tracking-tight uppercase leading-tight drop-shadow-xs mb-2 font-serif">
                {storeInfo.name || 'SAYOOJ RESTAURANT'}
              </h1>

              {/* Branch Type & Organization Name directly under Client Name */}
              <p className="text-xs sm:text-sm font-black text-[#c2410c] tracking-widest uppercase mb-4 opacity-90 font-sans">
                {storeInfo.posType || 'RESTAURANT'} &bull; {storeInfo.branchName || 'KOZHIKODE'}
              </p>

              {/* Primary Order Action Button */}
              <div className="mt-4 sm:mt-6">
                <button onClick={() => !isAuthenticated ? setShowLoginModal(true) : setActiveTab('menu')} className="bg-[#f97316] hover:bg-[#ea580c] text-white text-xs sm:text-sm font-black px-6 py-3 sm:px-8 sm:py-3.5 rounded-full uppercase tracking-wider transition-all transform hover:scale-105 shadow-md shadow-orange-500/20 flex items-center gap-2">
                  <span>EXPLORE STORE & ORDER</span>
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ── REVIEWS TAB CONTENT ── */}
      {activeTab === 'reviews' && storeInfo.reviewsEnabled !== false && (
        <div className="flex-1 flex flex-col justify-between w-full min-h-[calc(100vh-65px)] bg-stone-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full flex-1">
            
            {/* Rating Banner Header (Compact Low-Size Design) */}
            <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-xs border border-orange-200/80 mb-5 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex flex-col items-center justify-center text-white shadow-xs shrink-0">
                  <span className="text-lg sm:text-xl font-black">{reviewsData.averageRating.toFixed(1)}</span>
                  <div className="flex text-white/90 text-[10px] -mt-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star}>★</span>
                    ))}
                  </div>
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-black text-stone-900 font-serif">Customer Ratings & Reviews</h2>
                  <p className="text-[11px] sm:text-xs text-stone-500 mt-0.5 font-medium">
                    Based on {reviewsData.totalReviews} verified customer reviews for {storeInfo.name} ({storeInfo.branchName})
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  if (!isAuthenticated) {
                    setAuthError('Please sign in to post a review.');
                    setShowLoginModal(true);
                    return;
                  }
                  setReviewForm(prev => ({
                    ...prev,
                    customerEmail: userEmail || '',
                    customerName: prev.customerName || (userEmail ? userEmail.split('@')[0] : '')
                  }));
                  setShowReviewModal(true);
                }}
                className="bg-[#f97316] hover:bg-[#ea580c] text-white text-[11px] font-black px-4 py-2 sm:px-5 sm:py-2.5 rounded-full uppercase tracking-wider transition-all shadow-xs shrink-0 flex items-center gap-1.5"
              >
                <FiStar size={14} />
                <span>WRITE A REVIEW</span>
              </button>
            </div>

            {/* Review List */}
            {loadingReviews ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-[#f97316] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : reviewsData.reviews.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {reviewsData.reviews.map((rev) => (
                  <div key={rev.id} className="bg-white rounded-xl p-4 border border-stone-200/80 shadow-2xs flex flex-col justify-between space-y-2.5">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-orange-100 text-[#ea580c] font-black text-xs flex items-center justify-center uppercase">
                            {rev.customerName ? rev.customerName[0] : 'C'}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-stone-800">{rev.customerName || 'Anonymous'}</h4>
                            <p className="text-[10px] text-stone-400 font-medium">
                              {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recent Customer'}
                            </p>
                          </div>
                        </div>
                        <div className="flex text-[#f97316] text-xs font-bold bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span key={star} className={star <= (rev.rating || 5) ? 'text-[#f97316]' : 'text-stone-300'}>★</span>
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-stone-600 font-medium leading-relaxed italic">
                        &quot;{rev.comment || 'Great experience and wonderful products!'}&quot;
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 shadow-xs">
                <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                  ★
                </div>
                <h3 className="text-lg font-black text-stone-800">No Reviews Yet</h3>
                <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                  Be the first customer to share your dining or delivery experience with {storeInfo.name}!
                </p>
                <button
                  onClick={() => setShowReviewModal(true)}
                  className="mt-5 bg-[#f97316] text-white text-xs font-black px-6 py-2.5 rounded-full uppercase tracking-wider hover:bg-[#ea580c] transition-all"
                >
                  BE THE FIRST TO REVIEW
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── PRODUCTS / CATALOG TAB ── */}
      {activeTab === 'menu' && (
        <div className="min-h-screen bg-stone-50 w-full max-w-full overflow-x-hidden">
          {/* Top Search Bar & Category Navigation Bar */}
          <div className="sticky top-[53px] sm:top-[65px] z-20 bg-white/95 backdrop-blur-md border-b border-stone-200/80 shadow-xs px-3 sm:px-6 py-3 w-full max-w-full">
            <div className="max-w-4xl mx-auto flex items-center gap-2 sm:gap-3 w-full">
              {/* Clean Icon-less Search Input */}
              <div className="relative flex-1 min-w-0 bg-stone-100/90 hover:bg-stone-100 border border-stone-200 focus-within:border-[#f97316] focus-within:bg-white focus-within:ring-2 focus-within:ring-orange-100 rounded-full px-4 py-2 sm:py-2.5 transition-all shadow-inner">
                <input
                  type="text"
                  placeholder={categoryInfo.searchPlaceholder}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="bg-transparent text-xs sm:text-sm font-semibold text-stone-800 placeholder:text-stone-400 placeholder:font-medium outline-none w-full min-w-0"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 text-[10px] font-black tracking-wider px-1.5 py-0.5 rounded-full hover:bg-stone-200 transition-colors"
                  >
                    CLEAR
                  </button>
                )}
              </div>

              {/* Clean Icon-less Veg Only Toggle Pill */}
              {categoryInfo.showVegFilter && (
                <button
                  onClick={() => setVegOnly(v => !v)}
                  className={`text-[10px] sm:text-xs font-black uppercase tracking-wider px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full border transition-all shrink-0 shadow-2xs ${
                    vegOnly
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50'
                  }`}
                >
                  {vegOnly ? 'VEG ONLY ✓' : 'VEG ONLY'}
                </button>
              )}
            </div>

            {/* Category Navigation Carousel Bar */}
            {!search && categories.length > 0 && (
              <div className="max-w-4xl mx-auto flex items-center gap-1 mt-2.5 w-full relative">
                {/* Left Scroll Button */}
                <button
                  type="button"
                  onClick={scrollCategoryLeft}
                  className="hidden sm:flex items-center justify-center w-7 h-7 rounded-full bg-stone-100 hover:bg-orange-100 text-stone-600 hover:text-[#f97316] shrink-0 transition-colors shadow-2xs font-bold text-xs"
                  aria-label="Scroll left"
                >
                  ‹
                </button>

                {/* Carousel Items Container */}
                <div
                  ref={categoryScrollRef}
                  className="flex gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide py-1 px-0.5 w-full items-center scroll-smooth"
                >
                  {/* ALL Filter Pill */}
                  <button
                    type="button"
                    onClick={() => selectCategoryFilter('ALL')}
                    className={`flex-shrink-0 text-[10px] sm:text-xs font-bold px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full uppercase tracking-wider transition-all transform active:scale-95 ${
                      !activeCategory || activeCategory === 'ALL'
                        ? 'bg-[#f97316] text-white font-black shadow-sm shadow-orange-500/20'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
                    }`}
                  >
                    ALL
                  </button>

                  {/* Individual Category Pills */}
                  {categories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => selectCategoryFilter(cat)}
                      className={`flex-shrink-0 text-[10px] sm:text-xs font-bold px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full uppercase tracking-wider transition-all transform active:scale-95 ${
                        activeCategory === cat
                          ? 'bg-[#f97316] text-white font-black shadow-sm shadow-orange-500/20'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Right Scroll Button */}
                <button
                  type="button"
                  onClick={scrollCategoryRight}
                  className="hidden sm:flex items-center justify-center w-7 h-7 rounded-full bg-stone-100 hover:bg-orange-100 text-stone-600 hover:text-[#f97316] shrink-0 transition-colors shadow-2xs font-bold text-xs"
                  aria-label="Scroll right"
                >
                  ›
                </button>
              </div>
            )}
          </div>

          {/* Catalog Items */}
          <div className="max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-8 pb-32 w-full max-w-full">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-3.5">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                  <div key={n} className="bg-white/95 rounded-2xl p-3 border border-orange-100 animate-pulse flex flex-col justify-between h-52">
                    <div className="w-full h-28 bg-stone-200/80 rounded-xl" />
                    <div className="space-y-2 mt-2">
                      <div className="h-3 w-3/4 bg-stone-200/80 rounded" />
                      <div className="h-2.5 w-1/2 bg-stone-100 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : displayCategories.length > 0 ? (
              displayCategories.map(cat => (
                grouped[cat]?.length > 0 && (
                  <div key={cat} ref={el => { if (el) categoryRefs.current[cat] = el; }} className="mb-5 sm:mb-7">
                    <div className="flex items-center justify-between border-b border-orange-200/80 pb-1.5 mb-3">
                      <h2 className="text-sm sm:text-lg font-black text-[#ea580c] uppercase tracking-tight">
                        {cat}
                      </h2>
                      <span className="text-[10px] font-black text-[#f97316] bg-orange-100/80 border border-orange-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {grouped[cat].length} ITEMS
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-3.5">
                      {grouped[cat].map(item => (
                        <MenuItemCard
                          key={item.id}
                          item={item}
                          qty={getQty(item.id)}
                          onAdd={addItem}
                          onRemove={removeItem}
                          onSelectVariant={setSelectedVariantItem}
                          showVegBadge={categoryInfo.showVegFilter}
                          defaultEmoji={categoryInfo.placeholderEmoji}
                        />
                      ))}
                    </div>
                  </div>
                )
              ))
            ) : (
              <div className="bg-white/95 backdrop-blur-md rounded-3xl border-2 border-orange-200 p-8 sm:p-16 text-center max-w-lg mx-auto shadow-xl">
                <FiPackage size={48} className="text-[#f97316] mx-auto mb-3" />
                <h3 className="text-lg sm:text-xl font-black text-stone-800 uppercase tracking-tight">NO PRODUCTS LISTED FOR THIS BRANCH</h3>
                <p className="text-xs text-stone-500 mt-2 font-medium">Check back soon or select another branch outlet in admin.</p>
              </div>
            )}
          </div>

          {/* Cart & Checkout Floating Bar (Navigates directly to Checkout) */}
          <FloatingCartBar
            cart={cart}
            onClick={() => {
              try {
                localStorage.setItem(`cart_${restaurantId}`, JSON.stringify(cart));
                sessionStorage.setItem(`cart_${restaurantId}`, JSON.stringify(cart));
              } catch { }
              router.push(`/checkout?r=${restaurantId}&t=${orderType}${orgId ? `&orgId=${orgId}` : ''}`);
            }}
          />

          <VariantSelectorModal
            item={selectedVariantItem}
            isOpen={!!selectedVariantItem}
            onClose={() => setSelectedVariantItem(null)}
            cart={cart}
            onUpdateVariants={updateVariantQuantities}
          />
        </div>
      )}

      {/* ── ABOUT US & LOCATION TABS ── */}
      {activeTab === 'about' && (
        <section className="max-w-4xl mx-auto px-6 py-16 text-center">
          <h2 className="text-3xl font-black text-[#ea580c] uppercase">ABOUT {storeInfo.name}</h2>
          <p className="text-stone-600 mt-4 text-sm leading-relaxed max-w-2xl mx-auto font-medium">
            Welcome to {storeInfo.name}. We provide direct-to-customer local delivery and pickup services for all our branch products.
          </p>
        </section>
      )}

      {activeTab === 'location' && (
        <section className="max-w-4xl mx-auto px-6 py-16 text-center">
          <div className="bg-white rounded-3xl border-2 border-orange-200 p-8 sm:p-12 shadow-xl max-w-2xl mx-auto relative overflow-hidden">
            <div className="w-16 h-16 bg-orange-100 text-[#ea580c] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
              <FiPhoneCall size={30} />
            </div>

            <h2 className="text-3xl font-black text-[#ea580c] uppercase tracking-tight">
              CONTACT DETAILS
            </h2>
            <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mt-1 mb-8">
              {storeInfo.name} &bull; {storeInfo.branchName}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left border-t border-orange-100 pt-8">
              <div className="bg-orange-50/60 p-4 rounded-2xl border border-orange-100 sm:col-span-2">
                <span className="text-[10px] font-black text-[#ea580c] uppercase tracking-wider block mb-1">📍 OUTLET LOCATION ADDRESS</span>
                <p className="text-sm font-bold text-stone-800">{storeInfo.address || 'Kozhikode Outlet, Kerala'}</p>
              </div>

              <div className="bg-orange-50/60 p-4 rounded-2xl border border-orange-100">
                <span className="text-[10px] font-black text-[#ea580c] uppercase tracking-wider block mb-1">📞 PHONE / WHATSAPP</span>
                <p className="text-sm font-bold text-stone-800">{storeInfo.phone || storeInfo.whatsappNumber || '+91 98765 43210'}</p>
              </div>

              <div className="bg-orange-50/60 p-4 rounded-2xl border border-orange-100">
                <span className="text-[10px] font-black text-[#ea580c] uppercase tracking-wider block mb-1">✉️ SUPPORT EMAIL</span>
                <p className="text-sm font-bold text-stone-800">{userEmail || 'support@sayoojrestaurant.com'}</p>
              </div>

              {/* Social Channels Pill Group */}
              <div className="bg-orange-50/60 p-4 rounded-2xl border border-orange-100 sm:col-span-2">
                <span className="text-[10px] font-black text-[#ea580c] uppercase tracking-wider block mb-2">🌐 FOLLOW & CONNECT ONLINE</span>
                <div className="flex flex-wrap items-center gap-2.5">
                  <a href={storeInfo.instagramUrl || 'https://instagram.com'} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 bg-white border border-orange-200 px-3 py-1.5 rounded-full text-xs font-bold text-[#ea580c] hover:bg-[#f97316] hover:text-white transition-all shadow-sm">
                    <FiInstagram size={14} /> Instagram
                  </a>
                  <a href={storeInfo.facebookUrl || 'https://facebook.com'} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 bg-white border border-orange-200 px-3 py-1.5 rounded-full text-xs font-bold text-[#ea580c] hover:bg-[#f97316] hover:text-white transition-all shadow-sm">
                    <FiFacebook size={14} /> Facebook
                  </a>
                  <a href={storeInfo.twitterUrl || 'https://twitter.com'} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 bg-white border border-orange-200 px-3 py-1.5 rounded-full text-xs font-bold text-[#ea580c] hover:bg-[#f97316] hover:text-white transition-all shadow-sm">
                    <FiTwitter size={14} /> X / Twitter
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── CUSTOMER PROFILE PAGE VIEW ── */}
      {activeTab === 'profile' && isAuthenticated && (
        <div className="flex-1 w-full bg-stone-50 py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            
            {/* Header Profile Banner Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-orange-200/80 mb-6 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-2xl flex items-center justify-center font-black text-3xl shadow-md shrink-0">
                  {profileForm.fullName ? profileForm.fullName[0].toUpperCase() : (userEmail ? userEmail[0].toUpperCase() : 'U')}
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-stone-900 uppercase tracking-tight font-serif">
                    {profileForm.fullName || 'Customer Profile'}
                  </h2>
                  <p className="text-xs sm:text-sm text-stone-500 font-medium mt-0.5">{userEmail}</p>
                  <span className="text-[10px] font-black text-green-700 uppercase bg-green-100 px-2.5 py-0.5 rounded-full inline-block mt-2">
                    ✓ VERIFIED CUSTOMER ACCOUNT
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('orders');
                    fetchCustomerOrders();
                  }}
                  className="bg-orange-100 hover:bg-orange-200 text-[#ea580c] text-xs font-black px-4 py-2.5 rounded-full uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-2xs"
                >
                  <FiPackage size={15} />
                  <span>MY ORDERS</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    document.cookie = 'delivery_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                    setIsAuthenticated(false);
                    setActiveTab('home');
                  }}
                  className="bg-red-50 hover:bg-red-100 text-red-600 text-xs font-black px-4 py-2.5 rounded-full uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-2xs"
                >
                  <FiLogOut size={15} />
                  <span>SIGN OUT</span>
                </button>
              </div>
            </div>

            {/* Profile Details Form Card */}
            <div className="bg-[#fffdfa] rounded-3xl p-6 sm:p-8 shadow-xs border border-orange-200/80">
              <h3 className="text-base sm:text-lg font-black text-[#ea580c] uppercase tracking-tight mb-5 border-b border-orange-100 pb-3 font-serif">
                Personal & Delivery Address Details
              </h3>

              <form onSubmit={handleSaveProfile} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-wider block mb-1">LOGGED IN EMAIL *</label>
                    <input
                      type="email"
                      readOnly
                      value={userEmail}
                      className="w-full bg-stone-100 border border-stone-200 rounded-xl px-4 py-3 text-xs font-bold text-stone-600 cursor-not-allowed outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-stone-500 uppercase tracking-wider block mb-1">FULL NAME *</label>
                    <input
                      type="text"
                      required
                      placeholder="Enter full name"
                      value={profileForm.fullName}
                      onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-xs font-semibold text-stone-800 outline-none focus:border-[#f97316]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-stone-500 uppercase tracking-wider block mb-1">PHONE / WHATSAPP NUMBER *</label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 9876543210"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-xs font-semibold text-stone-800 outline-none focus:border-[#f97316]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-stone-500 uppercase tracking-wider block mb-1">LANDMARK</label>
                    <input
                      type="text"
                      placeholder="Near public park / landmark"
                      value={profileForm.landmark}
                      onChange={(e) => setProfileForm({ ...profileForm, landmark: e.target.value })}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-xs font-semibold text-stone-800 outline-none focus:border-[#f97316]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-stone-500 uppercase tracking-wider block mb-1">DEFAULT DELIVERY ADDRESS</label>
                  <textarea
                    rows={3}
                    placeholder="House / Flat / Building No, Street Name, Locality"
                    value={profileForm.address}
                    onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-xs font-medium text-stone-800 outline-none focus:border-[#f97316]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-stone-500 uppercase tracking-wider block mb-1">CITY</label>
                    <input
                      type="text"
                      placeholder="Kozhikode"
                      value={profileForm.city}
                      onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-xs font-semibold text-stone-800 outline-none focus:border-[#f97316]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-stone-500 uppercase tracking-wider block mb-1">PINCODE</label>
                    <input
                      type="text"
                      placeholder="673001"
                      value={profileForm.pincode}
                      onChange={(e) => setProfileForm({ ...profileForm, pincode: e.target.value })}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-xs font-semibold text-stone-800 outline-none focus:border-[#f97316]"
                    />
                  </div>
                </div>

                {profileMsg && (
                  <div className={`p-3 rounded-xl text-xs font-bold text-center ${profileMsg.includes('success') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                    {profileMsg}
                  </div>
                )}

                <div className="pt-3">
                  <button
                    type="submit"
                    className="w-full sm:w-auto bg-[#f97316] hover:bg-[#ea580c] text-white text-xs font-black px-8 py-3.5 rounded-full uppercase tracking-wider transition-all shadow-md shadow-orange-500/20"
                  >
                    SAVE PROFILE DETAILS
                  </button>
                </div>
              </form>
            </div>

          </div>
        </div>
      )}

      {/* ── MY ORDERS FULL PAGE VIEW ── */}
      {activeTab === 'orders' && isAuthenticated && (
        <div className="flex-1 w-full bg-stone-50 py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            
            {/* Header Banner */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-orange-200/80 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-orange-100 text-[#f97316] rounded-2xl flex items-center justify-center font-black shadow-inner shrink-0">
                  <FiPackage size={26} />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-stone-900 uppercase tracking-tight font-serif">
                    MY ORDERS
                  </h2>
                  <p className="text-xs text-stone-500 font-medium">
                    Order history for <span className="font-bold text-stone-800">{userEmail}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={fetchCustomerOrders}
                disabled={loadingOrders}
                className="bg-orange-50 hover:bg-orange-100 text-[#ea580c] text-xs font-black px-4 py-2.5 rounded-full uppercase tracking-wider transition-all flex items-center gap-2 border border-orange-200/60 shrink-0"
              >
                <FiClock className={loadingOrders ? 'animate-spin' : ''} size={14} />
                <span>{loadingOrders ? 'REFRESHING…' : 'REFRESH ORDERS'}</span>
              </button>
            </div>

            {/* Orders List / Empty State */}
            {loadingOrders ? (
              <div className="py-20 text-center">
                <div className="w-10 h-10 border-4 border-[#f97316] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">Loading your orders…</p>
              </div>
            ) : customerOrders.length > 0 ? (
              <div className="space-y-4">
                {customerOrders.map((order, idx) => {
                  const statusColors = {
                    COMPLETED: 'bg-green-100 text-green-800 border-green-200',
                    DELIVERED: 'bg-green-100 text-green-800 border-green-200',
                    PREPARING: 'bg-amber-100 text-amber-800 border-amber-200',
                    CONFIRMED: 'bg-blue-100 text-blue-800 border-blue-200',
                    PENDING: 'bg-orange-100 text-orange-800 border-orange-200',
                    CANCELLED: 'bg-red-100 text-red-800 border-red-200'
                  };
                  const statusKey = (order.orderStatus || order.status || 'PENDING').toUpperCase();
                  const statusStyle = statusColors[statusKey] || 'bg-stone-100 text-stone-800 border-stone-200';

                  return (
                    <div key={order.id || idx} className="bg-white rounded-3xl p-6 border border-orange-200/80 shadow-xs hover:shadow-md transition-all space-y-4">
                      {/* Order Header info */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-stone-100">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-black text-stone-800">
                              ORDER #{String(order.orderNumber || order.id || idx + 1).slice(-8).toUpperCase()}
                            </span>
                            <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${statusStyle}`}>
                              {statusKey}
                            </span>
                          </div>
                          <span className="text-[11px] text-stone-400 font-medium block mt-1">
                            {order.createdAt ? new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Recent Order'}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-lg font-black text-[#ea580c] block font-serif">
                            ₹{Number(order.totalAmount || order.grandTotal || 0).toFixed(2)}
                          </span>
                          <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                            {order.paymentMethod || 'CASH ON DELIVERY'}
                          </span>
                        </div>
                      </div>

                      {/* Items List */}
                      <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/60 space-y-2">
                        <span className="text-[10px] font-black text-stone-400 uppercase tracking-wider block mb-1">ITEMS ORDERED</span>
                        {Array.isArray(order.items) && order.items.length > 0 ? (
                          order.items.map((it, iIdx) => (
                            <div key={iIdx} className="flex items-center justify-between text-xs font-semibold text-stone-700">
                              <span>{it.quantity || it.qty || 1}x {it.productName || it.name || 'Item'}</span>
                              <span className="font-mono text-stone-600">₹{Number((it.price || 0) * (it.quantity || it.qty || 1)).toFixed(2)}</span>
                            </div>
                          ))
                        ) : (
                          <span className="text-xs text-stone-500 italic">Delivery Order Package</span>
                        )}
                      </div>

                      {/* Track Order Footer */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="text-xs text-stone-500 font-medium truncate max-w-[240px] sm:max-w-md">
                          📍 {order.deliveryAddress || 'Standard Outlet Delivery'}
                        </div>

                        {order.trackingUrl && (
                          <a
                            href={order.trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-[#f97316] hover:bg-[#ea580c] text-white text-xs font-black px-4 py-2 rounded-full uppercase tracking-wider transition-all flex items-center gap-1 shrink-0 shadow-xs"
                          >
                            <span>LIVE TRACKING</span>
                            <FiArrowRight size={13} />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-12 text-center border border-orange-200/80 shadow-xs space-y-3">
                <div className="w-16 h-16 bg-orange-50 text-orange-400 rounded-full flex items-center justify-center mx-auto">
                  <FiPackage size={32} />
                </div>
                <h3 className="text-lg font-black text-stone-800 uppercase tracking-tight font-serif">No Orders Placed Yet</h3>
                <p className="text-xs text-stone-500 max-w-sm mx-auto font-medium">
                  You haven&apos;t placed any orders with this email address. Explore our store menu to place your first delicious order!
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => setActiveTab('menu')}
                    className="bg-[#f97316] hover:bg-[#ea580c] text-white text-xs font-black px-6 py-3 rounded-full uppercase tracking-wider transition-all shadow-md shadow-orange-500/20"
                  >
                    EXPLORE MENU & ORDER
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── STORE FOOTER (RENDERED ON ALL PAGES) ── */}
      <footer className="bg-gradient-to-b from-[#fffdfa] via-orange-50/30 to-amber-50/50 text-stone-800 border-t-2 border-orange-200/80 py-10 px-4 sm:px-8 w-full mt-auto shrink-0">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-orange-200/60 text-center md:text-left">
          <div className="space-y-3">
            <h3 className="text-base sm:text-lg font-black text-[#ea580c] tracking-wider uppercase font-serif">
              {storeInfo.name || 'SAYOOJ RESTAURANT'}
            </h3>
            <p className="text-xs text-stone-600 font-medium leading-relaxed max-w-sm mx-auto md:mx-0">
              {storeInfo.tagline || 'Experience delicious food crafted with passion and premium ingredients delivered fresh to your doorstep.'}
            </p>

            {/* Social Media Icons (Only Render Provided Links) */}
            <div className="flex items-center justify-center md:justify-start gap-3 pt-2">
              {storeInfo.instagramUrl && (
                <a href={storeInfo.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="w-9 h-9 rounded-full bg-white border-2 border-orange-200 text-[#ea580c] hover:bg-[#f97316] hover:text-white hover:border-[#f97316] flex items-center justify-center transition-all shadow-sm transform hover:scale-110">
                  <FiInstagram size={17} />
                </a>
              )}
              {storeInfo.facebookUrl && (
                <a href={storeInfo.facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="w-9 h-9 rounded-full bg-white border-2 border-orange-200 text-[#ea580c] hover:bg-[#f97316] hover:text-white hover:border-[#f97316] flex items-center justify-center transition-all shadow-sm transform hover:scale-110">
                  <FiFacebook size={17} />
                </a>
              )}
              {storeInfo.twitterUrl && (
                <a href={storeInfo.twitterUrl} target="_blank" rel="noopener noreferrer" aria-label="Twitter" className="w-9 h-9 rounded-full bg-white border-2 border-orange-200 text-[#ea580c] hover:bg-[#f97316] hover:text-white hover:border-[#f97316] flex items-center justify-center transition-all shadow-sm transform hover:scale-110">
                  <FiTwitter size={17} />
                </a>
              )}
              {(storeInfo.whatsappNumber || storeInfo.phone) && (
                <a href={`https://wa.me/${(storeInfo.whatsappNumber || storeInfo.phone || '').replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="w-9 h-9 rounded-full bg-white border-2 border-orange-200 text-[#ea580c] hover:bg-[#25D366] hover:text-white hover:border-[#25D366] flex items-center justify-center transition-all shadow-sm transform hover:scale-110">
                  <FaWhatsapp size={18} />
                </a>
              )}
            </div>
          </div>

          <div className="space-y-2.5">
            <h4 className="text-xs font-black text-[#ea580c] uppercase tracking-widest">QUICK NAVIGATION</h4>
            <div className="flex flex-col gap-2 text-xs font-bold text-stone-600 pt-1">
              <button onClick={() => setActiveTab('home')} className="hover:text-[#f97316] transition-colors text-center md:text-left">About Us</button>
              <button onClick={() => !isAuthenticated ? setShowLoginModal(true) : setActiveTab('menu')} className="hover:text-[#f97316] transition-colors text-center md:text-left">Products & Catalog</button>
              {isAuthenticated && (
                <>
                  <button onClick={() => setActiveTab('profile')} className="hover:text-[#f97316] transition-colors text-center md:text-left">My Profile</button>
                  <button onClick={() => { setActiveTab('orders'); fetchCustomerOrders(); }} className="hover:text-[#f97316] transition-colors text-center md:text-left">My Orders</button>
                </>
              )}
              <button onClick={() => setActiveTab('location')} className="hover:text-[#f97316] transition-colors text-center md:text-left">Contact & Branch Outlet</button>
            </div>
          </div>

          <div className="space-y-2.5">
            <h4 className="text-xs font-black text-[#ea580c] uppercase tracking-widest">OUTLET DETAILS</h4>
            <div className="space-y-2 text-xs text-stone-600 font-medium">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <FiMapPin size={14} className="text-[#f97316] shrink-0" />
                <span>{storeInfo.address || 'Kozhikode Outlet, Kerala'}</span>
              </div>
              <div className="flex items-center justify-center md:justify-start gap-2">
                <FiPhoneCall size={14} className="text-[#f97316] shrink-0" />
                <span>{storeInfo.phone || '+91 98765 43210'}</span>
              </div>
              <div className="flex items-center justify-center md:justify-start gap-2">
                <FiClock size={14} className="text-[#f97316] shrink-0" />
                <span>{storeInfo.openingHours || 'Open Daily: 10:00 AM - 11:00 PM'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-stone-500 font-medium">
          <p>© {new Date().getFullYear()} {storeInfo.name || 'SAYOOJ RESTAURANT'}. All rights reserved.</p>
          <p>Powered by <span className="text-[#f97316] font-bold">CafeQR Delivery</span></p>
        </div>
      </footer>

      {/* ── LOGIN / OTP MODAL ── */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 relative shadow-2xl border-4 border-[#f97316]">
            <button
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 text-lg"
            >
              <FiX size={20} />
            </button>

            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-orange-100 text-[#f97316] rounded-full flex items-center justify-center mx-auto mb-3">
                <FiLock size={22} />
              </div>
              <h3 className="text-2xl font-black text-[#ea580c] uppercase tracking-tight">SIGN IN TO ORDER</h3>
              <p className="text-xs text-stone-500 mt-1 font-medium">Enter your email address to receive your 6-digit OTP code</p>
            </div>

            {authError && (
              <div className="bg-red-50 text-red-700 text-xs font-bold p-3 rounded-xl mb-4 text-center border border-red-200">
                {authError}
              </div>
            )}

            {otpVerified ? (
              <div className="py-6 text-center text-green-600 font-extrabold text-sm space-y-2">
                <FiCheck size={32} className="mx-auto" />
                <p>Verified! Unlocking Branch Catalog…</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-black text-stone-500 uppercase tracking-wider">EMAIL ADDRESS</label>
                  <div className="flex gap-2 mt-1.5">
                    <input
                      type="email"
                      className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl text-sm outline-none focus:border-[#f97316] font-semibold"
                      placeholder="you@example.com"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setAuthError(''); }}
                      disabled={otpSent}
                      autoFocus
                    />
                    {!otpSent ? (
                      <button
                        onClick={sendOtp}
                        disabled={authLoading}
                        className="bg-[#f97316] hover:bg-[#ea580c] text-white font-black text-xs px-5 py-3 rounded-xl uppercase tracking-wider flex-shrink-0"
                      >
                        {authLoading ? 'SENDING…' : 'SEND OTP'}
                      </button>
                    ) : (
                      <button
                        onClick={() => { setOtpSent(false); setOtp(''); setAuthError(''); }}
                        className="text-xs text-stone-400 underline px-2 flex-shrink-0 font-bold hover:text-stone-700"
                      >
                        CHANGE
                      </button>
                    )}
                  </div>
                </div>

                {otpSent && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-black text-stone-500 uppercase tracking-wider">6-DIGIT OTP</label>
                      <button
                        onClick={sendOtp}
                        disabled={resendTimer > 0 || authLoading}
                        className="text-xs font-bold text-[#f97316] disabled:text-stone-300"
                      >
                        {resendTimer > 0 ? `RESEND IN ${resendTimer}S` : 'RESEND OTP'}
                      </button>
                    </div>
                    <div className="flex gap-2 mt-1">
                      <input
                        type="text"
                        maxLength={6}
                        autoFocus
                        className="w-full border-2 border-stone-200 rounded-xl px-4 py-3 text-center text-xl font-mono font-black tracking-[0.3em] outline-none focus:border-[#f97316]"
                        placeholder="······"
                        value={otp}
                        onChange={e => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setAuthError(''); }}
                      />
                      <button
                        onClick={verifyOtp}
                        disabled={authLoading || otp.length < 6}
                        className="bg-[#f97316] hover:bg-[#ea580c] text-white font-black text-xs px-6 py-3 rounded-xl uppercase tracking-wider flex-shrink-0 flex items-center gap-1"
                      >
                        {authLoading ? 'VERIFYING…' : 'VERIFY & ORDER'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── WRITE REVIEW MODAL ── */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-orange-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="text-lg font-black text-stone-900 font-serif">Write a Customer Review</h3>
              <button onClick={() => setShowReviewModal(false)} className="text-stone-400 hover:text-stone-700 p-1">
                <FiX size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateReview} className="mt-4 space-y-4">
              {/* Star Rating Picker */}
              <div>
                <label className="text-xs font-bold text-stone-600 uppercase tracking-wider block mb-1.5 text-center">Your Rating</label>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setReviewForm(prev => ({ ...prev, rating: star }))}
                      className={`text-3xl transition-transform transform hover:scale-125 ${
                        star <= reviewForm.rating ? 'text-[#f97316]' : 'text-stone-300'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-600 uppercase tracking-wider block mb-1">Your Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Enter your full name"
                  value={reviewForm.customerName}
                  onChange={(e) => setReviewForm({ ...reviewForm, customerName: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-stone-800 outline-none focus:border-[#f97316]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-600 uppercase tracking-wider block mb-1">Logined Customer Email *</label>
                <input
                  type="email"
                  required
                  readOnly
                  value={userEmail || reviewForm.customerEmail || ''}
                  className="w-full bg-stone-100 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-stone-600 outline-none cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-600 uppercase tracking-wider block mb-1">Your Review / Comments</label>
                <textarea
                  rows={3}
                  placeholder="Tell us about the food quality, speed of delivery, or overall service..."
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-stone-800 outline-none focus:border-[#f97316]"
                />
              </div>

              {reviewMsg && (
                <div className={`p-3 rounded-xl text-xs font-bold text-center ${reviewMsg.includes('Thank') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                  {reviewMsg}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="flex-1 bg-stone-100 text-stone-700 text-xs font-bold py-3 rounded-xl uppercase hover:bg-stone-200 transition-colors"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="flex-1 bg-[#f97316] text-white text-xs font-black py-3 rounded-xl uppercase hover:bg-[#ea580c] transition-colors shadow-md disabled:opacity-50"
                >
                  {submittingReview ? 'SUBMITTING...' : 'SUBMIT REVIEW'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrderPage({ slugHandle, branchHandle }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#fffdfa]">
        <div className="w-10 h-10 border-4 border-[#f97316] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <OrderPageInner slugHandle={slugHandle} branchHandle={branchHandle} />
    </Suspense>
  );
}
