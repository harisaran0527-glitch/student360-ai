const { PrismaClient: PostgresPrisma } = require("@prisma/client");
const { PrismaClient: SqlitePrisma } = require("@prisma/client-sqlite");

async function runDataMigration() {
  console.log("==================================================");
  console.log("SQLITE TO SUPABASE POSTGRESQL LIVE MIGRATION");
  console.log("==================================================");

  const sqlite = new SqlitePrisma();
  const pg = new PostgresPrisma();

  try {
    // 1. Audit SQLite Local Backup Record Counts
    console.log("\n[STEP 1] Reading local SQLite backup records...");
    const sqliteCounts = {
      departments: await sqlite.department.count(),
      academicYears: await sqlite.academicYear.count(),
      batches: await sqlite.batch.count(),
      sections: await sqlite.section.count(),
      courses: await sqlite.course.count(),
      users: await sqlite.user.count(),
      studentProfiles: await sqlite.studentProfile.count(),
      academicRecords: await sqlite.academicRecord.count(),
      internships: await sqlite.internship.count(),
      certificates: await sqlite.certificate.count(),
      projects: await sqlite.project.count(),
      skills: await sqlite.skill.count(),
      notifications: await sqlite.notification.count(),
      auditLogs: await sqlite.auditLog.count(),
    };

    console.log("--> SQLite Backup Record Summary:");
    console.table(sqliteCounts);

    console.log("\n[STEP 2] Streaming records into Supabase PostgreSQL Cloud Database...");

    // Helper to migrate table records using spread
    const migrateTable = async (name, records, modelDelegate) => {
      let migrated = 0;
      for (const item of records) {
        await modelDelegate.upsert({
          where: { id: item.id },
          update: { ...item },
          create: { ...item },
        });
        migrated++;
      }
      console.log(`--> ${name} migrated: ${migrated}`);
    };

    // 1. Department
    await migrateTable("Departments", await sqlite.department.findMany(), pg.department);

    // 2. AcademicYear
    await migrateTable("Academic Years", await sqlite.academicYear.findMany(), pg.academicYear);

    // 3. Batch
    await migrateTable("Batches", await sqlite.batch.findMany(), pg.batch);

    // 4. Section
    await migrateTable("Sections", await sqlite.section.findMany(), pg.section);

    // 5. Course / Subject
    await migrateTable("Courses/Subjects", await sqlite.course.findMany(), pg.course);

    // 6. User
    await migrateTable("Users", await sqlite.user.findMany(), pg.user);

    // 7. StudentProfile
    await migrateTable("Student Profiles", await sqlite.studentProfile.findMany(), pg.studentProfile);

    // 8. AcademicRecord
    await migrateTable("Academic Records", await sqlite.academicRecord.findMany(), pg.academicRecord);

    // 9. Internship
    await migrateTable("Internships", await sqlite.internship.findMany(), pg.internship);

    // 10. Certificate
    await migrateTable("Certificates", await sqlite.certificate.findMany(), pg.certificate);

    // 11. Project
    await migrateTable("Projects", await sqlite.project.findMany(), pg.project);

    // 12. Skill
    await migrateTable("Skills", await sqlite.skill.findMany(), pg.skill);

    // 13. PlacementDrive
    await migrateTable("Placement Drives", await sqlite.placementDrive.findMany(), pg.placementDrive);

    // 14. PlacementRecord
    await migrateTable("Placement Records", await sqlite.placementRecord.findMany(), pg.placementRecord);

    // 15. AlumniRecord
    await migrateTable("Alumni Records", await sqlite.alumniRecord.findMany(), pg.alumniRecord);

    // 16. StudentPost
    await migrateTable("Student Posts", await sqlite.studentPost.findMany(), pg.studentPost);

    // 17. PostComment
    await migrateTable("Post Comments", await sqlite.postComment.findMany(), pg.postComment);

    // 18. Notifications
    await migrateTable("Notifications", await sqlite.notification.findMany(), pg.notification);

    // 19. AuditLog
    await migrateTable("Audit Logs", await sqlite.auditLog.findMany(), pg.auditLog);

    // 3. Verify Remote PostgreSQL Table Record Counts
    console.log("\n[STEP 3] Verifying Remote Supabase PostgreSQL Record Counts...");
    const pgCounts = {
      users: await pg.user.count(),
      departments: await pg.department.count(),
      batches: await pg.batch.count(),
      sections: await pg.section.count(),
      courses: await pg.course.count(),
      studentProfiles: await pg.studentProfile.count(),
      academicRecords: await pg.academicRecord.count(),
      internships: await pg.internship.count(),
      certificates: await pg.certificate.count(),
      projects: await pg.project.count(),
      skills: await pg.skill.count(),
      notifications: await pg.notification.count(),
      auditLogs: await pg.auditLog.count(),
    };

    console.log("--> Remote Supabase PostgreSQL Record Counts Summary:");
    console.table(pgCounts);

    console.log("\n>>> SQLITE TO SUPABASE POSTGRESQL MIGRATION COMPLETED SUCCESSFULLY! 🚀");
  } catch (err) {
    console.error("Migration Error:", err.message);
  } finally {
    await sqlite.$disconnect();
    await pg.$disconnect();
  }
}

runDataMigration();
