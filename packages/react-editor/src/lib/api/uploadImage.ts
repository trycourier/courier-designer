interface UploadImageResponse {
  tenant: {
    notification: {
      uploadImage: {
        url: string;
      };
    };
  };
}

export const uploadImage = async (
  file: File,
  config: {
    apiUrl: string;
    token: string;
    tenantId: string;
    clientKey: string;
  }
): Promise<string> => {
  const { apiUrl, token, clientKey } = config;

  // Read file as Data URL (base64)
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to read file as data URL"));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  // Extract the base64 data without the Data URL prefix
  const base64Data = dataUrl.split(",")[1];

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
          mutation UploadImage($input: UploadImageInput!) {
            tenant {
              notification {
                uploadImage(input: $input) {
                  url
                }
              }
            }
          }
        `,
        variables: {
          input: {
            name: file.name,
            type: file.type,
            data: base64Data,
          },
        },
      }),
    });

    const result = await response.json();

    if (result.errors) {
      throw new Error(result.errors.map((error: any) => error.message).join("\n"));
    }

    const data = result.data as UploadImageResponse;
    return data.tenant.notification.uploadImage.url;
  } catch (error) {
    console.error("Error uploading image:", error);
    throw error;
  }
};
