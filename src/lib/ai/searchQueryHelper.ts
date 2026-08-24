export interface SearchQueryTranslation {
  rawQuery: string;
  interpretedFilters: {
    attendanceShortage?: boolean;
    incompleteInternship?: boolean;
    missingSkill?: string;
    semester?: number;
    highestProjectParticipation?: boolean;
    department?: string;
  };
  summaryExplanation: string;
}

export function parseStructuredSearchQuery(query: string): SearchQueryTranslation {
  const q = query.toLowerCase().trim();
  const filters: SearchQueryTranslation["interpretedFilters"] = {};
  const explanationParts: string[] = [];

  // Attendance Shortage
  if (q.includes("attendance shortage") || q.includes("low attendance") || q.includes("attendance below")) {
    filters.attendanceShortage = true;
    explanationParts.push("Filter: Students with attendance percentage < 75%");
  }

  // Incomplete / Overdue Internship
  if (q.includes("incomplete internship") || q.includes("missing internship") || q.includes("overdue internship")) {
    filters.incompleteInternship = true;
    explanationParts.push("Filter: Students with incomplete or overdue semester internship requirement");
  }

  // Semester Extraction (e.g. "semester 4", "sem 4", "s4")
  const semMatch = q.match(/sem(?:ester)?\s*(\d)/i);
  if (semMatch && semMatch[1]) {
    filters.semester = parseInt(semMatch[1], 10);
    explanationParts.push(`Filter: Semester ${filters.semester} students`);
  }

  // Missing Skill Extraction (e.g. "missing sql", "missing python", "without react")
  const missingMatch = q.match(/(?:missing|without|lacks?)\s+([a-z0-9#+.\s]+?)(?:\s+and|\s+or|\s+students|$)/i);
  if (missingMatch && missingMatch[1]) {
    filters.missingSkill = missingMatch[1].trim();
    explanationParts.push(`Filter: Students lacking verified evidence in ${filters.missingSkill}`);
  }

  // Highest Project Participation
  if (q.includes("highest verified project") || q.includes("highest project participation") || q.includes("most projects")) {
    filters.highestProjectParticipation = true;
    explanationParts.push("Aggregation: Batches/Sections sorted by highest verified project count");
  }

  // Department Extraction (e.g. "cse", "ece", "aids", "ai&ds")
  const deptMatch = q.match(/\b(cse|ece|aids|ai&ds|it|mech|civil)\b/i);
  if (deptMatch && deptMatch[1]) {
    const rawDept = deptMatch[1].toUpperCase();
    filters.department = rawDept === "AI&DS" ? "AIDS" : rawDept;
    explanationParts.push(`Filter: Department ${filters.department === "AIDS" ? "AI&DS" : filters.department}`);
  }

  return {
    rawQuery: query,
    interpretedFilters: filters,
    summaryExplanation:
      explanationParts.length > 0
        ? explanationParts.join(" | ")
        : "Structured filter search: Matches keyword tokens across student name, roll number, department, and skills.",
  };
}
