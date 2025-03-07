import { atom, useAtom, useAtomValue } from 'jotai';
import { ReactNode, useEffect } from 'react';
import { apiUrlAtom, tokenAtom, tenantIdAtom, templateDataAtom, isLoadingAtom, errorAtom, templateIdAtom, editorAtom } from './store';
import { convertTiptapToElemental } from '../../lib/utils';
import { TiptapDoc } from '@/types';

// Function atoms
const getTemplateAtom = atom(
  null,
  async (get, set, id: string) => {
    const apiUrl = get(apiUrlAtom);
    const token = get(tokenAtom);
    const tenantId = get(tenantIdAtom);

    if (!apiUrl || !token || !tenantId) {
      set(errorAtom, 'Missing configuration');
      return;
    }

    set(isLoadingAtom, true);
    set(errorAtom, null);

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
      console.log("data", data)
      set(templateDataAtom, data);
    } catch (error) {
      set(errorAtom, error instanceof Error ? error.message : 'Unknown error');
    } finally {
      set(isLoadingAtom, false);
    }
  }
);

const saveTemplateAtom = atom(
  null,
  async (get, set) => {
    const apiUrl = get(apiUrlAtom);
    const token = get(tokenAtom);
    const tenantId = get(tenantIdAtom);
    const id = get(templateIdAtom);
    const editor = get(editorAtom);

    if (!apiUrl) {
      set(errorAtom, 'Missing API URL');
      return;
    }

    set(isLoadingAtom, true);
    set(errorAtom, null);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-COURIER-CLIENT-KEY': 'NDBmYTEyODAtNjg0Ni00YjYwLTlkZjktNGE3M2RkMWM4ZWIw',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({
          query: `
            mutation SaveNotification($input: SaveNotificationInput!) {
              tenant {
                saveNotification(input: $input) {
                  success
                }
              }
            }
          `,
          variables: {
            input: {
              tenantId,
              // name: "New Notification Name",
              notificationId: id,
              data: {
                content: convertTiptapToElemental(editor?.getJSON() as TiptapDoc)
              }
            }
          }
        })
      });

      const data = await response.json();
      return data;
    } catch (error) {
      set(errorAtom, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    } finally {
      set(isLoadingAtom, false);
    }
  }
);

// Custom hooks
export function useCourierTemplate() {
  const [, getTemplate] = useAtom(getTemplateAtom);
  const [, saveTemplate] = useAtom(saveTemplateAtom);
  const isLoading = useAtomValue(isLoadingAtom);
  const error = useAtomValue(errorAtom);
  const templateData = useAtomValue(templateDataAtom);

  return {
    getTemplate,
    saveTemplate,
    isLoading,
    error,
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
  const [, setApiUrl] = useAtom(apiUrlAtom);
  const [, setToken] = useAtom(tokenAtom);
  const [, setTenantId] = useAtom(tenantIdAtom);
  const [, setTemplateId] = useAtom(templateIdAtom);
  const [, getTemplate] = useAtom(getTemplateAtom);

  // Set configuration on mount
  useEffect(() => {
    setApiUrl(apiUrl);
    setToken(token);
    setTenantId(tenantId);
    setTemplateId(templateId);
  }, [apiUrl, token, tenantId, templateId, setApiUrl, setToken, setTenantId, setTemplateId]);

  // Fetch initial template data
  useEffect(() => {
    if (templateId) {
      getTemplate(templateId);
    }
  }, [templateId, getTemplate]);

  return <>{children}</>;
};