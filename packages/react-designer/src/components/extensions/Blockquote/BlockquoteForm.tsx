import {
  Divider,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  InputColor,
} from "@/components/ui-kit";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { Editor } from "@tiptap/react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { useNodeAttributes } from "../../hooks";
import { FormHeader } from "../../ui/FormHeader";
import { defaultBlockquoteProps } from "./Blockquote";
import { blockquoteSchema } from "./Blockquote.types";
import { ConditionsSection } from "../../ui/Conditions";
import { TypographyFields } from "../shared/TypographyFields";
import { useEmailTypographyBaseline } from "../shared/useEmailTypographyBaseline";
import type { ElementalIfCondition } from "@/types/conditions.types";

interface BlockquoteFormProps {
  element?: ProseMirrorNode;
  editor: Editor | null;
  hideCloseButton?: boolean;
}

export const BlockquoteForm = ({
  element,
  editor,
  hideCloseButton = false,
}: BlockquoteFormProps) => {
  const form = useForm<z.infer<typeof blockquoteSchema>>({
    resolver: zodResolver(blockquoteSchema),
    defaultValues: {
      ...defaultBlockquoteProps,
      ...(element?.attrs as z.infer<typeof blockquoteSchema>),
    },
  });

  const { updateNodeAttributes } = useNodeAttributes({
    editor,
    element,
    form,
    nodeType: element?.type.name || "blockquote",
  });

  const baseline = useEmailTypographyBaseline("quote", { quote: true });
  const fontSize = form.watch("fontSize");
  const lineHeight = form.watch("lineHeight");

  const commitTypography = (patch: { fontSize?: number | null; lineHeight?: number | null }) => {
    for (const [key, value] of Object.entries(patch)) {
      form.setValue(key as "fontSize" | "lineHeight", value);
    }
    updateNodeAttributes({ ...form.getValues(), ...patch });
  };

  if (!element) {
    return null;
  }

  return (
    <Form {...form}>
      <FormHeader type="blockquote" hideCloseButton={hideCloseButton} />
      <form
        data-sidebar-form
        onChange={() => {
          updateNodeAttributes(form.getValues());
        }}
      >
        <TypographyFields
          fontSize={fontSize ?? null}
          lineHeight={lineHeight ?? null}
          inheritedFontSize={baseline.fontSize}
          inheritedLineHeight={baseline.lineHeight}
          onFontSizeChange={(value) => commitTypography({ fontSize: value })}
          onLineHeightChange={(value) => commitTypography({ lineHeight: value })}
        />
        <Divider className="courier-mb-4" />
        <h4 className="courier-text-sm courier-font-medium courier-mb-3">Border</h4>
        <FormField
          control={form.control}
          name="borderColor"
          render={({ field }) => (
            <FormItem className="courier-mb-3">
              <FormControl>
                <InputColor
                  {...field}
                  defaultValue={defaultBlockquoteProps.borderColor}
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
        <ConditionsSection
          value={element?.attrs?.if as ElementalIfCondition | undefined}
          onChange={(ifValue) => {
            updateNodeAttributes({
              ...form.getValues(),
              if: ifValue,
            });
          }}
        />
      </form>
    </Form>
  );
};
