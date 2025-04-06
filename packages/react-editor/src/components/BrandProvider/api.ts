import { atom } from "jotai";
import { toast } from "sonner";
import {
  isBrandPublishingAtom,
  isBrandSavingAtom,
  brandApiUrlAtom,
  brandClientKeyAtom,
  brandDataAtom,
  brandErrorAtom,
  brandTenantIdAtom,
  brandTokenAtom,
  isBrandLoadingAtom,
} from "./store";

export const getBrandAtom = atom(null, async (get, set, tenantId: string) => {
  const apiUrl = get(brandApiUrlAtom);
  const token = get(brandTokenAtom);
  const clientKey = get(brandClientKeyAtom);

  if (!apiUrl || !token || !tenantId) {
    set(brandErrorAtom, "Missing configuration");
    return;
  }

  set(isBrandLoadingAtom, true);
  set(brandErrorAtom, null);

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
            query GetTenant($tenantId: String!, $brandInput: GetTenantBrandInput!) {
              tenant(tenantId: $tenantId) {
                tenantId
                name

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
            version: "latest",
          },
          brandInput: {
            version: "latest"
          }
        },
      }),
    });

    const data = await response.json();
    const status = response.status;

    if (data.data?.tenant) {
      set(brandDataAtom, data);
    } else if (data.errors) {
      toast.error(data.errors?.map((error: any) => error.message).join("\n"));
    } else if (status === 401) {
      toast.error("Unauthorized");
    } else {
      toast.error("Error fetching brand");
    }
  } catch (error) {
    toast.error("Error fetching brand");
    set(brandErrorAtom, error instanceof Error ? error.message : "Unknown error");
  } finally {
    set(isBrandLoadingAtom, false);
  }
});

export const saveBrandAtom = atom(null, async (get, set, settings?: any) => {
  const brandApiUrl = get(brandApiUrlAtom);
  const brandToken = get(brandTokenAtom);
  const brandTenantId = get(brandTenantIdAtom);
  const clientKey = get(brandClientKeyAtom);
  const brandData = get(brandDataAtom);

  if (!brandApiUrl) {
    set(brandErrorAtom, "Missing API URL");
    return;
  }

  set(isBrandSavingAtom, true);
  set(brandErrorAtom, null);

  const newBrandData = {
    ...brandData,
    data: {
      ...brandData?.data,
      tenant: {
        ...brandData?.data?.tenant,
        brand: { ...brandData?.data?.tenant?.brand, settings }
      }
    }
  }

  set(brandDataAtom, newBrandData);

  try {
    const response = await fetch(brandApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-COURIER-CLIENT-KEY": clientKey,
        ...(brandToken && { Authorization: `Bearer ${brandToken}` }),
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
            tenantId: brandTenantId,
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
    set(brandErrorAtom, error instanceof Error ? error.message : "Unknown error");
    throw error;
  } finally {
    set(isBrandSavingAtom, false);
  }
});

export const publishBrandAtom = atom(null, async (get, set) => {
  const brandApiUrl = get(brandApiUrlAtom);
  const brandToken = get(brandTokenAtom);
  const brandTenantId = get(brandTenantIdAtom);
  const clientKey = get(brandClientKeyAtom);

  if (!brandApiUrl) {
    set(brandErrorAtom, "Missing API URL");
    return;
  }

  set(isBrandPublishingAtom, true);
  set(brandErrorAtom, null);

  try {
    const response = await fetch(brandApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-COURIER-CLIENT-KEY": clientKey,
        ...(brandToken && { Authorization: `Bearer ${brandToken}` }),
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
            tenantId: brandTenantId,
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
    set(brandErrorAtom, error instanceof Error ? error.message : "Unknown error");
    throw error;
  } finally {
    set(isBrandPublishingAtom, false);
  }
});