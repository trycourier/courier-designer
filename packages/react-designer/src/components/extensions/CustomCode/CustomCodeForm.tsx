import { Button, Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui-kit";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { Editor } from "@tiptap/react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { useNodeAttributes } from "../../hooks";
import { FormHeader } from "../../ui/FormHeader";
import { defaultCustomCodeProps } from "./CustomCode";
import { customCodeSchema } from "./CustomCode.types";
import { MonacoCodeEditor } from "./MonacoCodeEditor";
import { ExpandIcon, RightToLineIcon } from "@/components/ui-kit/Icon";
import { useCallback } from "react";
import { useAtom } from "jotai";
import { isSidebarExpandedAtom } from "../../TemplateEditor/store";

interface CustomCodeFormProps {
  element?: ProseMirrorNode;
  editor: Editor | null;
}

export const CustomCodeForm = ({ element, editor }: CustomCodeFormProps) => {
  const form = useForm<z.infer<typeof customCodeSchema>>({
    resolver: zodResolver(customCodeSchema),
    defaultValues: {
      ...defaultCustomCodeProps,
      ...(element?.attrs as z.infer<typeof customCodeSchema>),
    },
  });

  const { updateNodeAttributes } = useNodeAttributes({
    editor,
    element,
    form,
    nodeType: "customCode",
  });

  const [isSidebarExpanded, setIsSidebarExpanded] = useAtom(isSidebarExpandedAtom);

  const handleCodeSave = useCallback(
    (newCode: string) => {
      form.setValue("code", newCode);
      updateNodeAttributes({ code: newCode });
    },
    [form, updateNodeAttributes]
  );

  if (!element) {
    return null;
  }

  return (
    <Form {...form}>
      {!isSidebarExpanded && <FormHeader type="customCode" />}
      <div className="courier-flex courier-flex-col courier-gap-4">
        <Button
          className="courier-w-fit"
          variant="outline"
          buttonSize="small"
          onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
        >
          {isSidebarExpanded ? (
            <>
              <RightToLineIcon className="courier-w-3 courier-h-3" />
              Minimize
            </>
          ) : (
            <>
              <ExpandIcon className="courier-w-3 courier-h-3" />
              Expand Editor
            </>
          )}
        </Button>

        {/* Monaco Editor */}
        <div
          className="courier-mb-4 courier-overflow-hidden courier-rounded-md courier-border courier-border-border"
          style={{
            minHeight: "200px",
            height: "300px",
            resize: "vertical",
            overflow: "auto",
          }}
        >
          <form
            onChange={() => {
              updateNodeAttributes(form.getValues());
            }}
            className="courier-h-full"
          >
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem className="courier-h-full">
                  <FormControl>
                    <MonacoCodeEditor
                      code={field.value}
                      onSave={(newCode) => {
                        field.onChange(newCode);
                        handleCodeSave(newCode);
                      }}
                      onCancel={() => {}} // No-op for backward compatibility
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </div>
      </div>
    </Form>
  );
};
