import { ExtensionKit } from "@/components/extensions/extension-kit";
import { Placeholder } from "@tiptap/extension-placeholder";
import { isTemplateLoadingAtom } from "@/components/Providers/store";
import { brandEditorAtom, type VariableViewMode } from "@/components/TemplateEditor/store";
import {
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  MediumIcon,
  XIcon,
} from "@/components/ui-kit/Icon";
import { BubbleTextMenu } from "@/components/ui/TextMenu/BubbleTextMenu";
import { selectedNodeAtom } from "@/components/ui/TextMenu/store";
import { VariableViewModeSync } from "@/components/TemplateEditor/VariableViewModeSync";
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
  variableViewMode?: VariableViewMode;
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
  facebookLink,
  linkedinLink,
  instagramLink,
  mediumLink,
  xLink,
  readOnly = false,
  value,
  variableViewMode = "show-variables",
  onUpdate,
}: BrandFooterProps) => {
  const isMountedRef = useRef(false);
  const setSelectedNode = useSetAtom(selectedNodeAtom);

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
        ...ExtensionKit({
          setSelectedNode,
        }).filter((ext) => ext?.name !== "placeholder"),
        Placeholder.configure({
          includeChildren: true,
          showOnlyCurrent: false,
          placeholder: "",
          emptyEditorClass: "is-editor-empty",
          emptyNodeClass: "is-empty",
          showOnlyWhenEditable: true,
        }),
        EscapeHandlerExtension,
      ].filter((e): e is AnyExtension => e !== undefined),
    [EscapeHandlerExtension, setSelectedNode]
  );

  const hasSocialLinks = facebookLink || linkedinLink || instagramLink || mediumLink || xLink;

  return (
    <div className="courier-flex courier-flex-row courier-items-center courier-justify-center courier-gap-[10px]">
      <EditorProvider
        content={(() => {
          const doc = convertMarkdownToTiptap(value ?? "");
          if (doc.content.length === 0) {
            doc.content = [{ type: "paragraph", attrs: { textAlign: "left" } }];
          }
          return doc;
        })()}
        extensions={extensions}
        editable={!readOnly}
        autofocus={!readOnly}
        onUpdate={onUpdate}
        editorContainerProps={{
          className: cn(
            "courier-flex-grow courier-brand-editor [&_.ProseMirror_a]:courier-text-[12px] [&_.ProseMirror_a]:courier-font-normal [&_.ProseMirror_a]:courier-leading-4 [&_.ProseMirror_a]:courier-tracking-[-0.2px] [&_.ProseMirror_a]:courier-text-[color:var(--brand-link-color,#2a9edb)] [&_.ProseMirror_a]:courier-underline",
            readOnly && "courier-brand-editor-readonly"
          ),
        }}
        immediatelyRender={false}
      >
        <VariableViewModeSync variableViewMode={variableViewMode} />
        <EditorContent value={value} readOnly={readOnly} />
        <BubbleTextMenu />
      </EditorProvider>
      {hasSocialLinks && (
        <div className="courier-flex courier-items-center courier-justify-center courier-gap-1">
          {facebookLink && (
            <a href={facebookLink} target="_blank" rel="noopener noreferrer">
              <FacebookIcon className="courier-w-5 courier-h-5 courier-text-zinc-500" />
            </a>
          )}
          {linkedinLink && (
            <a href={linkedinLink} target="_blank" rel="noopener noreferrer">
              <LinkedinIcon className="courier-w-5 courier-h-5 courier-text-zinc-500" />
            </a>
          )}
          {instagramLink && (
            <a href={instagramLink} target="_blank" rel="noopener noreferrer">
              <InstagramIcon className="courier-w-5 courier-h-5 courier-text-zinc-500" />
            </a>
          )}
          {mediumLink && (
            <a href={mediumLink} target="_blank" rel="noopener noreferrer">
              <MediumIcon className="courier-w-5 courier-h-5 courier-text-zinc-500" />
            </a>
          )}
          {xLink && (
            <a href={xLink} target="_blank" rel="noopener noreferrer">
              <XIcon className="courier-w-5 courier-h-5 courier-text-zinc-500" />
            </a>
          )}
        </div>
      )}
    </div>
  );
};

export const BrandFooter = memo(BrandFooterComponent);
