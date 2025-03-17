import { isTemplateSavingAtom, templateErrorAtom } from "@/components/CourierTemplateProvider/store";
import { useAtomValue } from "jotai";
import { useEffect, useState } from "react";

export const Status = () => {
  const isTemplateSaving = useAtomValue(isTemplateSavingAtom);
  const templateError = useAtomValue(templateErrorAtom);
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (!isTemplateSaving && !templateError) {
      setShowSaved(true);
      const timer = setTimeout(() => {
        setShowSaved(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isTemplateSaving, templateError]);

  if (!showSaved && !isTemplateSaving && !templateError) {
    return null;
  }

  return (
    <div className="absolute top-0 right-0 h-12 z-50 flex items-center px-4 text-xs">
      {templateError ? "Error" : isTemplateSaving ? "Saving..." : "Saved"}
    </div>
  );
};
