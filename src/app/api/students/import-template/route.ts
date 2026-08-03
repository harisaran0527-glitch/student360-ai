import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  try {
    const templateData = [
      {
        "Register Number": "7376221CS101",
        "Roll Number": "22CS101",
        "Admission Number": "ADM2022CS01",
        "Student Name": "John Doe",
        "Gender": "Male",
        "Date of Birth": "2004-06-15",
        "Blood Group": "O+",
        "Email": "john.doe@student360.edu",
        "Phone Number": "9876543210",
        "Aadhar Number": "123456789012",
        "Father Name": "Robert Doe",
        "Mother Name": "Mary Doe",
        "Guardian Phone": "9876543211",
        "Emergency Phone": "9876543212",
        "Address Line 1": "123 College Avenue",
        "Address Line 2": "Near Campus Gate",
        "City": "Chennai",
        "State": "Tamil Nadu",
        "Pincode": "600001",
        "Department Code": "CSE",
        "Batch Name": "2022-2026",
        "Section Name": "Section A",
        "Academic Year": "2025-2026",
        "Current Semester": 6,
        "Entry Type": "REGULAR",
        "Admission Quota": "GQ",
        "Residence Type": "DAY_SCHOLAR",
        "Admission Date": "2022-08-01",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Student_Master_Template");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Student_Master_Import_Template.xlsx"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
