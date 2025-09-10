# Auto-Save for New Blank Templates - E2E Tests

## Overview

This test suite verifies that the auto-save functionality works correctly for new blank templates across all channels. It addresses the specific bug where auto-save mutations would not fire when users typed in a new template that had never been saved before.

## Bug Description

**Original Issue**: When a user has a blank template (not saved once) and types something in any channel editor, the auto-save mutation would not fire.

**Root Cause**: All channel editors had early return conditions that prevented content updates when `templateEditorContent` was null (which is the case for new templates).

**Fix Applied**: Modified all channel editors to create initial template structure when `templateEditorContent` is null, enabling auto-save to trigger.

## Test Coverage

### Test Cases

1. **Individual Channel Tests**:

   - `Email Channel`: Tests auto-save when typing in email editor for new template
   - `SMS Channel`: Tests auto-save when typing in SMS editor for new template
   - `Push Channel`: Tests auto-save when typing in push editor for new template
   - `Inbox Channel`: Tests auto-save when typing in inbox editor for new template

2. **Multi-Channel Workflow**:

   - Tests switching between channels and verifying auto-save works in each
   - Verifies template structure is maintained across channel switches

3. **Performance & Timing**:

   - Tests debounce functionality to prevent over-triggering
   - Verifies appropriate timing for auto-save triggers

4. **Error Handling**:

   - Tests recovery from failed save attempts
   - Ensures auto-save continues working after errors

5. **Regression Testing**:
   - Verifies existing subject-change auto-save still works
   - Ensures fix doesn't break existing functionality

### API Mocking

The tests mock both:

- **GetTenant queries**: Returns null notification for new templates
- **SaveNotification mutations**: Captures save requests and validates content structure

### Content Structure Validation

Each test verifies that the saved content has the correct structure for each channel:

- **Email**: `{ version: "2022-01-01", elements: [{ type: "channel", channel: "email", elements: [...] }] }`
- **SMS**: `{ version: "2022-01-01", elements: [{ type: "channel", channel: "sms", raw: { text: "..." } }] }`
- **Push**: `{ version: "2022-01-01", elements: [{ type: "channel", channel: "push", raw: { title: "...", text: "..." } }] }`
- **Inbox**: `{ version: "2022-01-01", elements: [{ type: "channel", channel: "inbox", elements: [...] }] }`

## Running the Tests

```bash
# Run all auto-save tests
npx playwright test auto-save-new-templates.spec.ts

# Run specific test
npx playwright test auto-save-new-templates.spec.ts -g "Email Channel"

# Run with browser visible (for debugging)
npx playwright test auto-save-new-templates.spec.ts --headed

# Run with debug mode
npx playwright test auto-save-new-templates.spec.ts --debug
```

## Test Environment

- **Framework**: Playwright
- **Browser**: Chromium (default)
- **Timeout**: 30 seconds per test
- **Mock API**: GraphQL endpoints mocked with realistic responses

## Key Assertions

1. **Auto-save triggers**: `expect(saveRequestCount).toBeGreaterThan(0)`
2. **Content structure**: Validates proper channel-specific content format
3. **Debounce behavior**: Ensures reasonable number of save requests
4. **Error recovery**: Editor remains functional after save failures

## Files Modified for Fix

- `EmailEditor.tsx`: Added new template handling in `processUpdate`
- `SMS.tsx`: Added new template handling in `onUpdateHandler`
- `Push.tsx`: Added new template handling in `onUpdateHandler`
- `Inbox.tsx`: Added new template handling in `onUpdateHandler`

## Related Tests

- `template-loading-scenarios.spec.ts`: Template loading workflows
- `template-switching.spec.ts`: Template switching functionality
- `template-provider-integration.spec.ts`: Provider integration tests
