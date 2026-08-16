const { SignJWT } = require('jose');
const https = require('https');

const BASE_URL = 'https://student360-avs.onrender.com';
const JWT_SECRET = new TextEncoder().encode("student360_super_secret_jwt_key_2026_production");

async function generateToken() {
  return await new SignJWT({
    id: "cm4adminuser0000000000000",
    email: "student360@gmail.com",
    fullName: "Priyadharshini",
    role: "SUPER_ADMIN"
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(JWT_SECRET);
}

async function run() {
  const token = await generateToken();
  const cookieHeader = `student360_session=${token}`;
  
  const u = new URL(`${BASE_URL}/api/admin/stats`);
  const req = https.request({
    hostname: u.hostname,
    path: u.pathname + u.search,
    method: 'GET',
    headers: { 'Cookie': cookieHeader }
  }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      console.log(`STATUS: ${res.statusCode}`);
      console.log(`BODY:\n${body}`);
    });
  });
  req.on('error', e => console.error(e));
  req.end();
}

run();
