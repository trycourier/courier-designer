import { useAutoSave } from "@/hooks/useAutoSave";
import type { ElementalContent } from "@/types/elemental.types";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { memo, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { channelAtom, pageAtom } from "../../store";
import type { BrandEditorProps } from "../BrandEditor";
import { BrandEditor } from "../BrandEditor";
import { BrandEditorContentAtom } from "../BrandEditor/store";
// import { ElementalValue } from "../ElementalValue/ElementalValue";
import { useTemplateActions } from "../Providers";
import {
  isTenantLoadingAtom,
  templateIdAtom,
  tenantDataAtom,
  tenantIdAtom,
} from "../Providers/store";
import type { Theme } from "../ui-kit/ThemeProvider/ThemeProvider.types";
import { Email, Inbox, Push, SMS } from "./Channels";
import { subjectAtom, templateEditorContentAtom } from "./store";

export interface TemplateEditorProps {
  theme?: Theme | string;
  value?: ElementalContent;
  onChange?: (value: ElementalContent) => void;
  variables?: Record<string, unknown>;
  hidePublish?: boolean;
  autoSave?: boolean;
  autoSaveDebounce?: number;
  brandEditor?: boolean;
  brandProps?: BrandEditorProps;
  channels?: ("email" | "sms" | "push" | "in-app")[];
}

const TemplateEditorComponent: React.FC<TemplateEditorProps> = ({
  theme,
  // value,
  // onChange,
  variables,
  hidePublish = false,
  autoSave = true,
  autoSaveDebounce = 200,
  brandEditor = false,
  brandProps,
}) => {
  // const [__, setElementalValue] = useState<ElementalContent | undefined>(value);
  const isTenantLoading = useAtomValue(isTenantLoadingAtom);
  const [tenantData, setTenantData] = useAtom(tenantDataAtom);
  const templateId = useAtomValue(templateIdAtom);
  const tenantId = useAtomValue(tenantIdAtom);
  const [_, setSubject] = useAtom(subjectAtom);
  const { getTenant, saveTemplate } = useTemplateActions();
  const page = useAtomValue(pageAtom);
  const isResponseSetRef = useRef(false);
  const [templateEditorContent, setTemplateEditorContent] = useAtom(templateEditorContentAtom);
  const setBrandEditorContent = useSetAtom(BrandEditorContentAtom);
  const channel = useAtomValue(channelAtom);

  useEffect(() => {
    const tenant = tenantData?.data?.tenant;
    if (
      templateId &&
      tenant &&
      (templateId !== tenant?.notification?.notificationId || tenantId !== tenant?.tenantId)
    ) {
      console.log("setting to null");
      setTenantData(null);
      setTemplateEditorContent(null);
      setBrandEditorContent(null);
      setSubject(null);
      isResponseSetRef.current = false;
      // setElementalValue(undefined);
    }
  }, [
    templateId,
    isResponseSetRef,
    tenantData,
    tenantId,
    setTemplateEditorContent,
    setSubject,
    setTenantData,
    setBrandEditorContent,
  ]);

  const { handleAutoSave } = useAutoSave({
    onSave: saveTemplate,
    debounceMs: autoSaveDebounce,
    enabled: isTenantLoading !== null && autoSave,
    onError: useMemo(() => () => toast.error("Error saving template"), []),
  });

  // Simple effect with only the essential logic
  useEffect(() => {
    // Skip if no tenant or already loading
    if (!templateId || !tenantId || isTenantLoading || (tenantData && isTenantLoading === false)) {
      return;
    }

    getTenant({ includeBrand: brandEditor });
  }, [templateId, tenantId, brandEditor, getTenant, isTenantLoading, tenantData]);

  useEffect(() => {
    if (isTenantLoading !== false) {
      return;
    }
    setTemplateEditorContent(tenantData?.data?.tenant?.notification?.data?.content);
  }, [tenantData, setTemplateEditorContent, isTenantLoading]);

  useEffect(() => {
    if (!templateEditorContent) {
      return;
    }
    setTimeout(() => {
      isResponseSetRef.current = true;
    }, 100);
  }, [templateEditorContent, channel]);

  useEffect(() => {
    isResponseSetRef.current = false;
  }, [channel]);

  useEffect(() => {
    if (!isResponseSetRef.current || !templateEditorContent) {
      return;
    }

    handleAutoSave(templateEditorContent);
  }, [templateEditorContent, handleAutoSave]);

  const notificationContent = useMemo(
    () => tenantData?.data?.tenant?.notification?.data?.content,
    [tenantData]
  );

  if (brandEditor && page === "brand") {
    return (
      <BrandEditor
        hidePublish={hidePublish}
        autoSave={autoSave}
        templateEditor
        variables={variables}
        {...brandProps}
      />
    );
  }

  if (page === "template" && channel === "email" && notificationContent) {
    return (
      <Email
        value={notificationContent}
        variables={variables}
        theme={theme}
        isLoading={Boolean(isTenantLoading)}
        hidePublish={hidePublish}
        brandEditor={brandEditor}
      />
    );
  }

  if (page === "template" && channel === "sms") {
    return <SMS theme={theme} hidePublish={hidePublish} />;
  }

  if (page === "template" && channel === "push") {
    return <Push theme={theme} hidePublish={hidePublish} />;
  }

  if (page === "template" && channel === "inbox") {
    return <Inbox theme={theme} hidePublish={hidePublish} />;
  }

  // return (
  //   <>
  //     <div className="courier-mt-12 courier-w-full">
  //       Ver: 0.0.20
  //       <div className="courier-flex courier-gap-4 courier-w-full courier-h-[300px]">
  //         <textarea
  //           className="courier-flex-1 courier-rounded-lg courier-border courier-border-border courier-shadow-sm courier-p-4 courier-h-full"
  //           readOnly
  //           value={elementalValue ? JSON.stringify(elementalValue, null, 2) : ""}
  //         />
  //         <div className="courier-flex courier-flex-col courier-w-1/2">
  //           <ElementalValue
  //             value={elementalValue}
  //             onChange={(value, isValid) => {
  //               if (isValid) {
  //                 try {
  //                   const parsedValue = JSON.parse(value);
  //                   setElementalValue(parsedValue);
  //                   if (editor) {
  //                     editor.commands.setContent(convertElementalToTiptap(parsedValue));
  //                   }
  //                 } catch (e) {
  //                   console.error("Invalid JSON format", e);
  //                 }
  //               }
  //             }}
  //           />
  //         </div>
  //       </div>
  //     </div>
  //   </>
  // );
};

export const TemplateEditor = memo(TemplateEditorComponent);
