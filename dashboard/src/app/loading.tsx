import { Skeleton } from "@/components/ui/skeleton";

export default function QueueLoading() {
  return (
    <main className="flex min-h-full flex-1 flex-col">
      <div className="flex items-center justify-between border-b px-6 py-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-8 w-20" />
      </div>
      <div className="grid flex-1 grid-cols-[320px_1fr] overflow-hidden">
        <div className="flex flex-col gap-px border-r p-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2 px-2 py-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-4 p-6">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-16 w-24" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </main>
  );
}
