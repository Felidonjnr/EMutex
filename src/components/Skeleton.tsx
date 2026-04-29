import { cn } from '../lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("animate-pulse bg-brand-champagne/20 rounded-xl", className)} />
  );
}

export function ProductSkeleton() {
  return (
    <div className="card bg-white overflow-hidden">
      <Skeleton className="aspect-[4/5] rounded-none" />
      <div className="p-6 space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="pt-2 flex gap-2">
          <Skeleton className="h-10 flex-grow" />
          <Skeleton className="h-10 w-12" />
        </div>
      </div>
    </div>
  );
}

export function DetailedProductSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <Skeleton className="aspect-square w-full rounded-2xl" />
        <div className="space-y-8">
          <div className="space-y-4">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-20 w-full" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    </div>
  );
}

export function LeadRowSkeleton() {
  return (
    <tr className="animate-pulse">
      <td className="px-6 py-6 border-b border-brand-champagne/10">
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      </td>
      <td className="px-6 py-6 border-b border-brand-champagne/10"><Skeleton className="h-6 w-24" /></td>
      <td className="px-6 py-6 border-b border-brand-champagne/10"><Skeleton className="h-4 w-20" /></td>
      <td className="px-6 py-6 border-b border-brand-champagne/10"><Skeleton className="h-8 w-24" /></td>
      <td className="px-6 py-6 border-b border-brand-champagne/10 text-right"><Skeleton className="h-9 w-20 ml-auto" /></td>
    </tr>
  );
}

export function DashboardStatSkeleton() {
  return (
    <div className="card p-8 space-y-4">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-16" />
      <Skeleton className="h-4 w-32 ml-auto" />
    </div>
  );
}
