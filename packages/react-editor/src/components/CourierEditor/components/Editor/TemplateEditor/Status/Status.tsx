import { isTemplateLoadingAtom, isTemplateSavingAtom, templateErrorAtom } from "@/components/CourierTemplateProvider/store";
import { useAtomValue } from "jotai";
import { useEffect, useState } from "react";
import { Loader } from "../../../Loader";
import { CircleCheck } from "lucide-react";

export const Status = () => {
  const isTemplateSaving = useAtomValue(isTemplateSavingAtom);
  const isTemplateLoading = useAtomValue(isTemplateLoadingAtom);
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

  if (isTemplateLoading || isTemplateSaving === null) {
    return null;
  }

  const templateSaving = isTemplateSaving ? <><Loader className="w-4 h-4" />Saving...</> : <><CircleCheck strokeWidth={1.25} className="w-4 h-4" />Saved</>

  return (
    <div className="absolute top-0 right-0 h-12 z-50 flex items-center px-4 text-xs gap-1">
      {templateError ? "Error" : templateSaving}
    </div>
  );
};
