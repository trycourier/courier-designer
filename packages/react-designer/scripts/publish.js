#!/usr/bin/env node

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pkgPath = path.resolve(__dirname, "../package.json");

// Parse arguments
const args = process.argv.slice(2);
const versionArg = args.find((arg) => /^--version=(patch|minor|major|prerelease)$/.test(arg));
const versionType = versionArg ? versionArg.split("=")[1] : "patch";
const dryRun = args.includes("--dry-run");
const isCanary = args.includes("--canary");
const skipGit = args.includes("--skip-git") || isCanary;

console.log(`📦 Publishing @trycourier/react-editor${isCanary ? " (canary)" : ""}`);

try {
  // Ensure working directory is clean
  try {
    execSync("git diff --quiet", { stdio: "inherit" });
  } catch (error) {
    console.error("❌ Git working directory is not clean. Please commit or stash your changes.");
    process.exit(1);
  }

  // Build the package
  console.log("🔨 Building package...");
  execSync("pnpm run build", { stdio: "inherit" });

  // Run tests
  console.log("🧪 Running tests...");
  execSync("pnpm run test", { stdio: "inherit" });

  if (!dryRun) {
    // Get current version from package.json
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    let newVersion;
    let canaryTag;

    if (isCanary) {
      // For canary builds, use YYYYMMDDHHMISS format to match CI
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");

      const timestamp = `${year}${month}${day}${hours}${minutes}${seconds}`;
      const baseVersion = pkg.version.split("-")[0]; // Get the base version without any prerelease suffix

      // Create canary tag and version with date-time format
      canaryTag = `canary`;
      newVersion = `${baseVersion}-${canaryTag}-${timestamp}`;

      // Directly update package.json with the canary version
      pkg.version = newVersion;
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
      console.log(`📝 Set canary version to ${newVersion}`);
      console.log(`🏷️  Using npm tag: ${canaryTag}`);
    } else {
      // For regular releases, use pnpm version to bump as before
      console.log(`📝 Bumping version (${versionType})...`);
      execSync(`pnpm version ${versionType} --no-git-tag-version`, { stdio: "inherit" });

      // Read the updated version
      const updatedPkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      newVersion = updatedPkg.version;
    }

    // Handle git operations for regular releases
    if (!skipGit) {
      console.log("📝 Committing version bump...");
      execSync(`git add ${pkgPath}`, { stdio: "inherit" });
      execSync(`git commit -m "chore: bump @trycourier/react-editor to v${newVersion}"`, {
        stdio: "inherit",
      });
      execSync(`git tag -a v${newVersion} -m "v${newVersion}"`, { stdio: "inherit" });
    }

    // Publish to npm
    const publishTag = isCanary ? ` --tag ${canaryTag}` : "";
    console.log(`🚀 Publishing to npm${isCanary ? ` with tag "${canaryTag}"` : ""}...`);
    execSync(`pnpm publish --access public --no-git-checks${publishTag}`, {
      stdio: "inherit",
      cwd: path.resolve(__dirname, ".."),
    });

    console.log(
      `✅ Successfully published @trycourier/react-editor v${newVersion} to npm${isCanary ? ` with tag "${canaryTag}"` : ""}`
    );

    // Push changes and tags for regular releases
    if (!skipGit) {
      console.log("🔄 Pushing changes and tags...");
      execSync("git push && git push --tags", { stdio: "inherit" });
    }
  } else {
    console.log("🏁 Dry run completed successfully");
  }
} catch (error) {
  console.error("❌ Publishing failed:", error.message);
  process.exit(1);
}
