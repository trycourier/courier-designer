import { isTemplateLoadingAtom, isTemplateSavingAtom, templateErrorAtom } from "@/components/CourierTemplateProvider/store";
import { pageAtom } from "../../../../store";
import { useAtomValue } from "jotai";
import { useEffect, useState } from "react";
import { Loader } from "../../../Loader";
import { CircleCheck } from "lucide-react";

export const Status = () => {
  const isTemplateSaving = useAtomValue(isTemplateSavingAtom);
  const isTemplateLoading = useAtomValue(isTemplateLoadingAtom);
  const templateError = useAtomValue(templateErrorAtom);
  const page = useAtomValue(pageAtom);
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

  if (isTemplateLoading || isTemplateSaving === null || page === "theme") {
    return null;
  }

  const templateSaving = isTemplateSaving ? <><Loader className="courier-w-4 courier-h-4" />Saving...</> : <><CircleCheck strokeWidth={1.25} className="courier-w-4 courier-h-4" />Saved</>

  return (
    <div className="courier-absolute courier-top-0 courier-right-0 courier-h-12 courier-z-50 courier-flex courier-items-center courier-px-4 courier-text-xs courier-gap-1">
      {templateError ? "Error" : templateSaving}
    </div>
  );
};
