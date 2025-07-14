import type { PushProps } from "./Push";
import { Push } from "./Push";
import { PushEditor } from "./PushEditor";

export interface PushLayoutProps extends PushProps {}

export const PushLayout = ({
  hidePublish,
  theme,
  variables,
  channels,
  routing,
}: PushLayoutProps) => (
  <Push
    variables={variables}
    theme={theme}
    hidePublish={hidePublish}
    channels={channels}
    routing={routing}
    render={(props) => (
      <div className="courier-flex courier-flex-col courier-items-center courier-py-8">
        <PushEditor {...props} />
      </div>
    )}
  />
);
