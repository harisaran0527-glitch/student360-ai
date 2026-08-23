const fs = require("fs");
const path = require("path");

function analyze() {
  const backupDir = path.join(__dirname, "..", "backups", "2026-08-19-22-33");
  if (!fs.existsSync(backupDir)) {
    console.log("Backup directory not found.");
    return;
  }

  const profiles = JSON.parse(fs.readFileSync(path.join(backupDir, "studentProfiles.json"), "utf8"));
  const records = JSON.parse(fs.readFileSync(path.join(backupDir, "fullDayAttendances.json"), "utf8"));

  console.log(`Profiles loaded: ${profiles.length}`);
  console.log(`Records loaded: ${records.length}`);

  // Inspect the academicYear and departmentId of students who have records
  console.log("\n--- Students with saved records: ---");
  const studentMap = {};
  profiles.forEach(p => {
    studentMap[p.id] = p;
  });

  const recordStats = {};
  records.forEach(r => {
    const student = studentMap[r.studentId];
    if (!student) {
      console.log(`Warning: Record has studentId ${r.studentId} but no profile exists!`);
      return;
    }
    const key = `${student.academicYear} | ${student.departmentId} | ${student.fullName} (${student.registerNo})`;
    recordStats[key] = (recordStats[key] || 0) + 1;
  });

  console.log(recordStats);
}

analyze();
