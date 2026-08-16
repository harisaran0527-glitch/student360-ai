const { SignJWT } = require('jose');
const https = require('https');

const BASE_URL = 'https://student360-avs.onrender.com';
const JWT_SECRET = new TextEncoder().encode("student360_super_secret_jwt_key_2026_production");

async function generateToken() {
  const token = await new SignJWT({
    id: "cm4adminuser0000000000000",
    email: "student360@gmail.com",
    fullName: "Priyadharshini",
    role: "SUPER_ADMIN"
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(JWT_SECRET);

  return token;
}

function request(url, cookieHeader) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      port: u.port || 443,
      path: u.pathname + u.search,
      method: 'GET',
      headers: {
        'Cookie': cookieHeader
      }
    };

    const start = Date.now();
    const req = https.request(opts, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          duration: Date.now() - start,
          size: body.length,
          bodySnippet: body.substring(0, 100)
        });
      });
    });

    req.on('error', (err) => resolve({ status: 0, duration: Date.now() - start, error: err.message }));
    req.end();
  });
}

async function run() {
  const token = await generateToken();
  const cookieHeader = `student360_session=${token}`;
  console.log('Generated Admin JWT Token successfully.');

  const endpoints = [
    '/api/auth/me',
    '/api/students',
    '/api/students/options',
    '/api/academic-options',
    '/api/academic-years',
    '/api/batches',
    '/api/departments',
    '/api/admin/stats',
    '/api/attendance',
    '/api/internships',
    '/api/certificates',
    '/api/projects',
    '/api/placement',
    '/api/bus'
  ];

  console.log('\n--- Measuring Production Response Times (Before Optimization) ---');
  console.log('Endpoint'.padEnd(25) + ' | Status | Run 1 (ms) | Run 2 (ms) | Size (bytes)');
  console.log('-------------------------------------------------------------------------');

  const report = [];
  for (const ep of endpoints) {
    const res1 = await request(`${BASE_URL}${ep}`, cookieHeader);
    await new Promise(r => setTimeout(r, 200));
    const res2 = await request(`${BASE_URL}${ep}`, cookieHeader);

    console.log(`${ep.padEnd(25)} | ${res1.status.toString().padStart(6)} | ${res1.duration.toString().padStart(10)} | ${res2.duration.toString().padStart(10)} | ${res1.size.toString().padStart(10)} B`);
    
    report.push({
      endpoint: ep,
      status: res1.status,
      run1: res1.duration,
      run2: res2.duration,
      size: res1.size
    });
  }
}

run();
