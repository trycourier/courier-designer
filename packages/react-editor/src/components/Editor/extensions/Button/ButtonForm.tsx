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

const defaultValues = {
  label: "click me",
  link: "",
  alignment: "left",
  size: "default",
  backgroundColor: "#000000",
  textColor: "#ffffff",
  borderWidth: 0,
  borderRadius: 0,
  borderColor: "#000000",
};

export const ButtonForm = ({ element, editor }: ButtonFormProps) => {
  const form = useForm<z.infer<typeof buttonSchema>>({
    resolver: zodResolver(buttonSchema),
    defaultValues: {
      ...defaultValues,
      ...(element?.attrs as z.infer<typeof buttonSchema>),
    },
  });

  if (!element) {
    return null;
  }

  return (
    <Form {...form}>
      <p>Button</p>
      <form
        onChange={() => {
          editor?.commands.updateAttributes(element.type, form.getValues());
        }}
      >
        <FormField
          control={form.control}
          name="label"
          render={({ field }) => (
            <FormItem className="mb-4">
              <FormLabel>Label</FormLabel>
              <FormControl>
                <Input placeholder="" {...field} />
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
                <Input placeholder="" type="number" {...field} />
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
          name="backgroundColor"
          render={({ field }) => (
            <FormItem className="mb-4">
              <FormLabel>Background Color</FormLabel>
              <FormControl>
                <InputColor {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="textColor"
          render={({ field }) => (
            <FormItem className="mb-4">
              <FormLabel>Text Color</FormLabel>
              <FormControl>
                <InputColor {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex flex-row gap-2 mb-4">
          <FormField
            control={form.control}
            name="borderWidth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Border (px)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="" min={0} {...field} />
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
                  <Input type="number" placeholder="" min={0} {...field} />
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
                <InputColor {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
};
