'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { FiCheck, FiClock, FiPackage, FiTruck, FiHome, FiShoppingBag, FiScissors } from 'react-icons/fi';
import { getOrderStatus } from '@/lib/apiClient';

/**
 * Returns dynamic stepper steps, banner text, and labels customized to the branch's business category
 */
function getOrderWorkflowConfig(posType = 'Restaurant', orderType = 'DELIVERY', outletName = '') {
  const norm = String(posType || '').toUpperCase();
  const isTakeaway = String(orderType).toUpperCase() === 'TAKEAWAY';

  // 1. Boutique / Fashion / Apparel
  if (norm.includes('BOUTIQUE') || norm.includes('FASHION') || norm.includes('APPAREL') || norm.includes('CLOTH')) {
    const deliverySteps = [
      { key: 'PLACED', label: 'Order Placed', icon: FiCheck, desc: 'Your order has been received' },
      { key: 'CONFIRMED', label: 'Order Confirmed', icon: FiPackage, desc: 'Store is packing your items' },
      { key: 'READY', label: 'Package Ready', icon: FiClock, desc: 'Packed & ready for dispatch' },
      { key: 'OUT', label: 'Out for Delivery', icon: FiTruck, desc: 'Delivery partner is on the way' },
      { key: 'DELIVERED', label: 'Delivered', icon: FiHome, desc: 'Package delivered! Thank you for shopping with us.' },
    ];
    const takeawaySteps = [
      { key: 'PLACED', label: 'Order Placed', icon: FiCheck, desc: 'Your order has been received' },
      { key: 'CONFIRMED', label: 'Confirmed', icon: FiPackage, desc: 'Store is preparing your package' },
      { key: 'READY', label: 'Ready for Pickup', icon: FiClock, desc: 'Your package is ready! Visit us to collect.' },
    ];
    return {
      steps: isTakeaway ? takeawaySteps : deliverySteps,
      deliveredBannerTitle: isTakeaway ? 'Package Ready for Pickup!' : 'Package Delivered!',
      deliveredBannerSub: 'Thank you for shopping with us! We hope you love your purchase.',
      declinedBannerSub: `This order was declined by ${outletName || 'the boutique'}.`,
      originMapLabel: outletName || 'Boutique Store',
      itemsSectionTitle: 'Purchased Items',
    };
  }

  // 2. Grocery / Supermarket / Mart / FMCG
  if (norm.includes('GROCERY') || norm.includes('SUPERMARKET') || norm.includes('MART')) {
    const deliverySteps = [
      { key: 'PLACED', label: 'Order Placed', icon: FiCheck, desc: 'Your order has been received' },
      { key: 'CONFIRMED', label: 'Order Confirmed', icon: FiPackage, desc: 'Store is gathering & packing your items' },
      { key: 'READY', label: 'Groceries Packed', icon: FiClock, desc: 'Items bagged & ready for dispatch' },
      { key: 'OUT', label: 'Out for Delivery', icon: FiTruck, desc: 'Delivery partner is on the way' },
      { key: 'DELIVERED', label: 'Delivered', icon: FiHome, desc: 'Groceries delivered! Thank you for ordering.' },
    ];
    const takeawaySteps = [
      { key: 'PLACED', label: 'Order Placed', icon: FiCheck, desc: 'Your order has been received' },
      { key: 'CONFIRMED', label: 'Confirmed', icon: FiPackage, desc: 'Store is gathering your groceries' },
      { key: 'READY', label: 'Ready for Pickup', icon: FiClock, desc: 'Your groceries are packed & ready for pickup.' },
    ];
    return {
      steps: isTakeaway ? takeawaySteps : deliverySteps,
      deliveredBannerTitle: isTakeaway ? 'Groceries Ready for Pickup!' : 'Groceries Delivered!',
      deliveredBannerSub: 'Thank you for ordering with us!',
      declinedBannerSub: `This order was declined by ${outletName || 'the store'}.`,
      originMapLabel: outletName || 'Grocery Mart',
      itemsSectionTitle: 'Grocery Items',
    };
  }

  // 3. Bakery / Pastry / Confectionery
  if (norm.includes('BAKERY') || norm.includes('BAKE') || norm.includes('PASTRY') || norm.includes('CAKE')) {
    const deliverySteps = [
      { key: 'PLACED', label: 'Order Placed', icon: FiCheck, desc: 'Your order has been received' },
      { key: 'CONFIRMED', label: 'Order Confirmed', icon: FiPackage, desc: 'Bakery is preparing your bakes & treats' },
      { key: 'READY', label: 'Bakes Ready', icon: FiClock, desc: 'Fresh bakes packed & ready for dispatch' },
      { key: 'OUT', label: 'Out for Delivery', icon: FiTruck, desc: 'Rider is on the way to you' },
      { key: 'DELIVERED', label: 'Delivered', icon: FiHome, desc: 'Enjoy your fresh bakes! Thank you.' },
    ];
    const takeawaySteps = [
      { key: 'PLACED', label: 'Order Placed', icon: FiCheck, desc: 'Your order has been received' },
      { key: 'CONFIRMED', label: 'Confirmed', icon: FiPackage, desc: 'Bakery is packing your bakes' },
      { key: 'READY', label: 'Ready for Pickup', icon: FiClock, desc: 'Your bakes are ready! Head over to pick up.' },
    ];
    return {
      steps: isTakeaway ? takeawaySteps : deliverySteps,
      deliveredBannerTitle: isTakeaway ? 'Fresh Bakes Ready!' : 'Order Delivered!',
      deliveredBannerSub: 'Enjoy your fresh bakes! Thank you for ordering.',
      declinedBannerSub: `This order was declined by ${outletName || 'the bakery'}.`,
      originMapLabel: outletName || 'Bakery',
      itemsSectionTitle: 'Baked Goods & Treats',
    };
  }

  // 4. Salon / Spa / Services
  if (norm.includes('SALON') || norm.includes('SPA') || norm.includes('BEAUTY')) {
    const deliverySteps = [
      { key: 'PLACED', label: 'Order Placed', icon: FiCheck, desc: 'Your order has been received' },
      { key: 'CONFIRMED', label: 'Order Confirmed', icon: FiPackage, desc: 'Store is processing your order' },
      { key: 'READY', label: 'Order Ready', icon: FiClock, desc: 'Products packed & ready for dispatch' },
      { key: 'OUT', label: 'Out for Delivery', icon: FiTruck, desc: 'Delivery partner is on the way' },
      { key: 'DELIVERED', label: 'Delivered', icon: FiHome, desc: 'Products delivered! Thank you.' },
    ];
    const takeawaySteps = [
      { key: 'PLACED', label: 'Order Placed', icon: FiCheck, desc: 'Your order has been received' },
      { key: 'CONFIRMED', label: 'Confirmed', icon: FiPackage, desc: 'Staff is preparing your package' },
      { key: 'READY', label: 'Ready for Pickup', icon: FiClock, desc: 'Your order is ready! Visit us to collect.' },
    ];
    return {
      steps: isTakeaway ? takeawaySteps : deliverySteps,
      deliveredBannerTitle: isTakeaway ? 'Order Ready for Pickup!' : 'Order Delivered!',
      deliveredBannerSub: 'Thank you for choosing us!',
      declinedBannerSub: `This order was declined by ${outletName || 'the salon'}.`,
      originMapLabel: outletName || 'Salon & Spa',
      itemsSectionTitle: 'Order Items',
    };
  }

  // 5. General Retail / Others
  if (norm.includes('OTHER') || norm.includes('RETAIL') || norm.includes('STORE')) {
    const deliverySteps = [
      { key: 'PLACED', label: 'Order Placed', icon: FiCheck, desc: 'Your order has been received' },
      { key: 'CONFIRMED', label: 'Order Confirmed', icon: FiPackage, desc: 'Store is processing & packing your order' },
      { key: 'READY', label: 'Package Ready', icon: FiClock, desc: 'Order packed & ready for dispatch' },
      { key: 'OUT', label: 'Out for Delivery', icon: FiTruck, desc: 'Delivery partner is on the way' },
      { key: 'DELIVERED', label: 'Delivered', icon: FiHome, desc: 'Order delivered! Thank you for ordering.' },
    ];
    const takeawaySteps = [
      { key: 'PLACED', label: 'Order Placed', icon: FiCheck, desc: 'Your order has been received' },
      { key: 'CONFIRMED', label: 'Confirmed', icon: FiPackage, desc: 'Store is packing your items' },
      { key: 'READY', label: 'Ready for Pickup', icon: FiClock, desc: 'Your order is ready! Visit us to collect.' },
    ];
    return {
      steps: isTakeaway ? takeawaySteps : deliverySteps,
      deliveredBannerTitle: isTakeaway ? 'Order Ready for Pickup!' : 'Order Delivered!',
      deliveredBannerSub: 'Thank you for shopping with us!',
      declinedBannerSub: `This order was declined by ${outletName || 'the store'}.`,
      originMapLabel: outletName || 'Store Outlet',
      itemsSectionTitle: 'Order Items',
    };
  }

  // 6. Default: Restaurant / Cafe / QSR / Food Truck / Bar
  const deliverySteps = [
    { key: 'PLACED', label: 'Order Placed', icon: FiCheck, desc: 'Your order has been received' },
    { key: 'CONFIRMED', label: 'Order Confirmed', icon: FiPackage, desc: 'Restaurant is preparing your food' },
    { key: 'READY', label: 'Food Ready', icon: FiClock, desc: 'Freshly prepared & packed for delivery' },
    { key: 'OUT', label: 'Out for Delivery', icon: FiTruck, desc: 'Rider is on the way to you' },
    { key: 'DELIVERED', label: 'Delivered', icon: FiHome, desc: 'Enjoy your meal! Thank you for ordering.' },
  ];
  const takeawaySteps = [
    { key: 'PLACED', label: 'Order Placed', icon: FiCheck, desc: 'Your order has been received' },
    { key: 'CONFIRMED', label: 'Confirmed', icon: FiPackage, desc: 'Kitchen is preparing your order' },
    { key: 'READY', label: 'Ready for Pickup', icon: FiClock, desc: 'Your food is ready! Head over to pick up.' },
  ];
  return {
    steps: isTakeaway ? takeawaySteps : deliverySteps,
    deliveredBannerTitle: isTakeaway ? 'Food Ready for Pickup!' : 'Order Delivered!',
    deliveredBannerSub: 'Enjoy your meal! Thank you for ordering.',
    declinedBannerSub: `This order was declined by ${outletName || 'the restaurant'}.`,
    originMapLabel: outletName || 'Restaurant',
    itemsSectionTitle: 'Your Order',
  };
}

