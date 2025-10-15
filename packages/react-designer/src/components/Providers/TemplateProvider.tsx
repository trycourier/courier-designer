import { Provider, useAtom, createStore, useStore } from "jotai";
import { createContext, memo, useContext, useEffect, useMemo } from "react";
import { toast } from "sonner";
import type { BasicProviderProps, UploadImageFunction } from "./Providers.types";
import { apiUrlAtom, templateErrorAtom, templateIdAtom, tenantIdAtom, tokenAtom } from "./store";

// Use Jotai's useStore to access the current store instance (for multi-instance support)
export const useTemplateStore = () => {
  const store = useStore();
  return { store };
};

// Simple context ONLY for uploadImage function (doesn't affect Jotai performance for state)
const UploadImageContext = createContext<UploadImageFunction | null>(null);

export const useUploadImage = () => {
  return useContext(UploadImageContext);
};

// Configuration provider component
type TemplateProviderProps = BasicProviderProps & {
  templateId: string;
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
  uploadImage,
}) => {
  const [, setApiUrl] = useAtom(apiUrlAtom);
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

  return (
    <UploadImageContext.Provider value={uploadImage || null}>
      {children}
    </UploadImageContext.Provider>
  );
};

const TemplateProviderComponent: React.FC<TemplateProviderProps> = (props) => {
  // Create a unique store instance for this TemplateProvider
  const store = useMemo(() => createStore(), []);

  return (
    <Provider store={store}>
      <TemplateProviderContext {...props} />
    </Provider>
  );
};

export const TemplateProvider = memo(TemplateProviderComponent);
