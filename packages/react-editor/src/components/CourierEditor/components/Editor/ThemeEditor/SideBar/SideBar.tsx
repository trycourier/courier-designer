import { getFlattenedVariables } from "@/components/CourierEditor/utils/getFlattenedVariables";
import {
  Button,
  Divider,
  Form,
  FormControl,
  FormField,
  FormItem,
  // FormLabel,
  FormMessage,
  Input,
  InputColor,
  // Switch,
} from "@/components/ui-kit";
import {
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  MediumIcon,
  XIcon,
} from "@/components/ui-kit/Icon";
import { cn } from "@/lib/utils";
import { MAX_IMAGE_DIMENSION, resizeImage } from "@/lib/utils/image";
import { zodResolver } from "@hookform/resolvers/zod";
import { Editor } from "@tiptap/react";
import { ArrowUp } from "lucide-react";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { TextInput } from "../../../TextInput";
import { defaultThemeEditorFormValues, ThemeEditorFormValues, themeEditorSchema } from "../ThemeEditor.types";

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
  setForm: (form: ThemeEditorFormValues) => void;
  currentForm?: ThemeEditorFormValues;
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const form = useForm<ThemeEditorFormValues>({
    resolver: zodResolver(themeEditorSchema),
    defaultValues: currentForm || defaultThemeEditorFormValues,
  });

  useEffect(() => {
    if (currentForm) {
      form.reset(currentForm);
    }
  }, [currentForm, form]);

  const onFormChange = () => {
    const values = form.getValues();
    if (setForm) {
      setForm(values);
    }
  };

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
          {/* <h4 className="courier-text-sm courier-font-medium courier-mb-3">Footer actions</h4>
          <FormField
            control={form.control}
            name="isUnsubscribe"
            render={({ field }) => (
              <FormItem className="courier-flex courier-flex-row courier-items-center courier-gap-2 courier-mb-4">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="courier-!courier-m-0">Unsubscribe</FormLabel>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="isPreferences"
            render={({ field }) => (
              <FormItem className="courier-flex courier-flex-row courier-items-center courier-gap-2 courier-mb-4">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="courier-!courier-m-0">Preferences</FormLabel>
                <FormMessage />
              </FormItem>
            )}
          /> */}
        </div>
      </form>
    </Form>
  );
};
