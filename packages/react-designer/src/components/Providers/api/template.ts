import { atom } from "jotai";
import { toast } from "sonner";
// No need for error utilities - using direct error objects
import {
  isTemplatePublishingAtom,
  isTemplateSavingAtom,
  apiUrlAtom,
  templateErrorAtom,
  tenantIdAtom,
  tokenAtom,
  templateIdAtom,
  type MessageRouting,
} from "../store";

import {
  templateEditorContentAtom,
  templateEditorPublishedAtAtom,
  templateEditorVersionAtom,
} from "@/components/TemplateEditor/store";

// Function atoms
export const saveTemplateAtom = atom(null, async (get, set, routing?: MessageRouting) => {
  const apiUrl = get(apiUrlAtom);
  const token = get(tokenAtom);
  const tenantId = get(tenantIdAtom);
  const templateId = get(templateIdAtom);
  const templateEditorContent = get(templateEditorContentAtom);

  if (!templateEditorContent) {
    return;
  }

  if (!apiUrl) {
    set(templateErrorAtom, { message: "Missing API URL", toastProps: { duration: 5000 } });
    return;
  }

  set(isTemplateSavingAtom, true);
  set(templateErrorAtom, null);

  const data = {
    content: templateEditorContent,
    routing,
  };

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "x-courier-client-key": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `
            mutation SaveNotification($input: SaveNotificationInput!) {
              tenant {
                notification {
                  save(input: $input)  {
                    success
                    version
                    updatedAt
                    createdAt
                  }
                }
              }
            }
          `,
        variables: {
          input: {
            tenantId,
            notificationId: templateId,
            name: templateId,
            data,
          },
        },
      }),
    });

    const responseData = await response.json();
    // const status = response.status;
    if (responseData.data) {
      // @TODO: improve this
      // set(templateDataAtom, { data: { tenant: { notification: { data } } } });
      // toast.success("Template saved");

      set(templateEditorVersionAtom, responseData.data.tenant.notification.save.version);
    } else if (responseData.errors) {
      const errorMessages = responseData.errors?.map((error: { message: string }) => error.message);
      set(templateErrorAtom, {
        message: errorMessages.join("\n"),
        toastProps: { duration: 4000 },
      });
    } else {
      set(templateErrorAtom, {
        message: "Error saving template",
        toastProps: { duration: 4000 },
      });
    }
    return responseData;
  } catch (error) {
    set(templateErrorAtom, {
      message: "Network connection failed",
      toastProps: {
        duration: 5000,
        description: "Failed to save template",
      },
    });
    throw error;
  } finally {
    set(isTemplateSavingAtom, false);
  }
});

export const publishTemplateAtom = atom(null, async (get, set) => {
  const apiUrl = get(apiUrlAtom);
  const token = get(tokenAtom);
  const tenantId = get(tenantIdAtom);
  const templateId = get(templateIdAtom);
  const version = get(templateEditorVersionAtom);

  if (!version) {
    set(templateErrorAtom, { message: "Version not defined", toastProps: { duration: 5000 } });
    return;
  }

  if (!apiUrl) {
    set(templateErrorAtom, { message: "Missing API URL", toastProps: { duration: 5000 } });
    return;
  }

  set(isTemplatePublishingAtom, true);
  set(templateErrorAtom, null);

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "x-courier-client-key": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `
            mutation PublishNotification($input: PublishNotificationInput!) {
              tenant {
                notification {
                  publish(input: $input)  {
                    success
                    version
                    publishedAt
                  }
                }
              }
            }
          `,
        variables: {
          input: {
            tenantId,
            notificationId: templateId,
            version,
          },
        },
      }),
    });

    const data = await response.json();
    const status = response.status;
    if (status === 200) {
      toast.success("Template published");
      set(templateEditorPublishedAtAtom, new Date().toISOString());
      set(templateEditorVersionAtom, data.data.tenant.notification.publish.version);
    } else {
      set(templateErrorAtom, {
        message: "Error publishing template",
        toastProps: { duration: 4000 },
      });
    }
    return data;
  } catch (error) {
    set(templateErrorAtom, {
      message: "Network connection failed",
      toastProps: {
        duration: 5000,
        description: "Failed to publish template",
      },
    });
    throw error;
  } finally {
    set(isTemplatePublishingAtom, false);
  }
});
