// Maximum dimensions for stored images to improve performance
export const MAX_IMAGE_DIMENSION = 800;
// Maximum file size for email attachments (in bytes, ~500KB)
export const MAX_FILE_SIZE = 500 * 1024;

// Helper function to resize an image before storing it
export const resizeImage = (
  file: File,
  maxDimension: number
): Promise<{ dataUrl: string; width: number; height: number }> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let newWidth, newHeight;
        if (img.width > img.height) {
          newWidth = Math.min(maxDimension, img.width);
          newHeight = Math.round((img.height / img.width) * newWidth);
        } else {
          newHeight = Math.min(maxDimension, img.height);
          newWidth = Math.round((img.width / img.height) * newHeight);
        }

        // Create canvas for resizing
        const canvas = document.createElement("canvas");
        canvas.width = newWidth;
        canvas.height = newHeight;
        const ctx = canvas.getContext("2d");

        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, newWidth, newHeight);

          // Start with higher quality
          let quality = 0.8;
          let dataUrl = canvas.toDataURL(file.type || "image/jpeg", quality);

          // Reduce quality if the file is still too large
          let iterations = 0;
          const maxIterations = 5;

          while (dataUrl.length > MAX_FILE_SIZE && iterations < maxIterations) {
            iterations++;
            quality -= 0.1;
            if (quality < 0.3) quality = 0.3; // Don't go below 0.3 quality
            dataUrl = canvas.toDataURL(file.type || "image/jpeg", quality);
          }

          resolve({
            dataUrl,
            width: newWidth,
            height: newHeight,
          });
        } else {
          // Fallback if canvas context not available
          resolve({
            dataUrl: e.target?.result as string,
            width: img.width,
            height: img.height,
          });
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};
