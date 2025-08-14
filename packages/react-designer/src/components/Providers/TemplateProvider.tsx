import { Provider, useAtom } from "jotai";
import { useLayoutEffect, useRef, memo, useEffect } from "react";
import type { BasicProviderProps } from "./Providers.types";
import { useTemplateActions } from "./useTemplateActions";
import {
  apiUrlAtom,
  editorStore,
  templateIdAtom,
  tenantIdAtom,
  tokenAtom,
  getTemplateOverrideAtom,
} from "./store";

// Configuration provider component
type TemplateProviderProps = BasicProviderProps & {
  templateId: string;
  // Completely override default template fetching logic
  getTemplate?: (actions: ReturnType<typeof useTemplateActions>) => Promise<void>;
};

// Internal component that uses atoms
const TemplateProviderContext: React.FC<TemplateProviderProps> = ({
  children,
  templateId,
  tenantId,
  token,
  apiUrl,
  getTemplate,
}) => {
  const [, setApiUrl] = useAtom(apiUrlAtom);
  const [, setToken] = useAtom(tokenAtom);
  const [, setTenantId] = useAtom(tenantIdAtom);
  const [, setId] = useAtom(templateIdAtom);

  const templateActions = useTemplateActions();
  const templateActionsRef = useRef(templateActions);

  // Update ref with latest templateActions
  templateActionsRef.current = templateActions;

  // Set configuration on mount
  useEffect(() => {
    setToken(token);
    setTenantId(tenantId);
    setId(templateId);
    if (apiUrl) {
      setApiUrl(apiUrl);
    }
  }, [token, tenantId, templateId, apiUrl, setApiUrl, setToken, setTenantId, setId]);

  // Set override using useLayoutEffect to run synchronously before paint
  useLayoutEffect(() => {
    if (getTemplate) {
      const wrapper = async () => {
        await getTemplate(templateActionsRef.current);
      };
      editorStore.set(getTemplateOverrideAtom, wrapper);
    } else {
      editorStore.set(getTemplateOverrideAtom, null);
    }

    // Cleanup when component unmounts or getTemplate changes
    return () => {
      // Only clear if this instance had getTemplate
      if (getTemplate) {
        editorStore.set(getTemplateOverrideAtom, null);
      }
    };
  }, [getTemplate]);

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
