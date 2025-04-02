import { useAtom, useAtomValue } from "jotai";
import { ReactNode, useEffect, useRef } from "react";
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
}

export const TemplateProvider: React.FC<TemplateProviderProps> = ({
  children,
  templateId,
  tenantId,
  token,
  clientKey,
}) => {
  const [, setTemplateApiUrl] = useAtom(templateApiUrlAtom);
  const [, setTemplateToken] = useAtom(templateTokenAtom);
  const [, setTemplateTenantId] = useAtom(templateTenantIdAtom);
  const [, setTemplateId] = useAtom(templateIdAtom);
  const [, getTemplate] = useAtom(getTemplateAtom);
  const [, setTemplateClientKey] = useAtom(templateClientKeyAtom);
  const hasInitialFetch = useRef(false);

  // Set configuration on mount
  useEffect(() => {
    setTemplateToken(token);
    setTemplateTenantId(tenantId);
    setTemplateId(templateId);
    setTemplateClientKey(clientKey);
  }, [
    token,
    tenantId,
    templateId,
    clientKey,
    setTemplateApiUrl,
    setTemplateToken,
    setTemplateTenantId,
    setTemplateId,
    setTemplateClientKey,
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
