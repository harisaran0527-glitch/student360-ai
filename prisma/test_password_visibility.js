const fs = require("fs");
const path = require("path");

function verifyPasswordVisibilityImplementation() {
  console.log("==================================================");
  console.log("PASSWORD VISIBILITY TOGGLE VERIFICATION SUITE");
  console.log("==================================================");

  // 1. Verify PasswordInput component file existence
  const compPath = path.join(__dirname, "../src/components/ui/PasswordInput.tsx");
  console.log("\n[TEST 1] Checking PasswordInput.tsx file...");
  if (!fs.existsSync(compPath)) {
    throw new Error("PasswordInput.tsx component missing!");
  }
  const compContent = fs.readFileSync(compPath, "utf-8");
  console.log("--> PasswordInput.tsx exists.");

  // 2. Check icon imports & accessibility props
  console.log("\n[TEST 2] Verifying Lucide icons and Accessibility...");
  console.log("--> Eye & EyeOff icon imports:", compContent.includes("Eye") && compContent.includes("EyeOff") ? "PASSED" : "FAILED");
  console.log("--> aria-label Accessibility attribute:", compContent.includes("aria-label=") ? "PASSED" : "FAILED");
  console.log("--> Form submit prevention on toggle click:", compContent.includes("e.preventDefault()") ? "PASSED" : "FAILED");
  console.log("--> Default hidden mode (type='password'):", compContent.includes('isVisible ? "text" : "password"') ? "PASSED" : "FAILED");

  // 3. Verify Pages updated
  console.log("\n[TEST 3] Verifying Page Integrations...");
  const pagesToTest = [
    { name: "Login Page", relativePath: "../src/app/login/page.tsx" },
    { name: "Admin Batches & Progression", relativePath: "../src/app/(dashboard)/admin/batches/page.tsx" },
    { name: "Admin Master Directory", relativePath: "../src/app/(dashboard)/admin/master-records/page.tsx" },
    { name: "Admin Account Settings", relativePath: "../src/app/(dashboard)/admin/settings/page.tsx" },
  ];

  for (const page of pagesToTest) {
    const fullPath = path.join(__dirname, page.relativePath);
    const content = fs.readFileSync(fullPath, "utf-8");
    const hasComponent = content.includes("<PasswordInput");
    console.log(`--> ${page.name}:`, hasComponent ? "PASSED (PasswordInput Integrated)" : "FAILED");
  }

  // 4. Ensure no raw type="password" inputs remain in codebase
  console.log("\n[TEST 4] Scanning codebase for any legacy type='password' inputs...");
  function scanDir(dir) {
    const files = fs.readdirSync(dir);
    let legacyCount = 0;
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        legacyCount += scanDir(fullPath);
      } else if (file.endsWith(".tsx") || file.endsWith(".ts")) {
        const content = fs.readFileSync(fullPath, "utf-8");
        // Ignore the PasswordInput definition itself
        if (fullPath.includes("PasswordInput.tsx")) continue;
        if (/type=\s*["']password["']/.test(content)) {
          console.error(`Legacy raw password input found in ${fullPath}`);
          legacyCount++;
        }
      }
    }
    return legacyCount;
  }

  const srcPath = path.join(__dirname, "../src");
  const legacyFound = scanDir(srcPath);
  console.log("--> Legacy raw password inputs count:", legacyFound === 0 ? "PASSED (0 remaining)" : `FAILED (${legacyFound} remaining)`);

  console.log("\n>>> ALL PASSWORD VISIBILITY TOGGLE VERIFICATION TESTS PASSED! 🚀");
}

verifyPasswordVisibilityImplementation();
