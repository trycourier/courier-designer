---
"@trycourier/react-designer": patch
---

Keep the In-app editor from opening blank when its heading or body contains markdown (`**bold**`, `_italic_`, …). The markers now stay as literal text, as they already do for SMS and Push, instead of becoming marks the In-app editor's schema rejects.

The In-app editor and its preview also render that markdown the way the Inbox does: bold, italic and strikethrough are shown formatted, and the markers appear only while the caret is on the span. The stored text is unchanged.
