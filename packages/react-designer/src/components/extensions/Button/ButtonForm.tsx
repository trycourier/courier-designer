import {
  Divider,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  Input,
  InputColor,
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui-kit";
import { BorderRadiusIcon } from "@/components/ui-kit/Icon";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { Editor } from "@tiptap/react";
import { useCallback, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { useNodeAttributes } from "../../hooks";
import { FormHeader } from "../../ui/FormHeader";
import { VariableTextarea } from "../../ui/VariableEditor";
import { defaultButtonProps } from "./Button";
import { buttonSchema } from "./Button.types";
import { ButtonAlignCenterIcon, ButtonAlignLeftIcon, ButtonAlignRightIcon } from "./ButtonIcon";
import {
  findButtonNodeById,
  findButtonNodeAtPosition,
  updateButtonLabelAndContent,
} from "./buttonUtils";
import { setFormUpdating } from "@/components/TemplateEditor/store";

interface ButtonFormProps {
  element?: ProseMirrorNode;
  editor: Editor | null;
  hideCloseButton?: boolean;
}

export const ButtonForm = ({ element, editor, hideCloseButton = false }: ButtonFormProps) => {
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

    // Fallback: find by position when IDs are regenerated after setContent
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
      <FormHeader type="button" hideCloseButton={hideCloseButton} />
      <form
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
                <Input
                  placeholder="Enter button text"
                  value={field.value}
                  onChange={(e) => {
                    const value = typeof e === "string" ? e : e.target.value;
                    field.onChange(value);
                    updateButtonLabel(value);
                  }}
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
                    field.onChange(value);
                    updateNodeAttributes({
                      ...form.getValues(),
                      link: value,
                    });
                  }}
                  showToolbar
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Divider className="courier-mt-6 courier-mb-4" />
        <h4 className="courier-text-sm courier-font-medium courier-mb-3">Background</h4>
        <FormField
          control={form.control}
          name="backgroundColor"
          render={({ field }) => (
            <FormItem className="courier-mb-4">
              <FormControl>
                <InputColor
                  {...field}
                  defaultValue={defaultButtonProps.backgroundColor}
                  onChange={(value) => {
                    field.onChange(value);
                    updateNodeAttributes({
                      ...form.getValues(),
                      [field.name]: value,
                    });
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Divider className="courier-mt-6 courier-mb-4" />
        <h4 className="courier-text-sm courier-font-medium courier-mb-3">Frame</h4>
        <FormField
          control={form.control}
          name="padding"
          render={({ field }) => (
            <FormItem className="courier-mb-2">
              <FormControl>
                <Input type="number" min={0} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="alignment"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <ToggleGroup
                  type="single"
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                    updateNodeAttributes({
                      ...form.getValues(),
                      alignment: value,
                    });
                  }}
                  className="courier-w-full courier-border courier-rounded-md courier-border-border courier-p-0.5"
                >
                  <ToggleGroupItem size="sm" value="left" className="courier-w-full">
                    <ButtonAlignLeftIcon className="courier-h-4 courier-w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem size="sm" value="center" className="courier-w-full">
                    <ButtonAlignCenterIcon className="courier-h-4 courier-w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem size="sm" value="right" className="courier-w-full">
                    <ButtonAlignRightIcon className="courier-h-4 courier-w-4" />
                  </ToggleGroupItem>
                </ToggleGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Divider className="courier-mt-6 courier-mb-4" />
        <h4 className="courier-text-sm courier-font-medium courier-mb-3">Border</h4>
        <FormField
          control={form.control}
          name="borderRadius"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input startAdornment={<BorderRadiusIcon />} type="number" min={0} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
};
