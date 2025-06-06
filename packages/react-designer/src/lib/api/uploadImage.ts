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
  }
): Promise<string> => {
  const { apiUrl, token } = config;

  // Validate file type
  if (!file.type.startsWith("image/")) {
    throw new Error(`Invalid file type: ${file.type}. Only image files are supported.`);
  }

  // Generate a random filename but keep the original extension
  const fileExtension = file.name.split(".").pop() || "";
  const randomFilename = `image_${Date.now()}_${Math.random().toString(36).substring(2, 10)}.${fileExtension}`;

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
            name: randomFilename, // Use random filename here
            type: file.type,
            data: base64Data,
          },
        },
      }),
    });

    const result = await response.json();

    if (result.errors) {
      throw new Error(result.errors.map((error: { message: string }) => error.message).join("\n"));
    }

    const data = result.data as UploadImageResponse;
    return data.tenant.notification.uploadImage.url;
  } catch (error) {
    console.error("Error uploading image:", error);
    throw error;
  }
};
