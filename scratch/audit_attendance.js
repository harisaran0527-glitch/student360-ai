const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function runAudit() {
  console.log("=== STARTING ATTENDANCE AUDIT ===");
  try {
    // 1. Fetch all FullDayAttendance records
    const records = await prisma.fullDayAttendance.findMany({
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            registerNo: true,
            user: {
              select: {
                id: true,
              }
            }
          }
        }
      }
    });

    console.log(`Total FullDayAttendance rows: ${records.length}`);

    if (records.length === 0) {
      console.log("No FullDayAttendance records found in the database.");
      return;
    }

    // 2. Distinct saved dates
    const dates = [...new Set(records.map(r => r.date))].sort();
    console.log(`Distinct saved dates (${dates.length}):`, dates);

    // 3. Records per date
    console.log("\n--- Records per Date ---");
    const recordsPerDate = {};
    dates.forEach(d => {
      recordsPerDate[d] = records.filter(r => r.date === d).length;
    });
    console.log(recordsPerDate);

    // 4. Status counts
    console.log("\n--- Status Counts ---");
    const statusCounts = {
      PRESENT: 0,
      ABSENT: 0,
      OD: 0,
      MEDICAL_LEAVE: 0,
      LONG_ABSENT: 0,
      OTHER: 0
    };
    records.forEach(r => {
      const status = r.status.toUpperCase();
      if (statusCounts[status] !== undefined) {
        statusCounts[status]++;
      } else {
        statusCounts.OTHER++;
      }
    });
    console.log(statusCounts);

    // 5. Records per student
    console.log("\n--- Records per Student ---");
    const studentRecords = {};
    records.forEach(r => {
      const sId = r.studentId;
      const reg = r.student?.registerNo || "Unknown";
      const name = r.student?.fullName || "Unknown";
      const key = `${sId} (${reg} - ${name})`;
      studentRecords[key] = (studentRecords[key] || 0) + 1;
    });
    console.log(studentRecords);

    // 6. Detailed Saved Dates Table
    console.log("\n--- Date Summary Table ---");
    console.log("Date | Total Marked | Present | Absent | OD | ML | Long Absent");
    console.log("-----------------------------------------------------------------");
    dates.forEach(d => {
      const dayRecords = records.filter(r => r.date === d);
      const totalMarked = dayRecords.length;
      const present = dayRecords.filter(r => r.status.toUpperCase() === "PRESENT").length;
      const absent = dayRecords.filter(r => r.status.toUpperCase() === "ABSENT").length;
      const od = dayRecords.filter(r => r.status.toUpperCase() === "OD").length;
      const ml = dayRecords.filter(r => r.status.toUpperCase() === "MEDICAL_LEAVE" || r.status.toUpperCase() === "ML").length;
      const longAbsent = dayRecords.filter(r => r.status.toUpperCase() === "LONG_ABSENT").length;
      console.log(`${d} | ${totalMarked} | ${present} | ${absent} | ${od} | ${ml} | ${longAbsent}`);
    });

    // 7. Pick one student who has multiple saved attendance records
    console.log("\n--- Tracing one real student end-to-end ---");
    // Find a student with multiple records
    const studentIds = Object.keys(studentRecords).map(k => k.split(" ")[0]);
    let targetStudentId = null;
    for (const sId of studentIds) {
      const count = records.filter(r => r.studentId === sId).length;
      if (count > 1) {
        targetStudentId = sId;
        break;
      }
    }

    if (!targetStudentId && studentIds.length > 0) {
      targetStudentId = studentIds[0];
    }

    if (targetStudentId) {
      const studentProfile = await prisma.studentProfile.findUnique({
        where: { id: targetStudentId },
        include: { user: true }
      });
      const studentRecordsForTarget = records.filter(r => r.studentId === targetStudentId);

      console.log(`User.id: ${studentProfile?.userId}`);
      console.log(`StudentProfile.id: ${studentProfile?.id}`);
      console.log(`FullDayAttendance.studentId values: ${[...new Set(studentRecordsForTarget.map(r => r.studentId))].join(", ")}`);
      console.log(`All saved dates: ${studentRecordsForTarget.map(r => r.date).join(", ")}`);
      console.log(`All statuses: ${studentRecordsForTarget.map(r => r.status).join(", ")}`);
      console.log(`Verification: FullDayAttendance.studentId === StudentProfile.id is ${studentRecordsForTarget.every(r => r.studentId === studentProfile.id)}`);
    } else {
      console.log("No student found with any FullDayAttendance records.");
    }

  } catch (err) {
    console.error("Audit failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

runAudit();
