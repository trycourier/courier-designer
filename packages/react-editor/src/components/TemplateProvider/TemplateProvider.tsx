import { useAtom, useAtomValue } from "jotai";
import { ReactNode, useEffect } from "react";
import { getTemplateAtom, publishTemplateAtom, saveTemplateAtom } from './api';
import {
  isTemplateLoadingAtom,
  isTemplatePublishingAtom,
  isTemplateSavingAtom,
  templateApiUrlAtom,
  templateClientKeyAtom,
  templateDataAtom,
  templateErrorAtom,
  templateIdAtom,
  templateTenantIdAtom,
  templateTokenAtom,
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

// Configuration provider component
interface TemplateProviderProps {
  children: ReactNode;
  templateId: string;
  tenantId: string;
  token: string;
  clientKey: string;
  apiUrl?: string;
}

export const TemplateProvider: React.FC<TemplateProviderProps> = ({
  children,
  templateId,
  tenantId,
  token,
  clientKey,
  apiUrl,
}) => {
  const [, setTemplateApiUrl] = useAtom(templateApiUrlAtom);
  const [, setTemplateToken] = useAtom(templateTokenAtom);
  const [, setTemplateTenantId] = useAtom(templateTenantIdAtom);
  const [, setTemplateId] = useAtom(templateIdAtom);
  const [, setTemplateClientKey] = useAtom(templateClientKeyAtom);

  // Set configuration on mount
  useEffect(() => {
    setTemplateToken(token);
    setTemplateTenantId(tenantId);
    setTemplateId(templateId);
    setTemplateClientKey(clientKey);
    if (apiUrl) {
      setTemplateApiUrl(apiUrl);
    }
  }, [
    token,
    tenantId,
    templateId,
    clientKey,
    apiUrl,
    setTemplateApiUrl,
    setTemplateToken,
    setTemplateTenantId,
    setTemplateId,
    setTemplateClientKey,
  ]);

  return <>{children}</>;
};
