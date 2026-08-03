import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Aggregate verified historical internships by companyName
    const verifiedInternships = await prisma.internship.findMany({
      where: { status: { in: ["APPROVED", "ONGOING", "COMPLETED", "VERIFIED"] } },
      select: {
        companyName: true,
        industry: true,
        domain: true,
        mode: true,
        location: true,
        stipendType: true,
      },
    });

    const companyMap: Record<string, any> = {};

    verifiedInternships.forEach((i) => {
      const name = i.companyName;
      if (!companyMap[name]) {
        companyMap[name] = {
          name,
          industry: i.industry,
          domains: new Set(),
          modes: new Set(),
          locations: new Set(),
          count: 0,
        };
      }
      companyMap[name].count += 1;
      if (i.domain) companyMap[name].domains.add(i.domain);
      if (i.mode) companyMap[name].modes.add(i.mode);
      if (i.location) companyMap[name].locations.add(i.location);
    });

    const companies = Object.values(companyMap).map((c) => ({
      name: c.name,
      industry: c.industry,
      domains: Array.from(c.domains),
      modes: Array.from(c.modes),
      locations: Array.from(c.locations),
      verifiedCount: c.count,
    }));

    return NextResponse.json({ companies });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
