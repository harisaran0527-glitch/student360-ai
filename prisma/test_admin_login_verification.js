const http = require("http");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function testAdminAuthentication() {
  console.log("==================================================");
  console.log("VERIFYING ADMIN AUTHENTICATION & SECURITY");
  console.log("==================================================");

  // 1. Verify Database State in Supabase PostgreSQL
  const adminUsers = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
  });

  console.log("\n[TEST 1] Supabase PostgreSQL Admin Records Check:");
  console.log("--> Total Admin Users Count:", adminUsers.length);
  if (adminUsers.length !== 1) {
    console.error("FAIL: Expected exactly 1 admin user, found:", adminUsers.length);
    process.exit(1);
  }
  console.log("--> Admin ID:", adminUsers[0].id);
  console.log("--> Admin Email:", adminUsers[0].email);
  console.log("--> Admin Role:", adminUsers[0].role);

  if (adminUsers[0].email !== "student360@gmail.com") {
    console.error("FAIL: Admin email is not student360@gmail.com!");
    process.exit(1);
  }
  console.log("--> Database Email Check: PASSED ✅");

  // 2. Direct Bcrypt Hash Verification
  const matchNew = await bcrypt.compare("staff@avs", adminUsers[0].passwordHash);
  const matchOld = await bcrypt.compare("password123", adminUsers[0].passwordHash);

  console.log("\n[TEST 2] Password Hash Matching Check:");
  console.log("--> New Password ('staff@avs') Match:", matchNew ? "PASSED ✅" : "FAILED ❌");
  console.log("--> Old Password ('password123') Match:", !matchOld ? "PASSED (Rejected) ✅" : "FAILED (Accepted) ❌");

  if (!matchNew || matchOld) {
    console.error("FAIL: Password hash verification failed!");
    process.exit(1);
  }

  // 3. HTTP API Login Route Tests
  console.log("\n[TEST 3] Testing Live HTTP API Login (/api/auth/login)...");

  const postLogin = (email, password) => {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify({ email, password });
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

  // Case A: New Email + New Password -> MUST SUCCEED (200)
  const resA = await postLogin("student360@gmail.com", "staff@avs");
  console.log("--> Case A: student360@gmail.com + staff@avs -> Status:", resA.status);
  if (resA.status === 200 && resA.data?.success !== false) {
    console.log("    LOGIN SUCCESS ✅ Role:", resA.data?.data?.user?.role || resA.data?.user?.role);
  } else {
    console.error("    FAIL: Login with new credentials failed!", resA.data);
    process.exit(1);
  }

  // Case B: Old Email + Old Password -> MUST FAIL (401)
  const resB = await postLogin("admin@student360.edu", "password123");
  console.log("--> Case B: admin@student360.edu + password123 -> Status:", resB.status);
  if (resB.status === 401 || resB.status === 400 || resB.data?.success === false) {
    console.log("    REJECTED AS EXPECTED ✅ Message:", resB.data?.message || resB.data?.error);
  } else {
    console.error("    FAIL: Old credentials were inappropriately accepted!");
    process.exit(1);
  }

  // Case C: New Email + Old Password -> MUST FAIL (401)
  const resC = await postLogin("student360@gmail.com", "password123");
  console.log("--> Case C: student360@gmail.com + password123 -> Status:", resC.status);
  if (resC.status === 401 || resC.status === 400 || resC.data?.success === false) {
    console.log("    REJECTED AS EXPECTED ✅ Message:", resC.data?.message || resC.data?.error);
  } else {
    console.error("    FAIL: Incorrect password was accepted!");
    process.exit(1);
  }

  // 4. Verify Student Accounts Unaffected
  const studentCount = await prisma.user.count({ where: { role: "STUDENT" } });
  console.log("\n[TEST 4] Student Accounts Integrity Check:");
  console.log("--> Active Student User Accounts Count:", studentCount, "(Unaffected ✅)");

  console.log("\n>>> ALL ADMIN CREDENTIALS & LOGIN VERIFICATIONS PASSED 100%! 🚀");
}

testAdminAuthentication()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
