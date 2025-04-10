import type { TiptapDoc } from "@/types";
import { atom } from "jotai";
import { toast } from "sonner";
import { convertTiptapToElemental } from "../../../lib/utils";
import {
  isTemplateLoadingAtom,
  isTemplatePublishingAtom,
  isTemplateSavingAtom,
  apiUrlAtom,
  clientKeyAtom,
  templateDataAtom,
  templateEditorAtom,
  templateErrorAtom,
  templateIdAtom,
  tenantIdAtom,
  tokenAtom,
  brandDataAtom,
} from "../store";
import { subjectAtom } from "@/components/TemplateEditor/store";

// Function atoms
export const getTemplateAtom = atom(null, async (get, set, id: string) => {
  const apiUrl = get(apiUrlAtom);
  const token = get(tokenAtom);
  const tenantId = get(tenantIdAtom);
  const clientKey = get(clientKeyAtom);

  if (!apiUrl || !token || !tenantId) {
    set(templateErrorAtom, "Missing configuration");
    toast.error("Missing configuration: " + JSON.stringify({ apiUrl, token, tenantId }));
    return;
  }

  set(isTemplateLoadingAtom, true);
  set(templateErrorAtom, null);

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "X-COURIER-CLIENT-KEY": clientKey,
      },
      body: JSON.stringify({
        query: `
            query GetTenant($tenantId: String!, $input: GetNotificationInput!, $brandInput: GetTenantBrandInput!) {
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

                brand(input: $brandInput) {
                  brandId
                  name
                  settings {
                    colors {
                      primary
                      secondary
                      tertiary
                    }
                    email {
                      header {
                        barColor
                        logo {
                          href
                          image
                        }
                      }
                      footer {
                        content
                        markdown
                        social {
                          facebook {
                            url
                          }
                          instagram {
                            url
                          }
                          linkedin {
                            url
                          }
                          medium {
                            url
                          }
                          twitter {
                            url
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
            `,
        variables: {
          tenantId,
          input: {
            notificationId: id,
            version: "latest",
          },
          brandInput: {
            version: "latest",
          },
        },
      }),
    });

    const data = await response.json();
    const status = response.status;

    if (data.data?.tenant) {
      set(templateDataAtom, data);
      set(brandDataAtom, data);
    } else if (data.errors) {
      toast.error(data.errors?.map((error: { message: string }) => error.message).join("\n"));
    } else if (status === 401) {
      toast.error("Unauthorized");
    } else {
      toast.error("Error fetching template");
    }
  } catch (error) {
    toast.error("Error fetching template");
    set(templateErrorAtom, error instanceof Error ? error.message : "Unknown error");
  } finally {
    set(isTemplateLoadingAtom, false);
  }
});

export const saveTemplateAtom = atom(null, async (get, set) => {
  const apiUrl = get(apiUrlAtom);
  const token = get(tokenAtom);
  const tenantId = get(tenantIdAtom);
  const templateId = get(templateIdAtom);
  const templateEditor = get(templateEditorAtom);
  const subject = get(subjectAtom);
  const clientKey = get(clientKeyAtom);

  if (!apiUrl) {
    set(templateErrorAtom, "Missing API URL");
    toast.error("Missing API URL");
    return;
  }

  set(isTemplateSavingAtom, true);
  set(templateErrorAtom, null);

  const data = {
    content: convertTiptapToElemental(templateEditor?.getJSON() as TiptapDoc, subject),
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

    // set(templateDataAtom, { data: { tenant: { notification: { data } } } });

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
    set(templateErrorAtom, error instanceof Error ? error.message : "Unknown error");
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
  const templateData = get(templateDataAtom);
  const version = templateData?.data?.tenant?.notification?.version;
  const clientKey = get(clientKeyAtom);

  if (!version) {
    toast.error("Version not defined");
    return;
  }

  if (!apiUrl) {
    set(templateErrorAtom, "Missing API URL");
    return;
  }

  set(isTemplatePublishingAtom, true);
  set(templateErrorAtom, null);

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
    set(templateErrorAtom, error instanceof Error ? error.message : "Unknown error");
    throw error;
  } finally {
    set(isTemplatePublishingAtom, false);
  }
});
