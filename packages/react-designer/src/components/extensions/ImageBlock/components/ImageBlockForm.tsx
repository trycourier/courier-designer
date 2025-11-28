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
  Slider,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui-kit";
import { BorderRadiusIcon, BorderWidthIcon } from "@/components/ui-kit/Icon";
// No need for error utilities - using direct error objects
import { zodResolver } from "@hookform/resolvers/zod";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { Editor } from "@tiptap/react";
import { useSetAtom } from "jotai";
import { ArrowUp } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { useNodeAttributes } from "../../../hooks";
import { templateErrorAtom } from "../../../Providers/store";
import { useImageUpload } from "../../../Providers/useImageUpload";
import { FormHeader } from "../../../ui/FormHeader";
import { TextInput } from "../../../ui/TextInput";
import { getFlattenedVariables } from "../../../utils/getFlattenedVariables";
import {
  ButtonAlignCenterIcon,
  ButtonAlignLeftIcon,
  ButtonAlignRightIcon,
} from "../../Button/ButtonIcon";
import { defaultImageProps } from "../ImageBlock";
import { imageBlockSchema } from "../ImageBlock.types";

export interface ImageBlockFormProps {
  element?: ProseMirrorNode;
  editor: Editor | null;
}

export const ImageBlockForm = ({ element, editor }: ImageBlockFormProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLFormElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [rawWidthInput, setRawWidthInput] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [imageNaturalWidth, setImageNaturalWidth] = useState<number>(
    element?.attrs?.imageNaturalWidth || 0
  );
  const [isUploading, setIsUploading] = useState(false);

  // Get the API configuration
  const setTemplateError = useSetAtom(templateErrorAtom);
  const { uploadImage } = useImageUpload();

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

  // Load image and update natural width if needed
  useEffect(() => {
    const sourcePath = element?.attrs?.sourcePath;
    if (sourcePath && !imageNaturalWidth) {
      const img = new Image();
      img.onload = () => {
        setImageNaturalWidth(img.naturalWidth);
        const updatedValues = {
          ...form.getValues(),
          imageNaturalWidth: img.naturalWidth,
        };

        form.setValue("imageNaturalWidth", img.naturalWidth);
        updateNodeAttributes(updatedValues);
      };
      img.src = sourcePath;
    }
  }, [element?.attrs?.sourcePath, imageNaturalWidth, form, updateNodeAttributes]);

  const calculateWidthPercentage = useCallback(
    (naturalWidth: number) => {
      // Get the editor's container width
      const editorContainer = editor?.view?.dom?.closest(".ProseMirror");
      const containerWidth = editorContainer?.clientWidth || 1000;

      if (!naturalWidth) {
        naturalWidth = imageNaturalWidth;
      }

      if (!naturalWidth) {
        return 0;
      }

      const percentage = Math.min(100, (naturalWidth / containerWidth) * 100);
      const roundedPercentage = Math.round(percentage);

      return roundedPercentage;
    },
    [editor, imageNaturalWidth]
  );

  const handleUploadClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); // Prevent form submission
    fileInputRef.current?.click();
  }, []);

  const handleImageLoad = useCallback(
    (img: HTMLImageElement, sourcePath: string) => {
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
        isUploading: false, // Clear uploading state when upload completes
      };

      updateNodeAttributes(updatedValues);
    },
    [form, updateNodeAttributes, calculateWidthPercentage]
  );

  const validateAndLoadImage = useCallback(
    (value: string) => {
      // If empty, clear the image
      if (!value) {
        form.setValue("imageNaturalWidth", 0);
        form.setValue("width", 0);
        updateNodeAttributes({
          ...form.getValues(),
          sourcePath: "",
          imageNaturalWidth: 0,
          width: 0,
        });
        return;
      }

      // Try to load the image
      const img = new Image();
      img.onload = () => {
        const widthPercentage = calculateWidthPercentage(img.naturalWidth);

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
      img.onerror = () => {
        // Silently fail - user might still be typing
        console.debug("Image failed to load:", value);
      };
      img.src = value;
    },
    [form, updateNodeAttributes, calculateWidthPercentage]
  );

  const handleSourcePathChange = useCallback(
    (value: string) => {
      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Debounce the image validation by 500ms
      debounceTimerRef.current = setTimeout(() => {
        validateAndLoadImage(value);
      }, 500);
    },
    [validateAndLoadImage]
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const variables =
    editor?.extensionManager.extensions.find((ext) => ext.name === "variableSuggestion")?.options
      ?.variables || {};

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
        <h4 className="courier-text-sm courier-font-medium courier-mb-3">Image</h4>
        <Tabs defaultValue="file" className="courier-mb-3 courier-w-full">
          <TabsList className="courier-w-full courier-flex courier-justify-stretch courier-mb-3">
            <TabsTrigger value="file" className="courier-flex-1">
              From file
            </TabsTrigger>
            <TabsTrigger value="url" className="courier-flex-1">
              From URL
            </TabsTrigger>
          </TabsList>
          <TabsContent value="file">
            <div className="courier-flex courier-flex-col courier-gap-2">
              <Button
                onClick={handleUploadClick}
                className="courier-w-full"
                variant="outline"
                type="button"
                disabled={isUploading}
              >
                {isUploading ? (
                  <>Uploading...</>
                ) : (
                  <>
                    <ArrowUp
                      strokeWidth={1.25}
                      className="courier-w-4 courier-h-4 courier-ml-2 courier-text-foreground"
                    />
                    Upload image
                  </>
                )}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/gif, image/webp"
                className="courier-hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setIsUploading(true);
                    // Clear existing image to show only loading spinner
                    form.setValue("sourcePath", "");
                    // Also update node attributes so ImageBlockComponent shows spinner
                    updateNodeAttributes({
                      ...form.getValues(),
                      sourcePath: "",
                      isUploading: true,
                    });

                    // First validate the image can be read
                    const reader = new FileReader();
                    reader.onload = async () => {
                      try {
                        // Upload the image to server
                        const uploadResult = await uploadImage({ file });
                        const imageUrl = uploadResult.url;

                        // Load the image to get dimensions
                        const img = new Image();
                        img.onload = () => {
                          handleImageLoad(img, imageUrl);
                          setIsUploading(false);
                        };
                        img.onerror = () => {
                          setTemplateError({
                            message: "Upload failed: Failed to load uploaded image",
                            toastProps: {
                              duration: 6000,
                              description: `File: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`,
                            },
                          });
                          setIsUploading(false);
                          // Clear uploading state in node attributes on error
                          updateNodeAttributes({
                            ...form.getValues(),
                            isUploading: false,
                          });
                        };
                        img.src = imageUrl;
                      } catch (error) {
                        console.error("Error uploading image:", error);
                        setTemplateError({
                          message: "Upload failed: Failed to upload image",
                          toastProps: {
                            duration: 6000,
                            description: `File: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`,
                          },
                        });
                        setIsUploading(false);
                        // Clear uploading state in node attributes on error
                        updateNodeAttributes({
                          ...form.getValues(),
                          isUploading: false,
                        });
                      }
                    };

                    reader.onerror = () => {
                      setTemplateError({
                        message: "Upload failed: Failed to read image file",
                        toastProps: {
                          duration: 6000,
                          description: `File: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`,
                        },
                      });
                      setIsUploading(false);
                      // Clear uploading state in node attributes on error
                      updateNodeAttributes({
                        ...form.getValues(),
                        isUploading: false,
                      });
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
                <FormItem className="courier-mb-3">
                  <FormControl>
                    <TextInput
                      as="Textarea"
                      {...field}
                      autoResize
                      className="courier-max-h-[88px]"
                      variables={variableKeys}
                      onChange={(e) => {
                        // Update the field immediately for visual feedback
                        field.onChange(e);
                        // Debounce the image validation
                        handleSourcePathChange(e.target.value);
                      }}
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
            <FormItem className="courier-mb-3">
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
                      link: e.target.value,
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
            <FormItem className="courier-mb-4">
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
                      alt: e.target.value,
                    });
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Divider className="courier-mt-6 courier-mb-4" />
        <h4 className="courier-text-sm courier-font-medium courier-mb-3">Width</h4>
        {(() => {
          const currentWidth = form.getValues().width;
          const formImageNaturalWidth = form.getValues().imageNaturalWidth;
          const originalWidth = calculateWidthPercentage(formImageNaturalWidth);
          const isOriginalWidth = currentWidth === originalWidth;
          const currentValue = isOriginalWidth ? "original" : "fill";

          return (
            <ToggleGroup
              type="single"
              value={sourcePath ? currentValue : "original"}
              onValueChange={(value) => {
                // If value is undefined (clicking same toggle) or same as current, do nothing
                if (!value || value === currentValue) return;

                const newWidth =
                  value === "fill" ? 100 : calculateWidthPercentage(formImageNaturalWidth);

                // Only update if we have a valid width
                if (newWidth > 0) {
                  form.setValue("width", newWidth);
                  updateNodeAttributes({
                    ...form.getValues(),
                    width: newWidth,
                  });
                }
              }}
              className="courier-w-full courier-border courier-rounded-md courier-border-border courier-p-0.5 courier-mb-3 courier-shadow-sm"
              disabled={!sourcePath}
            >
              <ToggleGroupItem size="sm" value="original" className="courier-w-full courier-h-7">
                Original
              </ToggleGroupItem>
              <ToggleGroupItem
                size="sm"
                value="fill"
                className="courier-w-full courier-h-7"
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
            <FormItem className="courier-flex-1 courier-mb-3">
              <FormControl>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min={1}
                  max={100}
                  {...field}
                  value={
                    !form.getValues().sourcePath
                      ? "0%"
                      : isEditing
                        ? rawWidthInput
                        : `${field.value}%`
                  }
                  className="courier-text-2xl courier-font-normal"
                  disabled={!form.getValues().sourcePath}
                  onFocus={(e) => {
                    setIsEditing(true);
                    setRawWidthInput(e.target.value);
                  }}
                  onChange={(e) => {
                    setRawWidthInput(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.currentTarget.blur();
                    }
                  }}
                  onBlur={(e) => {
                    setIsEditing(false);
                    const value = parseFloat(e.target.value.replace("%", ""));
                    if (!isNaN(value)) {
                      const clampedValue = Math.min(100, Math.max(1, value));
                      field.onChange(clampedValue);
                      updateNodeAttributes({
                        ...form.getValues(),
                        width: Math.round(clampedValue),
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
            <FormItem className="courier-flex-1 courier-mb-3">
              <FormControl>
                <Slider
                  min={0}
                  max={100}
                  value={[sourcePath ? field.value : 0]}
                  disabled={!sourcePath}
                  onValueChange={(value) => {
                    field.onChange(value[0]);
                    updateNodeAttributes({
                      ...form.getValues(),
                      width: value[0],
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
        <div className="courier-flex courier-flex-row courier-gap-3 courier-mb-3">
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
                      const value = parseInt(e.target.value) || 0;
                      field.onChange(value);
                      updateNodeAttributes({
                        ...form.getValues(),
                        borderWidth: value,
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
                      const value = parseInt(e.target.value) || 0;
                      field.onChange(value);
                      updateNodeAttributes({
                        ...form.getValues(),
                        borderRadius: value,
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
            <FormItem className="courier-mb-4">
              <FormControl>
                <InputColor
                  {...field}
                  disabled={!sourcePath}
                  defaultValue={defaultImageProps.borderColor}
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
