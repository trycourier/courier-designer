import { cn } from "@/lib/utils";

export const Loader = ({ className }: { className?: string }) => {
  return (
    <div
      className={cn(
        "courier-flex courier-flex-col courier-items-center courier-justify-center courier-text-ring",
        className
      )}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="courier-w-6 courier-h-6 courier-animate-spin"
      >
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
    </div>
  );
};
