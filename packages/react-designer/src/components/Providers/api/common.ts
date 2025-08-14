import { atom } from "jotai";
import { toast } from "sonner";
import {
  isTemplateLoadingAtom,
  apiUrlAtom,
  templateDataAtom,
  templateErrorAtom,
  tenantIdAtom,
  tokenAtom,
  templateIdAtom,
} from "../store";
import {
  templateEditorPublishedAtAtom,
  templateEditorVersionAtom,
} from "@/components/TemplateEditor/store";

export const getTemplateAtom = atom(
  null,
  async (get, set, options?: { includeBrand?: boolean }) => {
    const apiUrl = get(apiUrlAtom);
    const token = get(tokenAtom);
    const tenantId = get(tenantIdAtom);
    const templateId = get(templateIdAtom);
    const includeBrand = options?.includeBrand ?? true; // Default to true for backward compatibility

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
          "x-courier-client-key": `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: `
            query GetTenant($tenantId: String!, $input: GetNotificationInput!, $brandInput: GetTenantBrandInput!, $includeBrand: Boolean!) {
              tenant(tenantId: $tenantId) {
                tenantId
                name
                notification(input: $input) {
                  createdAt
                  publishedAt
                  notificationId
                  data {
                    content
                    routing
                  }
                  version
                }

                brand(input: $brandInput) @include(if: $includeBrand) {
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
              notificationId: templateId,
              version: "latest",
            },
            brandInput: {
              version: "latest",
            },
            includeBrand,
          },
        }),
      });

      const data = await response.json();
      const status = response.status;

      const tenantData = data.data?.tenant;
      if (tenantData) {
        set(templateDataAtom, data);
        set(templateEditorPublishedAtAtom, tenantData?.notification?.publishedAt);
        set(templateEditorVersionAtom, tenantData?.notification?.version);
      } else if (status === 401) {
        toast.error("Unauthorized");
        set(templateErrorAtom, "Unauthorized");
      } else {
        toast.error("Error fetching template data");
        set(templateErrorAtom, "Error fetching template data");
      }

      if (data.errors) {
        toast.error(data.errors?.map((error: { message: string }) => error.message).join("\n"));
        set(templateErrorAtom, "Error fetching template");
      }
    } catch (error) {
      toast.error("Fatal error fetching template");
      set(templateErrorAtom, error instanceof Error ? error.message : "Unknown error");
    } finally {
      set(isTemplateLoadingAtom, false);
    }
  }
);
