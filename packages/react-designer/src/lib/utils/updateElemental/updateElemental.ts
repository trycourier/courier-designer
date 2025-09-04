import type { ElementalContent, ElementalNode } from "../../../types/elemental.types";

// New interfaces for updateElemental options
interface ElementalChannelSpecificProps {
  channel?: string;
  [key: string]: any; // Allow other specific channel attributes
}

export interface UpdateElementalOptions {
  elements?: ElementalNode[]; // The content elements (optional for channels like Push that use raw)
  channel?: string | ElementalChannelSpecificProps;
}

// Utility function to update an ElementalContent document
export function updateElemental(
  doc: ElementalContent | null | undefined,
  updates: UpdateElementalOptions
): ElementalContent {
  const currentDoc = doc || { version: "2022-01-01", elements: [] };

  // Start with the original document structure to preserve all properties
  const resultDoc: ElementalContent = {
    ...currentDoc,
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
      // Filter out meta entries from top-level elements - meta is only allowed within channels
      if (existingElement.type === "meta") {
        return; // Skip this element, don't push it to resultDoc.elements
      }

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

          const updatedChannel: ElementalNode = {
            type: "channel" as const,
            channel: existingChannel.channel!,
            ...Object.fromEntries(
              Object.entries(existingChannel).filter(
                ([key]) => !["type", "channel", "elements"].includes(key)
              )
            ),
            ...updatedChannelAttributes,
          };

          // Only add elements if they are provided in the update
          if (updates.elements !== undefined) {
            const newSubElements: ElementalNode[] = [];

            // Handle meta - ensure only one meta entry exists
            // First, extract any meta entries from updates.elements
            const metaFromElements = updates.elements.find((el) => el.type === "meta");

            if (metaFromElements) {
              // If meta is found in updates.elements, use the first one
              newSubElements.push(metaFromElements);
            } else {
              // If no new meta provided, keep existing meta from the channel
              const existingMetaNode = existingChannel.elements?.find((el) => el.type === "meta");
              if (existingMetaNode) {
                newSubElements.push(existingMetaNode);
              }
            }

            // Filter out meta entries from updates.elements since meta should only be added once above
            const filteredUpdateElements = updates.elements.filter((el) => el.type !== "meta");
            newSubElements.push(...filteredUpdateElements);

            (updatedChannel as any).elements = newSubElements;
          }
          resultDoc.elements.push(updatedChannel);
          channelHandled = true;
        } else {
          // Channel not being updated, keep original without spreading
          resultDoc.elements.push(existingElement);
        }
      } else {
        // Non-channel element, keep original without spreading
        resultDoc.elements.push(existingElement);
      }
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

    const newChannelNode: ElementalNode = {
      type: "channel",
      channel: newChannelName,
      ...baseChannelAttrs,
    };

    // Only add elements if they are provided in the update
    if (updates.elements !== undefined) {
      const newChannelElements: ElementalNode[] = [];

      // Handle meta - ensure only one meta entry exists
      // First, extract any meta entries from updates.elements
      const metaFromElements = updates.elements.find((el) => el.type === "meta");

      if (metaFromElements) {
        // If meta is found in updates.elements, use the first one
        newChannelElements.push(metaFromElements);
      }

      // Filter out meta entries from updates.elements since meta should only be added once above
      const filteredUpdateElements = updates.elements.filter((el) => el.type !== "meta");
      newChannelElements.push(...filteredUpdateElements);

      (newChannelNode as any).elements = newChannelElements;
    }
    resultDoc.elements.push(newChannelNode);
  }

  return resultDoc;
}
