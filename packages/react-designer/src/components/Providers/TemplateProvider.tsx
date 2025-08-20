import { Provider, useAtom } from "jotai";
import { useRef, memo, useEffect } from "react";
import type { BasicProviderProps } from "./Providers.types";
import { useTemplateActions } from "./useTemplateActions";
import {
  apiUrlAtom,
  editorStore,
  templateIdAtom,
  tenantIdAtom,
  tokenAtom,
  getTemplateOverrideAtom,
  saveTemplateOverrideAtom,
} from "./store";

// Configuration provider component
type TemplateProviderProps = BasicProviderProps & {
  templateId: string;
  // Completely override default template fetching logic
  getTemplate?: (actions: ReturnType<typeof useTemplateActions>) => Promise<void>;
  // Completely override default template saving logic
  saveTemplate?: (actions: ReturnType<typeof useTemplateActions>, options?: any) => Promise<void>;
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

  // No need for additional wrappers - functions are stored directly

  return <>{children}</>;
};

// Create a simple store for the raw override functions
export const overrideFunctions = {
  getTemplate: null as TemplateProviderProps["getTemplate"] | null,
  saveTemplate: null as TemplateProviderProps["saveTemplate"] | null,
};

const TemplateProviderComponent: React.FC<TemplateProviderProps> = (props) => {
  // Store the raw functions in a simple object
  useEffect(() => {
    overrideFunctions.getTemplate = props.getTemplate || null;
    // Set a marker in the atom so useTemplateActions knows an override exists
    editorStore.set(getTemplateOverrideAtom, props.getTemplate ? ((() => {}) as any) : null);
  }, [props.getTemplate]);

  useEffect(() => {
    overrideFunctions.saveTemplate = props.saveTemplate || null;
    // Set a marker in the atom so useTemplateActions knows an override exists
    editorStore.set(saveTemplateOverrideAtom, props.saveTemplate ? ((() => {}) as any) : null);
  }, [props.saveTemplate]);

  return (
    <Provider store={editorStore}>
      <TemplateProviderContext {...props} />
    </Provider>
  );
};

export const TemplateProvider = memo(TemplateProviderComponent);
