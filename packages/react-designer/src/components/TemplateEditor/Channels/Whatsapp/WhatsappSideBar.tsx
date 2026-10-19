import { Button, Divider, Label, Tabs, TabsList, TabsTrigger } from "@/components/ui-kit";
import { FormHeader } from "@/components/ui/FormHeader";
import { VariableInput, VariableTextarea } from "@/components/ui/VariableEditor";
import {
  pendingAutoSaveAtom,
  templateEditorAtom,
  templateEditorContentAtom,
} from "@/components/TemplateEditor/store";
import type { ElementalActionNode } from "@/types/elemental.types";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { Editor } from "@tiptap/react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { memo } from "react";
import { SlackSideBarItemDetails } from "../Slack/SideBar";
import { selectedWhatsappButtonAtom } from "./store";
import {
  WHATSAPP_MAX_BUTTONS,
  getWhatsappActions,
  getWhatsappHeader,
  setWhatsappActions,
  setWhatsappHeader,
} from "./whatsappContent";

const Note = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="courier-flex courier-flex-col courier-gap-1">
    <Label>{label}</Label>
    <p className="courier-m-0 courier-text-xs courier-text-muted-foreground">{children}</p>
  </div>
);

const Hint = ({ children }: { children: React.ReactNode }) => (
  <p className="courier-m-0 courier-mt-1.5 courier-text-xs courier-text-muted-foreground">
    {children}
  </p>
);

/** Slack's button form, laid out the same, for a button that lives under the bubble rather than in the editor. */
const WhatsappButtonForm = ({ index }: { index: number }) => {
  const [templateEditorContent, setTemplateEditorContent] = useAtom(templateEditorContentAtom);
  const setPendingAutoSave = useSetAtom(pendingAutoSaveAtom);
  const setSelected = useSetAtom(selectedWhatsappButtonAtom);
  const actions = getWhatsappActions(templateEditorContent);
  const action = actions[index];

  if (!action) return null;

  const update = (changes: Partial<ElementalActionNode>) => {
    const content = setWhatsappActions(
      templateEditorContent,
      actions.map((current, i) => (i === index ? { ...current, ...changes } : current))
    );
    setTemplateEditorContent(content);
    setPendingAutoSave(content);
  };

  return (
    <div className="courier-flex courier-flex-col courier-gap-4">
      {/* FormHeader's own Close clears the editor selection, which a button is not part of */}
      <Button
        className="courier-w-fit"
        variant="secondary"
        buttonSize="small"
        onClick={() => setSelected(null)}
      >
        Close
      </Button>
      <FormHeader type="button" hideCloseButton />
      <form data-sidebar-form key={index}>
        <h4 className="courier-text-sm courier-font-medium courier-mb-3">Label</h4>
        {/* Literal: Meta refuses a variable in a label, or keeps it as braces */}
        <VariableInput
          literal
          className="courier-min-h-[44px] !courier-items-start !courier-bg-secondary !courier-text-secondary-foreground !courier-p-1.5 courier-text-base md:courier-text-sm"
          value={action.content}
          placeholder="Enter button text"
          onChange={(value) => update({ content: value })}
        />
        <Hint>Up to 25 characters, no variables.</Hint>
        <Divider className="courier-mt-6 courier-mb-4" />
        <h4 className="courier-text-sm courier-font-medium courier-mb-3">Link</h4>
        <VariableTextarea
          value={action.href}
          placeholder="https://example.com"
          onChange={(value) => update({ href: value })}
          showToolbar
        />
        <Hint>One variable, only at the end.</Hint>
      </form>
    </div>
  );
};

/**
 * The header's type, with the list's own Type control: text is the bubble's bold first line,
 * an image is uploaded in the bubble itself. Switching drops the other kind.
 */
const WhatsappHeaderType = () => {
  const [templateEditorContent, setTemplateEditorContent] = useAtom(templateEditorContentAtom);
  const setPendingAutoSave = useSetAtom(pendingAutoSaveAtom);
  const templateEditor = useAtomValue(templateEditorAtom);
  const header = getWhatsappHeader(templateEditorContent);
  const type = header.type;

  const save = (next: Parameters<typeof setWhatsappHeader>[1]) => {
    const content = setWhatsappHeader(templateEditorContent, next);
    setTemplateEditorContent(content);
    setPendingAutoSave(content);
  };

  return (
    <div className="courier-flex courier-flex-col courier-gap-2">
      <Label>Header</Label>
      <div onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
        <Tabs
          value={type}
          onValueChange={(value) => {
            if (value === type) return;
            // Back to Text takes the title line as it reads, hidden while Image was picked
            save(
              value === "image"
                ? { type: "image", src: "" }
                : {
                    type: "text",
                    content: templateEditor?.state.doc.firstChild?.textContent.trim() ?? "",
                  }
            );
          }}
        >
          <TabsList className="courier-w-full">
            <TabsTrigger value="text" className="courier-flex-1">
              Text
            </TabsTrigger>
            <TabsTrigger value="image" className="courier-flex-1">
              Image
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <p className="courier-m-0 courier-text-xs courier-text-muted-foreground">
        {type === "image"
          ? "Drop or browse an image at the top of the message. JPEG or PNG; each send can use its own."
          : "The bold first line. Optional: leave it empty for no header. Up to 60 characters, one variable, no formatting or emoji."}
      </p>
      {header.type === "image" && header.src && (
        <Button
          className="courier-w-fit"
          variant="secondary"
          buttonSize="small"
          onClick={() => save({ type: "image", src: "" })}
        >
          Remove image
        </Button>
      )}
    </div>
  );
};

export interface WhatsappSideBarProps {
  /** The canvas block in focus: a list gets its bullets/numbers switch. */
  selectedNode?: ProseMirrorNode | null;
  editor?: Editor | null;
}

/** The right sidebar: the selected button's form, Slack's form for a selected list, or what each slot takes. */
const WhatsappSideBarComponent = ({ selectedNode = null, editor = null }: WhatsappSideBarProps) => {
  const [selected] = useAtom(selectedWhatsappButtonAtom);

  return (
    <div className="courier-whatsapp-sidebar">
      {selected !== null ? (
        <WhatsappButtonForm index={selected} />
      ) : (
        <SlackSideBarItemDetails
          element={selectedNode}
          editor={editor}
          defaultElement={
            <div className="courier-flex courier-flex-col courier-gap-4">
              <WhatsappHeaderType />
              <Note label="Buttons">
                Drag a Button onto the bottom of the message, up to {WHATSAPP_MAX_BUTTONS}. Click a
                button to edit it.
              </Note>
            </div>
          }
        />
      )}
    </div>
  );
};

export const WhatsappSideBar = memo(WhatsappSideBarComponent);
