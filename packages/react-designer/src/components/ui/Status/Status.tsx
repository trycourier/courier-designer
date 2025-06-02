import { CircleCheck } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { Loader } from "../Loader";

interface StatusProps {
  isError?: boolean;
  isSaving?: boolean | null;
  isLoading?: boolean;
}

export const Status = ({ isError, isSaving, isLoading }: StatusProps) => {
  const [showSaved, setShowSaved] = useState(false);
  const prevIsSavingRef = useRef<boolean | null | undefined>(isSaving);
  const savedTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isLoading || isError || (isSaving && isSaving !== prevIsSavingRef.current)) {
      if (savedTimerRef.current) {
        clearTimeout(savedTimerRef.current);
        savedTimerRef.current = null;
      }
      setShowSaved(false);
    } else if (prevIsSavingRef.current === true && isSaving === false && !isError && !isLoading) {
      setShowSaved(true);
      if (savedTimerRef.current) {
        clearTimeout(savedTimerRef.current);
      }
      savedTimerRef.current = setTimeout(() => {
        setShowSaved(false);
        savedTimerRef.current = null;
      }, 5000);
    }

    prevIsSavingRef.current = isSaving;

    return () => {
      if (savedTimerRef.current) {
        clearTimeout(savedTimerRef.current);
      }
    };
  }, [isSaving, isError, isLoading]);

  if (isLoading || isSaving === null) {
    return null;
  }

  if (isSaving) {
    return (
      <div className="courier-h-12 courier-flex courier-items-center courier-px-4 courier-text-xs courier-gap-1">
        <Loader className="courier-w-4 courier-h-4" />
        Saving...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="courier-h-12 courier-flex courier-items-center courier-px-4 courier-text-xs courier-gap-1">
        Error
      </div>
    );
  }

  if (showSaved) {
    return (
      <div className="courier-h-12 courier-flex courier-items-center courier-px-4 courier-text-xs courier-gap-1">
        <CircleCheck strokeWidth={1.25} className="courier-w-4 courier-h-4" />
        Saved
      </div>
    );
  }

  return null;
};
