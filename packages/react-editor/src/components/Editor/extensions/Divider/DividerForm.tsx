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
import { useNodeAttributes } from "../../hooks";
import {
  ButtonSizeDefaultIcon,
  ButtonSizeFullIcon,
} from "../Button/ButtonIcon";
import { defaultDividerProps } from "./Divider";
import { dividerSchema } from "./Divider.types";

type DividerFormProps = {
  element?: ProseMirrorNode;
  editor: Editor | null;
};

export const DividerForm = ({ element, editor }: DividerFormProps) => {
  const form = useForm<z.infer<typeof dividerSchema>>({
    resolver: zodResolver(dividerSchema),
    defaultValues: {
      ...defaultDividerProps,
      ...(element?.attrs as z.infer<typeof dividerSchema>),
    },
  });

  const { updateNodeAttributes } = useNodeAttributes({
    editor,
    element,
    form,
    nodeType: "divider",
  });

  if (!element) {
    return null;
  }

  return (
    <Form {...form}>
      <SideBarFormHeader title="Divider" />
      <form
        onChange={() => {
          updateNodeAttributes(form.getValues());
        }}
      >
        <div className="grid grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="margin"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Margin</FormLabel>
                <FormControl>
                  <Input type="number" {...field} onChange={(e) => {
                    field.onChange(e);
                    updateNodeAttributes({
                      ...form.getValues(),
                      margin: e.target.value
                    });
                  }} />
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
                    className="justify-start"
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      updateNodeAttributes({
                        ...form.getValues(),
                        size: value
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
        <Divider className="-mx-3 mt-6 mb-4" />
        <FormField
          control={form.control}
          name="color"
          render={({ field }) => (
            <FormItem className="mb-4">
              <FormLabel>Color</FormLabel>
              <FormControl>
                <InputColor {...field} defaultValue={defaultDividerProps.color} onChange={(value) => {
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
        <div className="grid grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="width"
            render={({ field }) => (
              <FormItem className="mb-4">
                <FormLabel>Width (px)</FormLabel>
                <FormControl>
                  <Input type="number" min={0} {...field} onChange={(e) => {
                    field.onChange(e);
                    updateNodeAttributes({
                      ...form.getValues(),
                      width: e.target.value
                    });
                  }} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="radius"
            render={({ field }) => (
              <FormItem className="mb-4">
                <FormLabel>Border Radius</FormLabel>
                <FormControl>
                  <Input type="number" min={0} {...field} onChange={(e) => {
                    field.onChange(e);
                    updateNodeAttributes({
                      ...form.getValues(),
                      radius: e.target.value
                    });
                  }} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </form>
    </Form>
  );
};