const getStepperStatusIndex = (backendStatus) => {
  switch (String(backendStatus).toUpperCase()) {
    case 'DRAFT':
    case 'PLACED':
    case 'PENDING':
      return 0;
    case 'CONFIRMED':
    case 'KITCHEN':
    case 'IN_PROGRESS':
      return 1;
    case 'READY':
      return 2;
    case 'BILLED':
    case 'OUT':
    case 'OUT_FOR_DELIVERY':
      return 3;
    case 'COMPLETED':
    case 'DELIVERED':
      return 4;
    default:
      return 0;
  }
};

function TrackPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get('id');
  const restaurantId = searchParams.get('r');
  const orgId = searchParams.get('orgId') || searchParams.get('branchId') || '';

  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState('PLACED');
  const [loading, setLoading] = useState(true);
  const [eta, setEta] = useState('25-35 min');
  const [mapLoaded, setMapLoaded] = useState(false);

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

  // Fetch order status & listen for real-time SSE updates
  useEffect(() => {
    if (!orderId) { router.replace('/'); return; }

    const fetchStatus = async () => {
      try {
        const res = await getOrderStatus(orderId, restaurantId);
        const data = res.data?.data || res.data;
        if (data) {
          setOrder(data);
          setStatus(data.status || 'PLACED');
          if (data.eta) setEta(data.eta);
        } else {
          throw new Error();
        }
      } catch (err) {
        console.warn('Failed to fetch order status from API:', err);
        // Demo mode — simulate order progression
        setOrder({ id: orderId, status: 'PLACED', type: 'DELIVERY' });
        setStatus('PLACED');
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();

    // Poll every 15 seconds as fallback
    const interval = setInterval(fetchStatus, 15000);

    // Setup real-time EventSource connection
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api';
    const sseUrl = `${apiBase}/delivery/orders/${orderId}/sse`;
    console.log('[sse] Connecting to order status updates:', sseUrl);

    let eventSource;
    try {
      eventSource = new EventSource(sseUrl);
      eventSource.addEventListener('status-update', (event) => {
        const newStatus = event.data;
        console.log('[sse] Real-time status update:', newStatus);
        setStatus(newStatus);
        fetchStatus();
      });
      eventSource.addEventListener('error', (err) => {
        console.warn('[sse] Connection issue, EventSource will auto-reconnect:', err);
      });
    } catch (e) {
      console.warn('[sse] Failed to init EventSource:', e);
    }

    return () => {
      clearInterval(interval);
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [orderId, restaurantId, router]);

  const orderType = order?.type || order?.orderType || 'DELIVERY';
  const posType = order?.posType || 'Restaurant';
  const outletName = order?.branchName || '';

  const workflowConfig = getOrderWorkflowConfig(posType, orderType, outletName);
  const steps = workflowConfig.steps;
  const stepIdx = getStepperStatusIndex(status);
  const isDelivered = status === 'DELIVERED' || status === 'COMPLETED' || (orderType === 'TAKEAWAY' && status === 'READY');
  const isCancelled = status === 'CANCELLED' || status === 'VOID';

  // Initialize Route Map
  useEffect(() => {
    if (!mapLoaded || !order || typeof window === 'undefined' || !window.L || orderType !== 'DELIVERY') return;

    const L = window.L;
    const container = document.getElementById('tracking-map');
    if (!container || container._leaflet_id) return;

    const restLat = order.shopLatitude ? Number(order.shopLatitude) : 10.528392;
    const restLng = order.shopLongitude ? Number(order.shopLongitude) : 76.213928;
    const custLat = order.latitude ? Number(order.latitude) : 10.532000;
    const custLng = order.longitude ? Number(order.longitude) : 76.222000;

    const mapInstance = L.map('tracking-map').setView([restLat, restLng], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapInstance);

    const restIcon = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    const custIcon = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    L.marker([restLat, restLng], { icon: restIcon }).addTo(mapInstance).bindPopup(workflowConfig.originMapLabel);
    L.marker([custLat, custLng], { icon: custIcon }).addTo(mapInstance).bindPopup('Delivery Location');

    L.polyline([[restLat, restLng], [custLat, custLng]], {
      color: '#EA580C',
      weight: 4,
      opacity: 0.7,
      dashArray: '8, 8'
    }).addTo(mapInstance);

    const bounds = L.latLngBounds([[restLat, restLng], [custLat, custLng]]);
    mapInstance.fitBounds(bounds, { padding: [40, 40] });

    return () => {
      mapInstance.remove();
    };
  }, [mapLoaded, order, workflowConfig.originMapLabel, orderType]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-brand-orange border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-stone-400 text-sm">Tracking your order…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-white border-b border-stone-100 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-stone-900 text-lg">Order Tracking</h1>
            <p className="text-xs text-stone-400 mt-0.5">#{orderId}</p>
          </div>
          {!isDelivered && !isCancelled && (
            <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-full">
              <div className="w-2 h-2 bg-brand-orange rounded-full animate-pulse" />
              <span className="text-xs font-semibold text-orange-700">{eta}</span>
            </div>
          )}
        </div>
      </div>

      {/* Celebration banner */}
      {isDelivered && (
        <div className="bg-green-500 text-white px-4 py-5 text-center">
          <p className="text-2xl mb-1">🎉</p>
          <p className="font-bold text-lg">{workflowConfig.deliveredBannerTitle}</p>
          <p className="text-sm opacity-80 mt-0.5">{workflowConfig.deliveredBannerSub}</p>
        </div>
      )}

      {/* Cancelled / Declined banner */}
      {isCancelled && (() => {
        const desc = String(order?.description || '').toLowerCase();
        const isDeclined = desc.includes('decline') || desc.includes('rejected');
        return (
          <div className="bg-red-500 text-white px-4 py-5 text-center">
            <p className="text-2xl mb-1">❌</p>
            <p className="font-bold text-lg">{isDeclined ? 'Order Declined' : 'Order Cancelled'}</p>
            <p className="text-sm opacity-80 mt-0.5">
              {isDeclined ? workflowConfig.declinedBannerSub : 'This order has been cancelled.'}
            </p>
          </div>
        );
      })()}

      {/* Progress stepper */}
      {!isCancelled && (
        <div className="bg-white mx-4 mt-4 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-stone-600 mb-4">Order Status</h2>
          <div className="space-y-0">
            {steps.map((step, idx) => {
              const done = idx < stepIdx;
              const current = idx === stepIdx;
              const Icon = step.icon;
              return (
                <div key={step.key} className="flex gap-4">
                  {/* Line + circle */}
                  <div className="flex flex-col items-center">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all ${done ? 'bg-green-500 border-green-500 text-white' :
                      current ? 'bg-brand-orange border-brand-orange text-white' :
                        'bg-white border-stone-200 text-stone-300'
                      }`}>
                      <Icon size={16} />
                    </div>
                    {idx < steps.length - 1 && (
                      <div className={`w-0.5 flex-1 min-h-[24px] ${done ? 'bg-green-400' : 'bg-stone-200'
                        }`} />
                    )}
                  </div>
                  {/* Label */}
                  <div className={`pb-5 ${idx === steps.length - 1 ? 'pb-0' : ''}`}>
                    <p className={`text-sm font-semibold ${current ? 'text-brand-orange' : done ? 'text-green-600' : 'text-stone-300'
                      }`}>{step.label}</p>
                    {current && (
                      <p className="text-xs text-stone-400 mt-0.5 flex items-center gap-1">
                        <span className="inline-block w-1.5 h-1.5 bg-brand-orange rounded-full animate-pulse" />
                        {step.desc}
                      </p>
                    )}
                    {done && <p className="text-xs text-stone-300 mt-0.5">{step.desc}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Visual Map Container */}
      {orderType === 'DELIVERY' && mapLoaded && !isCancelled && (
        <div className="bg-white mx-4 mt-3 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-stone-600 mb-3">Delivery Route</h2>
          <div id="tracking-map" className="h-64 w-full rounded-xl border border-stone-200 overflow-hidden z-0" />
        </div>
      )}

      {/* Order summary */}
      {order?.items && (
        <div className="bg-white mx-4 mt-3 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-stone-600 mb-3">{workflowConfig.itemsSectionTitle || 'Your Order'}</h2>
          {order.items.map((item, i) => {
            const displayName = item.productName || item.name || 'Item';
            const displayQty = item.quantity ?? item.qty ?? 1;
            const displayPrice = item.unitPrice ?? item.price ?? 0;
            const displayLineTotal = item.lineTotal ?? (displayPrice * displayQty);
            return (
              <div key={i} className="flex justify-between text-sm py-1">
                <span className="text-stone-700">{displayName} × {displayQty}</span>
                <span className="font-medium text-stone-800">₹{Number(displayLineTotal).toFixed(0)}</span>
              </div>
            );
          })}
          {order.remarks && (
            <div className="mt-3 pt-3 border-t border-stone-100">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Remarks / Instructions</p>
              <p className="text-sm text-stone-700 bg-stone-50 p-3 rounded-xl border border-stone-100">{order.remarks}</p>
            </div>
          )}
          {(order.grandTotal != null || order.total != null) && (
            <div className="border-t border-stone-100 mt-2 pt-2 flex justify-between font-bold text-stone-900">
              <span>Total</span><span>₹{order.grandTotal ?? order.total}</span>
            </div>
          )}
        </div>
      )}

      {/* Reorder / home */}
      <div className="px-4 mt-4 pb-8 space-y-2">
        {restaurantId && (
          <button
            onClick={() => router.push(`/order?r=${restaurantId}&t=${orderType}${orgId ? `&orgId=${orgId}` : ''}`)}
            className="w-full bg-brand-orange text-white font-semibold py-4 rounded-xl"
          >
            Order Again
          </button>
        )}
        <button
          onClick={() => router.push('/')}
          className="w-full border border-stone-200 text-stone-600 font-medium py-3.5 rounded-xl text-sm"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-brand-orange border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <TrackPageInner />
    </Suspense>
  );
}
