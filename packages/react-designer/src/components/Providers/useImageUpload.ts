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
        let uploadError: unknown;

        try {
          // Try new API first: (config: ImageUploadConfig) => Promise<{ url: string }>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          result = await (uploadImageOverride as any)(config);

          // If result is undefined, try old API with file/blob
          if (result === undefined) {
            result = await (uploadImageOverride as (file: Blob) => Promise<string>)(config.file);
          }
        } catch (error) {
          // Store the error in case the old API also fails
          uploadError = error;
          try {
            // If calling with config fails, try calling with just the file/blob (old API)
            result = await (uploadImageOverride as (file: Blob) => Promise<string>)(config.file);
          } catch (oldApiError) {
            // Both APIs failed, re-throw the original error
            throw uploadError;
          }
        }

        // Handle both API formats:
        // Old API: (file: Blob | File) => Promise<string>
        // New API: (config: ImageUploadConfig) => Promise<{ url: string }>
        let url: string = "";
        let errorMessage: string | undefined;

        if (typeof result === "string") {
          url = result;
        } else if (result) {
          // Check for error message at result level
          errorMessage = (result as { message?: string })?.message;

          // Check if url is a string or an error object
          const urlValue = result.url;
          if (typeof urlValue === "string") {
            url = urlValue;
          } else if (urlValue && typeof urlValue === "object") {
            // Server might return error object in url field: { url: { message: "...", type: "..." } }
            errorMessage = errorMessage || (urlValue as { message?: string })?.message;
          }
        }

        // If there's an error message, throw with that message
        if (errorMessage) {
          throw new Error(errorMessage);
        }

        // Validate that we got a valid URL
        if (!url) {
          // If we had an original error but got empty result, throw the original error
          if (uploadError) {
            throw uploadError;
          }
          throw new Error("Error uploading image");
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
