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
import { useCallback, useRef, useState } from "react";
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
  const containerRef = useRef<HTMLFormElement>(null);
  const [rawWidthInput, setRawWidthInput] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);

  const calculateWidthPercentage = useCallback((naturalWidth: number) => {
    // Get the editor's container width
    const editorContainer = editor?.view?.dom?.closest('.ProseMirror');
    const containerWidth = editorContainer?.clientWidth || 1000;
    const percentage = Math.min(100, (naturalWidth / containerWidth) * 100);

    // Round to integer
    const roundedPercentage = Math.round(percentage);

    return roundedPercentage;
  }, [editor]);

  const form = useForm<z.infer<typeof imageBlockSchema>>({
    resolver: zodResolver(imageBlockSchema),
    defaultValues: {
      ...defaultImageProps,
      ...(element?.attrs as z.infer<typeof imageBlockSchema>),
    },
    mode: "onChange",
  });

  const { updateNodeAttributes } = useNodeAttributes({
    editor,
    element,
    form,
    nodeType: "imageBlock",
  });

  const handleUploadClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); // Prevent form submission
    fileInputRef.current?.click();
  }, []);

  const handleImageLoad = useCallback((img: HTMLImageElement, sourcePath: string) => {
    // Always calculate the new width based on the uploaded image
    const calculatedWidth = calculateWidthPercentage(img.naturalWidth);

    // Update the raw input value to match the new width
    setRawWidthInput(`${calculatedWidth}%`);
    setIsEditing(false);

    form.setValue("sourcePath", sourcePath);
    form.setValue("imageNaturalWidth", img.naturalWidth);
    form.setValue("width", calculatedWidth);

    const updatedValues = {
      ...form.getValues(),
      sourcePath: sourcePath,
      width: calculatedWidth,
      imageNaturalWidth: img.naturalWidth,
    };

    updateNodeAttributes(updatedValues);
  }, [form, updateNodeAttributes, calculateWidthPercentage]);

  const handleSourcePathChange = useCallback(
    (value: string) => {
      if (!value) return;

      const img = new Image();
      img.onload = () => {
        const widthPercentage = calculateWidthPercentage(img.naturalWidth);

        form.setValue("sourcePath", value);
        form.setValue("imageNaturalWidth", img.naturalWidth);
        form.setValue("width", widthPercentage);

        const updatedValues = {
          ...form.getValues(),
          sourcePath: value,
          width: widthPercentage,
          imageNaturalWidth: img.naturalWidth,
        };

        updateNodeAttributes(updatedValues);
      };
      img.src = value;
    },
    [form, updateNodeAttributes, calculateWidthPercentage]
  );

  const variables = editor?.extensionManager.extensions.find(
    ext => ext.name === 'variableSuggestion'
  )?.options?.variables || {};

  const variableKeys = getFlattenedVariables(variables);
  const sourcePath = form.getValues().sourcePath;

  if (!element) {
    return null;
  }

  return (
    <Form {...form}>
      <FormHeader type="image" />

      <form
        ref={containerRef}
        onChange={() => {
          const values = form.getValues();
          updateNodeAttributes(values);
        }}
      >
        <h4 className="text-sm font-medium mb-3">Image</h4>
        <Tabs defaultValue="file" className="mb-3 w-full">
          <TabsList className="w-full flex justify-stretch mb-3">
            <TabsTrigger value="file" className="flex-1">From file</TabsTrigger>
            <TabsTrigger value="url" className="flex-1">From URL</TabsTrigger>
          </TabsList>
          <TabsContent value="file">
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleUploadClick}
                className="w-full"
                variant="outline"
                type="button"
              >
                <ArrowUp strokeWidth={1.25} className="w-4 h-4 ml-2 text-foreground" />
                Upload image
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const img = new Image();
                    const reader = new FileReader();

                    reader.onload = (event) => {
                      const result = event.target?.result as string;
                      img.onload = () => handleImageLoad(img, result);
                      img.src = result;
                    };

                    reader.readAsDataURL(file);
                  }
                }}
              />
            </div>
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
        {/* Calculate if we're at original width */}
        {(() => {
          const currentWidth = form.getValues().width;
          const originalWidth = calculateWidthPercentage(form.getValues().imageNaturalWidth);
          const isOriginalWidth = currentWidth === originalWidth;
          const currentValue = isOriginalWidth ? "original" : "fill";

          return (
            <ToggleGroup
              type="single"
              value={sourcePath ? currentValue : "original"}
              onValueChange={(value) => {
                // If value is undefined (clicking same toggle) or same as current, do nothing
                if (!value || value === currentValue) return;

                const newWidth = value === "fill" ? 100 : calculateWidthPercentage(form.getValues().imageNaturalWidth);
                form.setValue("width", newWidth);
                updateNodeAttributes({
                  ...form.getValues(),
                  width: newWidth
                });
              }}
              className="w-full border rounded-md border-border p-0.5 mb-3 shadow-sm"
              disabled={!sourcePath}
            >
              <ToggleGroupItem size="sm" value="original" className="w-full h-7">
                Original
              </ToggleGroupItem>
              <ToggleGroupItem
                size="sm"
                value="fill"
                className="w-full h-7"
                disabled={isOriginalWidth || !sourcePath}
              >
                Fill
              </ToggleGroupItem>
            </ToggleGroup>
          );
        })()}
        <FormField
          control={form.control}
          name="width"
          render={({ field }) => (
            <FormItem className="flex-1 mb-3">
              <FormControl>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min={1}
                  max={100}
                  {...field}
                  value={!form.getValues().sourcePath ? "0%" : (isEditing ? rawWidthInput : `${field.value}%`)}
                  className="text-2xl font-normal"
                  disabled={!form.getValues().sourcePath}
                  onFocus={(e) => {
                    setIsEditing(true);
                    setRawWidthInput(e.target.value);
                  }}
                  onChange={(e) => {
                    setRawWidthInput(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.currentTarget.blur();
                    }
                  }}
                  onBlur={(e) => {
                    setIsEditing(false);
                    const value = parseFloat(e.target.value.replace('%', ''));
                    if (!isNaN(value)) {
                      const clampedValue = Math.min(100, Math.max(1, value));
                      field.onChange(clampedValue);
                      updateNodeAttributes({
                        ...form.getValues(),
                        width: Math.round(clampedValue)
                      });
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="width"
          render={({ field }) => (
            <FormItem className="flex-1 mb-3">
              <FormControl>
                <Slider
                  min={1}
                  max={100}
                  value={[sourcePath ? field.value : 0]}
                  disabled={!sourcePath}
                  onValueChange={(value) => {
                    field.onChange(value[0]);
                    updateNodeAttributes({
                      ...form.getValues(),
                      width: value[0]
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
          name="alignment"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <ToggleGroup
                  disabled={!sourcePath}
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
                    disabled={!sourcePath}
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
                    disabled={!sourcePath}
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
                <InputColor {...field} disabled={!sourcePath} defaultValue={defaultImageProps.borderColor} onChange={(value) => {
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
