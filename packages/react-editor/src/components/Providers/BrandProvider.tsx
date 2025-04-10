import { Provider, useAtom, useAtomValue } from "jotai";
import { useEffect } from "react";
import { getBrandAtom, publishBrandAtom, saveBrandAtom } from "./api";
import type { BasicProviderProps } from "./Providers.types";
import {
  apiUrlAtom,
  brandDataAtom,
  brandErrorAtom,
  clientKeyAtom,
  editorStore,
  isBrandLoadingAtom,
  isBrandPublishingAtom,
  isBrandSavingAtom,
  tenantIdAtom,
  tokenAtom,
} from "./store";
// Custom hooks
export function useBrandActions() {
  const [, getBrand] = useAtom(getBrandAtom);
  const [, saveBrand] = useAtom(saveBrandAtom);
  const [, publishBrand] = useAtom(publishBrandAtom);
  const isBrandLoading = useAtomValue(isBrandLoadingAtom);
  const isBrandSaving = useAtomValue(isBrandSavingAtom);
  const isBrandPublishing = useAtomValue(isBrandPublishingAtom);
  const brandError = useAtomValue(brandErrorAtom);
  const brandData = useAtomValue(brandDataAtom);

  return {
    getBrand,
    saveBrand,
    publishBrand,
    isBrandLoading,
    isBrandSaving,
    isBrandPublishing,
    brandError,
    brandData,
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
