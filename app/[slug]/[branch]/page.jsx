'use client';
import { useParams } from 'next/navigation';
import OrderPage from '../../order/page';

/**
 * Dynamic Multi-Branch Clean Slug Route: /:slug/:branch
 * E.g., /arnos-marketing/main-outlet or /riyas-cafe/calicut
 */
export default function DynamicStoreBranchPage() {
  const params = useParams();
  const slug = params?.slug;
  const branch = params?.branch;
  return <OrderPage slugHandle={slug} branchHandle={branch} />;
}
