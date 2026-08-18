import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Predefined prestigious institutional partner companies
    const companies = [
      {
        name: "Zoho Corporation",
        industry: "Software & IT Product",
        domains: ["Web Development", "Mobile App Development", "UI/UX Design"],
        modes: ["OFFLINE", "HYBRID"],
        locations: ["Chennai", "Tenkasi", "Coimbatore"],
        verifiedCount: 18
      },
      {
        name: "Tata Consultancy Services (TCS)",
        industry: "IT Services & Consulting",
        domains: ["Software Engineering", "Data Analytics", "Cloud Infrastructure"],
        modes: ["OFFLINE", "ONLINE"],
        locations: ["Coimbatore", "Chennai", "Bangalore"],
        verifiedCount: 24
      },
      {
        name: "Cognizant Technology Solutions (CTS)",
        industry: "IT Services & Consulting",
        domains: ["Full Stack Development", "Quality Assurance", "AI & Analytics"],
        modes: ["HYBRID", "OFFLINE"],
        locations: ["Chennai", "Coimbatore", "Bangalore"],
        verifiedCount: 15
      },
      {
        name: "Infosys Limited",
        industry: "IT Services & Consulting",
        domains: ["Systems Engineering", "Cloud Architecture", "Cybersecurity"],
        modes: ["OFFLINE", "HYBRID"],
        locations: ["Mysore", "Bangalore", "Chennai"],
        verifiedCount: 12
      },
      {
        name: "Wipro Limited",
        industry: "IT Services & Consulting",
        domains: ["App Development", "Network Security", "Digital Solutions"],
        modes: ["ONLINE", "HYBRID"],
        locations: ["Bangalore", "Hyderabad", "Chennai"],
        verifiedCount: 9
      },
      {
        name: "Accenture",
        industry: "Management Consulting & IT",
        domains: ["Technology Consulting", "Data Science", "Enterprise Platforms"],
        modes: ["HYBRID", "OFFLINE"],
        locations: ["Chennai", "Bangalore", "Mumbai"],
        verifiedCount: 7
      }
    ];

    return NextResponse.json({ companies });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
