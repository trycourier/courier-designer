import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useCallback, useRef } from "react";

import {
  Divider,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  ToggleGroup,
  ToggleGroupItem,
  Button,
  ArrowUpIcon,
} from "@/components/ui-kit";
import { imageBlockSchema } from "../ImageBlock.types";
import { Editor } from "@tiptap/react";
import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import {
  ButtonAlignCenterIcon,
  ButtonAlignLeftIcon,
  ButtonAlignRightIcon,
  ButtonSizeDefaultIcon,
  ButtonSizeFullIcon,
} from "../../Button/ButtonIcon";

type ImageBlockFormProps = {
  element?: ProseMirrorNode;
  editor: Editor | null;
};

const defaultValues = {
  sourcePath: "",
  link: "",
  alt: "",
  alignment: "center",
  size: "default",
  width: 500,
  borderWidth: 0,
  borderRadius: 0,
  borderColor: "#ffffff",
};

export const ImageBlockForm = ({ element, editor }: ImageBlockFormProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const form = useForm<z.infer<typeof imageBlockSchema>>({
    resolver: zodResolver(imageBlockSchema),
    defaultValues: {
      ...defaultValues,
      ...(element?.attrs as z.infer<typeof imageBlockSchema>),
    },
  });

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && element?.type) {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          form.setValue("sourcePath", result);
          editor?.commands.updateAttributes(element.type, {
            ...form.getValues(),
            sourcePath: result,
          });
        };
        reader.readAsDataURL(file);
      }
    },
    [editor, element?.type, form]
  );

  const handleSourcePathChange = useCallback(
    (value: string) => {
      if (element?.type) {
        form.setValue("sourcePath", value);
        editor?.commands.updateAttributes(element.type, {
          ...form.getValues(),
          sourcePath: value,
        });
      }
    },
    [editor, element?.type, form]
  );

  if (!element) {
    return null;
  }

  return (
    <Form {...form}>
      <p>Image</p>
      <div>
        <Button
          onClick={handleUploadClick}
          className="w-full"
          variant="outline"
        >
          Upload
          <ArrowUpIcon className="w-4 h-4 mr-2" />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
      <form
        onChange={() => {
          editor?.commands.updateAttributes(element.type, form.getValues());
        }}
      >
        <FormField
          control={form.control}
          name="sourcePath"
          render={({ field }) => (
            <FormItem className="mb-4">
              <FormLabel>Image source path</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder=""
                  onChange={(e) => handleSourcePathChange(e.target.value)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Divider className="-mx-3 mt-6 mb-4" />
        <FormField
          control={form.control}
          name="link"
          render={({ field }) => (
            <FormItem className="mb-4">
              <FormLabel>Link (optional)</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="alt"
          render={({ field }) => (
            <FormItem className="mb-4">
              <FormLabel>Alt text</FormLabel>
              <FormControl>
                <Input {...field} />
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
                      <ButtonAlignLeftIcon className="h-4 w-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="center">
                      <ButtonAlignCenterIcon className="h-4 w-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="right">
                      <ButtonAlignRightIcon className="h-4 w-4" />
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
                      <ButtonSizeDefaultIcon className="h-4 w-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="full">
                      <ButtonSizeFullIcon className="h-4 w-4" />
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
          name="width"
          render={({ field }) => (
            <FormItem className="mb-4">
              <FormLabel>Image width (px)</FormLabel>
              <FormControl>
                <Input type="number" min={0} max={100} {...field} />
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
                <Input type="color" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
};
