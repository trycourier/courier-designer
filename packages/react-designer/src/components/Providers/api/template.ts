import { atom } from "jotai";
import { toast } from "sonner";
import {
  isTenantPublishingAtom,
  isTenantSavingAtom,
  apiUrlAtom,
  tenantDataAtom,
  tenantErrorAtom,
  tenantIdAtom,
  tokenAtom,
  templateIdAtom,
} from "../store";

import { templateEditorContentAtom } from "@/components/TemplateEditor/store";

// Function atoms
export const saveTemplateAtom = atom(null, async (get, set) => {
  const apiUrl = get(apiUrlAtom);
  const token = get(tokenAtom);
  const tenantId = get(tenantIdAtom);
  const templateId = get(templateIdAtom);
  const templateEditorContent = get(templateEditorContentAtom);

  if (!apiUrl) {
    set(tenantErrorAtom, "Missing API URL");
    toast.error("Missing API URL");
    return;
  }

  set(isTenantSavingAtom, true);
  set(tenantErrorAtom, null);

  // @TODO: improve this
  // @ts-ignore
  const channels = templateEditorContent?.elements
    .filter((node) => node.type === "channel")
    .map((node) => node.channel);

  const data = {
    content: templateEditorContent,
    routing: {
      method: "single",
      // channels: ["email"],
      channels,
    },
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
    } else if (responseData.errors) {
      toast.error(
        responseData.errors?.map((error: { message: string }) => error.message).join("\n")
      );
    } else {
      toast.error("Error saving template");
    }
    return responseData;
  } catch (error) {
    toast.error("Error saving template!");
    set(tenantErrorAtom, error instanceof Error ? error.message : "Unknown error");
    throw error;
  } finally {
    set(isTenantSavingAtom, false);
  }
});

export const publishTemplateAtom = atom(null, async (get, set) => {
  const apiUrl = get(apiUrlAtom);
  const token = get(tokenAtom);
  const tenantId = get(tenantIdAtom);
  const templateId = get(templateIdAtom);
  const tenantData = get(tenantDataAtom);
  const version = tenantData?.data?.tenant?.notification?.version;

  if (!version) {
    toast.error("Version not defined");
    return;
  }

  if (!apiUrl) {
    set(tenantErrorAtom, "Missing API URL");
    return;
  }

  set(isTenantPublishingAtom, true);
  set(tenantErrorAtom, null);

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
    } else {
      toast.error("Error publishing template");
    }
    return data;
  } catch (error) {
    toast.error("Error publishing template");
    set(tenantErrorAtom, error instanceof Error ? error.message : "Unknown error");
    throw error;
  } finally {
    set(isTenantPublishingAtom, false);
  }
});
