---
"@trycourier/react-designer": minor
---

Add the Jsonnet block to the MS Teams channel, matching Slack's, and offer it on both channels unconditionally.

`TemplateProvider`'s `slackJsonnetEnabled` prop is removed: the Jsonnet block is now always in the Slack and MS Teams sidebars. Hosts that passed it should drop the prop. On Teams the starter dropdown and the inserted default are Adaptive Card templates, since the backend only sends a top-level `type: "AdaptiveCard"` object and the Slack Block Kit starters would render nothing there.

Also raises the `handlebars` floor to `^4.7.10`, matching the security patch hosts already apply.
