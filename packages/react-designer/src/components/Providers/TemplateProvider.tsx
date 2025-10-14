import { Provider, useAtom, createStore } from "jotai";
import { createContext, memo, useContext, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import type { BasicProviderProps, UploadImageFunction } from "./Providers.types";
import {
  apiUrlAtom,
  getTemplateOverrideAtom,
  saveTemplateOverrideAtom,
  templateErrorAtom,
  templateIdAtom,
  tenantIdAtom,
  tokenAtom,
  type TemplateActions,
  type MessageRouting,
} from "./store";
import { useTemplateActions } from "./useTemplateActions";

// Context to provide the store instance and override functions
interface TemplateStoreContextValue {
  store: ReturnType<typeof createStore>;
  overrideFunctions: {
    getTemplate: ((actions: TemplateActions) => Promise<void>) | null;
    saveTemplate: ((actions: TemplateActions, options?: MessageRouting) => Promise<void>) | null;
    uploadImage: UploadImageFunction | null;
  };
}

export const TemplateStoreContext = createContext<TemplateStoreContextValue | null>(null);

export const useTemplateStore = () => {
  const context = useContext(TemplateStoreContext);
  if (!context) {
    throw new Error("useTemplateStore must be used within a TemplateProvider");
  }
  return context;
};

// Configuration provider component
type TemplateProviderProps = BasicProviderProps & {
  templateId: string;
  // Completely override default template fetching logic
  getTemplate?: (actions: TemplateActions) => Promise<void>;
  // Completely override default template saving logic
  saveTemplate?: (actions: TemplateActions, options?: MessageRouting) => Promise<void>;
  // Completely override default image upload logic
  uploadImage?: UploadImageFunction;
};

// Internal component that uses atoms
const TemplateProviderContext: React.FC<TemplateProviderProps> = ({
  children,
  templateId,
  tenantId,
  token,
  apiUrl,
}) => {
  const [, setApiUrl] = useAtom(apiUrlAtom);
  const [, setToken] = useAtom(tokenAtom);
  const [, setTenantId] = useAtom(tenantIdAtom);
  const [, setId] = useAtom(templateIdAtom);

  const templateActions = useTemplateActions();
  const templateActionsRef = useRef(templateActions);
  const [templateError] = useAtom(templateErrorAtom);

  // Update ref with latest templateActions
  templateActionsRef.current = templateActions;

  // Set configuration on mount
  useEffect(() => {
    setToken(token);
    setTenantId(tenantId);
    setId(templateId);
    if (apiUrl) {
      setApiUrl(apiUrl);
    }
  }, [token, tenantId, templateId, apiUrl, setApiUrl, setToken, setTenantId, setId]);

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

const TemplateProviderComponent: React.FC<TemplateProviderProps> = (props) => {
  // Create a unique store instance for this TemplateProvider
  const store = useMemo(() => createStore(), []);

  // Create instance-specific override functions
  const overrideFunctions = useMemo(
    () => ({
      getTemplate: props.getTemplate || null,
      saveTemplate: props.saveTemplate || null,
      uploadImage: props.uploadImage || null,
    }),
    [props.getTemplate, props.saveTemplate, props.uploadImage]
  );

  // Set markers in the store atoms when overrides exist
  useEffect(() => {
    store.set(getTemplateOverrideAtom, props.getTemplate ? () => Promise.resolve() : null);
  }, [store, props.getTemplate]);

  useEffect(() => {
    store.set(saveTemplateOverrideAtom, props.saveTemplate ? () => Promise.resolve() : null);
  }, [store, props.saveTemplate]);

  // Create context value
  const contextValue = useMemo(() => ({ store, overrideFunctions }), [store, overrideFunctions]);

  return (
    <Provider store={store}>
      <TemplateStoreContext.Provider value={contextValue}>
        <TemplateProviderContext {...props} />
      </TemplateStoreContext.Provider>
    </Provider>
  );
};

export const TemplateProvider = memo(TemplateProviderComponent);
