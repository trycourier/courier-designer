import { forwardRef } from "react";

type HeaderProps = {
  children: React.ReactNode;
};

export const Header = forwardRef<HTMLDivElement, HeaderProps>(({ children }, ref) => {
  return (
    <div
      ref={ref}
      className="courier-z-30 courier-flex courier-w-full courier-bg-primary courier-h-12 courier-border-t-0 courier-border-l-0 courier-border-r-0 courier-border-b rounded-b-none rounded-t-sm courier-shadow-none courier-justify-between courier-items-center courier-px-4"
    >
      {children}
    </div>
  );
});
