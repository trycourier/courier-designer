// import { LinkEditorPanel } from '../../panels'
import { Icon } from "../../Icon";
import { Toolbar } from "../../Toolbar";
import * as Popover from "@radix-ui/react-popover";

export type EditLinkPopoverProps = {
  onSetLink: (link: string, openInNewTab?: boolean) => void;
};

// export const EditLinkPopover = ({ onSetLink }: EditLinkPopoverProps) => {
export const EditLinkPopover = () => {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Toolbar.Button tooltip="Set Link">
          <Icon name="Link" />
        </Toolbar.Button>
      </Popover.Trigger>
      <Popover.Content>
        {/* <LinkEditorPanel onSetLink={onSetLink} /> */}
      </Popover.Content>
    </Popover.Root>
  );
};
