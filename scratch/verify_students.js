const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function verify() {
  console.log("=== LIVE AUDIT FOR 5 REAL STUDENTS ===");
  try {
    const students = await prisma.studentProfile.findMany({
      where: {
        fullDayAttendances: {
          some: {}
        }
      },
      include: {
        fullDayAttendances: true
      },
      take: 15
    });

    console.log("Student | P | A | OD | ML | Long Absent | Saved Days | Expected % | DB %");
    console.log("---------------------------------------------------------------------------------");

    for (const st of students) {
      const records = st.fullDayAttendances.filter(r => r.status.toUpperCase() !== "UNMARKED");
      const savedDays = records.length;
      
      const p = records.filter(r => r.status.toUpperCase() === "PRESENT").length;
      const a = records.filter(r => r.status.toUpperCase() === "ABSENT").length;
      const od = records.filter(r => r.status.toUpperCase() === "OD").length;
      const ml = records.filter(r => r.status.toUpperCase() === "MEDICAL_LEAVE" || r.status.toUpperCase() === "ML").length;
      const la = records.filter(r => r.status.toUpperCase() === "LONG_ABSENT").length;

      const presentSide = p + od + ml;
      const expectedPct = savedDays > 0 ? Math.round((presentSide / savedDays) * 100 * 100) / 100 : 0.0;
      
      console.log(`${st.fullName} | ${p} | ${a} | ${od} | ${ml} | ${la} | ${savedDays} | ${expectedPct}% | ${st.attendancePercentage}%`);
    }
  } catch (err) {
    console.error("Verification failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

verify();
