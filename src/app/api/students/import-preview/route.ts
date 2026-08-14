import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { DEFAULT_ACADEMIC_YEAR } from "@/lib/academicYearConstants";
import { apiSuccess, apiError } from "@/lib/apiResponse";

export async function POST(req: Request) {
  try {
    const session = await getSession(req);
    if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN")) {
      return apiError("Unauthorized", 401);
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return apiError("No file uploaded", 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const rawRows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!rawRows || rawRows.length === 0) {
      return apiError("Uploaded spreadsheet is empty", 400);
    }

    // Fetch Existing Identifiers for Duplicate Check
    const [existingStudents, departments, batches] = await Promise.all([
      prisma.studentProfile.findMany({
        select: { registerNo: true, admissionNo: true, email: true },
      }),
      prisma.department.findMany(),
      prisma.batch.findMany(),
    ]);

    const existingRegNos = new Set(existingStudents.map((s) => s.registerNo.toLowerCase()));
    const existingAdmNos = new Set(existingStudents.map((s) => s.admissionNo.toLowerCase()));
    const existingEmails = new Set(existingStudents.map((s) => s.email.toLowerCase()));

    const deptMap = new Map(departments.map((d) => [d.code.toLowerCase(), d.id]));
    const batchMap = new Map(batches.map((b) => [b.name.toLowerCase(), b.id]));

    const validRows: any[] = [];
    const invalidRows: any[] = [];
    const duplicateRows: any[] = [];

    const fileRegNos = new Set<string>();
    const fileAdmNos = new Set<string>();
    const fileEmails = new Set<string>();

    rawRows.forEach((row, index) => {
      // Flexibly extract column names
      const registerNo = String(row["Register Number"] || row["Register No"] || row["registerNo"] || "").trim();
      const rollNo = String(row["Roll Number"] || row["Roll No"] || row["rollNo"] || "").trim();
      const admissionNo = String(row["Admission Number"] || row["Admission No"] || row["admissionNo"] || "").trim();
      const fullName = String(row["Student Name"] || row["Full Name"] || row["fullName"] || "").trim();
      const gender = String(row["Gender"] || "Male").trim();
      const dob = String(row["Date of Birth"] || row["DOB"] || "2004-06-15").trim();
      const bloodGroup = String(row["Blood Group"] || "O+").trim();
      const email = String(row["Email"] || row["Institutional Email"] || "").trim();
      const phone = String(row["Phone Number"] || row["Phone"] || "9876543210").trim();
      const aadharNo = String(row["Aadhar Number"] || row["Aadhar No"] || "").trim();
      const fatherName = String(row["Father Name"] || "Father Name").trim();
      const motherName = String(row["Mother Name"] || "Mother Name").trim();
      const guardianPhone = String(row["Guardian Phone"] || "").trim();
      const emergencyPhone = String(row["Emergency Phone"] || "9876543210").trim();
      const addressLine1 = String(row["Address Line 1"] || "Address Line 1").trim();
      const addressLine2 = String(row["Address Line 2"] || "").trim();
      const city = String(row["City"] || "Chennai").trim();
      const state = String(row["State"] || "Tamil Nadu").trim();
      const pincode = String(row["Pincode"] || "600001").trim();
      const deptCode = String(row["Department Code"] || row["Department"] || "").trim();
      const batchName = String(row["Batch Name"] || row["Batch"] || "").trim();
      const sectionName = String(row["Section Name"] || row["Section"] || "").trim();
      const academicYear = String(row["Academic Year"] || DEFAULT_ACADEMIC_YEAR).trim();
      const currentSemester = parseInt(row["Current Semester"] || row["Semester"] || "1", 10);
      const entryType = String(row["Entry Type"] || "REGULAR").trim();
      const residenceType = String(row["Residence Type"] || "DAY_SCHOLAR").trim();
      const admissionDate = String(row["Admission Date"] || new Date().toISOString().split("T")[0]).trim();

      // Normalize Admission Quota
      const rawQuota = String(row["Admission Quota"] || row["Quota"] || "").trim();
      let admissionQuota = "";
      if (rawQuota) {
        const q = rawQuota.toUpperCase();
        if (q === "GQ" || q === "GOVERNMENT QUOTA" || q === "GOVERNMENT") {
          admissionQuota = "GQ";
        } else if (q === "MQ" || q === "MANAGEMENT QUOTA" || q === "MANAGEMENT") {
          admissionQuota = "MQ";
        }
      }

      const errors: string[] = [];

      // Validation Rules
      if (!registerNo) errors.push("Missing Register Number");
      if (!rollNo) errors.push("Missing Roll Number");
      if (!admissionNo) errors.push("Missing Admission Number");
      if (!fullName) errors.push("Missing Full Name");
      if (!email || !email.includes("@")) errors.push("Invalid Email Address");
      if (!admissionQuota) errors.push("Missing or invalid Admission Quota (Must be GQ or MQ)");

      const deptId = deptMap.get(deptCode.toLowerCase()) || (departments.length > 0 ? departments[0].id : null);
      const batchId = batchMap.get(batchName.toLowerCase()) || (batches.length > 0 ? batches[0].id : null);

      if (!deptId) errors.push(`Department code '${deptCode}' not found`);
      if (!batchId) errors.push(`Batch name '${batchName}' not found`);

      // Duplicate Check against DB and In-File
      const regLower = registerNo.toLowerCase();
      const admLower = admissionNo.toLowerCase();
      const emailLower = email.toLowerCase();

      const isDbDuplicate =
        existingRegNos.has(regLower) || existingAdmNos.has(admLower) || existingEmails.has(emailLower);
      const isFileDuplicate =
        fileRegNos.has(regLower) || fileAdmNos.has(admLower) || fileEmails.has(emailLower);

      const mappedRow = {
        rowIndex: index + 2,
        registerNo,
        rollNo,
        admissionNo,
        fullName,
        gender,
        dob,
        bloodGroup,
        email,
        phone,
        aadharNo,
        fatherName,
        motherName,
        guardianPhone,
        emergencyPhone,
        addressLine1,
        addressLine2,
        city,
        state,
        pincode,
        departmentId: deptId,
        departmentCode: deptCode,
        batchId,
        batchName,
        sectionName,
        academicYear,
        currentSemester,
        entryType,
        admissionQuota,
        residenceType,
        admissionDate,
        errors,
      };

      if (isDbDuplicate || isFileDuplicate) {
        duplicateRows.push({
          ...mappedRow,
          duplicateReason: isDbDuplicate ? "Already exists in database" : "Duplicate inside Excel file",
        });
      } else if (errors.length > 0) {
        invalidRows.push(mappedRow);
      } else {
        fileRegNos.add(regLower);
        fileAdmNos.add(admLower);
        fileEmails.add(emailLower);
        validRows.push(mappedRow);
      }
    });

    return apiSuccess({
      totalRows: rawRows.length,
      validRows,
      invalidRows,
      duplicateRows,
    });
  } catch (error: any) {
    return apiError(error.message || "Failed to parse import preview", 500);
  }
}
