const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("../node_modules/@prisma/client");
const prisma = new PrismaClient();

async function runRestore() {
  const args = process.argv.slice(2);
  const backupFolderArg = args.find((a) => !a.startsWith("--"));
  const hasConfirmFlag = args.includes("--confirm");

  if (!backupFolderArg) {
    console.error("Error: Missing backup folder parameter.");
    console.log("Usage: npm run restore:data -- <backup-folder-name> [--confirm]");
    console.log("Example: npm run restore:data -- 2026-08-08-14-25 --confirm");
    process.exit(1);
  }

  // Resolve target backup directory path
  let backupDir = path.resolve(backupFolderArg);
  if (!fs.existsSync(backupDir)) {
    backupDir = path.join(process.cwd(), "backups", backupFolderArg);
  }

  console.log(`=== STARTING RESTORE VALIDATION FOR: ${backupDir} ===`);

  if (!fs.existsSync(backupDir)) {
    console.error(`Error: Target backup directory does not exist: ${backupDir}`);
    process.exit(1);
  }

  const metadataPath = path.join(backupDir, "metadata.json");
  if (!fs.existsSync(metadataPath)) {
    console.error("Error: Invalid backup folder. Missing metadata.json.");
    process.exit(1);
  }

  const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
  console.log(`- Backup Timestamp: ${metadata.timestamp}`);
  console.log(`- Contained entity categories: ${Object.keys(metadata.counts || {}).join(", ")}`);

  if (!hasConfirmFlag) {
    console.warn("\n[SAFETY WARNING] Restoring data requires explicit confirmation.");
    console.warn("To execute restore, run the command with the --confirm flag:");
    console.warn(`npm run restore:data -- ${backupFolderArg} --confirm\n`);
    process.exit(0);
  }

  console.log("\n=== EXECUTING SAFE RESTORE TRANSACTION ===");

  const readEntity = (filename) => {
    const p = path.join(backupDir, `${filename}.json`);
    if (!fs.existsSync(p)) return [];
    try {
      return JSON.parse(fs.readFileSync(p, "utf-8"));
    } catch {
      return [];
    }
  };

  const results = {
    imported: {},
    skipped: {},
    failed: {},
  };

  try {
    const departments = readEntity("departments");
    const academicYears = readEntity("academicYears");
    const batches = readEntity("batches");
    const users = readEntity("users");
    const studentProfiles = readEntity("studentProfiles");
    const courses = readEntity("courses");
    const attendanceSessions = readEntity("attendanceSessions");
    const attendances = readEntity("attendances");
    const certificates = readEntity("certificates");
    const internships = readEntity("internships");
    const projects = readEntity("projects");
    const placementRecords = readEntity("placementRecords");
    const notifications = readEntity("notifications");
    const auditLogs = readEntity("auditLogs");

    await prisma.$transaction(
      async (tx) => {
      // 1. Departments
      let deptImported = 0, deptSkipped = 0;
      for (const d of departments) {
        const exists = await tx.department.findUnique({ where: { id: d.id } });
        if (!exists) {
          await tx.department.create({ data: d });
          deptImported++;
        } else {
          deptSkipped++;
        }
      }
      results.imported.departments = deptImported;
      results.skipped.departments = deptSkipped;

      // 2. AcademicYears
      let ayImported = 0, aySkipped = 0;
      for (const ay of academicYears) {
        const exists = await tx.academicYear.findUnique({ where: { id: ay.id } });
        if (!exists) {
          await tx.academicYear.create({ data: ay });
          ayImported++;
        } else {
          aySkipped++;
        }
      }
      results.imported.academicYears = ayImported;
      results.skipped.academicYears = aySkipped;

      // 3. Batches
      let batchImported = 0, batchSkipped = 0;
      for (const b of batches) {
        const exists = await tx.batch.findUnique({ where: { id: b.id } });
        if (!exists) {
          await tx.batch.create({ data: b });
          batchImported++;
        } else {
          batchSkipped++;
        }
      }
      results.imported.batches = batchImported;
      results.skipped.batches = batchSkipped;

      // 4. Users
      let userImported = 0, userSkipped = 0;
      for (const u of users) {
        const exists = await tx.user.findUnique({ where: { id: u.id } });
        if (!exists) {
          // Supply default password hash if omitted from backup
          const dataToInsert = {
            ...u,
            passwordHash: u.passwordHash || "$2a$10$UnA6xG3P1k5F5x.xWzXg/uK2E8jE.J3J4K5L6M7N8O9P0Q1R2S3T",
          };
          await tx.user.create({ data: dataToInsert });
          userImported++;
        } else {
          userSkipped++;
        }
      }
      results.imported.users = userImported;
      results.skipped.users = userSkipped;

      // 5. StudentProfiles
      let profImported = 0, profSkipped = 0;
      for (const sp of studentProfiles) {
        const exists = await tx.studentProfile.findUnique({ where: { id: sp.id } });
        if (!exists) {
          await tx.studentProfile.create({ data: sp });
          profImported++;
        } else {
          profSkipped++;
        }
      }
      results.imported.studentProfiles = profImported;
      results.skipped.studentProfiles = profSkipped;

      // 6. Courses
      let courseImported = 0, courseSkipped = 0;
      for (const c of courses) {
        const exists = await tx.course.findUnique({ where: { id: c.id } });
        if (!exists) {
          await tx.course.create({ data: c });
          courseImported++;
        } else {
          courseSkipped++;
        }
      }
      results.imported.courses = courseImported;
      results.skipped.courses = courseSkipped;

      // 7. AttendanceSessions
      let sessImported = 0, sessSkipped = 0;
      for (const s of attendanceSessions) {
        const exists = await tx.attendanceSession.findUnique({ where: { id: s.id } });
        if (!exists) {
          await tx.attendanceSession.create({ data: s });
          sessImported++;
        } else {
          sessSkipped++;
        }
      }
      results.imported.attendanceSessions = sessImported;
      results.skipped.attendanceSessions = sessSkipped;

      // 8. Attendances
      let attImported = 0, attSkipped = 0;
      for (const a of attendances) {
        const exists = await tx.attendance.findUnique({ where: { id: a.id } });
        if (!exists) {
          await tx.attendance.create({ data: a });
          attImported++;
        } else {
          attSkipped++;
        }
      }
      results.imported.attendances = attImported;
      results.skipped.attendances = attSkipped;

      // 9. Certificates
      let certImported = 0, certSkipped = 0;
      for (const cert of certificates) {
        const exists = await tx.certificate.findUnique({ where: { id: cert.id } });
        if (!exists) {
          await tx.certificate.create({ data: cert });
          certImported++;
        } else {
          certSkipped++;
        }
      }
      results.imported.certificates = certImported;
      results.skipped.certificates = certSkipped;

      // 10. Internships
      let intImported = 0, intSkipped = 0;
      for (const i of internships) {
        const exists = await tx.internship.findUnique({ where: { id: i.id } });
        if (!exists) {
          await tx.internship.create({ data: i });
          intImported++;
        } else {
          intSkipped++;
        }
      }
      results.imported.internships = intImported;
      results.skipped.internships = intSkipped;

      // 11. Projects
      let projImported = 0, projSkipped = 0;
      for (const p of projects) {
        const exists = await tx.project.findUnique({ where: { id: p.id } });
        if (!exists) {
          await tx.project.create({ data: p });
          projImported++;
        } else {
          projSkipped++;
        }
      }
      results.imported.projects = projImported;
      results.skipped.projects = projSkipped;

      // 12. PlacementRecords
      let placeImported = 0, placeSkipped = 0;
      for (const pr of placementRecords) {
        const exists = await tx.placementRecord.findUnique({ where: { id: pr.id } });
        if (!exists) {
          await tx.placementRecord.create({ data: pr });
          placeImported++;
        } else {
          placeSkipped++;
        }
      }
      results.imported.placementRecords = placeImported;
      results.skipped.placementRecords = placeSkipped;

      // 13. Notifications
      let notifImported = 0, notifSkipped = 0;
      for (const n of notifications) {
        const exists = await tx.notification.findUnique({ where: { id: n.id } });
        if (!exists) {
          await tx.notification.create({ data: n });
          notifImported++;
        } else {
          notifSkipped++;
        }
      }
      results.imported.notifications = notifImported;
      results.skipped.notifications = notifSkipped;

      // 14. AuditLogs
      let logImported = 0, logSkipped = 0;
      for (const l of auditLogs) {
        const exists = await tx.auditLog.findUnique({ where: { id: l.id } });
        if (!exists) {
          await tx.auditLog.create({ data: l });
          logImported++;
        } else {
          logSkipped++;
        }
      }
      results.imported.auditLogs = logImported;
      results.skipped.auditLogs = logSkipped;
    }, { maxWait: 30000, timeout: 120000 });

    console.log("\n=== RESTORE COMPLETED SUCCESSFULLY ===");
    console.log("Summary of Restored Record Counts:");
    for (const cat of Object.keys(results.imported)) {
      console.log(`- ${cat}: Imported ${results.imported[cat]}, Skipped Existing ${results.skipped[cat]}`);
    }
  } catch (err) {
    console.error("\nError during restore transaction:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runRestore();
