import { zodResolver } from "@hookform/resolvers/zod";

import type { BrandEditorFormValues } from "../BrandEditor.types";
import { defaultBrandEditorFormValues, brandEditorSchema } from "../BrandEditor.types";
import { useCallback } from "react";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui-kit";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui-kit/Input";
import { FacebookIcon } from "@/components/ui-kit/Icon";
import { BrandEditorFormAtom } from "../store";
import { useAtom } from "jotai";

export const Test = () => {
  const [brandEditorForm, setBrandEditorForm] = useAtom(BrandEditorFormAtom);
  const form = useForm<BrandEditorFormValues>({
    resolver: zodResolver(brandEditorSchema),
    defaultValues: brandEditorForm ?? defaultBrandEditorFormValues,
    mode: "onChange",
  });

  const onFormChange = useCallback(() => {
    const values = form.getValues();
    setBrandEditorForm(values);
  }, [form, setBrandEditorForm]);

  return (
    <Form {...form}>
      <form onChange={() => onFormChange()}>
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
      </form>
    </Form>
  );
};
