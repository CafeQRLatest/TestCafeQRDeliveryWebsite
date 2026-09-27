export const runtime = 'edge';

import OrderPage from '../order/page';

/**
 * Dynamic Clean Slug Route: /:slug
 * E.g., /arnos-marketing or /riyas-cafe
 */
export default function DynamicStorePage({ params }) {
  const slug = params?.slug;
  return <OrderPage slugHandle={slug} />;
}

