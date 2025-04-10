import { Provider, useAtom, useAtomValue } from "jotai";
import { useEffect } from "react";
import { getTemplateAtom, publishTemplateAtom, saveTemplateAtom } from "./api";
import type { BasicProviderProps } from "./Providers.types";
import {
  apiUrlAtom,
  clientKeyAtom,
  editorStore,
  isTemplateLoadingAtom,
  isTemplatePublishingAtom,
  isTemplateSavingAtom,
  templateDataAtom,
  templateErrorAtom,
  templateIdAtom,
  tenantIdAtom,
  tokenAtom,
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
type TemplateProviderProps = BasicProviderProps & {
  templateId: string;
};

// Internal component that uses atoms
const TemplateProviderContext: React.FC<TemplateProviderProps> = ({
  children,
  templateId,
  tenantId,
  token,
  clientKey,
  apiUrl,
}) => {
  const [, setApiUrl] = useAtom(apiUrlAtom);
  const [, setToken] = useAtom(tokenAtom);
  const [, setTenantId] = useAtom(tenantIdAtom);
  const [, setId] = useAtom(templateIdAtom);
  const [, setClientKey] = useAtom(clientKeyAtom);

  // Set configuration on mount
  useEffect(() => {
    setToken(token);
    setTenantId(tenantId);
    setId(templateId);
    setClientKey(clientKey);
    if (apiUrl) {
      setApiUrl(apiUrl);
    }
  }, [
    token,
    tenantId,
    templateId,
    clientKey,
    apiUrl,
    setApiUrl,
    setToken,
    setTenantId,
    setId,
    setClientKey,
  ]);

  return <>{children}</>;
};

export const TemplateProvider: React.FC<TemplateProviderProps> = (props) => {
  return (
    <Provider store={editorStore}>
      <TemplateProviderContext {...props} />
    </Provider>
  );
};
