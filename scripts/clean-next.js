const fs = require('fs');
const path = require('path');

const nextDir = path.join(__dirname, '..', '.next');
if (fs.existsSync(nextDir)) {
  try {
    fs.rmSync(nextDir, { recursive: true, force: true });
    console.log(".next directory removed successfully");
  } catch (e) {
    console.error("Failed to remove .next:", e);
  }
} else {
  console.log(".next directory does not exist");
}
