'use client';
import { FiCheck } from 'react-icons/fi';

export default function OrderStatusStepper({ status, posType = 'Restaurant' }) {
  const norm = String(posType || '').toUpperCase();
  const isRetail = norm.includes('BOUTIQUE') || norm.includes('GROCERY') || norm.includes('RETAIL') || norm.includes('STORE') || norm.includes('SALON');
  const isBakery = norm.includes('BAKERY') || norm.includes('CAKE');

  const prepEmoji = isRetail ? '🛍️' : isBakery ? '🥐' : '👨‍🍳';
  const prepLabel = isRetail ? 'Being Packed' : isBakery ? 'Baking Fresh' : 'Being Prepared';

  const steps = [
    { key: 'PENDING',   label: 'Order Received', emoji: '📋' },
    { key: 'CONFIRMED', label: 'Confirmed',       emoji: '✅' },
    { key: 'PREPARING', label: prepLabel,         emoji: prepEmoji },
    { key: 'ASSIGNED',  label: 'Agent Assigned',  emoji: '🛵' },
    { key: 'PICKED_UP', label: 'On the Way',      emoji: '🚀' },
    { key: 'DELIVERED', label: 'Delivered',       emoji: '🎉' },
  ];

  const currentIdx = steps.findIndex(s => s.key === status);
  return (
    <div className="py-2">
      {steps.map((step, idx) => {
        const done    = idx < currentIdx;
        const active  = idx === currentIdx;
        const pending = idx > currentIdx;
        return (
          <div key={step.key} className="flex gap-4">
            {/* Timeline */}
            <div className="flex flex-col items-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-lg border-2 transition-all ${
                done   ? 'bg-green-500 border-green-500 text-white' :
                active ? 'bg-brand-orange border-brand-orange text-white scale-110' :
                         'bg-white border-stone-200 text-stone-300'
              }`}>
                {done ? <FiCheck size={16} /> : step.emoji}
              </div>
              {idx < steps.length - 1 && (
                <div className={`w-0.5 h-8 mt-1 ${
                  done ? 'bg-green-400' : 'bg-stone-200'
                }`} />
              )}
            </div>
            {/* Label */}
            <div className="pb-6 pt-1.5">
              <p className={`text-sm font-semibold ${
                active ? 'text-brand-orange' : done ? 'text-green-600' : 'text-stone-300'
              }`}>
                {step.label}
              </p>
              {active && <p className="text-xs text-stone-400 mt-0.5">In progress…</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
