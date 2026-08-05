const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function countAllRecords() {
  console.log("==================================================");
  console.log("SQLITE DATABASE RECORD COUNT AUDIT");
  console.log("==================================================");

  const counts = {
    users: await prisma.user.count(),
    departments: await prisma.department.count(),
    batches: await prisma.batch.count(),
    sections: await prisma.section.count(),
    academicYears: await prisma.academicYear.count(),
    courses: await prisma.course.count(),
    attendanceSessions: await prisma.attendanceSession.count(),
    studentProfiles: await prisma.studentProfile.count(),
    attendances: await prisma.attendance.count(),
    attendancePolicies: await prisma.attendancePolicy.count(),
    academicRecords: await prisma.academicRecord.count(),
    internships: await prisma.internship.count(),
    certificates: await prisma.certificate.count(),
    achievements: await prisma.achievement.count(),
    projects: await prisma.project.count(),
    skills: await prisma.skill.count(),
    placementDrives: await prisma.placementDrive.count(),
    placementRecords: await prisma.placementRecord.count(),
    alumniRecords: await prisma.alumniRecord.count(),
    studentPosts: await prisma.studentPost.count(),
    postComments: await prisma.postComment.count(),
    notifications: await prisma.notification.count(),
    auditLogs: await prisma.auditLog.count(),
    studentCareerPreferences: await prisma.studentCareerPreference.count(),
    studentRiskSnapshots: await prisma.studentRiskSnapshot.count(),
  };

  console.table(counts);
  return counts;
}

countAllRecords()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
