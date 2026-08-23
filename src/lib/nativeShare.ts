/**
 * Canvas & Web Share API Module for Student360 Attendance
 * Draws attendance status reports directly onto HTML5 Canvas using pure HEX/RGB colors.
 * Completely eliminates html2canvas dependencies and modern CSS color parsing errors (lab, oklch, color-mix).
 */

export interface ShareStatusReportParams {
  date: string;
  subject?: string;
  period?: number | string;
  status: string; // 'Present', 'Absent', 'OD', 'ML', 'Long Absent', 'ALL'
  totalStudentsCount: number;
  studentList: Array<{
    id?: string | number;
    studentName: string;
    registerNumber: string;
    status: string;
  }>;
  fileName: string;
}

/**
 * Renders an attendance report directly onto an HTML5 Canvas using 2D context.
 * Dynamically scales canvas height to include every single student row.
 * Returns a PNG File object.
 */
export async function generateStatusReportImageCanvas(params: ShareStatusReportParams): Promise<File> {
  const { date, subject = "Full-Day Session", period = 1, status, studentList, fileName } = params;

  // 1. Calculate dynamic height based on student count
  const canvasWidth = 800;
  const padding = 32;
  const headerHeight = 150;
  const tableHeaderHeight = 40;
  const rowHeight = 36;
  const minRows = Math.max(studentList.length, 1);
  const footerHeight = 60;

  const canvasHeight = headerHeight + tableHeaderHeight + minRows * rowHeight + footerHeight;

  // 2. High-DPI (Retina 2x) Canvas setup for ultra-crisp text
  const dpr = 2;
  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth * dpr;
  canvas.height = canvasHeight * dpr;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not initialize 2D canvas context");
  }

  ctx.scale(dpr, dpr);

  // 3. Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // 4. Outer border
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, canvasWidth - 2, canvasHeight - 2);

  // 5. Header Bar
  ctx.fillStyle = "#0f172a"; // Dark slate
  ctx.fillRect(0, 0, canvasWidth, 60);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 20px system-ui, -apple-system, sans-serif";
  ctx.fillText("STUDENT360 - ATTENDANCE REPORT", padding, 38);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "500 13px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("OFFICIAL ATTENDANCE RECORD", canvasWidth - padding, 38);
  ctx.textAlign = "left";

  // 6. Report Metadata (Date, Subject, Session)
  const metaY = 85;
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 18px system-ui, -apple-system, sans-serif";
  ctx.fillText(`Date: ${date}`, padding, metaY + 15);

  ctx.fillStyle = "#475569";
  ctx.font = "500 13px system-ui, -apple-system, sans-serif";
  ctx.fillText(`Class: AI & ML  |  Session: ${subject}`, padding, metaY + 38);

  // Status Badge Pill calculation
  const displayStatus = status === "ALL" ? "Total Students" : status;
  const badgeText = `${displayStatus} (${studentList.length})`;
  ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
  const badgeWidth = ctx.measureText(badgeText).width + 24;
  const badgeX = canvasWidth - padding - badgeWidth;
  const badgeY = metaY + 8;

  let badgeBg = "#e0e7ff";
  let badgeColor = "#3730a3";
  let badgeBorder = "#c7d2fe";

  const sLower = status.toLowerCase();
  if (sLower.includes("present")) {
    badgeBg = "#d1fae5";
    badgeColor = "#065f46";
    badgeBorder = "#a7f3d0";
  } else if (sLower.includes("absent") && !sLower.includes("long")) {
    badgeBg = "#ffe4e6";
    badgeColor = "#9f1239";
    badgeBorder = "#fecdd3";
  } else if (sLower.includes("od") || sLower.includes("on duty")) {
    badgeBg = "#dbeafe";
    badgeColor = "#1e40af";
    badgeBorder = "#bfdbfe";
  } else if (sLower.includes("ml") || sLower.includes("medical")) {
    badgeBg = "#f3e8ff";
    badgeColor = "#6b21a8";
    badgeBorder = "#e9d5ff";
  } else if (sLower.includes("long") || sLower.includes("la")) {
    badgeBg = "#f4f4f5";
    badgeColor = "#27272a";
    badgeBorder = "#e4e4e7";
  }

  // Draw Rounded Status Badge Pill
  ctx.fillStyle = badgeBg;
  ctx.strokeStyle = badgeBorder;
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (typeof (ctx as any).roundRect === "function") {
    (ctx as any).roundRect(badgeX, badgeY, badgeWidth, 30, 15);
  } else {
    ctx.rect(badgeX, badgeY, badgeWidth, 30);
  }
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = badgeColor;
  ctx.textAlign = "center";
  ctx.fillText(badgeText, badgeX + badgeWidth / 2, badgeY + 20);
  ctx.textAlign = "left";

  // 7. Table Header
  const tableStartY = headerHeight;
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(padding, tableStartY, canvasWidth - padding * 2, tableHeaderHeight);

  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 1;
  ctx.strokeRect(padding, tableStartY, canvasWidth - padding * 2, tableHeaderHeight);

  ctx.fillStyle = "#475569";
  ctx.font = "bold 12px system-ui, -apple-system, sans-serif";

  const colIndexX = padding + 16;
  const colNameX = padding + 60;
  const colRegX = padding + 420;
  const colStatusX = canvasWidth - padding - 16;

  ctx.fillText("#", colIndexX, tableStartY + 25);
  ctx.fillText("STUDENT NAME", colNameX, tableStartY + 25);
  ctx.fillText("REGISTER NUMBER", colRegX, tableStartY + 25);

  ctx.textAlign = "right";
  ctx.fillText("STATUS", colStatusX, tableStartY + 25);
  ctx.textAlign = "left";

  // 8. Table Rows (Every student row drawn)
  let currentY = tableStartY + tableHeaderHeight;

  if (studentList.length === 0) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(padding, currentY, canvasWidth - padding * 2, rowHeight);
    ctx.strokeRect(padding, currentY, canvasWidth - padding * 2, rowHeight);

    ctx.fillStyle = "#64748b";
    ctx.font = "500 13px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("No students found for this status.", canvasWidth / 2, currentY + 23);
    ctx.textAlign = "left";
    currentY += rowHeight;
  } else {
    studentList.forEach((student, idx) => {
      const isEven = idx % 2 === 0;
      ctx.fillStyle = isEven ? "#ffffff" : "#f8fafc";
      ctx.fillRect(padding, currentY, canvasWidth - padding * 2, rowHeight);

      ctx.strokeStyle = "#e2e8f0";
      ctx.strokeRect(padding, currentY, canvasWidth - padding * 2, rowHeight);

      // Index #
      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 12px monospace";
      ctx.fillText((idx + 1).toString(), colIndexX, currentY + 23);

      // Student Name
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
      ctx.fillText(student.studentName, colNameX, currentY + 23);

      // Register Number
      ctx.fillStyle = "#4338ca";
      ctx.font = "bold 13px monospace";
      ctx.fillText(student.registerNumber, colRegX, currentY + 23);

      // Status Text
      ctx.fillStyle = badgeColor;
      ctx.font = "bold 12px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(student.status, colStatusX, currentY + 23);
      ctx.textAlign = "left";

      currentY += rowHeight;
    });
  }

  // 9. Footer Summary
  const footerY = currentY + 15;
  ctx.fillStyle = "#64748b";
  ctx.font = "500 11px system-ui, -apple-system, sans-serif";
  ctx.fillText(`Total Displayed: ${studentList.length} student(s)`, padding, footerY + 15);

  ctx.textAlign = "right";
  ctx.fillText("Student360 AI Enterprise ERP", canvasWidth - padding, footerY + 15);
  ctx.textAlign = "left";

  // 10. Convert Canvas to PNG Blob
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/png");
  });

  if (!blob) {
    throw new Error("Failed to generate PNG image from Canvas");
  }

  return new File([blob], fileName, { type: "image/png" });
}

