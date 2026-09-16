/**
 * The brand writes: save and publish.
 */
import { useCallback } from "react";
import { toast } from "sonner";
import { publishBrand, saveBrand } from "@/services/brand-service";
import { useCourierConnection } from "./useCourierConnection";
import { writeNames } from "./queryKeys";
import { useWrite } from "./useWrite";

export const useBrandMutations = () => {
  const connection = useCourierConnection();

  const save = useWrite(
    writeNames.brandSave,
    useCallback(
      (settings?: Record<string, unknown>) => saveBrand(connection, settings),
      [connection]
    )
  );

  const publish = useWrite(
    writeNames.brandPublish,
    useCallback(async () => {
      await publishBrand(connection);
      toast.success("Brand published");
    }, [connection])
  );

  return { save, publish };
};
