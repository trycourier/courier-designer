import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="courier-toaster courier-group"
      toastOptions={{
        classNames: {
          toast:
            "courier-group courier-toast group-[.toaster]:courier-bg-background group-[.toaster]:courier-text-foreground group-[.toaster]:courier-border-border group-[.toaster]:courier-shadow-lg",
          description: "courier-group-[.toast]:courier-text-muted-foreground",
          actionButton:
            "courier-group-[.toast]:courier-bg-primary courier-group-[.toast]:courier-text-primary-foreground",
          cancelButton:
            "courier-group-[.toast]:courier-bg-muted courier-group-[.toast]:courier-text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
