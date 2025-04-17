import { BrandEditorContentAtom } from "@/components/BrandEditor/store";
import {
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  MediumIcon,
  XIcon,
} from "@/components/ui-kit/Icon";
import { cn, convertElementalToTiptap } from "@/lib/utils";
import type { Editor as TiptapEditor } from "@tiptap/react";
import { EditorContent } from "@tiptap/react";
import { useAtom, useAtomValue } from "jotai";
import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { Doc as YDoc } from "yjs";
import { useBlockEditor } from "../useBlockEditor";
import { isTenantLoadingAtom, tenantDataAtom } from "@/components/Providers/store";

interface BrandFooterProps {
  variables?: Record<string, unknown>;
  setEditor?: (editor: TiptapEditor | null) => void;
  readOnly?: boolean;
  facebookLink?: string;
  linkedinLink?: string;
  instagramLink?: string;
  mediumLink?: string;
  xLink?: string;
}

const BrandFooterComponent = ({
  variables,
  facebookLink,
  linkedinLink,
  instagramLink,
  mediumLink,
  xLink,
  readOnly = false,
  setEditor,
}: BrandFooterProps) => {
  const ydoc = useMemo(() => new YDoc(), []);
  const isMountedRef = useRef(false);
  const [brandEditorContent, setBrandEditorContent] = useAtom(BrandEditorContentAtom);
  const tenantData = useAtomValue(tenantDataAtom);
  const isTenantLoading = useAtomValue(isTenantLoadingAtom);
  const isResponseSetRef = useRef(false);

  const extendedVariables = useMemo(() => {
    return {
      urls: {
        unsubscribe: true,
        preferences: true,
      },
      ...variables,
    };
  }, [variables]);

  const setSelectedNodeHandler = useCallback(() => {}, []);

  const { editor } = useBlockEditor({
    initialContent: useMemo(
      () => ({
        version: "2022-01-01",
        elements: [
          {
            type: "text",
            align: "left",
            content: "",
          },
        ],
      }),
      []
    ), // eslint-disable-line react-hooks/exhaustive-deps
    ydoc,
    variables: extendedVariables,
    readOnly,
    setSelectedNode: setSelectedNodeHandler,
  });

  useEffect(() => {
    if (readOnly && brandEditorContent) {
      editor.commands.setContent(convertElementalToTiptap(brandEditorContent));
    }
  }, [readOnly, brandEditorContent, editor]);

  useEffect(() => {
    const content = tenantData?.data?.tenant?.brand?.settings?.email?.footer?.content;

    if (isTenantLoading === false && !content) {
      isResponseSetRef.current = true;
    }

    if (!content || !editor) {
      return;
    }

    editor.commands.setContent(convertElementalToTiptap(content));
    setBrandEditorContent(content);

    setTimeout(() => {
      isResponseSetRef.current = true;
    }, 100);
  }, [tenantData, isTenantLoading, editor, setBrandEditorContent]);

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

export const BrandFooter = memo(BrandFooterComponent);
