import { atom } from "jotai";
import { toast } from "sonner";
import {
  isTemplatePublishingAtom,
  isTemplateSavingAtom,
  apiUrlAtom,
  templateErrorAtom,
  tenantIdAtom,
  tokenAtom,
} from "../store";

// API response error type
interface ApiError {
  message: string;
}

export const saveBrandAtom = atom(null, async (get, set, settings?: Record<string, unknown>) => {
  const apiUrl = get(apiUrlAtom);
  const token = get(tokenAtom);
  const tenantId = get(tenantIdAtom);

  if (!apiUrl) {
    set(templateErrorAtom, "Missing API URL");
    toast.error("Missing API URL");
    return;
  }

  set(isTemplateSavingAtom, true);
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
            mutation SaveTenantBrand($input: SaveBrandSettingsInput!) {
              tenant {
                brand {
                  updateSettings(input: $input) {
                    success
                  }
                }
              }
            }
          `,
        variables: {
          input: {
            tenantId,
            settings,
          },
        },
      }),
    });

    const responseData = await response.json();
    if (responseData.data) {
      // toast.success("Brand settings saved");
    } else if (responseData.errors) {
      toast.error(responseData.errors?.map((error: ApiError) => error.message).join("\n"));
    } else {
      toast.error("Error saving brand settings");
    }
    return responseData;
  } catch (error) {
    toast.error("Error saving brand settings");
    set(templateErrorAtom, error instanceof Error ? error.message : "Unknown error");
    throw error;
  } finally {
    set(isTemplateSavingAtom, false);
  }
});

export const publishBrandAtom = atom(null, async (get, set) => {
  const apiUrl = get(apiUrlAtom);
  const token = get(tokenAtom);
  const tenantId = get(tenantIdAtom);

  if (!apiUrl) {
    set(templateErrorAtom, "Missing API URL");
    toast.error("Missing API URL");
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
            mutation PublishNotification($input: PublishBrandInput!) {
              tenant {
                brand {
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
          },
        },
      }),
    });

    const data = await response.json();
    const status = response.status;
    if (status === 200) {
      toast.success("Brand published");
    } else {
      toast.error("Error publishing brand");
    }
    return data;
  } catch (error) {
    toast.error("Error publishing brand");
    set(templateErrorAtom, error instanceof Error ? error.message : "Unknown error");
    throw error;
  } finally {
    set(isTemplatePublishingAtom, false);
  }
});