/**
 * Main Share Handler: Generates PNG report image via Canvas API
 * and shares ONLY the PNG file via Web Share API or direct download fallback.
 */
export async function shareStatusCardAsImage(params: ShareStatusReportParams): Promise<boolean> {
  console.log("[Share] Generating PNG report image using Canvas API for:", params.date, params.status);

  // 1. Generate crisp PNG File using Canvas API
  const imageFile = await generateStatusReportImageCanvas(params);
  console.log("[Share] Generated PNG File size:", imageFile.size, "bytes.");

  // 2. Share ONLY as PNG image using Web Share API
  if (
    typeof navigator !== "undefined" &&
    navigator.share &&
    navigator.canShare &&
    navigator.canShare({ files: [imageFile] })
  ) {
    console.log("[Share] Triggering navigator.share with PNG image File...");
    try {
      await navigator.share({
        files: [imageFile],
      });
      console.log("[Share] navigator.share completed successfully.");
      return true;
    } catch (shareErr: any) {
      if (shareErr?.name === "AbortError") {
        console.log("[Share] User cancelled share sheet.");
        return true;
      }
      console.warn("[Share] navigator.share failed, attempting image download fallback:", shareErr);
    }
  }

  // 3. Direct PNG Download Fallback for desktop browsers without file share support
  console.log("[Share] Triggering direct image download fallback...");
  try {
    const url = URL.createObjectURL(imageFile);
    const a = document.createElement("a");
    a.href = url;
    a.download = params.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    console.log("[Share] Direct image download triggered successfully.");
    return true;
  } catch (downloadErr: any) {
    console.error("[Share] Image download fallback failed:", downloadErr);
    throw new Error("Failed to download image file");
  }
}
