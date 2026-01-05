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
import { zodResolver } from "@hookform/resolvers/zod";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { Editor } from "@tiptap/react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { useNodeAttributes } from "../../hooks";
import { FormHeader } from "../../ui/FormHeader";
// import {
//   ButtonSizeDefaultIcon,
//   ButtonSizeFullIcon,
// } from "../Button/ButtonIcon";
import { defaultDividerProps } from "./Divider";
import { dividerSchema } from "./Divider.types";
// import { BorderRadiusIcon, BorderWidthIcon, PaddingVerticalIcon } from "@/components/ui-kit/Icon";
import { BorderWidthIcon, PaddingVerticalIcon } from "@/components/ui-kit/Icon";

interface DividerFormProps {
  element?: ProseMirrorNode;
  editor: Editor | null;
  hideCloseButton?: boolean;
}

export const DividerForm = ({ element, editor, hideCloseButton = false }: DividerFormProps) => {
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

  const variant = form.watch("variant");

  return (
    <Form {...form}>
      <FormHeader type={variant} hideCloseButton={hideCloseButton} />
      <form
        onChange={() => {
          updateNodeAttributes(form.getValues());
        }}
      >
        <h4 className="courier-text-sm courier-font-medium courier-mb-3">Frame</h4>
        {/* <div className="grid grid-cols-2 gap-6"> */}
        <FormField
          control={form.control}
          name="padding"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  startAdornment={<PaddingVerticalIcon />}
                  type="number"
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    updateNodeAttributes({
                      ...form.getValues(),
                      margin: e.target.value,
                    });
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* <FormField
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
          /> */}
        {/* </div> */}

        {variant === "divider" && (
          <>
            <Divider className="courier-mt-6 courier-mb-4" />
            <h4 className="courier-text-sm courier-font-medium courier-mb-3">Line</h4>
            {/* <div className="grid grid-cols-2 gap-3"> */}
            <FormField
              control={form.control}
              name="size"
              render={({ field }) => (
                <FormItem className="courier-mb-4">
                  <FormControl>
                    <Input
                      startAdornment={<BorderWidthIcon />}
                      type="number"
                      min={0}
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        updateNodeAttributes({
                          ...form.getValues(),
                          width: e.target.value,
                        });
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* <FormField
                control={form.control}
                name="radius"
                render={({ field }) => (
                  <FormItem className="courier-mb-4">
                    <FormControl>
                      <Input startAdornment={<BorderRadiusIcon />} type="number" min={0} {...field} onChange={(e) => {
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
              /> */}
            {/* </div> */}
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem className="courier-mb-4">
                  <FormControl>
                    <InputColor
                      {...field}
                      defaultValue={defaultDividerProps.color}
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
          </>
        )}
      </form>
    </Form>
  );
};
