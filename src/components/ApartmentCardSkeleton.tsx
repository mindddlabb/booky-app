import { Skeleton } from "@/components/ui/skeleton";

const ApartmentCardSkeleton = () => {
  return (
    <div className="relative w-full h-full bg-muted animate-pulse">
      {/* Full screen image skeleton */}
      <Skeleton className="w-full h-full rounded-none" />

      {/* Top right badge skeleton */}
      <div className="absolute top-6 right-6 pt-safe">
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>

      {/* Bottom info skeleton */}
      <div className="absolute bottom-6 left-6 right-6 space-y-3 pb-[50px]">
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-14 rounded-full" />
        </div>
        <Skeleton className="h-8 w-3/4 rounded-lg" />
        <Skeleton className="h-5 w-1/2 rounded-lg" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-5 w-12 rounded" />
            <Skeleton className="h-5 w-12 rounded" />
            <Skeleton className="h-5 w-20 rounded" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-11 w-11 rounded-full" />
            <Skeleton className="h-11 w-28 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApartmentCardSkeleton;
