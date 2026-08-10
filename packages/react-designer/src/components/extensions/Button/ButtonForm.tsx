import {
  Divider,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  InputColor,
  PrefixInput,
  Switch,
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui-kit";
import {
  BorderRadiusIcon,
  PaddingHorizontalIcon,
  PaddingVerticalIcon,
} from "@/components/ui-kit/Icon";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { Editor } from "@tiptap/react";
import { useAtomValue } from "jotai";
import { useCallback, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Tooltip } from "@/components/ui/Tooltip";
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
import {
  emailFontSizeAtom,
  emailFormattingEnabledAtom,
  linkTrackingEnabledAtom,
  setFormUpdating,
} from "@/components/TemplateEditor/store";
import { EMAIL_EDITOR_ACTION_FONT_SIZE_FALLBACK } from "@/lib/constants/email-editor-tiptap-styles";
import { ConditionsSection } from "../../ui/Conditions";
import { TypographyFields } from "../shared/TypographyFields";
import type { ElementalIfCondition } from "@/types/conditions.types";

const URL_PREFIX_OPTIONS = [
  { label: "https://", value: "https://" },
  { label: "http://", value: "http://" },
];

interface ButtonFormProps {
  element?: ProseMirrorNode;
  editor: Editor | null;
  hideCloseButton?: boolean;
}

export const ButtonForm = ({ element, editor, hideCloseButton = false }: ButtonFormProps) => {
  const linkTrackingEnabled = useAtomValue(linkTrackingEnabledAtom);
  const emailFormattingEnabled = useAtomValue(emailFormattingEnabledAtom);
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

  const fontSize = form.watch("fontSize");

  /**
   * What the label renders at while the button sets nothing: the document base,
   * then the renderer's action fallback. Read off the action constant rather
   * than the body tier — action-block.hbs has its own default, which today
   * happens to match the paragraph preset.
   */
  const documentFontSize = useAtomValue(emailFontSizeAtom);
  const inheritedFontSize = documentFontSize ?? parseFloat(EMAIL_EDITOR_ACTION_FONT_SIZE_FALLBACK);

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
                <PrefixInput
                  value={field.value}
                  onChange={(value) => {
                    field.onChange(value);
                    updateNodeAttributes({
                      ...form.getValues(),
                      link: value,
                    });
                  }}
                  prefixOptions={URL_PREFIX_OPTIONS}
                  defaultPrefix="https://"
                >
                  {(inputProps) => (
                    <VariableTextarea
                      value={inputProps.value}
                      onChange={inputProps.onChange}
                      placeholder="example.com"
                      disabled={inputProps.disabled}
                      showToolbar
                    />
                  )}
                </PrefixInput>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
                        updateNodeAttributes({
                          ...form.getValues(),
                          disableTracking: !checked,
                        });
                      }}
                      className="!courier-m-0"
                    />
                  </FormControl>
                </FormItem>
              </Tooltip>
            )}
          />
        </div>
        {emailFormattingEnabled && (
          <>
            <Divider className="courier-mt-6 courier-mb-4" />
            <TypographyFields
              fontSize={fontSize ?? null}
              inheritedFontSize={inheritedFontSize}
              showLineHeight={false}
              onFontSizeChange={(value) => {
                form.setValue("fontSize", value);
                updateNodeAttributes({ ...form.getValues(), fontSize: value });
              }}
            />
          </>
        )}
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
        <div className="courier-flex courier-flex-row courier-gap-3 courier-mb-2">
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
            <FormItem className="courier-mb-4">
              <FormControl>
                <Input startAdornment={<BorderRadiusIcon />} type="number" min={0} {...field} />
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
