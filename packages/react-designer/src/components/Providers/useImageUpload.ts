import { useAtom } from "jotai";
import { useCallback } from "react";
import { uploadImage as defaultUploadImage } from "@/lib/api/uploadImage";
import { apiUrlAtom, tokenAtom } from "./store";
import { useTemplateStore } from "./TemplateProvider";
import type { ImageUploadConfig, ImageUploadResponse } from "./Providers.types";

/**
 * Hook for handling image uploads with customizable upload mechanism.
 *
 * - If uploadImage prop is provided to TemplateProvider: uses custom upload function
 * - If uploadImage prop is NOT provided: falls back to default GraphQL upload using apiUrl
 */
export function useImageUpload() {
  const { overrideFunctions } = useTemplateStore();
  const [apiUrl] = useAtom(apiUrlAtom);
  const [token] = useAtom(tokenAtom);

  const uploadImage = useCallback(
    async (config: ImageUploadConfig): Promise<ImageUploadResponse> => {
      const customUploadFunction = overrideFunctions.uploadImage;

      if (typeof customUploadFunction === "function") {
        // Use custom upload function
        return await customUploadFunction(config);
      } else {
        // Use default GraphQL upload
        if (!apiUrl || !token) {
          throw new Error("Upload failed: Missing configuration for image upload");
        }

        const imageUrl = await defaultUploadImage(config.file, {
          apiUrl,
          token,
        });

        if (!imageUrl) {
          throw new Error("Upload failed: No URL returned from server");
        }

        return { url: imageUrl };
      }
    },
    [apiUrl, token, overrideFunctions]
  );

  return { uploadImage };
}
