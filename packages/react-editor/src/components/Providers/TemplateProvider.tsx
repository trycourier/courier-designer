import { Provider, useAtom, useAtomValue } from "jotai";
import { useEffect } from "react";
import { getTenantAtom, publishTemplateAtom, saveTemplateAtom } from "./api";
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
  templateIdAtom,
  tenantIdAtom,
  tokenAtom,
} from "./store";

// Custom hooks
export function useTemplateActions() {
  const [, getTenant] = useAtom(getTenantAtom);
  const [, saveTemplate] = useAtom(saveTemplateAtom);
  const [, publishTemplate] = useAtom(publishTemplateAtom);
  const isTenantLoading = useAtomValue(isTenantLoadingAtom);
  const isTenantSaving = useAtomValue(isTenantSavingAtom);
  const isTenantPublishing = useAtomValue(isTenantPublishingAtom);
  const tenantError = useAtomValue(tenantErrorAtom);
  const tenantData = useAtomValue(tenantDataAtom);

  return {
    getTenant,
    saveTemplate,
    publishTemplate,
    isTenantLoading,
    isTenantSaving,
    isTenantPublishing,
    tenantError,
    tenantData,
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
