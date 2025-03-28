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
import { BorderRadiusIcon, BorderWidthIcon } from "@/components/ui-kit/Icon";
import { zodResolver } from "@hookform/resolvers/zod";
import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Editor } from "@tiptap/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FormHeader } from "../../components/Editor/TemplateEditor/SideBar/FormHeader";
import { TextInput } from "../../components/TextInput/TextInput";
import { useNodeAttributes } from "../../hooks";
import { getFlattenedVariables } from "../../utils/getFlattenedVariables";
import { defaultButtonProps } from "./Button";
import { buttonSchema } from "./Button.types";
import {
  ButtonAlignCenterIcon,
  ButtonAlignLeftIcon,
  ButtonAlignRightIcon,
  ButtonSizeDefaultIcon,
  ButtonSizeFullIcon,
} from "./ButtonIcon";

type ButtonFormProps = {
  element?: ProseMirrorNode;
  editor: Editor | null;
};

export const ButtonForm = ({ element, editor }: ButtonFormProps) => {
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

  // Get variables from editor storage
  const variables =
    editor?.extensionManager.extensions.find((ext) => ext.name === "variableSuggestion")?.options
      ?.variables || {};

  const variableKeys = getFlattenedVariables(variables);

  if (!element) {
    return null;
  }

  return (
    <Form {...form}>
      <FormHeader type="button" />
      <form
        onChange={() => {
          updateNodeAttributes(form.getValues());
        }}
      >
        <h4 className="courier-text-sm courier-font-medium courier-mb-3">Link</h4>
        <FormField
          control={form.control}
          name="link"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <TextInput
                  as="Textarea"
                  {...field}
                  variables={variableKeys}
                  onChange={(e) => {
                    field.onChange(e);
                    updateNodeAttributes({
                      ...form.getValues(),
                      link: e.target.value,
                    });
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Divider className="courier-mt-6 courier-mb-4" />
        <h4 className="courier-text-sm courier-font-medium courier-mb-3">Text</h4>
        <FormField
          control={form.control}
          name="label"
          render={({ field }) => (
            <FormItem className="courier-mb-2">
              <FormControl>
                <TextInput
                  {...field}
                  variables={variableKeys}
                  onChange={(e) => {
                    field.onChange(e);
                    updateNodeAttributes({
                      ...form.getValues(),
                      label: e.target.value,
                    });
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="textColor"
          render={({ field }) => (
            <FormItem className="courier-mb-4">
              <FormControl>
                <InputColor
                  {...field}
                  defaultValue={defaultButtonProps.textColor}
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
        <div className="courier-flex courier-flex-row courier-gap-6">
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
                  >
                    <ToggleGroupItem value="left">
                      <ButtonAlignLeftIcon />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="center">
                      <ButtonAlignCenterIcon />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="right">
                      <ButtonAlignRightIcon />
                    </ToggleGroupItem>
                  </ToggleGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="size"
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
                        size: value,
                      });
                    }}
                  >
                    <ToggleGroupItem value="default">
                      <ButtonSizeDefaultIcon />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="full">
                      <ButtonSizeFullIcon />
                    </ToggleGroupItem>
                  </ToggleGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Divider className="courier-mt-6 courier-mb-4" />
        <h4 className="courier-text-sm courier-font-medium courier-mb-3">Border</h4>
        <div className="courier-flex courier-flex-row courier-gap-3 courier-mb-3">
          <FormField
            control={form.control}
            name="borderWidth"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input startAdornment={<BorderWidthIcon />} type="number" min={0} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
        </div>
        <FormField
          control={form.control}
          name="borderColor"
          render={({ field }) => (
            <FormItem className="courier-mb-4">
              <FormControl>
                <InputColor
                  {...field}
                  defaultValue={defaultButtonProps.borderColor}
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
      </form>
    </Form>
  );
};
