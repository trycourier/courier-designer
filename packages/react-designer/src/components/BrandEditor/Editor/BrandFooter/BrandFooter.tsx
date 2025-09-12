import { ExtensionKit } from "@/components/extensions/extension-kit";
import { isTemplateLoadingAtom } from "@/components/Providers/store";
import { brandEditorAtom } from "@/components/TemplateEditor/store";
import {
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  MediumIcon,
  XIcon,
} from "@/components/ui-kit/Icon";
import { BubbleTextMenu } from "@/components/ui/TextMenu/BubbleTextMenu";
import { selectedNodeAtom } from "@/components/ui/TextMenu/store";
import { cn, convertMarkdownToTiptap } from "@/lib/utils";
import type { Transaction } from "@tiptap/pm/state";
import { TextSelection } from "@tiptap/pm/state";
import type { AnyExtension, Editor } from "@tiptap/react";
import { EditorProvider, Extension, useCurrentEditor } from "@tiptap/react";
import { useAtomValue, useSetAtom } from "jotai";
import { memo, useEffect, useMemo, useRef } from "react";

interface BrandFooterProps {
  value?: string | null;
  variables?: Record<string, unknown>;
  readOnly?: boolean;
  facebookLink?: string;
  linkedinLink?: string;
  instagramLink?: string;
  mediumLink?: string;
  xLink?: string;
  onUpdate?: (props: { editor: Editor; transaction: Transaction }) => void;
}

const EditorContent = ({ value, readOnly }: { value?: string | null; readOnly?: boolean }) => {
  const { editor } = useCurrentEditor();
  const setBrandEditor = useSetAtom(brandEditorAtom);
  const isTemplateLoading = useAtomValue(isTemplateLoadingAtom);
  const isValueUpdated = useRef(false);

  useEffect(() => {
    if (
      !editor ||
      ((isTemplateLoading !== false || isValueUpdated.current) && !readOnly) ||
      !value
    ) {
      return;
    }

    isValueUpdated.current = true;

    editor.commands.setContent(convertMarkdownToTiptap(value ?? ""));
  }, [editor, value, isTemplateLoading, readOnly]);

  useEffect(() => {
    if (editor) {
      setBrandEditor(editor);
      setTimeout(() => {
        editor.commands.blur();
      }, 1);
    }
  }, [editor, setBrandEditor]);

  return null;
};

const BrandFooterComponent = ({
  variables,
  facebookLink,
  linkedinLink,
  instagramLink,
  mediumLink,
  xLink,
  readOnly = false,
  value,
  onUpdate,
}: BrandFooterProps) => {
  const isMountedRef = useRef(false);
  const setSelectedNode = useSetAtom(selectedNodeAtom);

  const extendedVariables = useMemo(() => {
    return {
      urls: {
        unsubscribe: true,
        preferences: true,
      },
      ...variables,
    };
  }, [variables]);

  // Create an extension to handle the Escape key
  const EscapeHandlerExtension = Extension.create({
    name: "escapeHandler",
    addKeyboardShortcuts() {
      return {
        Escape: ({ editor }) => {
          const { state, dispatch } = editor.view;
          dispatch(
            state.tr.setSelection(TextSelection.create(state.doc, state.selection.$anchor.pos))
          );
          if (setSelectedNode) {
            setSelectedNode(null);
          }
          return false;
        },
      };
    },
  });

  // Track component mount status
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const extensions = useMemo(
    () =>
      [
        ...ExtensionKit({ variables: extendedVariables, setSelectedNode }),
        EscapeHandlerExtension,
      ].filter((e): e is AnyExtension => e !== undefined),
    [EscapeHandlerExtension, extendedVariables, setSelectedNode]
  );

  return (
    <div className="courier-flex courier-flex-row courier-gap-6 courier-justify-between courier-items-start">
      <EditorProvider
        content={convertMarkdownToTiptap(value ?? "")}
        extensions={extensions}
        editable={!readOnly}
        autofocus={!readOnly}
        onUpdate={onUpdate}
        editorContainerProps={{
          className: cn(
            "courier-py-2 courier-flex-grow",
            readOnly && "courier-brand-editor-readonly"
          ),
        }}
        immediatelyRender={false}
      >
        <EditorContent value={value} readOnly={readOnly} />
        <BubbleTextMenu />
      </EditorProvider>
      <div className="courier-flex courier-justify-end courier-items-center courier-gap-2 courier-mt-3">
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
    </div>
  );
};

export const BrandFooter = memo(BrandFooterComponent);
