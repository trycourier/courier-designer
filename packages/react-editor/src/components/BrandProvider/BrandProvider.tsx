import { useAtom, useAtomValue } from "jotai";
import { ReactNode, useEffect, useRef } from "react";
import { getBrandAtom, publishBrandAtom, saveBrandAtom } from './api';
import {
  isBrandLoadingAtom,
  isBrandPublishingAtom,
  isBrandSavingAtom,
  brandApiUrlAtom,
  brandClientKeyAtom,
  brandDataAtom,
  brandErrorAtom,
  brandTenantIdAtom,
  brandTokenAtom,
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
interface BrandProviderProps {
  children: ReactNode;
  tenantId: string;
  token: string;
  clientKey: string;
}

export const BrandProvider: React.FC<BrandProviderProps> = ({
  children,
  tenantId,
  token,
  clientKey,
}) => {
  const [, setBrandApiUrl] = useAtom(brandApiUrlAtom);
  const [, setBrandToken] = useAtom(brandTokenAtom);
  const [, setBrandTenantId] = useAtom(brandTenantIdAtom);
  const [, getBrand] = useAtom(getBrandAtom);
  const [, setBrandClientKey] = useAtom(brandClientKeyAtom);
  const hasInitialFetch = useRef(false);

  // Set configuration on mount
  useEffect(() => {
    setBrandToken(token);
    setBrandTenantId(tenantId);
    setBrandClientKey(clientKey);
  }, [
    token,
    tenantId,
    clientKey,
    setBrandApiUrl,
    setBrandToken,
    setBrandTenantId,
    setBrandClientKey,
  ]);

  // Fetch initial template data
  useEffect(() => {
    if (tenantId && !hasInitialFetch.current) {
      getBrand(tenantId);
      hasInitialFetch.current = true;
    }
  }, [tenantId, getBrand]);

  return <>{children}</>;
};
