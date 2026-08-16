const http = require("http");

async function testPortalEntryPoints() {
  console.log("==================================================");
  console.log("TESTING ENTRY POINT ISOLATION & LOGIN POLICIES");
  console.log("==================================================");

  const postLogin = (email, password, portalType) => {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify({ email, password, portalType });
      const req = http.request(
        "http://localhost:3000/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(data),
          },
        },
        (res) => {
          let body = "";
          res.on("data", (chunk) => (body += chunk));
          res.on("end", () => resolve({ status: res.statusCode, data: JSON.parse(body || "{}") }));
        }
      );
      req.on("error", reject);
      req.write(data);
      req.end();
    });
  };

  // Test 1: Student tries to login via Admin Entry Point (/admin)
  console.log("\n[TEST 1] Student Account login attempt on Admin Entry Point (portalType: 'ADMIN'):");
  const res1 = await postLogin("student@student360.edu", "password123", "ADMIN");
  console.log("--> Status Code:", res1.status);
  console.log("--> Message:", res1.data?.message || res1.data?.error);
  if (res1.status === 403 && (res1.data?.message?.includes("You are not authorized to access the Admin Panel") || res1.data?.error?.includes("You are not authorized to access the Admin Panel"))) {
    console.log("--> STUDENT LOGIN BLOCKED ON ADMIN ENTRY POINT: PASSED ✅");
  } else {
    console.error("--> FAIL: Expected HTTP 403 with authorization error message");
    process.exit(1);
  }

  // Test 2: Admin tries to login via Student Entry Point (/student)
  console.log("\n[TEST 2] Admin Account login attempt on Student Entry Point (portalType: 'STUDENT'):");
  const res2 = await postLogin("student360@gmail.com", "staff@avs", "STUDENT");
  console.log("--> Status Code:", res2.status);
  console.log("--> Message:", res2.data?.message || res2.data?.error);
  if (res2.status === 403 && (res2.data?.message?.includes("Please use the Admin Panel") || res2.data?.error?.includes("Please use the Admin Panel"))) {
    console.log("--> ADMIN LOGIN BLOCKED ON STUDENT ENTRY POINT: PASSED ✅");
  } else {
    console.error("--> FAIL: Expected HTTP 403 with 'Please use the Admin Panel' message");
    process.exit(1);
  }

  // Test 3: Admin login via Admin Entry Point (/admin)
  console.log("\n[TEST 3] Admin Account login on Admin Entry Point (portalType: 'ADMIN'):");
  const res3 = await postLogin("student360@gmail.com", "staff@avs", "ADMIN");
  console.log("--> Status Code:", res3.status);
  if (res3.status === 200 && res3.data?.success !== false) {
    console.log("--> ADMIN LOGIN SUCCESS ON ADMIN ENTRY POINT: PASSED ✅ Role:", res3.data?.data?.user?.role || res3.data?.user?.role);
  } else {
    console.error("--> FAIL: Valid Admin login failed");
    process.exit(1);
  }

  // Test 4: Student login via Student Entry Point (/student)
  console.log("\n[TEST 4] Student Account login on Student Entry Point (portalType: 'STUDENT'):");
  const res4 = await postLogin("student@student360.edu", "password123", "STUDENT");
  console.log("--> Status Code:", res4.status);
  if (res4.status === 200 && res4.data?.success !== false) {
    console.log("--> STUDENT LOGIN SUCCESS ON STUDENT ENTRY POINT: PASSED ✅ Role:", res4.data?.data?.user?.role || res4.data?.user?.role);
  } else {
    console.error("--> FAIL: Valid Student login failed");
    process.exit(1);
  }

  console.log("\n>>> ALL PUBLIC ENTRY POINTS & LOGIN ISOLATION TESTS PASSED 100%! 🚀");
}

testPortalEntryPoints().catch(console.error);
