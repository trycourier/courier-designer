import {
  Divider,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormWarning,
  Input,
  Switch,
  Tabs,
  TabsList,
  TabsTrigger,
  Textarea,
} from "@/components/ui-kit";
import { PaddingHorizontalIcon, PaddingVerticalIcon } from "@/components/ui-kit/Icon";
import { ExternalLink } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { Editor } from "@tiptap/react";
import { useAtomValue } from "jotai";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { useNodeAttributes } from "../../hooks";
import { FormHeader } from "../../ui/FormHeader";
import { resolveDataPath } from "../../utils/resolveDataPath";
import { sampleDataAtom } from "../../TemplateEditor/store";
import { defaultListProps } from "./List";
import { listSchema } from "./List.types";
import { ConditionsSection } from "../../ui/Conditions";
import type { ElementalIfCondition } from "@/types/conditions.types";

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
  const sampleData = useAtomValue(sampleDataAtom);

  const loopValue = form.watch("loop");
  const loopValidationTimer = useRef<ReturnType<typeof setTimeout>>();

  const triggerLoopValidation = useCallback(() => {
    clearTimeout(loopValidationTimer.current);
    loopValidationTimer.current = setTimeout(() => {
      form.trigger("loop");
    }, 1000);
  }, [form]);

  useEffect(() => {
    if (initialLoop) {
      form.trigger("loop");
    }
    return () => clearTimeout(loopValidationTimer.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [dataPathWarning, setDataPathWarning] = useState<string | null>(null);
  const warningTimer = useRef<ReturnType<typeof setTimeout>>();
  const isInitialRender = useRef(true);

  useEffect(() => {
    const resolveWarning = () => {
      if (!sampleData || !loopValue || !(loopValue === "data" || loopValue.startsWith("data."))) {
        setDataPathWarning(null);
        return;
      }
      const resolution = resolveDataPath(sampleData, loopValue);
      if (!resolution.exists) setDataPathWarning("Path not found in sample data");
      else if (!resolution.isArray) setDataPathWarning("Path resolves to a non-array value");
      else setDataPathWarning(null);
    };

    if (isInitialRender.current) {
      isInitialRender.current = false;
      resolveWarning();
      return;
    }

    setDataPathWarning(null);
    clearTimeout(warningTimer.current);
    if (!sampleData || !loopValue || !(loopValue === "data" || loopValue.startsWith("data.")))
      return;
    warningTimer.current = setTimeout(resolveWarning, 1000);
    return () => clearTimeout(warningTimer.current);
  }, [sampleData, loopValue]);

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
            <div data-courier-feature="list-loops">
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
                        <Textarea
                          placeholder="data.items"
                          autoResize
                          value={field.value || ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(value);
                            form.clearErrors("loop");
                            triggerLoopValidation();
                            updateNodeAttributes({
                              ...form.getValues(),
                              loop: value,
                            });
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
                  Use <span className="courier-text-foreground">{"$.item"}</span> to reference each
                  item in the loop (e.g. {"$.item.name"}).
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
            </div>
          </>
        )}
        <ConditionsSection
          value={element?.attrs?.if as ElementalIfCondition | undefined}
          onChange={(ifValue) => {
            updateNodeAttributes({
              ...form.getValues(),
              if: ifValue,
            });
          }}
        />
      </form>
    </Form>
  );
};
