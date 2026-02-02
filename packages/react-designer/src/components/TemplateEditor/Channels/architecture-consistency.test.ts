import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

/**
 * Architecture Consistency Tests
 *
 * These tests verify that all channel components follow the same proven pattern
 * for content derivation to prevent content persistence bugs (like C-16410).
 *
 * The correct pattern:
 * - Content should be derived using useMemo that ONLY depends on isTemplateLoading
 * - This ensures content reference stability after initial mount
 * - Content updates should flow through restoration effects, not by recreating EditorProvider
 *
 * Channels that should follow this pattern:
 * - SMS
 * - Push
 * - Inbox
 *
 * Channels with different patterns (acceptable):
 * - Email (more complex, uses different approach)
 * - Slack (uses different state management)
 * - MSTeams (uses different state management)
 */

// Get the channels directory path
const channelsDir = path.resolve(__dirname);

// Helper to read a channel file
const readChannelFile = (channel: string): string => {
  const filePath = path.join(channelsDir, channel, `${channel}.tsx`);
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, "utf-8");
  }
  throw new Error(`Channel file not found: ${filePath}`);
};

describe("Architecture Consistency Tests", () => {
  describe("Content Derivation Pattern", () => {
    const fixedChannels = ["SMS", "Push", "Inbox"];

    fixedChannels.forEach((channel) => {
      describe(`${channel} Channel`, () => {
        let fileContent: string;

        beforeAll(() => {
          fileContent = readChannelFile(channel);
        });

        it("should use useMemo for content derivation", () => {
          // Check that content is derived using useMemo
          const hasContentUseMemo = fileContent.includes("const content = useMemo");
          expect(hasContentUseMemo).toBe(true);
        });

        it("should have isTemplateLoading as the primary useMemo dependency", () => {
          // Extract the useMemo for content
          const useMemoMatch = fileContent.match(
            /const content = useMemo\(\(\) => \{[\s\S]*?\}, \[(.*?)\]\)/
          );

          expect(useMemoMatch).not.toBeNull();

          if (useMemoMatch) {
            const deps = useMemoMatch[1].trim();
            // Should only depend on isTemplateLoading
            expect(deps).toBe("isTemplateLoading");
          }
        });

        it("should NOT have templateEditorContent in content useMemo dependencies", () => {
          // Extract the useMemo for content
          const useMemoMatch = fileContent.match(
            /const content = useMemo\(\(\) => \{[\s\S]*?\}, \[(.*?)\]\)/
          );

          if (useMemoMatch) {
            const deps = useMemoMatch[1];
            // Should NOT include templateEditorContent (causes unnecessary re-renders)
            expect(deps).not.toContain("templateEditorContent");
          }
        });

        it("should NOT have value in content useMemo dependencies", () => {
          // Extract the useMemo for content
          const useMemoMatch = fileContent.match(
            /const content = useMemo\(\(\) => \{[\s\S]*?\}, \[(.*?)\]\)/
          );

          if (useMemoMatch) {
            const deps = useMemoMatch[1];
            // Should NOT include value (causes unnecessary re-renders)
            expect(deps).not.toContain("value");
          }
        });

        it("should NOT use useState for editorContent (old buggy pattern)", () => {
          // The old buggy pattern used useState for editorContent
          const hasBuggyPattern =
            fileContent.includes("const [editorContent, setEditorContent] = useState");
          expect(hasBuggyPattern).toBe(false);
        });

        it("should NOT use skipEditorContentUpdateRef (old buggy pattern)", () => {
          // The old buggy pattern used skipEditorContentUpdateRef
          const hasBuggyPattern = fileContent.includes("skipEditorContentUpdateRef");
          expect(hasBuggyPattern).toBe(false);
        });

        it("should have restoration effect in EditorContent component", () => {
          // The EditorContent component should have an effect for content restoration
          const editorContentComponent = `${channel}EditorContent`;
          const hasEditorContent = fileContent.includes(`export const ${editorContentComponent}`);
          expect(hasEditorContent).toBe(true);

          // Check for restoration effect pattern
          const hasRestorationEffect =
            fileContent.includes("templateEditorContent") &&
            fileContent.includes("editor.commands.setContent");
          expect(hasRestorationEffect).toBe(true);
        });
      });
    });
  });

  describe("Consistent State Management", () => {
    const fixedChannels = ["SMS", "Push", "Inbox"];

    fixedChannels.forEach((channel) => {
      it(`${channel} should use templateEditorContentAtom`, () => {
        const fileContent = readChannelFile(channel);
        expect(fileContent).toContain("templateEditorContentAtom");
      });

      it(`${channel} should use isTemplateLoadingAtom`, () => {
        const fileContent = readChannelFile(channel);
        expect(fileContent).toContain("isTemplateLoadingAtom");
      });

      it(`${channel} should use isTemplateTransitioningAtom`, () => {
        const fileContent = readChannelFile(channel);
        expect(fileContent).toContain("isTemplateTransitioningAtom");
      });

      it(`${channel} should use pendingAutoSaveAtom`, () => {
        const fileContent = readChannelFile(channel);
        expect(fileContent).toContain("pendingAutoSaveAtom");
      });
    });
  });

  describe("EditorProvider Usage Pattern", () => {
    const fixedChannels = ["SMS", "Push", "Inbox"];

    fixedChannels.forEach((channel) => {
      it(`${channel} should pass content to render function`, () => {
        const fileContent = readChannelFile(channel);
        // The component should pass content to the render prop
        expect(fileContent).toContain("render?.({");
        expect(fileContent).toContain("content");
      });

      it(`${channel} should use memo for component optimization`, () => {
        const fileContent = readChannelFile(channel);
        // The component should be wrapped in memo
        expect(fileContent).toContain(`export const ${channel} = memo`);
      });
    });
  });

  describe("Cross-Channel Pattern Consistency", () => {
    it("all fixed channels should follow the same content derivation pattern", () => {
      const channels = ["SMS", "Push", "Inbox"];
      const patterns: string[] = [];

      channels.forEach((channel) => {
        const fileContent = readChannelFile(channel);

        // Extract the useMemo dependencies pattern
        const useMemoMatch = fileContent.match(
          /const content = useMemo\(\(\) => \{[\s\S]*?\}, \[(.*?)\]\)/
        );

        if (useMemoMatch) {
          patterns.push(useMemoMatch[1].trim());
        }
      });

      // All channels should have the same dependency pattern
      expect(patterns.length).toBe(3);
      expect(new Set(patterns).size).toBe(1); // All should be identical
      expect(patterns[0]).toBe("isTemplateLoading");
    });

    it("all fixed channels should NOT have the old buggy pattern", () => {
      const channels = ["SMS", "Push", "Inbox"];
      const buggyPatterns = [
        "skipEditorContentUpdateRef",
        "const [editorContent, setEditorContent] = useState",
      ];

      channels.forEach((channel) => {
        const fileContent = readChannelFile(channel);

        buggyPatterns.forEach((pattern) => {
          const hasBuggyPattern = fileContent.includes(pattern);
          expect(hasBuggyPattern).toBe(false);
        });
      });
    });
  });

  describe("Documentation Compliance", () => {
    const fixedChannels = ["SMS", "Push", "Inbox"];

    fixedChannels.forEach((channel) => {
      it(`${channel} should have eslint-disable comment for intentional dependency omission`, () => {
        const fileContent = readChannelFile(channel);

        // The intentional omission of deps should be documented with eslint-disable
        const hasEslintComment =
          fileContent.includes("eslint-disable-next-line react-hooks/exhaustive-deps") ||
          fileContent.includes("// eslint-disable-next-line");

        expect(hasEslintComment).toBe(true);
      });

      it(`${channel} should have comment explaining the stable content pattern`, () => {
        const fileContent = readChannelFile(channel);

        // There should be a comment explaining why deps are intentionally limited
        const hasExplanation =
          fileContent.includes("Only recompute when loading state changes") ||
          fileContent.includes("intentionally omitted") ||
          fileContent.includes("keep EditorProvider stable");

        expect(hasExplanation).toBe(true);
      });
    });
  });
});

// Import beforeAll for the tests
import { beforeAll } from "vitest";
