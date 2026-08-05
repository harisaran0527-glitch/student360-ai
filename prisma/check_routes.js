const http = require("http");

const routes = [
  "/admin/batches",
  "/admin/attendance",
  "/admin/academics",
  "/admin/internships",
  "/admin/certificates",
  "/admin/projects",
  "/admin/placement",
  "/admin/alumni",
  "/admin/notifications",
  "/admin/verification",
];

async function checkRoutes() {
  console.log("==================================================");
  console.log("TESTING ALL 10 ADMIN ROUTES FOR HTTP STATUS");
  console.log("==================================================");

  for (const route of routes) {
    await new Promise((resolve) => {
      http
        .get(`http://localhost:3000${route}`, (res) => {
          console.log(`[ROUTE CHECK] http://localhost:3000${route} => HTTP ${res.statusCode}`);
          resolve();
        })
        .on("error", (err) => {
          console.error(`[ROUTE CHECK FAILED] http://localhost:3000${route} =>`, err.message);
          resolve();
        });
    });
  }
}

checkRoutes();
