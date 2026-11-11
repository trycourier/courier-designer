import { pendingAutoSaveAtom, templateEditorContentAtom } from "@/components/TemplateEditor/store";
import { ImageBlockComponent } from "@/components/extensions/ImageBlock";
import { useImageUpload } from "@/components/Providers/useImageUpload";
import { templateErrorAtom } from "@/components/Providers/store";
import { useAtom, useSetAtom } from "jotai";
import { useState } from "react";
import { setWhatsappHeader } from "./whatsappContent";

// Meta takes JPEG or PNG only; publish refuses other links too.
const HEADER_IMAGE_TYPES = ["image/jpeg", "image/png"];
// A new object per refusal: the toast fires when the error changes, and the same object again is no change.
const headerImageTypeError = () => ({ message: "WhatsApp header images must be JPEG or PNG." });

export interface WhatsappHeaderImageProps {
  src: string;
  editable: boolean;
}

/** An image header, drawn at the top of the bubble with the email image block's upload box. */
export const WhatsappHeaderImage = ({ src, editable }: WhatsappHeaderImageProps) => {
  const [templateEditorContent, setTemplateEditorContent] = useAtom(templateEditorContentAtom);
  const setPendingAutoSave = useSetAtom(pendingAutoSaveAtom);
  const setTemplateError = useSetAtom(templateErrorAtom);
  const { uploadImage } = useImageUpload();
  const [isUploading, setIsUploading] = useState(false);

  const onFileSelect = async (file: File) => {
    if (!editable) return;

    // The file picker's "All files" option skips `accept`.
    if (!HEADER_IMAGE_TYPES.includes(file.type)) {
      setTemplateError(headerImageTypeError());
      return;
    }

    setIsUploading(true);
    try {
      const { url } = await uploadImage({ file });
      const content = setWhatsappHeader(templateEditorContent, { type: "image", src: url });
      setTemplateEditorContent(content);
      setPendingAutoSave(content);
    } catch {
      setTemplateError({ message: "The image could not be uploaded." });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="courier-whatsapp-header-image">
      <ImageBlockComponent
        sourcePath={src}
        alignment="center"
        width={100}
        borderWidth={0}
        borderColor="transparent"
        imageNaturalWidth={0}
        isUploading={isUploading}
        onFileSelect={editable ? onFileSelect : undefined}
        allowedTypes={HEADER_IMAGE_TYPES}
        onFileRejected={editable ? () => setTemplateError(headerImageTypeError()) : undefined}
      />
    </div>
  );
};
