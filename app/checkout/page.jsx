'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { FiArrowLeft, FiMapPin, FiUser, FiPhone, FiCreditCard, FiCheck, FiMail, FiPlus, FiMinus, FiTrash2 } from 'react-icons/fi';
import { placeOrder as apiPlaceOrder, createDeliveryPaymentOrder, fetchDeliverySettings } from '@/lib/apiClient';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://cafe-qr-backend.onrender.com/api';

function CheckoutPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const restaurantId = searchParams.get('r');
  const orderType = searchParams.get('t') || 'DELIVERY';
  const orgId = searchParams.get('orgId') || searchParams.get('branchId') || '';

  const getMenuUrl = () => {
    const params = new URLSearchParams();
    if (restaurantId) params.set('r', restaurantId);
    if (orderType) params.set('t', orderType);
    if (orgId) params.set('orgId', orgId);
    params.set('tab', 'menu');
    return `/order?${params.toString()}`;
  };

  // Steps: 1=contact, 2=address, 3=payment+confirm
  const [step, setStep] = useState(1);
  const [cart, setCart] = useState([]);
  const [restaurant, setRestaurant] = useState(null);

  // Step 1 — contact
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');        // pre-filled from session, read-only
  const [sessionLoading, setSessionLoading] = useState(true);

  // Step 2 — address
  const [address, setAddress] = useState({ line1: '', area: '', city: '', pincode: '' });
  const [latitude, setLatitude] = useState(11.258753);
  const [longitude, setLongitude] = useState(75.780410);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [remarks, setRemarks] = useState('');

  const haversineDistanceKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const deliveryRadiusEnforced = restaurant?.deliveryRadiusKm != null && Number(restaurant.deliveryRadiusKm) > 0;
  const hasBranchCoords = restaurant?.branchLatitude != null && restaurant?.branchLongitude != null;
  const currentDistanceKm = hasBranchCoords
    ? haversineDistanceKm(Number(restaurant.branchLatitude), Number(restaurant.branchLongitude), latitude, longitude)
    : null;

  // Load Leaflet resources dynamically
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.L) {
      setMapLoaded(true);
      return;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => setMapLoaded(true);
    document.head.appendChild(script);
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!mapLoaded || step !== 1 || orderType === 'TAKEAWAY') return;

    const L = window.L;
    if (!L) return;

    const defaultLat = restaurant?.branchLatitude ? Number(restaurant.branchLatitude) : 11.258753;
    const defaultLng = restaurant?.branchLongitude ? Number(restaurant.branchLongitude) : 75.780410;

    // Detect browser coordinates first
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setLatitude(lat);
          setLongitude(lng);
          initMap(lat, lng);
        },
        () => {
          setLatitude(defaultLat);
          setLongitude(defaultLng);
          initMap(defaultLat, defaultLng);
        }
      );
    } else {
      setLatitude(defaultLat);
      setLongitude(defaultLng);
      initMap(defaultLat, defaultLng);
    }

    let mapInstance = null;
    let markerInstance = null;

    function initMap(lat, lng) {
      const container = document.getElementById('map-picker');
      if (!container) return;

      if (container._leaflet_id) {
        return;
      }

      mapInstance = L.map('map-picker').setView([lat, lng], 15);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapInstance);

      setTimeout(() => {
        try { mapInstance.invalidateSize(); } catch (e) {}
      }, 300);

      const redIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      markerInstance = L.marker([lat, lng], { draggable: true, icon: redIcon }).addTo(mapInstance);

      if (restaurant?.branchLatitude != null && restaurant?.branchLongitude != null) {
        const shopIcon = L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        });
        L.marker([restaurant.branchLatitude, restaurant.branchLongitude], { icon: shopIcon })
          .addTo(mapInstance)
          .bindPopup(`<b>${restaurant.name || 'Restaurant'}</b>`)
          .openPopup();

        if (restaurant.deliveryRadiusKm && Number(restaurant.deliveryRadiusKm) > 0) {
          L.circle([restaurant.branchLatitude, restaurant.branchLongitude], {
            color: '#f97316',
            fillColor: '#fdba74',
            fillOpacity: 0.15,
            radius: Number(restaurant.deliveryRadiusKm) * 1000
          }).addTo(mapInstance);
        }

        // Fit bounds to show both the customer location and the restaurant
        const bounds = L.latLngBounds([
          [lat, lng],
          [restaurant.branchLatitude, restaurant.branchLongitude]
        ]);
        mapInstance.fitBounds(bounds, { padding: [50, 50] });
      }

      const reverseGeocode = async (lt, lg) => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lt}&lon=${lg}`);
          if (res.ok) {
            const data = await res.json();
            const addr = data.address;
            const road = addr.road || '';
            const sub = addr.suburb || addr.neighbourhood || '';
            const area = addr.suburb || addr.village || addr.town || addr.county || '';
            const city = addr.city || addr.town || addr.village || addr.municipality || addr.city_district || addr.county || '';
            const pincode = addr.postcode || '';

            setAddress(prev => ({
              ...prev,
              area: road ? `${road}, ${area}` : (sub ? `${sub}, ${area}` : area),
              city: city || prev.city || 'Thrissur',
              pincode: pincode ? pincode.substring(0, 6) : prev.pincode
            }));
          }
        } catch (err) {
          console.warn('Geocoding failed:', err);
        }
      };

      markerInstance.on('dragend', () => {
        const position = markerInstance.getLatLng();
        setLatitude(position.lat);
        setLongitude(position.lng);
        reverseGeocode(position.lat, position.lng);
      });

      mapInstance.on('click', (e) => {
        const position = e.latlng;
        markerInstance.setLatLng(position);
        setLatitude(position.lat);
        setLongitude(position.lng);
        reverseGeocode(position.lat, position.lng);
      });

      reverseGeocode(lat, lng);
    }

    return () => {
      if (mapInstance) {
        mapInstance.remove();
      }
    };
  }, [mapLoaded, step, orderType, restaurant]);

  // Step 3 — payment
  const [payment, setPayment] = useState('COD');
  const [placing, setPlacing] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [errors, setErrors] = useState({});

  // Preload Razorpay checkout script
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // ── Load cart + restaurant from sessionStorage & API ────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`cart_${restaurantId}`) || sessionStorage.getItem(`cart_${restaurantId}`);
      if (saved) setCart(JSON.parse(saved));
    } catch { }
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
    } catch { }
  }, [cart, restaurantId]);

  useEffect(() => {
    let cached = null;
    try {
      const r = sessionStorage.getItem(`restaurant_${restaurantId}`);
      if (r) {
        cached = JSON.parse(r);
        setRestaurant(cached);
        if (cached?.onlinePaymentEnabled && cached?.razorpayKeyId) {
          setPayment('ONLINE');
        }
      }
    } catch { }

    if (restaurantId) {
      fetchDeliverySettings(restaurantId, orgId)
        .then(res => {
          const rData = res.data?.data || res.data;
          if (rData) {
            const formatted = {
              ...(cached || {}),
              name: rData.restaurantName || rData.name || cached?.name || 'Our Restaurant',
              tagline: rData.tagline || cached?.tagline || 'Delivery & Takeaway',
              address: rData.address || cached?.address || '',
              brandColor: rData.brandColor || cached?.brandColor || '#f97316',
              logoUrl: rData.logoUrl || cached?.logoUrl || '',
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
              onlinePaymentEnabled: !!rData.onlinePaymentEnabled,
              razorpayKeyId: rData.razorpayKeyId || null,
            };
            setRestaurant(formatted);
            if (formatted.branchLatitude && formatted.branchLongitude) {
              setLatitude(Number(formatted.branchLatitude));
              setLongitude(Number(formatted.branchLongitude));
            }
            if (formatted.onlinePaymentEnabled && formatted.razorpayKeyId) {
              setPayment('ONLINE');
            }
            try {
              sessionStorage.setItem(`restaurant_${restaurantId}`, JSON.stringify(formatted));
            } catch { }
          }
        })
        .catch(err => {
          console.warn('Failed to refresh delivery settings in checkout', err);
        });
    }
  }, [restaurantId, orgId]);

  // ── Pre-fill email from delivery_session cookie (via /api/auth/session) ─────
  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.email) setEmail(data.email); })
      .catch(() => { })
      .finally(() => setSessionLoading(false));

    try {
      const saved = sessionStorage.getItem('delivery_remarks');
      if (saved) setRemarks(saved);
    } catch { }
  }, []);

  // ── Auto-prefill Customer Profile (Name, Phone, Address, Landmark, City, Pincode) ─────
  useEffect(() => {
    if (!email || typeof window === 'undefined') return;
    try {
      const savedProfile = localStorage.getItem(`profile_${email}`);
      if (savedProfile) {
        const p = JSON.parse(savedProfile);
        if (p.fullName) setName(p.fullName);
        if (p.phone) setPhone(String(p.phone).replace(/\D/g, '').slice(-10));
        
        setAddress(prev => ({
          line1: p.address || prev.line1 || '',
          area: p.landmark || prev.area || '',
          city: p.city || prev.city || 'Kozhikode',
          pincode: p.pincode || prev.pincode || '673001'
        }));

        if (p.deliveryNotes && !remarks) setRemarks(p.deliveryNotes);
      }
    } catch (e) {
      console.warn('Failed to load profile in checkout', e);
    }
  }, [email]);

  const saveProfileToLocalStorage = () => {
    if (!email || typeof window === 'undefined') return;
    try {
      const existing = localStorage.getItem(`profile_${email}`);
      const current = existing ? JSON.parse(existing) : {};
      const updated = {
        ...current,
        fullName: name || current.fullName || '',
        phone: phone || current.phone || '',
        address: address.line1 || current.address || '',
        landmark: address.area || current.landmark || '',
        city: address.city || current.city || '',
        pincode: address.pincode || current.pincode || '',
        deliveryNotes: remarks || current.deliveryNotes || ''
      };
      localStorage.setItem(`profile_${email}`, JSON.stringify(updated));
    } catch (e) { }
  };

  // --- GST and Totals Calculations ---
  const gstEnabled = restaurant?.taxEnabled || false;
  const pricesIncludeTax = gstEnabled ? !!restaurant?.pricesIncludeTax : false;
  const defaultTaxRate = (() => {
    if (!gstEnabled) return 0;
    const rates = restaurant?.taxRates || [];
    const def = rates.find(r => r.id === restaurant?.taxDefaultId);
    return def ? parseFloat(def.value || def.rate || 0) || 0 : (rates[0] ? parseFloat(rates[0].value || rates[0].rate || 0) || 0 : 0);
  })();

  let totalTaxableAmount = 0;
  let totalTaxAmount = 0;
  let subtotal = 0;

  cart.forEach(i => {
    const qty = Number(i.qty || 1);
    const faceUnit = Number(i.price || 0);
    const isPackaged = !!i.isPackagedGood;
    const rate = gstEnabled
      ? (isPackaged
        ? (i.taxRate !== undefined && i.taxRate !== null && i.taxRate !== '' ? Number(i.taxRate) : defaultTaxRate)
        : defaultTaxRate)
      : 0;

    const isInclusive = gstEnabled && (isPackaged || pricesIncludeTax);

    let baseUnit;
    let lineTotal;
    let taxable;
    let tax;

    if (isInclusive && rate > 0) {
      baseUnit = faceUnit / (1 + rate / 100);
      lineTotal = faceUnit * qty;
      taxable = lineTotal / (1 + rate / 100);
      tax = lineTotal - taxable;
    } else {
      baseUnit = faceUnit;
      taxable = faceUnit * qty;
      tax = taxable * (rate / 100);
      lineTotal = taxable + tax;
    }

    totalTaxableAmount += taxable;
    totalTaxAmount += tax;
    subtotal += lineTotal;
  });

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const grandTotal = totalTaxableAmount + totalTaxAmount;

  // ── Place Order Handlers ───────────────────────────────────────────────────
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePlaceOrder = async () => {
    setPlacing(true);
    setPaymentError('');
    try {
      const deliveryAddressStr = orderType === 'DELIVERY'
        ? `${address.line1}, ${address.area}, ${address.city} - ${address.pincode}`
        : 'Takeaway Pickup';

      const payload = {
        clientId: restaurantId,
        orgId: orgId || null,
        customerEmail: email,
        customerName: name,
        customerPhone: phone,
        fulfillmentType: orderType,
        deliveryAddress: deliveryAddressStr,
        note: `Payment: COD`,
        remarks: remarks,
        paymentMethod: 'COD',
        items: cart.map(i => ({ productId: i.id, quantity: i.qty })),
        latitude: orderType === 'DELIVERY' ? latitude : null,
        longitude: orderType === 'DELIVERY' ? longitude : null,
      };

      let orderId;
      try {
        const res = await apiPlaceOrder(payload);
        const data = res.data?.data || res.data;
        orderId = data.orderId || data.id;
      } catch (err) {
        console.error('Failed to place order via backend:', err);
        orderId = 'DEL-' + Math.random().toString(36).slice(2, 8).toUpperCase();
      }

      try {
        sessionStorage.removeItem(`cart_${restaurantId}`);
        sessionStorage.removeItem('delivery_remarks');
      } catch { }
      router.push(`/track?id=${orderId}&r=${restaurantId}${orgId ? `&orgId=${orgId}` : ''}`);
    } catch (err) {
      setPaymentError(err.response?.data?.message || err.message || 'Failed to place order.');
    } finally {
      setPlacing(false);
    }
  };

  const handleOnlinePayment = async () => {
    setPlacing(true);
    setPaymentError('');
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) {
        throw new Error('Unable to load payment gateway. Please try Cash on Delivery or reload the page.');
      }

      const deliveryAddressStr = orderType === 'DELIVERY'
        ? `${address.line1}, ${address.area}, ${address.city} - ${address.pincode}`
        : 'Takeaway Pickup';

      const res = await createDeliveryPaymentOrder({
        clientId: restaurantId,
        orgId: orgId || null,
        customerEmail: email,
        customerName: name,
        customerPhone: phone,
        fulfillmentType: orderType,
        items: cart.map(i => ({ productId: i.id, quantity: i.qty }))
      });

      const orderData = res.data?.data || res.data;
      if (!orderData?.razorpayOrderId) {
        throw new Error('Failed to initiate online payment order.');
      }

      const options = {
        key: orderData.keyId,
        order_id: orderData.razorpayOrderId,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: restaurant?.restaurantName || restaurant?.name || 'Restaurant Order',
        description: `${orderType === 'DELIVERY' ? 'Home Delivery' : 'Takeaway'} Order (${cartCount} items)`,
        prefill: {
          name: name,
          email: email,
          contact: phone ? (phone.startsWith('+91') ? phone : `+91${phone}`) : ''
        },
        theme: {
          color: restaurant?.brandColor || '#f97316'
        },
        modal: {
          ondismiss: () => {
            setPlacing(false);
          }
        },
        handler: async (response) => {
          let orderId = orderData.orderId || response.razorpay_order_id;
          try {
            sessionStorage.removeItem(`cart_${restaurantId}`);
            sessionStorage.removeItem('delivery_remarks');
          } catch { }
          router.push(`/track?id=${orderId}&r=${restaurantId}${orgId ? `&orgId=${orgId}` : ''}`);
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (resp) {
        setPaymentError(resp.error?.description || 'Online payment failed. Please try again.');
        setPlacing(false);
      });
      rzp.open();
    } catch (err) {
      setPaymentError(err.response?.data?.message || err.message || 'Failed to initiate online payment.');
      setPlacing(false);
    }
  };

  // ── Validation ──────────────────────────────────────────────────────────────
  const validateStep1 = () => {
    const e = {};
    if (!name.trim()) e.name = 'Full Name is required';
    if (!phone.trim() || !/^[6-9]\d{9}$/.test(phone)) e.phone = 'Enter a valid 10-digit mobile number';

    if (orderType !== 'TAKEAWAY') {
      if (!address.line1.trim()) e.line1 = 'House / flat is required';
      if (!address.area.trim()) e.area = 'Area / locality is required';
      if (!address.city.trim()) e.city = 'City is required';
      if (!address.pincode.trim()) e.pincode = 'Pincode is required';

      if (deliveryRadiusEnforced && currentDistanceKm != null) {
        if (currentDistanceKm > Number(restaurant.deliveryRadiusKm)) {
          e.distance = `Sorry, your location is ${currentDistanceKm.toFixed(1)} km away. We deliver within ${restaurant.deliveryRadiusKm} km only.`;
        }
      }
    }

    setErrors(e);
    if (Object.keys(e).length === 0) {
      saveProfileToLocalStorage();
      return true;
    }
    return false;
  };

  const STEPS = [
    { num: 1, label: orderType === 'TAKEAWAY' ? 'Details' : 'Address & Details' },
    { num: 2, label: 'Payment' },
  ];

  if (cart.length === 0 && step < 2) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="text-5xl">🛒</span>
        <h2 className="font-bold text-stone-800 text-lg">Your cart is empty</h2>
        <button onClick={() => router.push(getMenuUrl())} className="bg-brand-orange text-white px-6 py-3 rounded-xl font-semibold text-sm">← Back to Menu</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">

      {/* Header */}
      <div className="bg-white sticky top-0 z-10 border-b border-stone-100">
        <div className="flex items-center gap-3 px-4 py-4">
          <button
            onClick={() => step === 1 ? router.push(getMenuUrl()) : setStep(s => s - 1)}
            className="p-1.5 -ml-1 rounded-lg hover:bg-stone-100 text-stone-500 transition-colors"
            title="Back to products catalog"
          >
            <FiArrowLeft size={20} />
          </button>
          <h1 className="font-bold text-stone-900 text-lg">Checkout</h1>
        </div>

        {/* Step indicator */}
        <div className="flex px-4 pb-3 gap-0">
          {STEPS.map((s, idx) => (
            <div key={s.num} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${step > s.num ? 'bg-green-500 border-green-500 text-white' :
                  step === s.num ? 'bg-[#ea580c] border-[#ea580c] text-white' :
                    'bg-white border-stone-200 text-stone-400'
                  }`}>
                  {step > s.num ? <FiCheck size={12} /> : s.num}
                </div>
                <span className={`text-xs mt-0.5 ${step >= s.num ? 'text-stone-600 font-medium' : 'text-stone-300'
                  }`}>{s.label}</span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mb-3 mx-1 ${step > s.num ? 'bg-[#ea580c]' : 'bg-stone-200'
                  }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 py-5 space-y-4 pb-36">

        {/* Cart summary (always visible) */}
        <div className="bg-gradient-to-b from-white via-orange-50/20 to-amber-50/10 rounded-3xl border-2 border-orange-200/80 p-5 sm:p-6 shadow-xl shadow-orange-500/5">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-orange-100">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-stone-900 uppercase tracking-tight">
                Order Summary
              </h3>
              <span className="text-[10px] font-black text-[#ea580c] bg-orange-100/80 border border-orange-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                {cartCount} {cartCount === 1 ? 'ITEM' : 'ITEMS'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Empty Cart Button */}
              <button
                type="button"
                onClick={() => {
                  setCart([]);
                  try {
                    if (restaurantId) sessionStorage.removeItem(`cart_${restaurantId}`);
                  } catch (e) { }
                  router.push(getMenuUrl());
                }}
                className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/80 hover:border-rose-300 text-[11px] sm:text-xs font-black px-3 py-1.5 rounded-full shadow-2xs transition-all uppercase tracking-wider flex items-center gap-1.5"
                title="Clear all items from cart"
              >
                <FiTrash2 size={12} />
                <span>EMPTY CART</span>
              </button>

              {/* Add More Items Button (Beautified Primary Theme Button) */}
              <button
                type="button"
                onClick={() => router.push(getMenuUrl())}
                className="bg-[#f97316] hover:bg-[#ea580c] text-white text-[11px] sm:text-xs font-black px-3.5 py-1.5 rounded-full shadow-sm hover:shadow-md transition-all uppercase tracking-wider flex items-center gap-1.5"
              >
                <FiPlus size={13} />
                <span>ADD MORE ITEMS</span>
              </button>
            </div>
          </div>

          {/* Cart Items List */}
          <div className="space-y-3 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
            {cart.map((i) => (
              <div key={i.id} className="flex items-center justify-between gap-3 text-xs border-b border-stone-100/80 pb-2.5 last:border-0 last:pb-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-extrabold text-stone-800 text-xs sm:text-sm truncate">{i.name}</p>
                    {i.variantName && (
                      <span className="text-[10px] font-extrabold text-[#ea580c] bg-orange-100/80 border border-orange-200 px-2 py-0.5 rounded-full">
                        {i.variantName}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-stone-500 font-semibold mt-0.5">
                    ₹{Number(i.price).toFixed(2)} each
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1 bg-stone-100 border border-stone-200 rounded-full px-2 py-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        const updated = cart.map(item => item.id === i.id ? { ...item, qty: item.qty - 1 } : item).filter(item => item.qty > 0);
                        setCart(updated);
                        try {
                          if (restaurantId) sessionStorage.setItem(`cart_${restaurantId}`, JSON.stringify(updated));
                        } catch (e) { }
                        if (updated.length === 0) router.push(getMenuUrl());
                      }}
                      className="w-4 h-4 rounded-full bg-orange-100 text-[#ea580c] hover:bg-[#f97316] hover:text-white flex items-center justify-center transition-colors text-xs font-black"
                    >
                      <FiMinus size={10} />
                    </button>
                    
                    <span className="text-xs font-black text-stone-900 min-w-[14px] text-center">{i.qty}</span>
                    
                    <button
                      type="button"
                      onClick={() => {
                        const updated = cart.map(item => item.id === i.id ? { ...item, qty: item.qty + 1 } : item);
                        setCart(updated);
                        try {
                          if (restaurantId) sessionStorage.setItem(`cart_${restaurantId}`, JSON.stringify(updated));
                        } catch (e) { }
                      }}
                      className="w-4 h-4 rounded-full bg-orange-100 text-[#ea580c] hover:bg-[#f97316] hover:text-white flex items-center justify-center transition-colors text-xs font-black"
                    >
                      <FiPlus size={10} />
                    </button>
                  </div>

                  <span className="text-xs sm:text-sm font-black text-stone-900 min-w-[60px] text-right">
                    ₹{(i.price * i.qty).toFixed(2)}
                  </span>

                  {/* Product Line Delete Button (Icon Only) */}
                  <button
                    type="button"
                    onClick={() => {
                      const updated = cart.filter(item => item.id !== i.id);
                      setCart(updated);
                      try {
                        if (restaurantId) sessionStorage.setItem(`cart_${restaurantId}`, JSON.stringify(updated));
                      } catch (e) { }
                      if (updated.length === 0) router.push(getMenuUrl());
                    }}
                    className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white hover:bg-rose-50 text-stone-400 hover:text-rose-600 border border-stone-200/80 hover:border-rose-200 flex items-center justify-center transition-all shadow-2xs shrink-0"
                    title="Delete item"
                  >
                    <FiTrash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Bill Breakdown & Grand Total */}
          <div className="border-t border-orange-100 mt-4 pt-3 space-y-2">
            <div className="flex justify-between text-xs font-semibold text-stone-500">
              <span>Subtotal</span>
              <span className="font-bold text-stone-800">₹{totalTaxableAmount.toFixed(2)}</span>
            </div>
            {gstEnabled && totalTaxAmount > 0 && (
              <div className="flex justify-between text-xs font-semibold text-stone-500">
                <span>{restaurant?.taxLabelGlobal || 'GST'}</span>
                <span className="font-bold text-stone-800">₹{totalTaxAmount.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between items-center text-sm font-black text-stone-900 pt-2 border-t border-orange-100">
              <span className="uppercase tracking-wider">Total</span>
              <span className="text-base text-[#ea580c]">₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* ── Step 1: Customer Details & Delivery Address (Combined) ── */}
        {step === 1 && (
          <div className="bg-white rounded-3xl border-2 border-orange-100 p-6 space-y-5 shadow-sm">
            
            {/* Customer Details Header */}
            <div className="flex items-center gap-2 border-b border-orange-100 pb-3">
              <FiUser size={18} className="text-[#ea580c]" />
              <h2 className="font-black text-stone-900 text-sm uppercase tracking-tight">Customer Details</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Name */}
              <div>
                <label className="text-[11px] font-black text-stone-500 uppercase tracking-wide">Full Name *</label>
                <input
                  className={`w-full mt-1.5 border rounded-xl px-4 py-3 text-sm outline-none transition-colors ${errors.name ? 'border-red-400 bg-red-50' : 'border-stone-200 focus:border-[#ea580c]'
                    }`}
                  placeholder="Enter your full name"
                  value={name}
                  onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: '' })); }}
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>

              {/* Phone */}
              <div>
                <label className="text-[11px] font-black text-stone-500 uppercase tracking-wide">Mobile Number *</label>
                <div className="flex gap-2 mt-1.5">
                  <div className="border border-stone-200 rounded-xl px-3.5 py-3 text-sm font-bold text-stone-500 bg-stone-50">+91</div>
                  <input
                    className={`flex-1 border rounded-xl px-4 py-3 text-sm outline-none transition-colors ${errors.phone ? 'border-red-400 bg-red-50' : 'border-stone-200 focus:border-[#ea580c]'
                      }`}
                    placeholder="10-digit mobile number"
                    value={phone}
                    onChange={e => { setPhone(e.target.value); setErrors(p => ({ ...p, phone: '' })); }}
                    maxLength={10}
                    inputMode="numeric"
                  />
                </div>
                {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
              </div>
            </div>

            {/* Email — read-only */}
            <div>
              <label className="text-[11px] font-black text-stone-500 uppercase tracking-wide">Verified Email</label>
              <div className="relative mt-1.5">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={15} />
                {sessionLoading ? (
                  <div className="w-full border border-stone-200 rounded-xl px-4 py-3 pl-9 bg-stone-50 text-sm text-stone-300 animate-pulse">Loading…</div>
                ) : (
                  <input
                    className="w-full border border-emerald-300 bg-emerald-50/60 rounded-xl pl-9 pr-10 py-3 text-sm font-medium text-emerald-900 outline-none cursor-default"
                    value={email}
                    readOnly
                    tabIndex={-1}
                  />
                )}
                {!sessionLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                    <FiCheck size={11} className="text-white" />
                  </div>
                )}
              </div>
              <p className="text-[10px] text-stone-400 mt-1">Verified via OTP at sign-in</p>
            </div>

            {/* Delivery Address Header */}
            <div className="flex items-center gap-2 pt-4 border-t border-orange-100 pb-2">
              <FiMapPin size={18} className="text-[#ea580c]" />
              <h2 className="font-black text-stone-900 text-sm uppercase tracking-tight">
                {orderType === 'TAKEAWAY' ? 'Pickup Confirmation' : 'Delivery Address'}
              </h2>
            </div>

            {orderType === 'TAKEAWAY' ? (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
                <p className="text-sm font-black text-amber-900">🛖 Takeaway Order</p>
                <p className="text-xs text-amber-700 font-medium">Your order will be ready for pickup. We&apos;ll send a confirmation to {email}.</p>
                <div className="mt-4 pt-2 border-t border-amber-200">
                  <label className="text-[11px] font-black text-stone-500 uppercase tracking-wide">Cooking Instructions / Remarks (Optional)</label>
                  <textarea
                    className="w-full mt-1.5 border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#ea580c] resize-none h-20 bg-white"
                    placeholder="E.g., Make it spicy, No onions..."
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-black text-stone-500 uppercase tracking-wide">House / Flat / Building *</label>
                  <input
                    className={`w-full mt-1.5 border rounded-xl px-4 py-3 text-sm outline-none transition-colors ${errors.line1 ? 'border-red-400 bg-red-50' : 'border-stone-200 focus:border-[#ea580c]'
                      }`}
                    placeholder="Flat 4B, Rose Apartments"
                    value={address.line1}
                    onChange={e => { setAddress(p => ({ ...p, line1: e.target.value })); setErrors(p => ({ ...p, line1: '' })); }}
                  />
                  {errors.line1 && <p className="text-xs text-red-500 mt-1">{errors.line1}</p>}
                </div>

                <div>
                  <label className="text-[11px] font-black text-stone-500 uppercase tracking-wide">Area / Landmark *</label>
                  <input
                    className={`w-full mt-1.5 border rounded-xl px-4 py-3 text-sm outline-none transition-colors ${errors.area ? 'border-red-400 bg-red-50' : 'border-stone-200 focus:border-[#ea580c]'
                      }`}
                    placeholder="Near public park, Swaraj Round"
                    value={address.area}
                    onChange={e => { setAddress(p => ({ ...p, area: e.target.value })); setErrors(p => ({ ...p, area: '' })); }}
                  />
                  {errors.area && <p className="text-xs text-red-500 mt-1">{errors.area}</p>}
                </div>

                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-[11px] font-black text-stone-500 uppercase tracking-wide">City *</label>
                    <input
                      className={`w-full mt-1.5 border rounded-xl px-4 py-3 text-sm outline-none transition-colors ${errors.city ? 'border-red-400 bg-red-50' : 'border-stone-200 focus:border-[#ea580c]'
                        }`}
                      placeholder="Kozhikode"
                      value={address.city}
                      onChange={e => {
                        setAddress(p => ({ ...p, city: e.target.value }));
                        setErrors(p => ({ ...p, city: '' }));
                      }}
                    />
                    {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
                  </div>
                  <div className="flex-1">
                    <label className="text-[11px] font-black text-stone-500 uppercase tracking-wide">Pincode *</label>
                    <input
                      className={`w-full mt-1.5 border rounded-xl px-4 py-3 text-sm outline-none transition-colors ${errors.pincode ? 'border-red-400 bg-red-50' : 'border-stone-200 focus:border-[#ea580c]'
                        }`}
                      placeholder="673001"
                      value={address.pincode}
                      onChange={e => { setAddress(p => ({ ...p, pincode: e.target.value })); setErrors(p => ({ ...p, pincode: '' })); }}
                      maxLength={6}
                      inputMode="numeric"
                    />
                    {errors.pincode && <p className="text-xs text-red-500 mt-1">{errors.pincode}</p>}
                  </div>
                </div>

                {/* Leaflet Map Picker */}
                {mapLoaded && (
                  <div className="space-y-2 mt-4 pt-2 border-t border-stone-100">
                    <label className="text-[11px] font-black text-stone-500 uppercase tracking-wide">Pin Your Location on Map</label>
                    <div id="map-picker" className="h-60 w-full rounded-2xl border border-stone-200 overflow-hidden z-0 shadow-sm" />
                    
                    {/* Real-time distance and delivery zone status */}
                    {hasBranchCoords && currentDistanceKm != null && (
                      <div className={`mt-3 p-3.5 rounded-xl border flex flex-col gap-1.5 transition-all duration-300 ${deliveryRadiusEnforced
                        ? currentDistanceKm > Number(restaurant.deliveryRadiusKm)
                          ? 'bg-red-50 border-red-200 text-red-700'
                          : 'bg-green-50 border-green-200 text-green-700'
                        : 'bg-stone-50 border-stone-200 text-stone-700'
                        }`}>
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="flex items-center gap-1.5">
                            {deliveryRadiusEnforced
                              ? currentDistanceKm > Number(restaurant.deliveryRadiusKm)
                                ? '⚠️ Out of Delivery Zone'
                                : '✅ Within Delivery Zone'
                              : '📍 Distance to Restaurant'
                            }
                          </span>
                          <span>{currentDistanceKm.toFixed(2)} km away</span>
                        </div>
                      </div>
                    )}
                    {errors.distance && (
                      <div className="bg-red-100 text-red-800 p-3 rounded-xl text-xs font-medium border border-red-200 animate-pulse mt-2">
                        {errors.distance}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Payment (Online + COD) ───────────────────────────── */}
        {step === 2 && (
          <div className="bg-white rounded-3xl border-2 border-orange-100 p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <FiCreditCard size={18} className="text-[#ea580c]" />
              <h2 className="font-black text-stone-900 text-sm uppercase tracking-tight">Choose Payment Method</h2>
            </div>

            {/* Error Banner */}
            {paymentError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2 animate-fadeIn">
                <span className="text-base">⚠️</span>
                <div className="flex-1">
                  <p className="font-semibold">Payment Issue</p>
                  <p className="mt-0.5 leading-relaxed">{paymentError}</p>
                </div>
              </div>
            )}

            {/* Online Payment Option */}
            {restaurant?.onlinePaymentEnabled && restaurant?.razorpayKeyId ? (
              <button
                type="button"
                onClick={() => { setPayment('ONLINE'); setPaymentError(''); }}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                  payment === 'ONLINE'
                    ? 'border-[#ea580c] bg-orange-50/70 shadow-sm'
                    : 'border-stone-200 hover:border-stone-300 bg-white'
                }`}
              >
                <span className="text-2xl">💳</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-black text-stone-900">UPI / Cards / NetBanking</p>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 rounded-full uppercase tracking-wider">Fast & Secure</span>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  payment === 'ONLINE' ? 'border-[#ea580c] bg-[#ea580c]' : 'border-stone-300 bg-white'
                }`}>
                  {payment === 'ONLINE' && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
              </button>
            ) : null}

            {/* Cash on Delivery Option */}
            <button
              type="button"
              onClick={() => { setPayment('COD'); setPaymentError(''); }}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                payment === 'COD'
                  ? 'border-[#ea580c] bg-orange-50/70 shadow-sm'
                  : 'border-stone-200 hover:border-stone-300 bg-white'
              }`}
            >
              <span className="text-2xl">💵</span>
              <div className="flex-1">
                <p className="text-sm font-black text-stone-900">
                  {orderType === 'TAKEAWAY' ? 'Pay at Counter' : 'Cash on Delivery (COD)'}
                </p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                payment === 'COD' ? 'border-[#ea580c] bg-[#ea580c]' : 'border-stone-300 bg-white'
              }`}>
                {payment === 'COD' && <div className="w-2 h-2 bg-white rounded-full" />}
              </div>
            </button>
          </div>
        )}

      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-100 px-4 py-4 z-20 shadow-lg">
        {step === 1 ? (
          <button
            onClick={() => {
              if (!validateStep1()) return;
              setStep(2);
            }}
            className="w-full bg-gradient-to-r from-[#f97316] via-[#ea580c] to-[#c2410c] hover:from-[#ea580c] hover:to-[#9a3412] text-white font-black py-4 rounded-2xl transition-all text-sm uppercase tracking-wider shadow-lg shadow-orange-500/25 transform hover:scale-[1.01] active:scale-[0.99]"
          >
            Continue to Payment →
          </button>
        ) : (
          <button
            onClick={payment === 'ONLINE' ? handleOnlinePayment : handlePlaceOrder}
            disabled={placing}
            className="w-full bg-gradient-to-r from-[#f97316] via-[#ea580c] to-[#c2410c] hover:from-[#ea580c] hover:to-[#9a3412] disabled:opacity-70 text-white font-black py-4 rounded-2xl transition-all text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 transform hover:scale-[1.01] active:scale-[0.99]"
          >
            {placing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Placing Your Order...</span>
              </>
            ) : (
              <span>Place Order ₹{grandTotal.toFixed(2)}</span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-brand-orange border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CheckoutPageInner />
    </Suspense>
  );
}
