import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormWarning,
  Switch,
  Textarea,
} from "@/components/ui-kit";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { Editor } from "@tiptap/react";
import { useAtomValue } from "jotai";
import { ExternalLink } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { useNodeAttributes } from "../../hooks";
import { sampleDataAtom } from "../../TemplateEditor/store";
import { ConditionsSection } from "../../ui/Conditions";
import { FormHeader } from "../../ui/FormHeader";
import { resolveDataPath } from "../../utils/resolveDataPath";
import type { ElementalIfCondition } from "@/types/conditions.types";
import { defaultGroupProps, groupSchema } from "./Group.types";

interface GroupFormProps {
  element?: ProseMirrorNode;
  editor: Editor | null;
  hideCloseButton?: boolean;
}

export const GroupForm = ({ element, editor, hideCloseButton = false }: GroupFormProps) => {
  const form = useForm<z.infer<typeof groupSchema>>({
    resolver: zodResolver(groupSchema),
    mode: "onChange",
    defaultValues: {
      ...defaultGroupProps,
      ...(element?.attrs as z.infer<typeof groupSchema>),
    },
  });

  const [loopEnabled, setLoopEnabled] = useState(!!element?.attrs?.loop);
  const sampleData = useAtomValue(sampleDataAtom);
  const loopValue = form.watch("loop");

  const { updateNodeAttributes } = useNodeAttributes({
    editor,
    element,
    form,
    nodeType: "group",
  });

  useEffect(() => {
    if (element?.attrs?.loop) form.trigger("loop");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const dataPathWarning = useMemo(() => {
    if (!sampleData || !loopValue || !(loopValue === "data" || loopValue.startsWith("data."))) {
      return null;
    }
    const resolution = resolveDataPath(sampleData, loopValue);
    if (!resolution.exists) return "Path not found in sample data";
    if (!resolution.isArray) return "Path resolves to a non-array value";
    return null;
  }, [sampleData, loopValue]);

  if (!element) {
    return null;
  }

  return (
    <Form {...form}>
      <FormHeader type="group" hideCloseButton={hideCloseButton} />
      <form data-sidebar-form onSubmit={(e) => e.preventDefault()}>
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
                        updateNodeAttributes({ ...form.getValues(), loop: "" });
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
                  <Textarea
                    placeholder="data.items"
                    autoResize
                    value={field.value || ""}
                    onChange={(e) => {
                      field.onChange(e.target.value);
                      updateNodeAttributes({ ...form.getValues(), loop: e.target.value });
                    }}
                  />
                </FormControl>
                {form.formState.errors.loop ? (
                  <p className="courier-text-[0.8rem] courier-font-medium courier-text-[#DC2626]">
                    {String(form.formState.errors.loop.message)}
                  </p>
                ) : dataPathWarning ? (
                  <FormWarning className="courier-flex courier-items-center courier-gap-1">
                    {dataPathWarning}
                  </FormWarning>
                ) : null}
              </FormItem>
            )}
          />
        )}
        {loopEnabled && (
          <p className="courier-text-xs courier-text-muted-foreground courier-mb-3 courier-leading-relaxed">
            The group repeats once per item. Use{" "}
            <span className="courier-text-foreground">{"$.item"}</span> to reference it (e.g.{" "}
            {"$.item.name"}). To preview the loop, use a test event with an array at this path.
            <a
              href="https://www.courier.com/docs/platform/content/elemental/control-flow#loop"
              target="_blank"
              rel="noopener noreferrer"
              className="courier-inline-flex courier-items-center courier-gap-0.5 courier-text-muted-foreground hover:courier-text-foreground courier-underline courier-underline-offset-2"
            >
              Learn more about loops
              <ExternalLink className="courier-h-3 courier-w-3" />
            </a>
          </p>
        )}
        <ConditionsSection
          value={element?.attrs?.if as ElementalIfCondition | undefined}
          onChange={(ifValue) => {
            updateNodeAttributes({ ...form.getValues(), if: ifValue });
          }}
        />
      </form>
    </Form>
  );
};
