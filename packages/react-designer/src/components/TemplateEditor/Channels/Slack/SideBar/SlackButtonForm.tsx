import {
  Divider,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Switch,
} from "@/components/ui-kit";
import { Tooltip } from "@/components/ui/Tooltip";
import { useAtomValue } from "jotai";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { Editor } from "@tiptap/react";
import { useCallback, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { useNodeAttributes } from "@/components/hooks";
import { FormHeader } from "@/components/ui/FormHeader";
import { VariableTextarea } from "@/components/ui/VariableEditor";
import { defaultButtonProps } from "@/components/extensions/Button/Button";
import { buttonSchema } from "@/components/extensions/Button/Button.types";
import {
  findButtonNodeById,
  findButtonNodeAtPosition,
  updateButtonLabelAndContent,
} from "@/components/extensions/Button/buttonUtils";
import { linkTrackingEnabledAtom, setFormUpdating } from "@/components/TemplateEditor/store";

interface SlackButtonFormProps {
  element?: ProseMirrorNode;
  editor: Editor | null;
  /** Show the link-tracking switch (Teams tracks its button links; Slack's form never had it). */
  showLinkTracking?: boolean;
}

export const SlackButtonForm = ({
  element,
  editor,
  showLinkTracking = false,
}: SlackButtonFormProps) => {
  const linkTrackingEnabled = useAtomValue(linkTrackingEnabledAtom);
  const form = useForm<z.infer<typeof buttonSchema>>({
    resolver: zodResolver(buttonSchema),
    defaultValues: {
      ...defaultButtonProps,
      ...(element?.attrs as z.infer<typeof buttonSchema>),
    },
  });

  const { updateNodeAttributes } = useNodeAttributes({
    editor,
    element,
    form,
    nodeType: "button",
  });

  const buttonNodeIdRef = useRef<string | null>(element?.attrs.id || null);
  const buttonPosRef = useRef<number | null>(null);

  useEffect(() => {
    if (element?.attrs.id && editor) {
      buttonNodeIdRef.current = element.attrs.id;
      editor.state.doc.descendants((node, pos) => {
        if (node.attrs.id === element.attrs.id && node.type.name === "button") {
          buttonPosRef.current = pos;
          return false;
        }
        return true;
      });
    }
  }, [element?.attrs.id, editor]);

  const findButtonNode = useCallback((): { pos: number; node: ProseMirrorNode } | null => {
    if (!editor) return null;

    if (buttonNodeIdRef.current) {
      const result = findButtonNodeById(editor.state.doc, buttonNodeIdRef.current);
      if (result) {
        buttonPosRef.current = result.pos;
        return result;
      }
    }

    if (buttonPosRef.current !== null) {
      const result = findButtonNodeAtPosition(editor.state.doc, buttonPosRef.current);
      if (result) {
        buttonNodeIdRef.current = result.node.attrs.id;
        return result;
      }
    }

    return null;
  }, [editor]);

  const updateButtonLabel = useCallback(
    (newLabel: string) => {
      if (!editor) return;

      const result = findButtonNode();
      if (!result) return;

      const { pos: buttonPos } = result;

      setFormUpdating(true);

      editor
        .chain()
        .command(({ tr, dispatch }) => {
          if (dispatch) {
            return updateButtonLabelAndContent(tr, buttonPos, newLabel);
          }
          return false;
        })
        .run();

      setTimeout(() => {
        setFormUpdating(false);
      }, 50);
    },
    [editor, findButtonNode]
  );

  if (!element) {
    return null;
  }

  return (
    <Form {...form}>
      <FormHeader type="button" />
      <form
        data-sidebar-form
        onChange={() => {
          updateNodeAttributes(form.getValues());
        }}
      >
        <h4 className="courier-text-sm courier-font-medium courier-mb-3">Label</h4>
        <FormField
          control={form.control}
          name="label"
          render={({ field }) => (
            <FormItem className="courier-mb-4">
              <FormControl>
                <VariableTextarea
                  placeholder="Enter button text"
                  value={field.value}
                  onChange={(value) => {
                    field.onChange(value);
                    updateButtonLabel(value);
                  }}
                  showToolbar
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Divider className="courier-mt-6 courier-mb-4" />
        <h4 className="courier-text-sm courier-font-medium courier-mb-3">Link</h4>
        <FormField
          control={form.control}
          name="link"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <VariableTextarea
                  value={field.value}
                  onChange={(value) => {
                    setFormUpdating(true);
                    field.onChange(value);
                    updateNodeAttributes({
                      ...form.getValues(),
                      link: value,
                    });
                    setTimeout(() => {
                      setFormUpdating(false);
                    }, 50);
                  }}
                  showToolbar
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {showLinkTracking && (
          <div className="courier-mt-4">
            <FormField
              control={form.control}
              name="disableTracking"
              render={({ field }) => (
                <Tooltip
                  enabled={!linkTrackingEnabled}
                  title="Click-through tracking is turned off for this workspace"
                >
                  <FormItem className="courier-flex courier-flex-row courier-items-center courier-justify-between">
                    <FormLabel className="!courier-m-0">Link tracking</FormLabel>
                    <FormControl>
                      <Switch
                        checked={linkTrackingEnabled ? !field.value : false}
                        disabled={!linkTrackingEnabled}
                        onCheckedChange={(checked) => {
                          // Switch reflects "tracking enabled"; the stored attr is its inverse.
                          field.onChange(!checked);
                          updateNodeAttributes({ ...form.getValues(), disableTracking: !checked });
                        }}
                        className="!courier-m-0"
                      />
                    </FormControl>
                  </FormItem>
                </Tooltip>
              )}
            />
          </div>
        )}
      </form>
    </Form>
  );
};
