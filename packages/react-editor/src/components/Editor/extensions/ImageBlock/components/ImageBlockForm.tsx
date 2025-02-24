import {
  Button,
  Divider,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  Input,
  InputColor,
  TabsTrigger,
  Tabs,
  ToggleGroup,
  ToggleGroupItem,
  TabsList,
  TabsContent,
  Slider,
} from "@/components/ui-kit";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { Editor } from "@tiptap/react";
import { useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { FormHeader } from "../../../components/SideBar/FormHeader";
import { TextInput } from "@/components/Editor/components/TextInput";
import { useNodeAttributes } from "@/components/Editor/hooks";
import { getFlattenedVariables } from "@/components/Editor/utils/getFlattenedVariables";
import {
  ButtonAlignCenterIcon,
  ButtonAlignLeftIcon,
  ButtonAlignRightIcon,
} from "../../Button/ButtonIcon";
import { defaultImageProps } from "../ImageBlock";
import { imageBlockSchema } from "../ImageBlock.types";
import { ArrowUp } from "lucide-react";
import { BorderRadiusIcon, BorderWidthIcon } from "@/components/ui-kit/Icon";

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
      <FormHeader type="image" />

      <form
        onChange={() => {
          updateNodeAttributes(form.getValues());
        }}
      >
        <h4 className="text-sm font-medium mb-3">Image</h4>
        <Tabs defaultValue="file" className="mb-3 w-full">
          <TabsList className="w-full flex justify-stretch mb-3">
            <TabsTrigger value="file" className="flex-1">From file</TabsTrigger>
            <TabsTrigger value="url" className="flex-1">From URL</TabsTrigger>
          </TabsList>
          <TabsContent value="file">
            <Button
              onClick={handleUploadClick}
              className="w-full"
              variant="outline"
            >
              <ArrowUp strokeWidth={1.25} className="w-4 h-4 ml-2 text-foreground" />
              Upload image
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </TabsContent>
          <TabsContent value="url">
            <FormField
              control={form.control}
              name="sourcePath"
              render={({ field }) => (
                <FormItem className="mb-3">
                  <FormControl>
                    <TextInput
                      as="Textarea"
                      {...field}
                      autoResize
                      className="max-h-[88px]"
                      variables={variableKeys}
                      onChange={(e) => handleSourcePathChange(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>
        </Tabs>
        <FormField
          control={form.control}
          name="link"
          render={({ field }) => (
            <FormItem className="mb-3">
              <FormControl>
                <TextInput
                  as="Textarea"
                  placeholder="Link"
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
              <FormControl>
                <TextInput
                  as="Textarea"
                  {...field}
                  placeholder="Alt text..."
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
        <Divider className="mt-6 mb-4" />
        <h4 className="text-sm font-medium mb-3">Width</h4>
        <ToggleGroup
          type="single"
          // value={field.value}
          // onValueChange={(value) => {
          //   field.onChange(value);
          //   updateNodeAttributes({
          //     ...form.getValues(),
          //     alignment: value
          //   });
          // }}
          className="w-full border rounded-md border-border p-0.5 mb-3 shadow-sm"
        >
          <ToggleGroupItem size="sm" value="left" className="w-full h-7">
            Original
          </ToggleGroupItem>
          <ToggleGroupItem size="sm" value="right" className="w-full h-7">
            Fill
          </ToggleGroupItem>
        </ToggleGroup>
        <FormField
          control={form.control}
          name="width"
          render={({ field }) => (
            <FormItem className="flex-1 mb-3">
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
        <FormItem className="flex-1 mb-3">
          <FormControl>
            <Slider
              min={0}
              max={100}
            // value={form.getValues().width}
            // onChange={(value) => {
            //   form.setValue("width", value);
            // }}
            />
          </FormControl>
          <FormMessage />
        </FormItem>

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
                      alignment: value
                    });
                  }}
                  className="w-full border rounded-md border-border p-0.5"
                >
                  <ToggleGroupItem size="sm" value="left" className="w-full">
                    <ButtonAlignLeftIcon className="h-4 w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem size="sm" value="center" className="w-full">
                    <ButtonAlignCenterIcon className="h-4 w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem size="sm" value="right" className="w-full">
                    <ButtonAlignRightIcon className="h-4 w-4" />
                  </ToggleGroupItem>
                </ToggleGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Divider className="mt-6 mb-4" />
        <h4 className="text-sm font-medium mb-3">Border</h4>
        <div className="flex flex-row gap-2 mb-4">
          <FormField
            control={form.control}
            name="borderWidth"
            render={({ field }) => (
              <FormItem>
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
                <FormControl>
                  <Input
                    startAdornment={<BorderRadiusIcon />}
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
