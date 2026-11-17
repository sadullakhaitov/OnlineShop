/**
 * Shown at once while a page that needs the server (account, an order) is
 * on its way, so a tap never looks ignored.
 */
export default function Loading() {
  return (
    <div className="flex flex-col gap-5 pt-5 sm:pt-7" aria-busy="true">
      <div className="h-4 w-40 animate-pulse rounded-full bg-hairline" />
      <div className="glass h-40 animate-pulse rounded-[1.75rem]" />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="glass aspect-[3/4] animate-pulse rounded-[1.5rem]" />
        ))}
      </div>
    </div>
  );
}
