const https = require('https');

const BASE_URL = 'https://student360-avs.onrender.com';

function request(url, options = {}, postData = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      port: u.port || 443,
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const start = Date.now();
    const req = https.request(opts, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          duration: Date.now() - start,
          headers: res.headers,
          body
        });
      });
    });

    req.on('error', (err) => resolve({ status: 0, duration: Date.now() - start, error: err.message }));
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function run() {
  console.log('--- Logging in to production ---');
  let cookieHeader = '';

  // Try Admin Login with password123 first, then Admin@1234
  for (const pwd of ['password123', 'Admin@1234']) {
    const payload = JSON.stringify({ email: 'admin@student360.edu', password: pwd });
    const loginRes = await request(`${BASE_URL}/api/auth/admin-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, payload);

    console.log(`Login attempt with '${pwd}': status ${loginRes.status}, duration: ${loginRes.duration}ms`);
    if (loginRes.status === 200 && loginRes.headers['set-cookie']) {
      cookieHeader = loginRes.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
      console.log(`Login successful! Cookie obtained.`);
      break;
    }
  }

  if (!cookieHeader) {
    console.error('Failed to log in with known passwords!');
    return;
  }

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

  const results = [];
  for (const ep of endpoints) {
    const res1 = await request(`${BASE_URL}${ep}`, {
      headers: { 'Cookie': cookieHeader }
    });
    await new Promise(r => setTimeout(r, 200));
    const res2 = await request(`${BASE_URL}${ep}`, {
      headers: { 'Cookie': cookieHeader }
    });
    console.log(`${ep.padEnd(25)} | ${res1.status.toString().padStart(6)} | ${res1.duration.toString().padStart(10)} | ${res2.duration.toString().padStart(10)} | ${res1.body.length.toString().padStart(10)} B`);
    results.push({
      endpoint: ep,
      status: res1.status,
      run1: res1.duration,
      run2: res2.duration,
      size: res1.body.length
    });
  }
}

run();
