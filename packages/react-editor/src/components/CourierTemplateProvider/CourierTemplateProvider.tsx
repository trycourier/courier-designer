import { atom, useAtom, useAtomValue } from 'jotai';
import { ReactNode, useEffect, useRef } from 'react';
import { templateApiUrlAtom, templateTokenAtom, templateTenantIdAtom, templateDataAtom, isTemplateLoadingAtom, isTemplateSavingAtom, isTemplatePublishingAtom, templateErrorAtom, templateIdAtom, templateEditorAtom, templateClientKeyAtom } from './store';
import { subjectAtom } from '../CourierEditor/store';
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
    const clientKey = get(templateClientKeyAtom);
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
          'X-COURIER-CLIENT-KEY': clientKey,
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
                  data {
                    content
                    routing
                  }
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

      if (data.data?.tenant) {
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
    const subject = get(subjectAtom);
    const clientKey = get(templateClientKeyAtom);
    if (!templateApiUrl) {
      set(templateErrorAtom, 'Missing API URL');
      return;
    }

    set(isTemplateSavingAtom, true);
    set(templateErrorAtom, null);

    const data = {
      content: convertTiptapToElemental(templateEditor?.getJSON() as TiptapDoc, subject),
      routing: {
        method: "single",
        channels: ["email"]
      }
    };

    try {
      const response = await fetch(templateApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-COURIER-CLIENT-KEY': clientKey,
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
              name: templateId,
              data
            }
          }
        })
      });

      const responseData = await response.json();
      // const status = response.status;
      if (responseData.data) {
        // @TODO: improve this
        set(templateDataAtom, { data: { tenant: { notification: { data } } } });
        // toast.success("Template saved");
      } else if (responseData.errors) {
        toast.error(responseData.errors?.map((error: any) => error.message).join("\n"));
      } else {
        toast.error("Error saving template");
      }
      return responseData;
    } catch (error) {
      toast.error("Error saving template");
      set(templateErrorAtom, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    } finally {
      set(isTemplateSavingAtom, false);
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
    const clientKey = get(templateClientKeyAtom);

    if (!version) {
      toast.error("Version not defined");
      return;
    }

    if (!templateApiUrl) {
      set(templateErrorAtom, 'Missing API URL');
      return;
    }

    set(isTemplatePublishingAtom, true);
    set(templateErrorAtom, null);

    try {
      const response = await fetch(templateApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-COURIER-CLIENT-KEY': clientKey,
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
      set(isTemplatePublishingAtom, false);
    }
  }
);

// Custom hooks
export function useCourierTemplate() {
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
    templateData
  };
}

// Configuration provider component
interface CourierTemplateProviderProps {
  children: ReactNode;
  templateId: string;
  tenantId: string;
  token: string;
  clientKey: string;
  apiUrl: string;
}

export const CourierTemplateProvider: React.FC<CourierTemplateProviderProps> = ({
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
  const [, getTemplate] = useAtom(getTemplateAtom);
  const [, setTemplateClientKey] = useAtom(templateClientKeyAtom);
  const hasInitialFetch = useRef(false);

  // Set configuration on mount
  useEffect(() => {
    setTemplateApiUrl(apiUrl);
    setTemplateToken(token);
    setTemplateTenantId(tenantId);
    setTemplateId(templateId);
    setTemplateClientKey(clientKey);
  }, [apiUrl, token, tenantId, templateId, clientKey, setTemplateApiUrl, setTemplateToken, setTemplateTenantId, setTemplateId, setTemplateClientKey]);

  // Fetch initial template data
  useEffect(() => {
    if (templateId && !hasInitialFetch.current) {
      getTemplate(templateId);
      hasInitialFetch.current = true;
    }
  }, [templateId, getTemplate]);

  return <>{children}</>;
};