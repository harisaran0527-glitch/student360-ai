const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function recalculate() {
  console.log("=== RECALCULATING ALL STUDENT ATTENDANCE PERCENTAGES ===");
  try {
    const students = await prisma.studentProfile.findMany({
      include: {
        fullDayAttendances: true
      }
    });

    console.log(`Loaded ${students.length} students.`);

    for (const student of students) {
      const records = student.fullDayAttendances.filter(
        r => r.status.toUpperCase() !== "UNMARKED"
      );

      const total = records.length;
      const present = records.filter(r => {
        const s = r.status.toUpperCase();
        return s === "PRESENT" || s === "OD" || s === "MEDICAL_LEAVE" || s === "ML";
      }).length;

      const percentage = total > 0 ? Math.round((present / total) * 100 * 100) / 100 : 0.0;

      await prisma.studentProfile.update({
        where: { id: student.id },
        data: { attendancePercentage: percentage }
      });

      console.log(`Student: ${student.fullName} (${student.registerNo}) | Saved Days: ${total} | Present-side: ${present} | New %: ${percentage}%`);
    }

    console.log("=== PERCENTAGE RECALCULATION COMPLETE ===");
  } catch (err) {
    console.error("Recalculation failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

recalculate();
