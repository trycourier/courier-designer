import { useBlockEditor } from "@/components/TemplateEditor/Editor/useBlockEditor";
import {
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  MediumIcon,
  XIcon,
} from "@/components/ui-kit/Icon";
import { cn, convertElementalToTiptap } from "@/lib/utils";
import { ElementalContent } from "@/types/elemental.types";
import { EditorContent, Editor as TiptapEditor } from "@tiptap/react";
import { useEffect, useMemo } from "react";
import { Doc as YDoc } from "yjs";

type BrandFooterProps = {
  variables?: Record<string, any>;
  setEditor?: (editor: TiptapEditor | null) => void;
  onUpdate?: (content: ElementalContent) => void;
  readOnly?: boolean;
  content?: ElementalContent;
  facebookLink?: string;
  linkedinLink?: string;
  instagramLink?: string;
  mediumLink?: string;
  xLink?: string;
}

export const BrandFooter = ({ content, variables, facebookLink, linkedinLink, instagramLink, mediumLink, xLink, readOnly = false, setEditor, onUpdate }: BrandFooterProps) => {
  const ydoc = useMemo(() => new YDoc(), []);

  const { editor } = useBlockEditor({
    initialContent: content || {
      version: "2022-01-01",
      elements: [
        {
          type: "text",
          align: "left",
          content: "",
        },
      ],
    },
    ydoc,
    variables,
    readOnly,
    onUpdate: (content: ElementalContent) => {
      if (onUpdate) {
        onUpdate(content);
      }
    },
    setSelectedNode: () => { },
  });

  useEffect(() => {
    if (editor && setEditor) {
      setEditor(editor);
    }
  }, [editor, setEditor]);

  useEffect(() => {
    if (editor && content) {
      editor.commands.setContent(convertElementalToTiptap(content));
    }
  }, [content, editor]);


  return (
    <>
      <EditorContent editor={editor} className={cn('courier-py-2', readOnly && "courier-editor-readonly")} />
      <div className="courier-flex courier-justify-end courier-items-center courier-gap-2">
        {facebookLink && (
          <a href={facebookLink} target="_blank" rel="noopener noreferrer">
            <FacebookIcon className="courier-w-5 courier-h-5" />
          </a>
        )}
        {linkedinLink && (
          <a href={linkedinLink} target="_blank" rel="noopener noreferrer">
            <LinkedinIcon className="courier-w-5 courier-h-5" />
          </a>
        )}
        {instagramLink && (
          <a href={instagramLink} target="_blank" rel="noopener noreferrer">
            <InstagramIcon className="courier-w-5 courier-h-5" />
          </a>
        )}
        {mediumLink && (
          <a href={mediumLink} target="_blank" rel="noopener noreferrer">
            <MediumIcon className="courier-w-5 courier-h-5" />
          </a>
        )}
        {xLink && (
          <a href={xLink} target="_blank" rel="noopener noreferrer">
            <XIcon className="courier-w-5 courier-h-5" />
          </a>
        )}
      </div>
    </>
  );
};
