import { pendingAutoSaveAtom, templateEditorContentAtom } from "@/components/TemplateEditor/store";
import { ImageBlockComponent } from "@/components/extensions/ImageBlock";
import { useImageUpload } from "@/components/Providers/useImageUpload";
import { templateErrorAtom } from "@/components/Providers/store";
import { useAtom, useSetAtom } from "jotai";
import { useState } from "react";
import { setWhatsappHeader } from "./whatsappContent";

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
      />
    </div>
  );
};
