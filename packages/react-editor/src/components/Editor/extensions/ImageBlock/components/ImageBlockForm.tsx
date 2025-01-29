import {
  Button,
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
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { Editor } from "@tiptap/react";
import { useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { SideBarFormHeader } from "../../../components/SideBarFormHeader";
import { TextInput } from "@/components/Editor/components/TextInput";
import { useNodeAttributes } from "@/components/Editor/hooks";
import { getFlattenedVariables } from "@/components/Editor/utils/getFlattenedVariables";
import {
  ButtonAlignCenterIcon,
  ButtonAlignLeftIcon,
  ButtonAlignRightIcon,
  ButtonSizeDefaultIcon,
  ButtonSizeFullIcon,
} from "../../Button/ButtonIcon";
import { defaultImageProps } from "../ImageBlock";
import { imageBlockSchema } from "../ImageBlock.types";
import { ArrowUp } from "lucide-react";

export interface ImageBlockFormProps {
  element?: ProseMirrorNode;
  editor: Editor | null;
}

export const ImageBlockForm = ({ element, editor }: ImageBlockFormProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const form = useForm<z.infer<typeof imageBlockSchema>>({
    resolver: zodResolver(imageBlockSchema),
    defaultValues: {
      ...defaultImageProps,
      ...(element?.attrs as z.infer<typeof imageBlockSchema>),
    },
  });

  const { updateNodeAttributes } = useNodeAttributes({
    editor,
    element,
    form,
    nodeType: "imageBlock",
  });

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          form.setValue("sourcePath", result);
          updateNodeAttributes({
            ...form.getValues(),
            sourcePath: result,
          });
        };
        reader.readAsDataURL(file);
      }
    },
    [form, updateNodeAttributes]
  );

  const handleSourcePathChange = useCallback(
    (value: string) => {
      form.setValue("sourcePath", value);
      updateNodeAttributes({
        ...form.getValues(),
        sourcePath: value,
      });
    },
    [form, updateNodeAttributes]
  );

  const variables = editor?.extensionManager.extensions.find(
    ext => ext.name === 'variableSuggestion'
  )?.options?.variables || {};

  const variableKeys = getFlattenedVariables(variables);

  if (!element) {
    return null;
  }

  return (
    <Form {...form}>
      <SideBarFormHeader title="Image" />
      <div>
        <Button
          onClick={handleUploadClick}
          className="w-full"
          variant="outline"
        >
          Upload
          <ArrowUp strokeWidth={1.25} className="w-4 h-4 mr-2 text-foreground" />
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
          updateNodeAttributes(form.getValues());
        }}
      >
        <FormField
          control={form.control}
          name="sourcePath"
          render={({ field }) => (
            <FormItem className="mb-4">
              <FormLabel>Image source path</FormLabel>
              <FormControl>
                <TextInput
                  as="Textarea"
                  {...field}
                  autoResize
                  variables={variableKeys}
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
                <TextInput
                  as="Textarea"
                  {...field}
                  variables={variableKeys}
                  onChange={(e) => {
                    field.onChange(e);
                    updateNodeAttributes({
                      ...form.getValues(),
                      link: e.target.value
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
          name="alt"
          render={({ field }) => (
            <FormItem className="mb-4">
              <FormLabel>Alt text</FormLabel>
              <FormControl>
                <TextInput
                  as="Textarea"
                  {...field}
                  variables={variableKeys}
                  onChange={(e) => {
                    field.onChange(e);
                    updateNodeAttributes({
                      ...form.getValues(),
                      alt: e.target.value
                    });
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Divider className="-mx-3 mt-6 mb-4" />
        <div className="flex flex-row gap-2 mb-4">
          <FormField
            control={form.control}
            name="width"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Image width</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      updateNodeAttributes({
                        ...form.getValues(),
                        width: e.target.value
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
            name="margin"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Margin</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      updateNodeAttributes({
                        ...form.getValues(),
                        margin: e.target.value
                      });
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
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
                      updateNodeAttributes({
                        ...form.getValues(),
                        alignment: value
                      });
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
                      updateNodeAttributes({
                        ...form.getValues(),
                        size: value
                      });
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
        <div className="flex flex-row gap-2 mb-4">
          <FormField
            control={form.control}
            name="borderWidth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Border (px)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      updateNodeAttributes({
                        ...form.getValues(),
                        borderWidth: e.target.value
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
            name="borderRadius"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Border radius</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      updateNodeAttributes({
                        ...form.getValues(),
                        borderRadius: e.target.value
                      });
                    }}
                  />
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
                <InputColor {...field} defaultValue={defaultImageProps.borderColor} onChange={(value) => {
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
