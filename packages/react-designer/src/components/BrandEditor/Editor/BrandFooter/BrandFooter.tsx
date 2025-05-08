import { ExtensionKit } from "@/components/extensions/extension-kit";
import { brandEditorAtom } from "@/components/TemplateEditor/store";
import {
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  MediumIcon,
  XIcon,
} from "@/components/ui-kit/Icon";
import { selectedNodeAtom } from "@/components/ui/TextMenu/store";
import { cn, convertMarkdownToTiptap } from "@/lib/utils";
import type { Transaction } from "@tiptap/pm/state";
import { TextSelection } from "@tiptap/pm/state";
import type { AnyExtension, Editor } from "@tiptap/react";
import { EditorProvider, Extension, useCurrentEditor } from "@tiptap/react";
import { useSetAtom } from "jotai";
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
  // const ydoc = useMemo(() => new YDoc(), []);
  const isMountedRef = useRef(false);
  // const [brandEditorContent, setBrandEditorContent] = useAtom(BrandEditorContentAtom);
  // const tenantData = useAtomValue(tenantDataAtom);
  // const isTenantLoading = useAtomValue(isTenantLoadingAtom);
  // const isResponseSetRef = useRef(false);
  const setSelectedNode = useSetAtom(selectedNodeAtom);
  // const setBrandEditorContent = useSetAtom(BrandEditorContentAtom);

  const extendedVariables = useMemo(() => {
    return {
      urls: {
        unsubscribe: true,
        preferences: true,
      },
      ...variables,
    };
  }, [variables]);

  // const setSelectedNodeHandler = useCallback(() => {}, []);

  // const { editor } = useBlockEditor({
  //   initialContent: useMemo(
  //     () => ({
  //       version: "2022-01-01",
  //       elements: [
  //         {
  //           type: "text",
  //           align: "left",
  //           content: "",
  //         },
  //       ],
  //     }),
  //     []
  //   ), // eslint-disable-line react-hooks/exhaustive-deps
  //   ydoc,
  //   variables: extendedVariables,
  //   readOnly,
  //   setSelectedNode: setSelectedNodeHandler,
  // });

  // useEffect(() => {
  //   if (readOnly && brandEditorContent) {
  //     setTimeout(() => {
  //       editor.commands.setContent(convertMarkdownToTiptap(brandEditorContent));
  //       editor.chain().focus().setTextSelection(0).run();
  //     }, 0);
  //   }
  // }, [readOnly, brandEditorContent, editor]);

  // useEffect(() => {
  //   const markdown = tenantData?.data?.tenant?.brand?.settings?.email?.footer?.markdown ?? "";

  //   if (isTenantLoading === false && !markdown) {
  //     isResponseSetRef.current = true;
  //   }

  //   if (!editor) {
  //     return;
  //   }

  //   setTimeout(() => {
  //     editor.commands.setContent(convertMarkdownToTiptap(markdown));
  //     editor.chain().focus().setTextSelection(0).run();
  //     setBrandEditorContent(markdown);
  //   }, 0);

  //   setTimeout(() => {
  //     isResponseSetRef.current = true;
  //   }, 100);
  // }, [tenantData, isTenantLoading, editor, setBrandEditorContent]);

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

  // // Set editor reference for parent component
  // useEffect(() => {
  //   if (editor && setEditor && isMountedRef.current) {
  //     setEditor(editor);
  //   }
  // }, [editor, setEditor]);

  const extensions = useMemo(
    () =>
      [
        ...ExtensionKit({ variables: extendedVariables, setSelectedNode }),
        EscapeHandlerExtension,
      ].filter((e): e is AnyExtension => e !== undefined),
    [EscapeHandlerExtension, extendedVariables, setSelectedNode]
  );

  const EditorContent = () => {
    const { editor } = useCurrentEditor();
    const setBrandEditor = useSetAtom(brandEditorAtom);
    // const mountedRef = useRef(false);

    useEffect(() => {
      if (editor) {
        setBrandEditor(editor);
        setTimeout(() => {
          editor.commands.blur();
        }, 1);
      }
    }, [editor, setBrandEditor]);

    // useEffect(() => {
    //   if (!(editor && subject !== null)) {
    //     return;
    //   }
    //   const newContent = convertTiptapToElemental(editor.getJSON() as TiptapDoc, subject ?? "");
    //   if (JSON.stringify(templateEditorContent) !== JSON.stringify(newContent)) {
    //     setTemplateEditorContent(newContent);
    //   }
    // }, [templateEditorContent, editor, subject, setTemplateEditorContent]);

    // // Ensure editor is editable when component unmounts or editor changes
    // useEffect(() => {
    //   return () => {
    //     // Reset editor to editable state when component unmounts
    //     if (editor && !editor.isDestroyed) {
    //       editor.setEditable(true);
    //     }
    //   };
    // }, [editor]);

    // useEffect(() => {
    //   if (editor && mountedRef.current) {
    //     editor.commands.updateSelectionState(selectedNode);
    //   }
    // }, [editor, selectedNode]);

    // useEffect(() => {
    //   mountedRef.current = true;
    //   return () => {
    //     mountedRef.current = false;
    //   };
    // }, []);

    return null;
  };

  return (
    <div className="courier-flex courier-flex-row courier-gap-6 courier-justify-between courier-items-start">
      {/* <button onClick={handleTest}>test</button> */}
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
      >
        <EditorContent />
      </EditorProvider>
      {/* <EditorContent
        editor={editor}
        className={cn(
          "courier-py-2 courier-flex-grow",
          readOnly && "courier-brand-editor-readonly"
        )}
      /> */}
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
