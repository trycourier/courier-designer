import { Provider, useAtom } from "jotai";
import { useEffect, memo } from "react";
import type { BasicProviderProps } from "./Providers.types";
import { apiUrlAtom, editorStore, templateIdAtom, tenantIdAtom, tokenAtom } from "./store";

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
  apiUrl,
}) => {
  const [, setApiUrl] = useAtom(apiUrlAtom);
  const [, setToken] = useAtom(tokenAtom);
  const [, setTenantId] = useAtom(tenantIdAtom);
  const [, setId] = useAtom(templateIdAtom);

  // Set configuration on mount
  useEffect(() => {
    setToken(token);
    setTenantId(tenantId);
    setId(templateId);
    if (apiUrl) {
      setApiUrl(apiUrl);
    }
  }, [token, tenantId, templateId, apiUrl, setApiUrl, setToken, setTenantId, setId]);

  return <>{children}</>;
};

const TemplateProviderComponent: React.FC<TemplateProviderProps> = (props) => {
  return (
    <Provider store={editorStore}>
      <TemplateProviderContext {...props} />
    </Provider>
  );
};

export const TemplateProvider = memo(TemplateProviderComponent);
