import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Fetch all non-archived internships to extract real company directory info
    const verifiedInternships = await prisma.internship.findMany({
      where: { isArchived: false },
      select: {
        companyName: true,
        industry: true,
        domain: true,
        mode: true,
        location: true,
      },
    });

    const companyMap = new Map<string, {
      name: string;
      industry: string;
      domains: Set<string>;
      modes: Set<string>;
      locations: Set<string>;
    }>();

    verifiedInternships.forEach((i) => {
      const normalizedName = i.companyName.trim().toLowerCase();
      if (!normalizedName) return;

      if (!companyMap.has(normalizedName)) {
        companyMap.set(normalizedName, {
          name: i.companyName.trim(), // Keep original display name
          industry: i.industry || "Software & IT",
          domains: new Set<string>(),
          modes: new Set<string>(),
          locations: new Set<string>(),
        });
      }

      const comp = companyMap.get(normalizedName)!;
      if (i.domain) comp.domains.add(i.domain.trim());
      if (i.mode) comp.modes.add(i.mode.trim());
      if (i.location) comp.locations.add(i.location.trim());
    });

    const companies = Array.from(companyMap.values()).map((c) => ({
      name: c.name,
      industry: c.industry,
      domains: Array.from(c.domains),
      modes: Array.from(c.modes),
      locations: Array.from(c.locations),
    }));

    return NextResponse.json({ companies });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
