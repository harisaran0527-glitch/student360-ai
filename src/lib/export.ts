import * as XLSX from "xlsx";

export function generateStudentTemplateExcel(): Buffer {
  const headers = [
    "Register No",
    "Roll No",
    "Admission No",
    "Full Name",
    "Gender",
    "Date of Birth (YYYY-MM-DD)",
    "Blood Group",
    "Email",
    "Phone",
    "Aadhar No",
    "Father Name",
    "Mother Name",
    "Guardian Phone",
    "Emergency Phone",
    "Address Line 1",
    "Address Line 2",
    "City",
    "State",
    "Pincode",
    "Department Code",
    "Batch Name",
    "Section Name",
    "Current Semester",
    "Entry Type",
    "Admission Quota",
    "Residence Type",
    "Admission Date",
  ];

  const sampleRow = [
    "REG2025001",
    "22CS01",
    "ADM202501",
    "John Doe",
    "Male",
    "2004-05-15",
    "O+",
    "john.doe@example.com",
    "9876543210",
    "123456789012",
    "Robert Doe",
    "Sarah Doe",
    "9876543211",
    "9876543210",
    "123 Academic Way",
    "Suite 404",
    "Chennai",
    "Tamil Nadu",
    "600001",
    "CSE",
    "2022-2026",
    "Section A",
    "5",
    "REGULAR",
    "GOVERNMENT",
    "HOSTELER",
    "2022-08-10",
  ];

  const worksheet = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Student Master Format");

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

export function exportDataToExcel(data: any[], sheetName: string = "ExportData"): Buffer {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}
