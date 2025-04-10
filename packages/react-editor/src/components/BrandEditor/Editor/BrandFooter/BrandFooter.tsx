import { useBlockEditor } from "@/components/TemplateEditor/Editor/useBlockEditor";
import {
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  MediumIcon,
  XIcon,
} from "@/components/ui-kit/Icon";
import { cn, convertElementalToTiptap } from "@/lib/utils";
import type { ElementalContent } from "@/types/elemental.types";
import type { Editor as TiptapEditor } from "@tiptap/react";
import { EditorContent } from "@tiptap/react";
import { useEffect, useMemo, useRef } from "react";
import { Doc as YDoc } from "yjs";

interface BrandFooterProps {
  variables?: Record<string, unknown>;
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

export const BrandFooter = ({
  content,
  variables,
  facebookLink,
  linkedinLink,
  instagramLink,
  mediumLink,
  xLink,
  readOnly = false,
  setEditor,
  onUpdate,
}: BrandFooterProps) => {
  const ydoc = useMemo(() => new YDoc(), []);
  const isUserEditing = useRef(false);
  const previousContentRef = useRef<ElementalContent | undefined>(content);
  const isMountedRef = useRef(false);
  const dataSetRef = useRef<NodeJS.Timeout | null>(null);

  // Custom wrapper for onUpdate to ensure it's only called when component is mounted
  const safeOnUpdate = useMemo(() => {
    if (!onUpdate) return undefined;

    return (updatedContent: ElementalContent) => {
      if (isMountedRef.current) {
        isUserEditing.current = true;
        onUpdate(updatedContent);

        // Use requestAnimationFrame instead of setTimeout to stay within React's lifecycle
        requestAnimationFrame(() => {
          if (isMountedRef.current) {
            isUserEditing.current = false;
          }
        });
      }
    };
  }, [onUpdate]);

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
    onUpdate: safeOnUpdate,
    setSelectedNode: () => {},
  });

  // Track component mount status
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Set editor reference for parent component
  useEffect(() => {
    if (editor && setEditor && isMountedRef.current) {
      setEditor(editor);
    }
  }, [editor, setEditor]);

  // Handle external content updates
  useEffect(() => {
    if (editor && content && !isUserEditing.current && isMountedRef.current) {
      if (dataSetRef.current) {
        clearTimeout(dataSetRef.current);
      }
      dataSetRef.current = setTimeout(() => {
        editor.commands.setContent(convertElementalToTiptap(content));
        previousContentRef.current = content;
      }, 0);
    }

    return () => {
      if (dataSetRef.current) {
        clearTimeout(dataSetRef.current);
      }
    };
  }, [content, editor]);

  // Update previous content ref when content changes
  useEffect(() => {
    if (isMountedRef.current) {
      previousContentRef.current = content;
    }
  }, [content]);

  return (
    <>
      <EditorContent
        editor={editor}
        className={cn("courier-py-2", readOnly && "courier-brand-editor-readonly")}
      />
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
