'use client';
import { useParams } from 'next/navigation';
import OrderPage from '../order/page';

/**
 * Dynamic Clean Slug Route: /:slug
 * E.g., /arnos-marketing or /riyas-cafe
 */
export default function DynamicStorePage() {
  const params = useParams();
  const slug = params?.slug;
  return <OrderPage slugHandle={slug} />;
}
