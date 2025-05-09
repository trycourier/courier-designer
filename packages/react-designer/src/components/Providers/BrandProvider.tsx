import { Provider, useAtom, useAtomValue } from "jotai";
import { useEffect, memo } from "react";
import { getTenantAtom, publishBrandAtom, saveBrandAtom } from "./api";
import type { BasicProviderProps } from "./Providers.types";
import {
  apiUrlAtom,
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
