import { brandEditorAtom } from "@/components/TemplateEditor/store";
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
  Switch,
} from "@/components/ui-kit";
import {
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  MediumIcon,
  XIcon,
} from "@/components/ui-kit/Icon";
import { cn } from "@/lib/utils";
import type { TiptapDoc } from "@/lib/utils";
import { MAX_IMAGE_DIMENSION, resizeImage } from "@/lib/utils/image";
import { convertTiptapToMarkdown } from "@/lib/utils/convertTiptapToMarkdown/convertTiptapToMarkdown";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { ArrowUp } from "lucide-react";
import { memo, useCallback, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { TextInput } from "../../../ui/TextInput";
import type { BrandEditorFormValues } from "../../BrandEditor.types";
import { brandEditorSchema, defaultBrandEditorFormValues } from "../../BrandEditor.types";
import { BrandEditorFormAtom, BrandEditorContentAtom } from "../../store";

const HeaderStyle = ({
  isActive,
  onClick,
  value,
}: {
  isActive?: boolean;
  onClick?: () => void;
  value?: string;
}) => {
  return (
    <div
      className={cn(
        "courier-w-full courier-h-16 courier-rounded-md courier-border-border courier-border courier-overflow-hidden courier-bg-secondary courier-cursor-pointer",
        isActive && "!courier-border-[#3B82F6]"
      )}
      onClick={onClick}
    >
      <div className="courier-h-full courier-m-2 courier-rounded-md courier-border-border courier-border courier-shadow-md courier-bg-background courier-overflow-hidden">
        {value === "border" && <div className="courier-w-full courier-bg-[#000000] courier-h-1" />}
      </div>
    </div>
  );
};

export const SideBarComponent = () => {
  const [brandEditorForm, setBrandEditorForm] = useAtom(BrandEditorFormAtom);
  const setBrandEditorContent = useSetAtom(BrandEditorContentAtom);
  const brandEditor = useAtomValue(brandEditorAtom);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const form = useForm<BrandEditorFormValues>({
    resolver: zodResolver(brandEditorSchema),
    defaultValues: {
      ...defaultBrandEditorFormValues,
      ...brandEditorForm,
    },
    mode: "onChange",
  });

  useEffect(() => {
    if (brandEditorForm) {
      form.reset(brandEditorForm);
    }
  }, [brandEditorForm, form]);

  const onFormChange = useCallback(() => {
    setBrandEditorForm(form.getValues());
  }, [form, setBrandEditorForm]);

  const handlePreferencesChange = useCallback(
    (status: boolean) => {
      if (!brandEditor) {
        return;
      }
      if (status) {
        const content = brandEditor.getJSON();
        const newContent = {
          type: "doc",
          content: [
            ...(content.content || []),
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Manage Notification Preferences",
                  marks: [
                    {
                      type: "link",
                      attrs: {
                        href: "{{urls.preferences}}",
                      },
                    },
                  ],
                },
              ],
            },
          ],
        };

        brandEditor.chain().focus().setContent(newContent).run();
      } else {
        const content = brandEditor.getJSON();

        // Filter out any paragraph that contains the preferences URL
        const filteredContent =
          content.content?.filter((node) => {
            if (node.type !== "paragraph") return true;

            const hasPreferencesLink = node.content?.some(
              (textNode) =>
                textNode.type === "text" &&
                textNode.marks?.some(
                  (mark) => mark.type === "link" && mark.attrs?.href === "{{urls.preferences}}"
                )
            );

            return !hasPreferencesLink;
          }) || [];

        brandEditor.chain().focus().setContent({ type: "doc", content: filteredContent }).run();
      }

      // Explicitly update the content atom to ensure autosave works
      setBrandEditorContent(convertTiptapToMarkdown(brandEditor.getJSON() as TiptapDoc));
    },
    [brandEditor, setBrandEditorContent]
  );

  return (
    <Form {...form}>
      <form onChange={() => onFormChange()}>
        <div className="courier-pb-6">
          <h4 className="courier-text-sm courier-font-medium courier-mb-3">Header style</h4>
          <FormField
            control={form.control}
            name="headerStyle"
            render={({ field }) => (
              <FormItem className="courier-mb-4">
                <FormControl>
                  <div className="courier-w-full courier-flex courier-flex-row courier-gap-3">
                    <HeaderStyle
                      isActive={field.value === "plain"}
                      onClick={() => {
                        field.onChange("plain");
                        setBrandEditorForm({ ...form.getValues(), headerStyle: "plain" });
                      }}
                      value="plain"
                    />
                    <HeaderStyle
                      isActive={field.value === "border"}
                      onClick={() => {
                        field.onChange("border");
                        setBrandEditorForm({ ...form.getValues(), headerStyle: "border" });
                      }}
                      value="border"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Divider className="courier-mb-4" />
          <h4 className="courier-text-sm courier-font-medium courier-mb-3">Logo</h4>
          <div className="courier-flex courier-flex-row courier-gap-3 courier-mb-3">
            {form.getValues().logo ? (
              <Button
                onClick={() => {
                  const values = form.getValues();
                  values.logo = "";
                  form.reset(values);
                  setBrandEditorForm({ ...values });
                  // Reset the file input
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                  onFormChange();
                }}
                className="courier-w-full"
                variant="outline"
                type="button"
              >
                Remove logo
              </Button>
            ) : (
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                    fileInputRef.current.click();
                  }
                }}
                className="courier-w-full"
                variant="outline"
                type="button"
              >
                <ArrowUp
                  strokeWidth={1.25}
                  className="courier-w-4 courier-h-4 courier-mr-2 courier-text-foreground"
                />
                Upload logo
              </Button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/gif, image/webp"
              className="courier-hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  try {
                    const { dataUrl } = await resizeImage(file, MAX_IMAGE_DIMENSION);
                    const values = form.getValues();
                    values.logo = dataUrl;
                    form.reset(values);
                    setBrandEditorForm({ ...values });
                  } catch (error) {
                    console.error("Error processing image:", error);
                  }
                }
                // Always reset the input
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
              }}
            />
          </div>
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
                    onChange={(value) => {
                      field.onChange(value);
                      onFormChange();
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* <FormField
            control={form.control}
            name="alt"
            render={({ field }) => (
              <FormItem className="courier-mb-4">
                <FormControl>
                  <TextInput
                    as="Textarea"
                    {...field}
                    placeholder="Alt text..."
                    onChange={(value) => {
                      field.onChange(value);
                      onFormChange();
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          /> */}
          <Divider className="courier-mb-4" />

          <h4 className="courier-text-sm courier-font-medium courier-mb-3">Brand color</h4>
          <FormField
            control={form.control}
            name="brandColor"
            render={({ field }) => (
              <FormItem className="courier-mb-4">
                <FormControl>
                  <InputColor
                    {...field}
                    defaultValue={field.value}
                    onChange={(value) => {
                      field.onChange(value);
                      onFormChange();
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* <h4 className="courier-text-sm courier-font-medium courier-mb-3">Secondary color</h4>
          <FormField
            control={form.control}
            name="textColor"
            render={({ field }) => (
              <FormItem className="courier-mb-4">
                <FormControl>
                  <InputColor
                    {...field}
                    defaultValue={field.value}
                    onChange={(value) => {
                      field.onChange(value);
                      onFormChange();
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <h4 className="courier-text-sm courier-font-medium courier-mb-3">Tertiary color</h4>
          <FormField
            control={form.control}
            name="subtleColor"
            render={({ field }) => (
              <FormItem className="courier-mb-4">
                <FormControl>
                  <InputColor
                    {...field}
                    defaultValue={field.value}
                    onChange={(value) => {
                      field.onChange(value);
                      onFormChange();
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          /> */}
          <Divider className="courier-mb-4" />
          <h4 className="courier-text-sm courier-font-medium courier-mb-3">Footer links</h4>
          <div className="courier-flex courier-flex-col courier-gap-3 courier-mb-3">
            <FormField
              control={form.control}
              name="facebookLink"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      startAdornment={<FacebookIcon />}
                      placeholder="facebook.com/username"
                      {...field}
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="linkedinLink"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      startAdornment={<LinkedinIcon />}
                      placeholder="linkedin.com/username"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="instagramLink"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      startAdornment={<InstagramIcon />}
                      placeholder="instagram.com/username"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="mediumLink"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      startAdornment={<MediumIcon />}
                      placeholder="medium.com/username"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="xLink"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input startAdornment={<XIcon />} placeholder="x.com/username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <Divider className="courier-mb-4" />
          <h4 className="courier-text-sm courier-font-medium courier-mb-3">Footer actions</h4>
          {/* <FormField
            control={form.control}
            name="isUnsubscribe"
            render={({ field }) => (
              <FormItem className="courier-flex courier-flex-row courier-items-center courier-gap-2 courier-mb-4">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="!courier-m-0">Unsubscribe</FormLabel>
                <FormMessage />
              </FormItem>
            )}
          /> */}
          <FormField
            control={form.control}
            name="isPreferences"
            render={({ field }) => (
              <FormItem className="courier-flex courier-flex-row courier-items-center courier-gap-2 courier-mb-4">
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={(status) => {
                      form.setValue("isPreferences", status);
                      field.onChange(status);
                      handlePreferencesChange(status);
                      const updatedValues = { ...form.getValues(), isPreferences: status };
                      setBrandEditorForm(updatedValues);
                    }}
                  />
                </FormControl>
                <FormLabel className="!courier-m-0">Manage Preferences</FormLabel>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </form>
    </Form>
  );
};

export const SideBar = memo(SideBarComponent);
