---
"@trycourier/react-designer": patch
---

The WhatsApp header image picker takes only JPEG and PNG, which is all Meta accepts for an image header. A dropped or chosen file of any other type is refused with "WhatsApp header images must be JPEG or PNG." instead of being ignored or uploaded. `ImageBlockComponent` gains optional `allowedTypes` and `onFileRejected` props; the email image block keeps the types it accepts.
