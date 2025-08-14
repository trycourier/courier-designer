import { Provider, useAtom } from "jotai";
import { useEffect, memo } from "react";
import type { BasicProviderProps } from "./Providers.types";
import { apiUrlAtom, editorStore, tenantIdAtom, tokenAtom } from "./store";

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

  return <>{children}</>;
};

const BrandProviderComponent: React.FC<BrandProviderProps> = (props) => {
  return (
    <Provider store={editorStore}>
      <BrandProviderContext {...props} />
    </Provider>
  );
};

export const BrandProvider = memo(BrandProviderComponent);
