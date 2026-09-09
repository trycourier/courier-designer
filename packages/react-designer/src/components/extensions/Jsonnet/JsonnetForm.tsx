import { Button, Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui-kit";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui-kit/DropdownMenu";
import { ExpandIcon, RightToLineIcon } from "@/components/ui-kit/Icon";
import type { ElementalIfCondition } from "@/types/conditions.types";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { Editor } from "@tiptap/react";
import { useAtom } from "jotai";
import { ChevronDown, ExternalLink } from "lucide-react";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { cn } from "@/lib";
import type { z } from "zod";
import { useNodeAttributes } from "../../hooks";
import { isSidebarExpandedAtom } from "../../TemplateEditor/store";
import { ConditionsSection } from "../../ui/Conditions";
import { FormHeader } from "../../ui/FormHeader";
import { defaultJsonnetProps } from "./Jsonnet";
import { jsonnetSchema } from "./Jsonnet.types";
import { MonacoJsonnetEditor } from "./MonacoJsonnetEditor";
import { jsonnetTemplates } from "./templates";

const DOCS_URL =
  "https://www.courier.com/docs/courier-designer/content-blocks/jsonnet-blocks/#working-with-jsonnet-blocks";

interface JsonnetFormProps {
  element?: ProseMirrorNode;
  editor: Editor | null;
}

export const JsonnetForm = ({ element, editor }: JsonnetFormProps) => {
  const form = useForm<z.infer<typeof jsonnetSchema>>({
    resolver: zodResolver(jsonnetSchema),
    defaultValues: {
      ...defaultJsonnetProps,
      ...(element?.attrs as z.infer<typeof jsonnetSchema>),
    },
  });

  const { updateNodeAttributes } = useNodeAttributes({
    editor,
    element,
    form,
    nodeType: "jsonnet",
  });

  const [isSidebarExpanded, setIsSidebarExpanded] = useAtom(isSidebarExpandedAtom);
  // Monaco reads its content from `defaultValue`, so picking a starter has to
  // remount it rather than nudge the form value.
  const [editorGeneration, setEditorGeneration] = useState(0);

  const handleTemplateSave = useCallback(
    (newTemplate: string) => {
      form.setValue("template", newTemplate);
      updateNodeAttributes({ template: newTemplate });
    },
    [form, updateNodeAttributes]
  );

  const handleStarterSelect = useCallback(
    (newTemplate: string) => {
      handleTemplateSave(newTemplate);
      setEditorGeneration((generation) => generation + 1);
    },
    [handleTemplateSave]
  );

  if (!element) {
    return null;
  }

  return (
    <Form {...form}>
      <div
        className={
          isSidebarExpanded
            ? "courier-flex courier-flex-col courier-h-full"
            : "courier-flex courier-flex-col courier-gap-4"
        }
      >
        {!isSidebarExpanded && <FormHeader type="jsonnet" hideCloseButton />}
        <div
          className={`courier-flex courier-flex-col courier-gap-4 ${isSidebarExpanded ? "courier-flex-1 courier-min-h-0" : ""}`}
        >
          <div
            className={cn(
              "courier-flex courier-gap-2 courier-flex-shrink-0",
              // expanded there is room to sit beside the Minimize toggle;
              // the collapsed sidebar is too narrow for both on one line.
              isSidebarExpanded
                ? "courier-flex-row courier-items-center"
                : "courier-flex-col courier-items-start"
            )}
          >
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "courier-flex courier-min-w-0 courier-items-center courier-justify-between courier-gap-1 courier-rounded-md courier-border-none courier-bg-secondary courier-text-secondary-foreground courier-px-2 courier-py-1 courier-text-sm courier-cursor-pointer hover:courier-bg-accent focus-visible:courier-outline-none",
                    // expanded, the panel is page-wide and a full-bleed trigger
                    // reads as a banner; keep it near its collapsed width.
                    isSidebarExpanded ? "courier-w-56" : "courier-w-full"
                  )}
                >
                  <span className="courier-truncate">Select Template</span>
                  <ChevronDown className="courier-h-4 courier-w-4 courier-shrink-0 courier-opacity-50" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="courier-w-[var(--radix-dropdown-menu-trigger-width)]"
                align="start"
              >
                {jsonnetTemplates.map(({ label, template }) => (
                  <DropdownMenuItem key={label} onSelect={() => handleStarterSelect(template)}>
                    {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div
            className={`courier-overflow-hidden courier-rounded-md courier-border courier-border-border ${isSidebarExpanded ? "courier-flex-1 courier-min-h-0" : "courier-mb-2"}`}
            style={
              isSidebarExpanded
                ? { minHeight: "200px" }
                : {
                    minHeight: "200px",
                    height: "300px",
                    resize: "vertical",
                    overflow: "auto",
                  }
            }
          >
            <form data-sidebar-form className="courier-h-full">
              <FormField
                control={form.control}
                name="template"
                render={({ field }) => (
                  <FormItem className="courier-h-full">
                    <FormControl>
                      <MonacoJsonnetEditor
                        key={editorGeneration}
                        template={field.value}
                        onSave={(newTemplate) => {
                          field.onChange(newTemplate);
                          handleTemplateSave(newTemplate);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </div>

          <p
            className={cn(
              "courier-text-xs courier-text-muted-foreground courier-leading-relaxed courier-flex-shrink-0",
              isSidebarExpanded && "courier-mb-4"
            )}
          >
            Use <span className="courier-text-foreground">{'data("key")'}</span> to read a value
            from the send payload.
            <a
              href={DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "courier-items-center courier-gap-0.5 courier-text-muted-foreground hover:courier-text-foreground courier-underline courier-underline-offset-2",
                isSidebarExpanded
                  ? "courier-inline-flex courier-ml-1"
                  : "courier-flex courier-mt-1 courier-w-fit"
              )}
            >
              Learn more about Jsonnet blocks
              <ExternalLink className="courier-h-3 courier-w-3" />
            </a>
          </p>
        </div>
        <ConditionsSection
          value={element?.attrs?.if as ElementalIfCondition | undefined}
          onChange={(ifValue) => {
            updateNodeAttributes({ ...form.getValues(), if: ifValue });
          }}
        />
      </div>
    </Form>
  );
};
