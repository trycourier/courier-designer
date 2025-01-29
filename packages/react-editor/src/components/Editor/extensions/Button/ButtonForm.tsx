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
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui-kit";
import { zodResolver } from "@hookform/resolvers/zod";
import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Editor } from "@tiptap/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { SideBarFormHeader } from "../../components/SideBarFormHeader";
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
  const variables = editor?.extensionManager.extensions.find(
    ext => ext.name === 'variableSuggestion'
  )?.options?.variables || {};

  const variableKeys = getFlattenedVariables(variables);

  if (!element) {
    return null;
  }

  return (
    <Form {...form}>
      <SideBarFormHeader title="Button" />
      <form
        onChange={() => {
          updateNodeAttributes(form.getValues());
        }}
      >
        <FormField
          control={form.control}
          name="label"
          render={({ field }) => (
            <FormItem className="mb-4">
              <FormLabel>Label</FormLabel>
              <FormControl>
                <TextInput {...field} variables={variableKeys} onChange={(e) => {
                  field.onChange(e);
                  updateNodeAttributes({
                    ...form.getValues(),
                    label: e.target.value
                  });
                }} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="link"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Link</FormLabel>
              <FormControl>
                <TextInput as="Textarea" {...field} variables={variableKeys} onChange={(e) => {
                  field.onChange(e);
                  updateNodeAttributes({
                    ...form.getValues(),
                    link: e.target.value
                  });
                }} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Divider className="-mx-3 mt-6 mb-4" />
        <FormField
          control={form.control}
          name="margin"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Margin</FormLabel>
              <FormControl>
                <Input type="number" min={0} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Divider className="-mx-3 mt-6 mb-4" />
        <div className="flex flex-row gap-6">
          <FormField
            control={form.control}
            name="alignment"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Alignment</FormLabel>
                <FormControl>
                  <ToggleGroup
                    type="single"
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      editor?.commands.updateAttributes(
                        element.type,
                        form.getValues()
                      );
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
                <FormLabel>Size</FormLabel>
                <FormControl>
                  <ToggleGroup
                    type="single"
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      editor?.commands.updateAttributes(
                        element.type,
                        form.getValues()
                      );
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
        <Divider className="-mx-3 mt-6 mb-4" />
        <FormField
          control={form.control}
          name="textColor"
          render={({ field }) => (
            <FormItem className="mb-4">
              <FormLabel>Text color</FormLabel>
              <FormControl>
                <InputColor {...field} defaultValue={defaultButtonProps.textColor} onChange={(value) => {
                  field.onChange(value);
                  updateNodeAttributes({
                    ...form.getValues(),
                    [field.name]: value
                  });
                }} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="backgroundColor"
          render={({ field }) => (
            <FormItem className="mb-4">
              <FormLabel>Background color</FormLabel>
              <FormControl>
                <InputColor {...field} defaultValue={defaultButtonProps.backgroundColor} onChange={(value) => {
                  field.onChange(value);
                  updateNodeAttributes({
                    ...form.getValues(),
                    [field.name]: value
                  });
                }} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Divider className="-mx-3 mt-6 mb-4" />
        <div className="flex flex-row gap-2 mb-4">
          <FormField
            control={form.control}
            name="borderWidth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Border (px)</FormLabel>
                <FormControl>
                  <Input type="number" min={0} {...field} />
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
                <FormLabel>Border radius</FormLabel>
                <FormControl>
                  <Input type="number" min={0} {...field} />
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
            <FormItem className="mb-4">
              <FormLabel>Border color</FormLabel>
              <FormControl>
                <InputColor {...field} defaultValue={defaultButtonProps.borderColor} onChange={(value) => {
                  field.onChange(value);
                  updateNodeAttributes({
                    ...form.getValues(),
                    [field.name]: value
                  });
                }} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
};
