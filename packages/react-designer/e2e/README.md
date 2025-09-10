# E2E Tests for Template Loading

This directory contains comprehensive end-to-end tests for the template loading scenarios in the Courier Designer.

## Test Files

### Core Template Loading Tests

1. **`template-loading-scenarios.spec.ts`** - Main test file covering the three requested scenarios:

   - Scenario 1: Initial TemplateEditor/TemplateProvider loading
   - Scenario 2: Load a template from a server
   - Scenario 3: Receive template data and restore the state in the editor
   - Bonus: Error handling and performance tests

2. **`template-loading.spec.ts`** - Comprehensive template loading tests with various edge cases

3. **`template-provider-integration.spec.ts`** - Integration tests between TemplateProvider and TemplateEditor

### Test Utilities

4. **`template-test-utils.ts`** - Shared utilities and mock data for template loading tests

5. **`debug-page.spec.ts`** - Debug test for troubleshooting page loading issues

## Prerequisites

### Environment Variables

The editor-dev app requires the following environment variables to be set. Create a `.env` file in `apps/editor-dev/` with these values:

```bash
# Required for template loading
VITE_API_URL=https://api.courier.com/graphql
VITE_JWT_TOKEN=your_jwt_token_here
VITE_TENANT_ID=your_tenant_id
VITE_TEMPLATE_ID=your_template_id
VITE_CLIENT_KEY=your_client_key

# Optional for image uploads
VITE_UPLOAD_IMAGE_URL=https://your-upload-url.com/upload
```

### For Testing Only

If you want to run tests without real API credentials, you can use mock values:

```bash
# Mock values for testing
VITE_API_URL=https://mock-api.example.com/graphql
VITE_JWT_TOKEN=mock_jwt_token
VITE_TENANT_ID=test-tenant-123
VITE_TEMPLATE_ID=test-template-456
VITE_CLIENT_KEY=mock_client_key
VITE_UPLOAD_IMAGE_URL=https://mock-upload.example.com/upload
```

## Running the Tests

### Setup

1. **Install dependencies:**

   ```bash
   cd packages/react-designer
   pnpm install
   ```

2. **Install Playwright browsers:**

   ```bash
   pnpm exec playwright install chromium
   ```

3. **Set up environment variables** (see above)

4. **Start the development server:**
   ```bash
   cd ../../apps/editor-dev
   pnpm dev
   ```
   The server should start on http://localhost:5173

### Running Tests

In a new terminal:

```bash
cd packages/react-designer

# Run all template loading tests
pnpm test:e2e template-loading-scenarios.spec.ts

# Run specific test scenarios
pnpm test:e2e template-loading-scenarios.spec.ts --grep "Scenario 1"

# Run all e2e tests
pnpm test:e2e

# Run with UI mode for debugging
pnpm exec playwright test --ui

# Generate test report
pnpm exec playwright show-report
```

### Debug Mode

If tests are failing, use the debug test to see what's happening:

```bash
pnpm test:e2e debug-page.spec.ts
```

This will:

- Take screenshots of the page state
- Log detailed information about elements found
- Show what content is actually loaded

## Test Architecture

### Mock Server Responses

The tests use Playwright's route interception to mock GraphQL responses:

```typescript
await mockTemplateResponse(page, mockTemplateDataSamples.fullTemplate, {
  delay: 800,
  requireAuth: true,
});
```

### Template Data Structure

Tests use realistic template data that mirrors the actual GraphQL schema:

```typescript
const templateData = {
  data: {
    tenant: {
      tenantId: "test-tenant",
      notification: {
        notificationId: "test-template",
        data: {
          content: {
            version: "2022-01-01",
            elements: [
              {
                type: "channel",
                channel: "email",
                elements: [
                  /* email content */
                ],
              },
            ],
          },
        },
      },
    },
  },
};
```

### Key Test Patterns

1. **Loading State Testing:**

   ```typescript
   await waitForTemplateLoad(page);
   ```

2. **Channel Switching:**

   ```typescript
   const emailButton = page.locator("button").filter({ hasText: /email/i });
   await emailButton.click();
   ```

3. **Content Verification:**
   ```typescript
   const editor = page.locator(".tiptap.ProseMirror").first();
   await expect(editor).toBeVisible();
   await expect(editor).toHaveAttribute("contenteditable", "true");
   ```

## Troubleshooting

### Common Issues

1. **"Timeout waiting for .tiptap.ProseMirror"**

   - Check that environment variables are set
   - Verify the dev server is running on port 5173
   - Run the debug test to see what's actually on the page

2. **"Server error 401"**

   - Check that VITE_JWT_TOKEN is set and valid
   - Verify VITE_CLIENT_KEY is correct

3. **"No template content appears"**
   - Check VITE_TENANT_ID and VITE_TEMPLATE_ID values
   - Verify the mock data matches expected structure

### Debug Commands

```bash
# Check server status
curl -I http://localhost:5173

# Check environment variables
cd apps/editor-dev && printenv | grep VITE

# Run debug test
pnpm test:e2e debug-page.spec.ts --reporter=list

# View test traces
pnpm exec playwright show-trace test-results/[test-name]/trace.zip
```

## Test Coverage

The template loading tests cover:

- ✅ Initial component loading and initialization
- ✅ Server communication and data fetching
- ✅ Template data parsing and state restoration
- ✅ Multi-channel content management
- ✅ Template switching and state transitions
- ✅ Error handling and recovery
- ✅ Performance under rapid operations
- ✅ Authentication and API configuration
- ✅ Brand data integration

## Writing New Tests

When adding new template loading tests:

1. Use the utilities in `template-test-utils.ts`
2. Follow the established patterns for mocking
3. Test both success and failure scenarios
4. Verify cross-channel functionality
5. Include appropriate cleanup in `beforeEach`

Example test structure:

```typescript
test("Your test name", async ({ page }) => {
  // Setup mock response
  await mockTemplateResponse(page, yourTemplateData);

  // Navigate and wait for load
  await page.goto("/");
  await waitForTemplateLoad(page);

  // Your test logic here

  // Verify results
  const editor = page.locator(".tiptap.ProseMirror").first();
  await expect(editor).toBeVisible();
});
```
