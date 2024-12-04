import * as Popover from "@radix-ui/react-popover";
import { LinkIcon } from "../../../../Icon";
import { LinkEditorPanel } from "../../LinkEditorPanel";
import { Toolbar } from "../../Toolbar";

export type EditLinkPopoverProps = {
  onSetLink: (link: string, openInNewTab?: boolean) => void;
  active: boolean;
};

export const EditLinkPopover = ({
  onSetLink,
  active,
}: EditLinkPopoverProps) => {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Toolbar.Button tooltip="Set Link" active={active}>
          <LinkIcon />
        </Toolbar.Button>
      </Popover.Trigger>
      <Popover.Content>
        <LinkEditorPanel onSetLink={onSetLink} />
      </Popover.Content>
    </Popover.Root>
  );
};
