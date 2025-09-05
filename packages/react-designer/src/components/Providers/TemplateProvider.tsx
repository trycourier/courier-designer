import { Provider, useAtom } from "jotai";
import { memo, useEffect } from "react";
import { toast } from "sonner";
import { Toaster } from "../ui-kit/Toaster";
import type { BasicProviderProps } from "./Providers.types";
import {
  apiUrlAtom,
  editorStore,
  getTemplateOverrideAtom,
  saveTemplateOverrideAtom,
  templateErrorAtom,
  templateIdAtom,
  tenantIdAtom,
  tokenAtom,
  uploadImageUrlAtom,
  type TemplateActions,
  type MessageRouting,
} from "./store";

// Configuration provider component
type TemplateProviderProps = BasicProviderProps & {
  templateId: string;
  // Completely override default template fetching logic
  getTemplate?: (actions: TemplateActions) => Promise<void>;
  // Completely override default template saving logic
  saveTemplate?: (actions: TemplateActions, options?: MessageRouting) => Promise<void>;
};

// Internal component that uses atoms
const TemplateProviderContext: React.FC<TemplateProviderProps> = ({
  children,
  templateId,
  tenantId,
  token,
  apiUrl,
  uploadImageUrl,
}) => {
  const [, setApiUrl] = useAtom(apiUrlAtom);
  const [, setUploadImageUrl] = useAtom(uploadImageUrlAtom);
  const [, setToken] = useAtom(tokenAtom);
  const [, setTenantId] = useAtom(tenantIdAtom);
  const [, setId] = useAtom(templateIdAtom);

  const [templateError] = useAtom(templateErrorAtom);

  // Set configuration on mount
  useEffect(() => {
    setToken(token);
    setTenantId(tenantId);
    setId(templateId);
    if (apiUrl) {
      setApiUrl(apiUrl);
    }
    if (uploadImageUrl) {
      setUploadImageUrl(uploadImageUrl);
    }
  }, [
    token,
    tenantId,
    templateId,
    apiUrl,
    setApiUrl,
    setToken,
    setTenantId,
    setId,
    uploadImageUrl,
    setUploadImageUrl,
  ]);

  useEffect(() => {
    if (templateError) {
      // Use the message and toastProps directly from the simplified error
      toast.error(templateError.message, templateError.toastProps);

      // Log error info in development
      if (process.env.NODE_ENV === "development") {
        console.group("Template Error");
        console.error("Message:", templateError.message);
        console.error("Toast Props:", templateError.toastProps);
        console.groupEnd();
      }
    }
  }, [templateError]);

  // No need for additional wrappers - functions are stored directly

  return <>{children}</>;
};

// Create a simple store for the raw override functions
export const overrideFunctions = {
  getTemplate: null as TemplateProviderProps["getTemplate"] | null,
  saveTemplate: null as TemplateProviderProps["saveTemplate"] | null,
};

const TemplateProviderComponent: React.FC<TemplateProviderProps> = (props) => {
  // Store the raw functions in a simple object
  useEffect(() => {
    overrideFunctions.getTemplate = props.getTemplate || null;
    // Set a marker in the atom so useTemplateActions knows an override exists
    editorStore.set(getTemplateOverrideAtom, props.getTemplate ? () => Promise.resolve() : null);
  }, [props.getTemplate]);

  useEffect(() => {
    overrideFunctions.saveTemplate = props.saveTemplate || null;
    // Set a marker in the atom so useTemplateActions knows an override exists
    editorStore.set(saveTemplateOverrideAtom, props.saveTemplate ? () => Promise.resolve() : null);
  }, [props.saveTemplate]);

  return (
    <Provider store={editorStore}>
      <TemplateProviderContext {...props} />
      <Toaster />
    </Provider>
  );
};

export const TemplateProvider = memo(TemplateProviderComponent);
