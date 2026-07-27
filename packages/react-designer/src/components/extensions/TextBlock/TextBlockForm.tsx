import {
  Divider,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  Input,
  InputColor,
} from "@/components/ui-kit";
import {
  BorderWidthIcon,
  PaddingHorizontalIcon,
  PaddingVerticalIcon,
} from "@/components/ui-kit/Icon";
import { Tooltip } from "@/components/ui/Tooltip";
import { zodResolver } from "@hookform/resolvers/zod";
import { Info } from "lucide-react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { Editor } from "@tiptap/react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { useNodeAttributes } from "../../hooks";
import { FormHeader } from "../../ui/FormHeader";
import { defaultTextBlockProps, textBlockSchema } from "./TextBlock.types";
import { ConditionsSection } from "../../ui/Conditions";
import { TypographyFields } from "../shared/TypographyFields";
import { useEmailTypographyBaseline } from "../shared/useEmailTypographyBaseline";
import type { TextTier } from "@/lib/constants/email-editor-tiptap-styles";
import type { ElementalIfCondition } from "@/types/conditions.types";

interface TextBlockFormProps {
  element?: ProseMirrorNode;
  editor: Editor | null;
  hideCloseButton?: boolean;
}

export const TextBlockForm = ({ element, editor, hideCloseButton = false }: TextBlockFormProps) => {
  const form = useForm<z.infer<typeof textBlockSchema>>({
    resolver: zodResolver(textBlockSchema),
    defaultValues: {
      ...defaultTextBlockProps,
      ...(element?.attrs as z.infer<typeof textBlockSchema>),
    },
  });

  const { updateNodeAttributes } = useNodeAttributes({
    editor,
    element,
    form,
    nodeType: element?.type.name || "paragraph",
  });

  // Elemental has no heading tier below h3, so deeper levels share its preset.
  const tier: TextTier =
    element?.type.name === "heading"
      ? (`h${Math.min(3, Math.max(1, Number(element.attrs?.level) || 1))}` as TextTier)
      : "text";
  const fontSize = form.watch("fontSize");
  const lineHeight = form.watch("lineHeight");
  const baseline = useEmailTypographyBaseline(tier, { blockFontSize: fontSize });

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
      <FormHeader type="text" hideCloseButton={hideCloseButton} />
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
        <h4 className="courier-text-sm courier-font-medium courier-mb-3 courier-flex courier-items-center">
          <span>Frame</span>
          <Tooltip
            title="The spacing inside this block and the color behind it. This only affects this block — the Frame in Email styles spaces the whole email body."
            tippyOptions={{ maxWidth: 260 }}
          >
            <Info className="courier-ml-1.5 courier-h-3.5 courier-w-3.5 courier-text-muted-foreground courier-cursor-help" />
          </Tooltip>
        </h4>
        <div className="courier-flex courier-flex-row courier-gap-3 courier-mb-3">
          <FormField
            control={form.control}
            name="paddingHorizontal"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    startAdornment={<PaddingHorizontalIcon />}
                    type="number"
                    min={0}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="paddingVertical"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    startAdornment={<PaddingVerticalIcon />}
                    type="number"
                    min={0}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="backgroundColor"
          render={({ field }) => (
            <FormItem className="courier-mb-4">
              <FormControl>
                <InputColor
                  {...field}
                  defaultValue={defaultTextBlockProps.backgroundColor}
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
        <Divider className="courier-mb-4" />
        <h4 className="courier-text-sm courier-font-medium courier-mb-3">Border</h4>
        <FormField
          control={form.control}
          name="borderWidth"
          render={({ field }) => (
            <FormItem className="courier-mb-3">
              <FormControl>
                <Input startAdornment={<BorderWidthIcon />} type="number" min={0} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="borderColor"
          render={({ field }) => (
            <FormItem className="courier-mb-4">
              <FormControl>
                <InputColor
                  {...field}
                  defaultValue={defaultTextBlockProps.borderColor}
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
