import { useAtom } from "jotai";
import { useCallback } from "react";
import { uploadImage as defaultUploadImage } from "@/lib/api/uploadImage";
import { apiUrlAtom, tokenAtom } from "./store";
import type { ImageUploadConfig, ImageUploadResponse } from "./Providers.types";
import { useUploadImage as useUploadImageContext } from "./TemplateProvider";

/**
 * Hook for handling image uploads with customizable upload mechanism.
 *
 * - If uploadImage prop is provided to TemplateProvider: uses custom upload function
 * - If uploadImage prop is NOT provided: falls back to default GraphQL upload using apiUrl
 */
export function useImageUpload() {
  const [apiUrl] = useAtom(apiUrlAtom);
  const [token] = useAtom(tokenAtom);
  const uploadImageOverride = useUploadImageContext();

  const uploadImage = useCallback(
    async (config: ImageUploadConfig): Promise<ImageUploadResponse> => {
      if (typeof uploadImageOverride === "function") {
        // Try to call with the full config first (new API)
        // If it fails or returns undefined, fall back to calling with just the file/blob (old API)
        let result: string | ImageUploadResponse;

        try {
          // Try new API first: (config: ImageUploadConfig) => Promise<{ url: string }>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          result = await (uploadImageOverride as any)(config);

          // If result is undefined, try old API with file/blob
          if (result === undefined) {
            result = await (uploadImageOverride as (file: Blob) => Promise<string>)(config.file);
          }
        } catch (error) {
          // If calling with config fails, try calling with just the file/blob (old API)
          result = await (uploadImageOverride as (file: Blob) => Promise<string>)(config.file);
        }

        // Handle both API formats:
        // Old API: (file: Blob | File) => Promise<string>
        // New API: (config: ImageUploadConfig) => Promise<{ url: string }>
        let url: string;
        if (typeof result === "string") {
          url = result;
        } else {
          url = result?.url ?? "";
        }

        // Validate that we got a valid URL
        if (!url) {
          throw new Error("Upload failed: No URL returned from upload function");
        }

        return { url };
      } else {
        // Use default GraphQL upload
        if (!apiUrl || !token) {
          throw new Error("Upload failed: Missing configuration for image upload");
        }

        // Ensure we have a File object for the default upload
        // If config.file is a Blob but not a File, wrap it
        const file =
          config.file instanceof File
            ? config.file
            : new File([config.file], "upload", { type: config.file.type });

        const imageUrl = await defaultUploadImage(file, {
          apiUrl,
          token,
        });

        if (!imageUrl) {
          throw new Error("Upload failed: No URL returned from server");
        }

        return { url: imageUrl };
      }
    },
    [apiUrl, token, uploadImageOverride]
  );

  return { uploadImage };
}
