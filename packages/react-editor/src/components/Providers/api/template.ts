import type { TiptapDoc } from "@/types";
import { atom } from "jotai";
import { toast } from "sonner";
import { convertTiptapToElemental } from "../../../lib/utils";
import {
  isTenantPublishingAtom,
  isTenantSavingAtom,
  apiUrlAtom,
  clientKeyAtom,
  tenantDataAtom,
  tenantEditorAtom,
  tenantErrorAtom,
  tenantIdAtom,
  tokenAtom,
  templateIdAtom,
} from "../store";
import { subjectAtom } from "@/components/TemplateEditor/store";

// Function atoms
export const saveTemplateAtom = atom(null, async (get, set) => {
  const apiUrl = get(apiUrlAtom);
  const token = get(tokenAtom);
  const tenantId = get(tenantIdAtom);
  const templateId = get(templateIdAtom);
  const tenantEditor = get(tenantEditorAtom);
  const subject = get(subjectAtom);
  const clientKey = get(clientKeyAtom);

  if (!apiUrl) {
    set(tenantErrorAtom, "Missing API URL");
    toast.error("Missing API URL");
    return;
  }

  set(isTenantSavingAtom, true);
  set(tenantErrorAtom, null);

  const data = {
    content: convertTiptapToElemental(tenantEditor?.getJSON() as TiptapDoc, subject),
    routing: {
      method: "single",
      channels: ["email"],
    },
  };

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-COURIER-CLIENT-KEY": clientKey,
        ...(token && { Authorization: `Bearer ${token}` }),
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
    toast.error("Error saving template");
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
  const clientKey = get(clientKeyAtom);

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
        "Content-Type": "application/json",
        "X-COURIER-CLIENT-KEY": clientKey,
        ...(token && { Authorization: `Bearer ${token}` }),
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
