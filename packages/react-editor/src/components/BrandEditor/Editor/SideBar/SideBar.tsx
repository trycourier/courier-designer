import {
  Button,
  Divider,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  Switch,
  FormMessage,
  Input,
  InputColor,
} from "@/components/ui-kit";
import {
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  MediumIcon,
  XIcon,
} from "@/components/ui-kit/Icon";
import { getFlattenedVariables } from "@/components/utils/getFlattenedVariables";
import { cn, convertTiptapToElemental, type TiptapDoc } from "@/lib/utils";
import { MAX_IMAGE_DIMENSION, resizeImage } from "@/lib/utils/image";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Editor } from "@tiptap/react";
import { ArrowUp } from "lucide-react";
import { useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { TextInput } from "../../../ui/TextInput";
import type { BrandEditorFormValues } from "../../BrandEditor.types";
import { brandEditorSchema, defaultBrandEditorFormValues } from "../../BrandEditor.types";
import { BrandEditorContentAtom } from "../../store";
import { useSetAtom } from "jotai";

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

export const SideBar = ({
  editor,
  setForm,
  currentForm,
}: {
  editor: Editor;
  setForm: (form: BrandEditorFormValues) => void;
  currentForm?: BrandEditorFormValues;
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const setBrandEditorContent = useSetAtom(BrandEditorContentAtom);

  const form = useForm<BrandEditorFormValues>({
    resolver: zodResolver(brandEditorSchema),
    defaultValues: currentForm || defaultBrandEditorFormValues,
  });

  useEffect(() => {
    if (currentForm) {
      form.reset(currentForm);
    }
  }, [currentForm, form]);

  const onFormChange = useCallback(() => {
    const values = form.getValues();
    if (setForm) {
      setForm(values);
    }
  }, [form, setForm]);

  const handlePreferencesChange = useCallback(
    (status: boolean) => {
      if (status) {
        editor
          .chain()
          .focus()
          .insertContent({ type: "paragraph", content: [] })
          .insertContent("Manage Preferences")
          .setLink({ href: "http://google.com/" })
          .run();
      } else {
        const content = editor.getJSON();
        const paragraphs = content.content?.filter((node) => node.type === "paragraph") || [];

        if (paragraphs.length >= 2) {
          const contentWithoutLastParagraph = content.content?.slice(0, -1) || [];
          editor
            .chain()
            .focus()
            .setContent({ type: "doc", content: contentWithoutLastParagraph })
            .run();
        }
      }

      setTimeout(() => {
        const newContent = convertTiptapToElemental(editor.getJSON() as TiptapDoc);
        setBrandEditorContent(newContent);
      }, 100);
    },
    [editor, setBrandEditorContent]
  );

  const variables =
    editor?.extensionManager.extensions.find((ext) => ext.name === "variableSuggestion")?.options
      ?.variables || {};

  const variableKeys = getFlattenedVariables(variables);

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
                        setForm({ ...form.getValues(), headerStyle: "plain" });
                      }}
                      value="plain"
                    />
                    <HeaderStyle
                      isActive={field.value === "border"}
                      onClick={() => {
                        field.onChange("border");
                        setForm({ ...form.getValues(), headerStyle: "border" });
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
                  setForm({ ...values });
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
              accept="image/*"
              className="courier-hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  try {
                    const { dataUrl } = await resizeImage(file, MAX_IMAGE_DIMENSION);
                    const values = form.getValues();
                    values.logo = dataUrl;
                    form.reset(values);
                    setForm({ ...values });
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
                    variables={variableKeys}
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
                    variables={variableKeys}
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

          <h4 className="courier-text-sm courier-font-medium courier-mb-3">Text color</h4>
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

          <h4 className="courier-text-sm courier-font-medium courier-mb-3">Subtle color</h4>
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
          />
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
                      field.onChange(status);
                      handlePreferencesChange(status);
                      onFormChange();
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
