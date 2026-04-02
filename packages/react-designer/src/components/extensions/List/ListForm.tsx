import {
  Divider,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Switch,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui-kit";
import { PaddingHorizontalIcon, PaddingVerticalIcon } from "@/components/ui-kit/Icon";
import { VariableTextarea } from "@/components/ui/VariableEditor";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { Editor } from "@tiptap/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { useNodeAttributes } from "../../hooks";
import { FormHeader } from "../../ui/FormHeader";
import { defaultListProps } from "./List";
import { listSchema } from "./List.types";

interface ListFormProps {
  element?: ProseMirrorNode;
  editor: Editor | null;
  hideCloseButton?: boolean;
  /**
   * When true, only shows the list type toggle (ordered/unordered).
   * Used for channels like Slack and MS Teams that don't support styling options.
   */
  minimalMode?: boolean;
}

export const ListForm = ({
  element,
  editor,
  hideCloseButton = false,
  minimalMode = false,
}: ListFormProps) => {
  const form = useForm<z.infer<typeof listSchema>>({
    resolver: zodResolver(listSchema),
    defaultValues: {
      ...defaultListProps,
      ...(element?.attrs as z.infer<typeof listSchema>),
    },
  });

  const initialLoop = (element?.attrs as z.infer<typeof listSchema>)?.loop;
  const [loopEnabled, setLoopEnabled] = useState(!!initialLoop);

  const { updateNodeAttributes } = useNodeAttributes({
    editor,
    element,
    form,
    nodeType: element?.type.name || "list",
  });

  if (!element) {
    return null;
  }

  return (
    <Form {...form}>
      <FormHeader type="list" hideCloseButton={hideCloseButton} />
      <form
        data-sidebar-form
        onChange={() => {
          updateNodeAttributes(form.getValues());
        }}
      >
        <h4 className="courier-text-sm courier-font-medium courier-mb-3">Type</h4>
        <FormField
          control={form.control}
          name="listType"
          render={({ field }) => (
            <FormItem className={minimalMode ? "" : "courier-mb-4"}>
              <FormControl>
                <div
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Tabs
                    value={field.value}
                    onValueChange={(value) => {
                      if (value) {
                        field.onChange(value);
                        updateNodeAttributes({
                          ...form.getValues(),
                          listType: value,
                        });
                      }
                    }}
                  >
                    <TabsList className="courier-w-full">
                      <TabsTrigger value="unordered" className="courier-flex-1">
                        Unordered
                      </TabsTrigger>
                      <TabsTrigger value="ordered" className="courier-flex-1">
                        Ordered
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {!minimalMode && (
          <>
            <Divider className="courier-mb-4" />
            <h4 className="courier-text-sm courier-font-medium courier-mb-3">Padding</h4>
            <div className="courier-flex courier-flex-row courier-gap-3 courier-mb-4">
              <FormField
                control={form.control}
                name="paddingHorizontal"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        startAdornment={<PaddingHorizontalIcon />}
                        type="number"
                        min={0}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paddingVertical"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        startAdornment={<PaddingVerticalIcon />}
                        type="number"
                        min={0}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Divider className="courier-mb-4" />
            <div className="courier-pb-4">
              <FormField
                control={form.control}
                name="loop"
                render={({ field }) => (
                  <FormItem className="courier-flex courier-flex-row courier-items-center courier-justify-between">
                    <FormLabel className="!courier-m-0">Loop on</FormLabel>
                    <FormControl>
                      <Switch
                        checked={loopEnabled}
                        onCheckedChange={(checked) => {
                          setLoopEnabled(!!checked);
                          if (!checked) {
                            field.onChange("");
                            updateNodeAttributes({
                              ...form.getValues(),
                              loop: "",
                            });
                          }
                        }}
                        className="!courier-m-0"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            {loopEnabled && (
              <FormField
                control={form.control}
                name="loop"
                render={({ field }) => (
                  <FormItem className="courier-mb-4">
                    <FormLabel>Data path</FormLabel>
                    <FormControl>
                      <VariableTextarea
                        placeholder="data.items"
                        value={field.value || ""}
                        onChange={(value) => {
                          field.onChange(value);
                          updateNodeAttributes({
                            ...form.getValues(),
                            loop: value,
                          });
                        }}
                        showToolbar
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </>
        )}
      </form>
    </Form>
  );
};
