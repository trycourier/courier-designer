import { useAtom, useAtomValue } from "jotai";
import { ReactNode, useEffect, useRef } from "react";
import { getTemplateAtom, publishTemplateAtom, saveTemplateAtom } from './api/template';
import { getBrandAtom, publishBrandAtom, saveBrandAtom } from './api/brand';
import {
  isTemplateLoadingAtom,
  isTemplatePublishingAtom,
  isTemplateSavingAtom,
  apiUrlAtom,
  clientKeyAtom,
  templateDataAtom,
  templateErrorAtom,
  templateIdAtom,
  tenantIdAtom,
  tokenAtom,
  isBrandLoadingAtom,
  isBrandSavingAtom,
  isBrandPublishingAtom,
  brandErrorAtom,
  brandDataAtom,
} from "./store";

// Custom hooks
export function useTemplateActions() {
  const [, getTemplate] = useAtom(getTemplateAtom);
  const [, saveTemplate] = useAtom(saveTemplateAtom);
  const [, publishTemplate] = useAtom(publishTemplateAtom);
  const isTemplateLoading = useAtomValue(isTemplateLoadingAtom);
  const isTemplateSaving = useAtomValue(isTemplateSavingAtom);
  const isTemplatePublishing = useAtomValue(isTemplatePublishingAtom);
  const templateError = useAtomValue(templateErrorAtom);
  const templateData = useAtomValue(templateDataAtom);

  return {
    getTemplate,
    saveTemplate,
    publishTemplate,
    isTemplateLoading,
    isTemplateSaving,
    isTemplatePublishing,
    templateError,
    templateData,
  };
}

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
interface EditorProviderProps {
  children: ReactNode;
  templateId: string;
  tenantId: string;
  token: string;
  clientKey: string;
}

export const EditorProvider: React.FC<EditorProviderProps> = ({
  children,
  templateId,
  tenantId,
  token,
  clientKey,
}) => {
  const [, setApiUrl] = useAtom(apiUrlAtom);
  const [, setToken] = useAtom(tokenAtom);
  const [, setTenantId] = useAtom(tenantIdAtom);
  const [, setTemplateId] = useAtom(templateIdAtom);
  const [, getTemplate] = useAtom(getTemplateAtom);
  const [, setClientKey] = useAtom(clientKeyAtom);
  const hasInitialFetch = useRef(false);

  // Set configuration on mount
  useEffect(() => {
    setToken(token);
    setTenantId(tenantId);
    setTemplateId(templateId);
    setClientKey(clientKey);
  }, [
    token,
    tenantId,
    templateId,
    clientKey,
    setApiUrl,
    setToken,
    setTenantId,
    setTemplateId,
    setClientKey,
  ]);

  // Fetch initial template data
  useEffect(() => {
    if (templateId && !hasInitialFetch.current) {
      getTemplate(templateId);
      hasInitialFetch.current = true;
    }
  }, [templateId, getTemplate]);

  return <>{children}</>;
};
