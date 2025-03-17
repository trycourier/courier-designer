import { getFlattenedVariables } from "@/components/CourierEditor/utils/getFlattenedVariables";
import { Button, Divider, Form, FormControl, FormField, FormItem, FormLabel, FormMessage, Input, InputColor, Switch } from "@/components/ui-kit";
import { FacebookIcon, InstagramIcon, LinkedinIcon, MediumIcon, XIcon } from "@/components/ui-kit/Icon";
import { zodResolver } from "@hookform/resolvers/zod";
import { Editor } from "@tiptap/react";
import { ArrowUp } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { TextInput } from "../../../TextInput";
import { cn } from "@/lib/utils";

const themeSchema = z.object({
  headerStyle: z.enum(["plain", "border"]),
  isUnsubscribe: z.boolean().optional(),
  isPreferences: z.boolean().optional(),
  link: z.string().optional(),
  alt: z.string().optional(),
  brandColor: z.string(),
  textColor: z.string(),
  subtleColor: z.string(),
  facebookLink: z.string().optional(),
  linkedinLink: z.string().optional(),
  instagramLink: z.string().optional(),
  mediumLink: z.string().optional(),
  xLink: z.string().optional(),
});

export type ThemeFormValues = z.infer<typeof themeSchema>;

const HeaderStyle = ({ isActive, onClick, value }: { isActive?: boolean, onClick?: () => void, value?: string }) => {
  return (
    <div className={cn("w-full h-16 rounded-md border-border border overflow-hidden bg-secondary cursor-pointer", isActive && "border-[#3B82F6]")} onClick={onClick}>
      <div className="h-full m-2 rounded-md border-border border shadow-md bg-background overflow-hidden">
        {value === "border" && <div className="w-full bg-[#000000] h-1" />}
      </div>
    </div>
  );
};

export const SideBar = ({ editor, setForm }: { editor: Editor, setForm: (form: ThemeFormValues) => void }) => {
  const form = useForm<ThemeFormValues>({
    resolver: zodResolver(themeSchema),
    defaultValues: {
      headerStyle: "plain",
      isUnsubscribe: false,
      isPreferences: false,
      link: "",
      alt: "",
      brandColor: "#000000",
      textColor: "#000000",
      subtleColor: "#737373",
      facebookLink: "",
      linkedinLink: "",
      instagramLink: "",
      mediumLink: "",
      xLink: "",
    },
  });

  // const onSubmit = (values: ThemeFormValues) => {
  //   // Handle form submission
  //   console.log(values);
  // };

  const variables = editor?.extensionManager.extensions.find(
    ext => ext.name === 'variableSuggestion'
  )?.options?.variables || {};

  const variableKeys = getFlattenedVariables(variables);

  return (
    <Form {...form}>
      {/* <form onChange={() => form.handleSubmit(onSubmit)()}> */}
      <form>
        <div className="pb-6">
          <h4 className="text-sm font-medium mb-3">Header style</h4>
          <FormField
            control={form.control}
            name="headerStyle"
            render={({ field }) => (
              <FormItem className="mb-4">
                <FormControl>
                  <div className="w-full flex flex-row gap-3">
                    <HeaderStyle isActive={field.value === "plain"} onClick={() => {
                      field.onChange("plain");
                      setForm({ ...form.getValues(), headerStyle: "plain" });
                    }} value="plain" />
                    <HeaderStyle isActive={field.value === "border"} onClick={() => {
                      field.onChange("border");
                      setForm({ ...form.getValues(), headerStyle: "border" });
                    }} value="border" />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Divider className="mb-4" />
          <h4 className="text-sm font-medium mb-3">Logo</h4>
          <div className="flex flex-row gap-3 mb-3">
            <Button
              // onClick={handleUploadClick}
              className="w-full"
              variant="outline"
              type="button"
            >
              <ArrowUp strokeWidth={1.25} className="w-4 h-4 ml-2 text-foreground" />
              Upload logo
            </Button>
            <input
              // ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
            // onChange={(e) => {
            //   const file = e.target.files?.[0];
            //   if (file) {
            //     const img = new Image();
            //     const reader = new FileReader();
            />
          </div>
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
                  // onChange={(e) => {
                  //   field.onChange(e);
                  //   updateNodeAttributes({
                  //     ...form.getValues(),
                  //     link: e.target.value
                  //   });
                  // }}
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
                  // onChange={(e) => {
                  //   field.onChange(e);
                  //   updateNodeAttributes({
                  //     ...form.getValues(),
                  //     alt: e.target.value
                  //   });
                  // }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Divider className="mb-4" />

          <h4 className="text-sm font-medium mb-3">Brand color</h4>
          <FormField
            control={form.control}
            name="brandColor"
            render={({ field }) => (
              <FormItem className="mb-4">
                <FormControl>
                  <InputColor {...field} defaultValue={field.value} onChange={(value) => {
                    field.onChange(value);
                  }} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <h4 className="text-sm font-medium mb-3">Text color</h4>
          <FormField
            control={form.control}
            name="textColor"
            render={({ field }) => (
              <FormItem className="mb-4">
                <FormControl>
                  <InputColor {...field} defaultValue={field.value} onChange={(value) => {
                    field.onChange(value);
                  }} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <h4 className="text-sm font-medium mb-3">Subtle color</h4>
          <FormField
            control={form.control}
            name="subtleColor"
            render={({ field }) => (
              <FormItem className="mb-4">
                <FormControl>
                  <InputColor {...field} defaultValue={field.value} onChange={(value) => {
                    field.onChange(value);
                  }} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Divider className="mb-4" />
          <h4 className="text-sm font-medium mb-3">Footer links</h4>
          <div className="flex flex-col gap-3 mb-3">
            <FormField
              control={form.control}
              name="facebookLink"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input startAdornment={<FacebookIcon />} placeholder="facebook.com/username" {...field} />
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
                    <Input startAdornment={<LinkedinIcon />} placeholder="linkedin.com/username" {...field} />
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
                    <Input startAdornment={<InstagramIcon />} placeholder="instagram.com/username" {...field} />
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
                    <Input startAdornment={<MediumIcon />} placeholder="medium.com/username" {...field} />
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
          <Divider className="mb-4" />
          <h4 className="text-sm font-medium mb-3">Footer actions</h4>
          <FormField
            control={form.control}
            name="isUnsubscribe"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center gap-2 mb-4">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="!m-0">Unsubscribe</FormLabel>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="isPreferences"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center gap-2 mb-4">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="!m-0">Preferences</FormLabel>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </form>
    </Form>
  );
};