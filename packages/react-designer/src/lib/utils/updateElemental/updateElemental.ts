import type { ElementalContent, ElementalNode } from "../../../types/elemental.types";

// New interfaces for updateElemental options
interface ElementalChannelSpecificProps {
  channel?: string;
  [key: string]: any; // Allow other specific channel attributes
}

interface ElementalMetaSpecificProps {
  title?: string;
  [key: string]: any; // Allow other specific meta attributes
}

export interface UpdateElementalOptions {
  elements: ElementalNode[]; // The content elements
  channel?: string | ElementalChannelSpecificProps;
  meta?: ElementalMetaSpecificProps;
}

// Utility function to update an ElementalContent document
export function updateElemental(
  doc: ElementalContent | null | undefined,
  updates: UpdateElementalOptions
): ElementalContent {
  const currentDoc = doc || { version: "2022-01-01", elements: [] };

  const resultDoc: ElementalContent = {
    version: currentDoc.version || "2022-01-01",
    elements: [], // Initialize with an empty array, to be populated
  };

  // Determine targetChannelName based on updates.channel type
  let targetChannelName: string | undefined;
  if (typeof updates.channel === "string") {
    targetChannelName = updates.channel;
  } else if (updates.channel && typeof updates.channel.channel === "string") {
    targetChannelName = updates.channel.channel;
  } else if (updates.channel) {
    // Case: updates.channel is an object but doesn't have a .channel string property
    // targetChannelName remains undefined, meaning "update first channel found / create default"
    // but apply attributes from this object.
  }

  let channelHandled = false; // Flag to track if the target/first channel was updated or added

  if (currentDoc.elements && Array.isArray(currentDoc.elements)) {
    currentDoc.elements.forEach((existingElement) => {
      let elementToPush: ElementalNode = { ...existingElement };

      if (existingElement.type === "channel") {
        const existingChannel = existingElement as ElementalNode & {
          elements?: ElementalNode[];
          channel?: string;
          [key: string]: any;
        };

        let shouldUpdateThisChannel = false;
        if (targetChannelName) {
          if (existingChannel.channel === targetChannelName) {
            shouldUpdateThisChannel = true;
          }
        } else if (!channelHandled) {
          shouldUpdateThisChannel = true;
        }

        if (shouldUpdateThisChannel) {
          const updatedChannelAttributes: { [key: string]: any } = {};
          // Only iterate if updates.channel is an object
          if (updates.channel && typeof updates.channel === "object") {
            for (const key in updates.channel) {
              if (
                key !== "type" &&
                key !== "elements" &&
                key !== "channel" && // Do not take channel name from here for attribute updates
                Object.prototype.hasOwnProperty.call(updates.channel, key)
              ) {
                updatedChannelAttributes[key] = (updates.channel as ElementalChannelSpecificProps)[
                  key
                ];
              }
            }
          }

          const newSubElements: ElementalNode[] = [];
          if (updates.meta) {
            newSubElements.push({ type: "meta", ...updates.meta });
          } else {
            const existingMetaNode = existingChannel.elements?.find((el) => el.type === "meta");
            if (existingMetaNode) {
              newSubElements.push(existingMetaNode);
            }
          }
          newSubElements.push(...updates.elements);

          elementToPush = {
            type: "channel",
            channel: existingChannel.channel!,
            ...Object.fromEntries(
              Object.entries(existingChannel).filter(
                ([key]) => !["type", "channel", "elements"].includes(key)
              )
            ),
            ...updatedChannelAttributes,
            elements: newSubElements,
          };
          channelHandled = true;
        }
      }
      resultDoc.elements.push(elementToPush);
    });
  }

  if (
    (targetChannelName && !channelHandled) ||
    (!currentDoc.elements?.some((el) => el.type === "channel") && !channelHandled)
  ) {
    // Determine the name for the new channel
    let newChannelName: string;
    if (targetChannelName) {
      newChannelName = targetChannelName;
    } else if (updates.channel && typeof updates.channel === "object" && updates.channel.channel) {
      newChannelName = updates.channel.channel;
    } else {
      newChannelName = "email"; // Default if no name could be derived
    }

    const baseChannelAttrs: { [key: string]: any } = {};
    // Only iterate if updates.channel is an object
    if (updates.channel && typeof updates.channel === "object") {
      for (const key in updates.channel) {
        if (
          key !== "type" &&
          key !== "elements" &&
          key !== "channel" && // Do not take channel name from here for attributes
          Object.prototype.hasOwnProperty.call(updates.channel, key)
        ) {
          baseChannelAttrs[key] = (updates.channel as ElementalChannelSpecificProps)[key];
        }
      }
    }

    const newChannelElements: ElementalNode[] = [];
    if (updates.meta) {
      newChannelElements.push({ type: "meta", ...updates.meta });
    }
    newChannelElements.push(...updates.elements);
    const newChannelNode: ElementalNode = {
      type: "channel",
      channel: newChannelName,
      elements: newChannelElements,
      ...baseChannelAttrs,
    };
    resultDoc.elements.push(newChannelNode);
  }

  return resultDoc;
}
