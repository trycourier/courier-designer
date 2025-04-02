import { CircleCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Loader } from "../Loader";

type StatusProps = {
  isError?: boolean;
  isSaving?: boolean;
  isLoading?: boolean;
};

export const Status = ({ isError, isSaving, isLoading }: StatusProps) => {
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (!isSaving && !isError) {
      setShowSaved(true);
      const timer = setTimeout(() => {
        setShowSaved(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isSaving, isError]);

  if (!showSaved && !isSaving && !isError) {
    return null;
  }

  if (isLoading || isSaving === null) {
    return null;
  }

  const saving = isSaving ? (
    <>
      <Loader className="courier-w-4 courier-h-4" />
      Saving...
    </>
  ) : (
    <>
      <CircleCheck strokeWidth={1.25} className="courier-w-4 courier-h-4" />
      Saved
    </>
  );

  return (
    <div className="courier-h-12 courier-flex courier-items-center courier-px-4 courier-text-xs courier-gap-1">
      {isError ? "Error" : saving}
    </div>
  );
};
