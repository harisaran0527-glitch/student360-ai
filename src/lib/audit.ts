import { prisma } from "./prisma";

export async function logAuditEvent({
  userId,
  userEmail,
  userRole,
  action,
  entityType,
  entityId,
  details,
  ipAddress,
}: {
  userId?: string;
  userEmail?: string;
  userRole?: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        userEmail,
        userRole,
        action,
        entityType,
        entityId,
        details: JSON.stringify(details || {}),
        ipAddress: ipAddress || "127.0.0.1",
      },
    });
  } catch (error) {
    console.error("Failed to log audit event:", error);
  }
}
