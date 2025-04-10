import { Provider, useAtom, useAtomValue } from "jotai";
import { useEffect } from "react";
import { getTenantAtom, publishBrandAtom, saveBrandAtom } from "./api";
import type { BasicProviderProps } from "./Providers.types";
import {
  apiUrlAtom,
  clientKeyAtom,
  editorStore,
  isTenantLoadingAtom,
  isTenantPublishingAtom,
  isTenantSavingAtom,
  tenantDataAtom,
  tenantErrorAtom,
  tenantIdAtom,
  tokenAtom,
} from "./store";
// Custom hooks
export function useBrandActions() {
  const [, getTenant] = useAtom(getTenantAtom);
  const [, saveBrand] = useAtom(saveBrandAtom);
  const [, publishBrand] = useAtom(publishBrandAtom);
  const isTenantLoading = useAtomValue(isTenantLoadingAtom);
  const isTenantSaving = useAtomValue(isTenantSavingAtom);
  const isTenantPublishing = useAtomValue(isTenantPublishingAtom);
  const tenantError = useAtomValue(tenantErrorAtom);
  const tenantData = useAtomValue(tenantDataAtom);

  return {
    getTenant,
    saveBrand,
    publishBrand,
    isTenantLoading,
    isTenantSaving,
    isTenantPublishing,
    tenantError,
    tenantData,
  };
}

// Configuration provider component
type BrandProviderProps = BasicProviderProps;

// Internal component that uses atoms
const BrandProviderContext: React.FC<BrandProviderProps> = ({
  children,
  tenantId,
  token,
  clientKey,
  apiUrl,
}) => {
  const [, setApiUrl] = useAtom(apiUrlAtom);
  const [, setToken] = useAtom(tokenAtom);
  const [, setTenantId] = useAtom(tenantIdAtom);
  const [, setClientKey] = useAtom(clientKeyAtom);

  // Set configuration on mount
  useEffect(() => {
    setToken(token);
    setTenantId(tenantId);
    setClientKey(clientKey);
    if (apiUrl) {
      setApiUrl(apiUrl);
    }
  }, [token, tenantId, clientKey, apiUrl, setApiUrl, setToken, setTenantId, setClientKey]);

  return <>{children}</>;
};

export const BrandProvider: React.FC<BrandProviderProps> = (props) => {
  return (
    <Provider store={editorStore}>
      <BrandProviderContext {...props} />
    </Provider>
  );
};
