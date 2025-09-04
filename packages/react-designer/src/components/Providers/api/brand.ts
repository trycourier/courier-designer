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
    set(templateErrorAtom, { message: "Missing API URL", toastProps: { duration: 5000 } });
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
      const errorMessages = responseData.errors?.map((error: ApiError) => error.message);
      set(templateErrorAtom, {
        message: errorMessages.join("\n"),
        toastProps: { duration: 4000 },
      });
    } else {
      set(templateErrorAtom, {
        message: "Error saving brand settings",
        toastProps: { duration: 4000 },
      });
    }
    return responseData;
  } catch (error) {
    set(templateErrorAtom, {
      message: "Network connection failed",
      toastProps: {
        duration: 5000,
        description: "Failed to save brand settings",
      },
    });
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
      set(templateErrorAtom, {
        message: "Error publishing brand",
        toastProps: { duration: 4000 },
      });
    }
    return data;
  } catch (error) {
    set(templateErrorAtom, {
      message: "Network connection failed",
      toastProps: {
        duration: 5000,
        description: "Failed to publish brand",
      },
    });
    throw error;
  } finally {
    set(isTemplatePublishingAtom, false);
  }
});
