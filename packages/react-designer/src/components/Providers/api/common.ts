import { atom } from "jotai";
import {
  isTemplateLoadingAtom,
  apiUrlAtom,
  templateDataAtom,
  templateErrorAtom,
  tenantIdAtom,
  tokenAtom,
  templateIdAtom,
} from "../store";
// No need for error utilities - using direct error objects
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
      const missingFields = [];
      if (!apiUrl) missingFields.push("API URL");
      if (!token) missingFields.push("token");
      if (!tenantId) missingFields.push("tenant ID");

      set(templateErrorAtom, {
        message: "Missing configuration",
        toastProps: {
          description: `Missing: ${missingFields.join(", ")}`,
          duration: 5000,
        },
      });
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
        set(templateErrorAtom, {
          message: "Authentication failed",
          toastProps: { duration: 6000 },
        });
      } else {
        set(templateErrorAtom, {
          message: "Error fetching template data",
          toastProps: { duration: 4000 },
        });
      }

      if (data.errors) {
        const errorMessages = data.errors?.map((error: { message: string }) => error.message);
        set(templateErrorAtom, {
          message: errorMessages.join("\n"),
          toastProps: { duration: 4000 },
        });
      }
    } catch (error) {
      set(templateErrorAtom, {
        message: "Network connection failed",
        toastProps: {
          duration: 5000,
          description: "Failed to fetch template data",
        },
      });
    } finally {
      set(isTemplateLoadingAtom, false);
    }
  }
);
