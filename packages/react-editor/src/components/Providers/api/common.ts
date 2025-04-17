import { atom } from "jotai";
import { toast } from "sonner";
import {
  isTenantLoadingAtom,
  apiUrlAtom,
  tenantDataAtom,
  tenantErrorAtom,
  tenantIdAtom,
  tokenAtom,
  templateIdAtom,
} from "../store";

export const getTenantAtom = atom(null, async (get, set) => {
  const apiUrl = get(apiUrlAtom);
  const token = get(tokenAtom);
  const tenantId = get(tenantIdAtom);
  const templateId = get(templateIdAtom);

  if (!apiUrl || !token || !tenantId) {
    set(tenantErrorAtom, "Missing configuration");
    toast.error("Missing configuration: " + JSON.stringify({ apiUrl, token, tenantId }));
    return;
  }

  set(isTenantLoadingAtom, true);
  set(tenantErrorAtom, null);

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
            notificationId: templateId,
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
      set(tenantDataAtom, data);
    } else if (data.errors) {
      toast.error(data.errors?.map((error: { message: string }) => error.message).join("\n"));
    } else if (status === 401) {
      toast.error("Unauthorized");
    } else {
      toast.error("Error fetching template");
    }
  } catch (error) {
    toast.error("Error fetching template");
    set(tenantErrorAtom, error instanceof Error ? error.message : "Unknown error");
  } finally {
    set(isTenantLoadingAtom, false);
  }
});
