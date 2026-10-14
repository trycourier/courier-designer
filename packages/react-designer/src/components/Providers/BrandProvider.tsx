import { Provider, useAtom, useAtomValue, createStore } from "jotai";
import { useEffect, memo, useMemo } from "react";
import { toast } from "sonner";
import type { BasicProviderProps } from "./Providers.types";
import { apiUrlAtom, templateErrorAtom, tenantIdAtom, tokenAtom } from "./store";

// Configuration provider component
type BrandProviderProps = BasicProviderProps;

// Internal component that uses atoms
const BrandProviderContext: React.FC<BrandProviderProps> = ({
  children,
  tenantId,
  token,
  apiUrl,
}) => {
  const [, setApiUrl] = useAtom(apiUrlAtom);
  const [, setToken] = useAtom(tokenAtom);
  const [, setTenantId] = useAtom(tenantIdAtom);

  // Set configuration on mount
  useEffect(() => {
    setToken(token);
    setTenantId(tenantId);
    if (apiUrl) {
      setApiUrl(apiUrl);
    }
  }, [token, tenantId, apiUrl, setApiUrl, setToken, setTenantId]);

  // Same as TemplateProvider: load and save errors would otherwise be silent.
  const templateError = useAtomValue(templateErrorAtom);
  useEffect(() => {
    if (templateError) {
      toast.error(templateError.message, templateError.toastProps);
    }
  }, [templateError]);

  return <>{children}</>;
};

const BrandProviderComponent: React.FC<BrandProviderProps> = (props) => {
  // Create a unique store instance for this BrandProvider
  const store = useMemo(() => createStore(), []);

  return (
    <Provider store={store}>
      <BrandProviderContext {...props} />
    </Provider>
  );
};

export const BrandProvider = memo(BrandProviderComponent);
