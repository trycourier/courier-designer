import { atom, useAtom, useAtomValue } from 'jotai';
import { ReactNode, useEffect, useRef } from 'react';
import { templateApiUrlAtom, templateTokenAtom, templateTenantIdAtom, templateDataAtom, isTemplateLoadingAtom, templateErrorAtom, templateIdAtom, templateEditorAtom } from './store';
import { convertTiptapToElemental } from '../../lib/utils';
import { TiptapDoc } from '@/types';
import { toast } from 'sonner';

// Function atoms
const getTemplateAtom = atom(
  null,
  async (get, set, id: string) => {
    const apiUrl = get(templateApiUrlAtom);
    const token = get(templateTokenAtom);
    const tenantId = get(templateTenantIdAtom);

    if (!apiUrl || !token || !tenantId) {
      set(templateErrorAtom, 'Missing configuration');
      return;
    }

    set(isTemplateLoadingAtom, true);
    set(templateErrorAtom, null);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-COURIER-CLIENT-KEY': 'NDBmYTEyODAtNjg0Ni00YjYwLTlkZjktNGE3M2RkMWM4ZWIw',
        },
        body: JSON.stringify({
          query: `
            query GetTenant($tenantId: String!, $input: GetNotificationInput!) {
              tenant(tenantId: $tenantId) {
                tenantId
                name
  
                notification(input: $input) {
                  createdAt
                  notificationId
                  data
                  version
                }
              }
            }
            `,
          variables: {
            tenantId,
            input: {
              notificationId: id,
              version: "latest"
            }
          }
        })
      });

      const data = await response.json();
      const status = response.status;

      if (data.data?.tenant?.notification) {
        set(templateDataAtom, data);
      } else if (data.errors) {
        toast.error(data.errors?.map((error: any) => error.message).join("\n"));
      } else if (status === 401) {
        toast.error("Unauthorized");
      } else {
        toast.error("Error fetching template");
      }
    } catch (error) {
      toast.error("Error fetching template");
      set(templateErrorAtom, error instanceof Error ? error.message : 'Unknown error');
    } finally {
      set(isTemplateLoadingAtom, false);
    }
  }
);

const saveTemplateAtom = atom(
  null,
  async (get, set) => {
    const templateApiUrl = get(templateApiUrlAtom);
    const templateToken = get(templateTokenAtom);
    const templateTenantId = get(templateTenantIdAtom);
    const templateId = get(templateIdAtom);
    const templateEditor = get(templateEditorAtom);

    if (!templateApiUrl) {
      set(templateErrorAtom, 'Missing API URL');
      return;
    }

    set(isTemplateLoadingAtom, true);
    set(templateErrorAtom, null);

    try {
      const response = await fetch(templateApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-COURIER-CLIENT-KEY': 'NDBmYTEyODAtNjg0Ni00YjYwLTlkZjktNGE3M2RkMWM4ZWIw',
          ...(templateToken && { 'Authorization': `Bearer ${templateToken}` }),
        },
        body: JSON.stringify({
          query: `
            mutation SaveNotification($input: SaveNotificationInput!) {
              tenant {
                notification {
                  save(input: $input)  {
                    success
                  }
                }
              }
            }
          `,
          variables: {
            input: {
              tenantId: templateTenantId,
              notificationId: templateId,
              name: "Test",
              data: {
                content: convertTiptapToElemental(templateEditor?.getJSON() as TiptapDoc)
              }
            }
          }
        })
      });

      const data = await response.json();
      // const status = response.status;
      if (data.data) {
        toast.success("Template saved");
      } else if (data.errors) {
        toast.error(data.errors?.map((error: any) => error.message).join("\n"));
      } else {
        toast.error("Error saving template");
      }
      return data;
    } catch (error) {
      toast.error("Error saving template");
      set(templateErrorAtom, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    } finally {
      set(isTemplateLoadingAtom, false);
    }
  }
);

const publishTemplateAtom = atom(
  null,
  async (get, set) => {
    const templateApiUrl = get(templateApiUrlAtom);
    const templateToken = get(templateTokenAtom);
    const templateTenantId = get(templateTenantIdAtom);
    const templateId = get(templateIdAtom);
    const templateData = get(templateDataAtom);
    const version = templateData?.data?.tenant?.notification?.version;

    if (!version) {
      toast.error("Version not defined");
      return;
    }

    if (!templateApiUrl) {
      set(templateErrorAtom, 'Missing API URL');
      return;
    }

    set(isTemplateLoadingAtom, true);
    set(templateErrorAtom, null);

    try {
      const response = await fetch(templateApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-COURIER-CLIENT-KEY': 'NDBmYTEyODAtNjg0Ni00YjYwLTlkZjktNGE3M2RkMWM4ZWIw',
          ...(templateToken && { 'Authorization': `Bearer ${templateToken}` }),
        },
        body: JSON.stringify({
          query: `
            mutation PublishNotification($input: PublishNotificationInput!) {
              tenant {
                notification {
                  publish(input: $input)  {
                    success
                  }
                }
              }
            }
          `,
          variables: {
            input: {
              tenantId: templateTenantId,
              notificationId: templateId,
              version
            }
          }
        })
      });

      const data = await response.json();
      const status = response.status;
      if (status === 200) {
        toast.success("Template published");
      } else {
        toast.error("Error publishing template");
      }
      return data;
    } catch (error) {
      toast.error("Error publishing template");
      set(templateErrorAtom, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    } finally {
      set(isTemplateLoadingAtom, false);
    }
  }
);

// Custom hooks
export function useCourierTemplate() {
  const [, getTemplate] = useAtom(getTemplateAtom);
  const [, saveTemplate] = useAtom(saveTemplateAtom);
  const [, publishTemplate] = useAtom(publishTemplateAtom);
  const isTemplateLoading = useAtomValue(isTemplateLoadingAtom);
  const templateError = useAtomValue(templateErrorAtom);
  const templateData = useAtomValue(templateDataAtom);

  return {
    getTemplate,
    saveTemplate,
    publishTemplate,
    isTemplateLoading,
    templateError,
    templateData
  };
}

// Configuration provider component
interface CourierTemplateProviderProps {
  children: ReactNode;
  templateId: string;
  tenantId: string;
  token: string;
  apiUrl: string;
}

export const CourierTemplateProvider: React.FC<CourierTemplateProviderProps> = ({
  children,
  templateId,
  tenantId,
  token,
  apiUrl,
}) => {
  const [, setTemplateApiUrl] = useAtom(templateApiUrlAtom);
  const [, setTemplateToken] = useAtom(templateTokenAtom);
  const [, setTemplateTenantId] = useAtom(templateTenantIdAtom);
  const [, setTemplateId] = useAtom(templateIdAtom);
  const [, getTemplate] = useAtom(getTemplateAtom);
  const hasInitialFetch = useRef(false);

  // Set configuration on mount
  useEffect(() => {
    setTemplateApiUrl(apiUrl);
    setTemplateToken(token);
    setTemplateTenantId(tenantId);
    setTemplateId(templateId);
  }, [apiUrl, token, tenantId, templateId, setTemplateApiUrl, setTemplateToken, setTemplateTenantId, setTemplateId]);

  // Fetch initial template data
  useEffect(() => {
    if (templateId && !hasInitialFetch.current) {
      getTemplate(templateId);
      hasInitialFetch.current = true;
    }
  }, [templateId, getTemplate]);

  return <>{children}</>;
};