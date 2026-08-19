const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("../node_modules/@prisma/client");
const prisma = new PrismaClient();

function getTimestampString() {
  const d = new Date();
  const YYYY = d.getFullYear();
  const MM = String(d.getMonth() + 1).padStart(2, "0");
  const DD = String(d.getDate()).padStart(2, "0");
  const HH = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${YYYY}-${MM}-${DD}-${HH}-${mm}`;
}

async function runBackup() {
  console.log("=== STARTING SYSTEM DATA BACKUP ===");
  const timestamp = getTimestampString();
  const backupDir = path.join(process.cwd(), "backups", timestamp);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  try {
    // 1. Fetch data from Prisma tables
    const rawUsers = await prisma.user.findMany();
    // Exclude passwordHash from user backup for security
    const users = rawUsers.map((u) => {
      const { passwordHash, ...safeUser } = u;
      return safeUser;
    });

    const studentProfiles = await prisma.studentProfile.findMany();
    const academicYears = await prisma.academicYear.findMany();
    const batches = await prisma.batch.findMany();
    const departments = await prisma.department.findMany();
    const courses = await prisma.course.findMany();
    const attendances = await prisma.attendance.findMany();
    const attendanceSessions = await prisma.attendanceSession.findMany();
    const certificates = await prisma.certificate.findMany();
    const internships = await prisma.internship.findMany();
    const projects = await prisma.project.findMany();
    const placementRecords = await prisma.placementRecord.findMany();
    const fullDayAttendances = await prisma.fullDayAttendance.findMany();
    const notifications = await prisma.notification.findMany();
    const auditLogs = await prisma.auditLog.findMany();

    const entities = {
      users,
      studentProfiles,
      academicYears,
      batches,
      departments,
      courses,
      attendances,
      attendanceSessions,
      fullDayAttendances,
      certificates,
      internships,
      projects,
      placementRecords,
      notifications,
      auditLogs,
    };

    const counts = {};

    for (const [key, data] of Object.entries(entities)) {
      const filePath = path.join(backupDir, `${key}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
      counts[key] = data.length;
      console.log(`- Exported ${key}.json (${data.length} records)`);
    }

    const metadata = {
      timestamp: new Date().toISOString(),
      backupFolder: timestamp,
      counts,
    };

    fs.writeFileSync(path.join(backupDir, "metadata.json"), JSON.stringify(metadata, null, 2), "utf-8");

    console.log(`\n=== BACKUP SUCCESSFUL ===`);
    console.log(`Saved under: backups/${timestamp}/`);
    console.log(`Total exported categories: ${Object.keys(entities).length}`);
  } catch (err) {
    console.error("Backup Failed:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runBackup();
