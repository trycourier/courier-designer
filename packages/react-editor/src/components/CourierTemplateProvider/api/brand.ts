import { atom } from "jotai";
import { toast } from "sonner";
import {
  isBrandPublishingAtom,
  isTemplateSavingAtom,
  templateApiUrlAtom,
  templateClientKeyAtom,
  templateDataAtom,
  templateErrorAtom,
  templateTenantIdAtom,
  templateTokenAtom,
} from "../store";

export const saveTenantBrandAtom = atom(null, async (get, set, settings?: any) => {
  const templateApiUrl = get(templateApiUrlAtom);
  const templateToken = get(templateTokenAtom);
  const templateTenantId = get(templateTenantIdAtom);
  const clientKey = get(templateClientKeyAtom);
  const templateData = get(templateDataAtom);

  if (!templateApiUrl) {
    set(templateErrorAtom, "Missing API URL");
    return;
  }

  set(isTemplateSavingAtom, true);
  set(templateErrorAtom, null);

  const newTemplateData = {
    ...templateData,
    data: {
      ...templateData?.data,
      tenant: {
        ...templateData?.data?.tenant,
        brand: { ...templateData?.data?.tenant?.brand, settings }
      }
    }
  }

  set(templateDataAtom, newTemplateData);

  try {
    const response = await fetch(templateApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-COURIER-CLIENT-KEY": clientKey,
        ...(templateToken && { Authorization: `Bearer ${templateToken}` }),
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
            tenantId: templateTenantId,
            settings,
          },
        },
      }),
    });

    const responseData = await response.json();
    if (responseData.data) {
      // toast.success("Brand settings saved");
    } else if (responseData.errors) {
      toast.error(responseData.errors?.map((error: any) => error.message).join("\n"));
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

export const publishTenantBrandAtom = atom(null, async (get, set) => {
  const templateApiUrl = get(templateApiUrlAtom);
  const templateToken = get(templateTokenAtom);
  const templateTenantId = get(templateTenantIdAtom);
  const templateData = get(templateDataAtom);
  const version = templateData?.data?.tenant?.notification?.version;
  const clientKey = get(templateClientKeyAtom);

  if (!version) {
    toast.error("Version not defined");
    return;
  }

  if (!templateApiUrl) {
    set(templateErrorAtom, "Missing API URL");
    return;
  }

  set(isBrandPublishingAtom, true);
  set(templateErrorAtom, null);

  try {
    const response = await fetch(templateApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-COURIER-CLIENT-KEY": clientKey,
        ...(templateToken && { Authorization: `Bearer ${templateToken}` }),
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
            tenantId: templateTenantId,
            // version,
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
    set(isBrandPublishingAtom, false);
  }
});