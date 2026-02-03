import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Editor } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import Bold from "@tiptap/extension-bold";
import Italic from "@tiptap/extension-italic";
import { getTextMenuConfigForSlackNode } from "./Slack";
import { Blockquote } from "@/components/extensions/Blockquote";

// Mock jotai to avoid state management issues in tests
vi.mock("jotai", () => ({
  useSetAtom: () => vi.fn(),
  useAtomValue: () => null,
  atom: vi.fn(),
}));

describe("Slack Conditional Rules - Integration Tests", () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({
      extensions: [Document, Paragraph, Text, Bold, Italic, Blockquote],
      content: "<p>Test content</p>",
    });
  });

  afterEach(() => {
    editor?.destroy();
  });

  describe("Slack Text Menu Config Structure", () => {
    it("should have conditional rules defined", () => {
      const config = getTextMenuConfigForSlackNode("paragraph");
      expect(config.conditionalRules).toBeDefined();
      expect(config.conditionalRules).toHaveLength(2);
    });

    it("should have bidirectional bold/italic rules", () => {
      const config = getTextMenuConfigForSlackNode("paragraph");
      const rules = config.conditionalRules || [];

      const italicRule = rules.find(
        (rule) =>
          rule.conditions.activeItems.includes("italic") &&
          rule.action.targets.includes("italic") &&
          rule.trigger.name === "blockquote"
      );

      const boldRule = rules.find(
        (rule) =>
          rule.conditions.activeItems.includes("bold") &&
          rule.action.targets.includes("bold") &&
          rule.trigger.name === "blockquote"
      );

      expect(italicRule).toBeDefined();
      expect(boldRule).toBeDefined();
    });
  });

  describe("Bold/Italic Behavior Outside Blockquote", () => {
    it("should allow bold to be active", () => {
      // Select all text
      editor.commands.setTextSelection({ from: 1, to: 13 });

      // Apply bold
      editor.commands.toggleBold();

      // Verify bold is active
      expect(editor.isActive("bold")).toBe(true);
      expect(editor.isActive("italic")).toBe(false);
    });

    it("should allow italic to be active", () => {
      // Select all text
      editor.commands.setTextSelection({ from: 1, to: 13 });

      // Apply italic
      editor.commands.toggleItalic();

      // Verify italic is active
      expect(editor.isActive("italic")).toBe(true);
      expect(editor.isActive("bold")).toBe(false);
    });

    it("should allow BOTH bold and italic to be active simultaneously outside blockquote", () => {
      // Select all text
      editor.commands.setTextSelection({ from: 1, to: 13 });

      // Apply both bold and italic
      editor.commands.toggleBold();
      editor.commands.toggleItalic();

      // Verify both are active (no mutual exclusivity outside blockquote)
      expect(editor.isActive("bold")).toBe(true);
      expect(editor.isActive("italic")).toBe(true);
    });
  });

  describe("Bold/Italic Mutual Exclusivity Inside Blockquote", () => {
    beforeEach(() => {
      // Convert paragraph to blockquote
      editor.commands.setTextSelection({ from: 1, to: 13 });
      editor.commands.toggleBlockquote();

      // Verify we're in a blockquote
      expect(editor.isActive("blockquote")).toBe(true);
    });

    it("should apply bold when nothing is active in blockquote", () => {
      // Select text inside blockquote
      editor.commands.setTextSelection({ from: 2, to: 14 });

      // Apply bold
      editor.commands.toggleBold();

      // Verify bold is active, italic is not
      expect(editor.isActive("bold")).toBe(true);
      expect(editor.isActive("italic")).toBe(false);
      expect(editor.isActive("blockquote")).toBe(true);
    });

    it("should apply italic when nothing is active in blockquote", () => {
      // Select text inside blockquote
      editor.commands.setTextSelection({ from: 2, to: 14 });

      // Apply italic
      editor.commands.toggleItalic();

      // Verify italic is active, bold is not
      expect(editor.isActive("italic")).toBe(true);
      expect(editor.isActive("bold")).toBe(false);
      expect(editor.isActive("blockquote")).toBe(true);
    });

    it("should turn OFF italic and turn ON bold when bold is clicked while italic is active", () => {
      // Select text inside blockquote
      editor.commands.setTextSelection({ from: 2, to: 14 });

      // First apply italic
      editor.commands.toggleItalic();
      expect(editor.isActive("italic")).toBe(true);
      expect(editor.isActive("bold")).toBe(false);

      // Now apply the conditional rule: turn off italic, turn on bold
      editor.chain().focus().toggleItalic().toggleBold().run();

      // Verify: bold is ON, italic is OFF
      expect(editor.isActive("bold")).toBe(true);
      expect(editor.isActive("italic")).toBe(false);
      expect(editor.isActive("blockquote")).toBe(true);
    });

    it("should turn OFF bold and turn ON italic when italic is clicked while bold is active", () => {
      // Select text inside blockquote
      editor.commands.setTextSelection({ from: 2, to: 14 });

      // First apply bold
      editor.commands.toggleBold();
      expect(editor.isActive("bold")).toBe(true);
      expect(editor.isActive("italic")).toBe(false);

      // Now apply the conditional rule: turn off bold, turn on italic
      editor.chain().focus().toggleBold().toggleItalic().run();

      // Verify: italic is ON, bold is OFF
      expect(editor.isActive("italic")).toBe(true);
      expect(editor.isActive("bold")).toBe(false);
      expect(editor.isActive("blockquote")).toBe(true);
    });

    it("should maintain mutual exclusivity through multiple toggles", () => {
      // Select text inside blockquote
      editor.commands.setTextSelection({ from: 2, to: 14 });

      // Toggle bold on
      editor.commands.toggleBold();
      expect(editor.isActive("bold")).toBe(true);
      expect(editor.isActive("italic")).toBe(false);

      // Toggle to italic (bold off, italic on)
      editor.chain().focus().toggleBold().toggleItalic().run();
      expect(editor.isActive("bold")).toBe(false);
      expect(editor.isActive("italic")).toBe(true);

      // Toggle back to bold (italic off, bold on)
      editor.chain().focus().toggleItalic().toggleBold().run();
      expect(editor.isActive("bold")).toBe(true);
      expect(editor.isActive("italic")).toBe(false);

      // Toggle bold off
      editor.commands.toggleBold();
      expect(editor.isActive("bold")).toBe(false);
      expect(editor.isActive("italic")).toBe(false);
    });
  });

  describe("Rule Validation", () => {
    it("should have unique rule IDs", () => {
      const rules = getTextMenuConfigForSlackNode("paragraph").conditionalRules || [];
      const ids = rules.map((rule) => rule.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it("should only trigger rules in blockquotes", () => {
      const rules = getTextMenuConfigForSlackNode("paragraph").conditionalRules || [];

      rules.forEach((rule) => {
        expect(rule.trigger.type).toBe("node");
        expect(rule.trigger.name).toBe("blockquote");
        expect(rule.trigger.active).toBe(true);
      });
    });

    it("should have correct action type for all rules", () => {
      const rules = getTextMenuConfigForSlackNode("paragraph").conditionalRules || [];

      rules.forEach((rule) => {
        expect(rule.action.type).toBe("toggle_off");
      });
    });
  });

  describe("Slack and MS Teams Config Consistency", () => {
    it("should have same rule structure as MS Teams", async () => {
      // Import MS Teams config function for comparison
      const { getTextMenuConfigForMSTeamsNode } = await import("../MSTeams/MSTeams");

      const slackRules = getTextMenuConfigForSlackNode("paragraph").conditionalRules || [];
      const msteamsRules = getTextMenuConfigForMSTeamsNode("paragraph").conditionalRules || [];

      // Both should have same number of rules
      expect(slackRules.length).toBe(msteamsRules.length);

      // Both should have the same trigger conditions
      slackRules.forEach((slackRule, index) => {
        const msteamsRule = msteamsRules[index];
        expect(slackRule.trigger.type).toBe(msteamsRule.trigger.type);
        expect(slackRule.trigger.name).toBe(msteamsRule.trigger.name);
        expect(slackRule.trigger.active).toBe(msteamsRule.trigger.active);
        expect(slackRule.action.type).toBe(msteamsRule.action.type);
        expect(slackRule.conditions.activeItems).toEqual(msteamsRule.conditions.activeItems);
        expect(slackRule.action.targets).toEqual(msteamsRule.action.targets);
      });
    });
  });
});
