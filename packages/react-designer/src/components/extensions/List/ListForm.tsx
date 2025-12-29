import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Editor } from "@tiptap/core";
import type { Node } from "@tiptap/pm/model";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui-kit";
import { FormHeader } from "@/components/ui/FormHeader/FormHeader";
import { BulletListIcon, NumberedListIcon } from "@/components/ui-kit/Icon";
import { useNodeAttributes } from "@/components/hooks/useNodeAttributes";

const listFormSchema = z.object({
  listType: z.enum(["ordered", "unordered"]),
});

type ListFormValues = z.infer<typeof listFormSchema>;

interface ListFormProps {
  element: Node;
  editor: Editor | null;
}

export const ListForm = ({ element, editor }: ListFormProps) => {
  const form = useForm<ListFormValues>({
    resolver: zodResolver(listFormSchema),
    defaultValues: {
      listType: (element?.attrs?.listType as "ordered" | "unordered") || "unordered",
    },
  });

  const { updateNodeAttributes } = useNodeAttributes({
    editor,
    element,
    form,
    nodeType: "list",
  });

  if (!element) {
    return null;
  }

  return (
    <Form {...form}>
      <FormHeader type="list" />
      <form
        onChange={() => {
          updateNodeAttributes(form.getValues());
        }}
      >
        <h4 className="courier-text-sm courier-font-medium courier-mb-3">List Type</h4>
        <FormField
          control={form.control}
          name="listType"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <ToggleGroup
                  type="single"
                  value={field.value}
                  onValueChange={(value) => {
                    if (!value) return;
                    field.onChange(value);
                    updateNodeAttributes({
                      ...form.getValues(),
                      listType: value,
                    });
                  }}
                  className="courier-w-full courier-border courier-rounded-md courier-border-border courier-p-0.5"
                >
                  <ToggleGroupItem
                    size="sm"
                    value="unordered"
                    className="courier-w-full"
                    aria-label="Bulleted list"
                  >
                    <BulletListIcon className="courier-h-4 courier-w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    size="sm"
                    value="ordered"
                    className="courier-w-full"
                    aria-label="Numbered list"
                  >
                    <NumberedListIcon className="courier-h-4 courier-w-4" />
                  </ToggleGroupItem>
                </ToggleGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
};

export default ListForm;
