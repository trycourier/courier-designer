import { atom } from "jotai";
import { toast } from "sonner";
import {
  isTenantPublishingAtom,
  isTenantSavingAtom,
  apiUrlAtom,
  clientKeyAtom,
  tenantDataAtom,
  tenantErrorAtom,
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
  const clientKey = get(clientKeyAtom);
  const tenantData = get(tenantDataAtom);

  if (!apiUrl) {
    set(tenantErrorAtom, "Missing API URL");
    toast.error("Missing API URL");
    return;
  }

  set(isTenantSavingAtom, true);
  set(tenantErrorAtom, null);

  const newTenantData = {
    ...tenantData,
    data: {
      ...tenantData?.data,
      tenant: {
        ...tenantData?.data?.tenant,
        brand: { ...tenantData?.data?.tenant?.brand, settings },
      },
    },
  };

  set(tenantDataAtom, newTenantData);

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
    set(tenantErrorAtom, error instanceof Error ? error.message : "Unknown error");
    throw error;
  } finally {
    set(isTenantSavingAtom, false);
  }
});

export const publishBrandAtom = atom(null, async (get, set) => {
  const apiUrl = get(apiUrlAtom);
  const token = get(tokenAtom);
  const tenantId = get(tenantIdAtom);
  const clientKey = get(clientKeyAtom);

  if (!apiUrl) {
    set(tenantErrorAtom, "Missing API URL");
    toast.error("Missing API URL");
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
    set(tenantErrorAtom, error instanceof Error ? error.message : "Unknown error");
    throw error;
  } finally {
    set(isTenantPublishingAtom, false);
  }
});
