import { Router } from "express";
import { randomUUID } from "crypto";
import { db, sessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateSessionBody,
  UpdateSessionBody,
  SaveSignatureBody,
} from "@workspace/api-zod";

const router = Router();

// List all sessions
router.get("/sessions", async (req, res) => {
  try {
    const sessions = await db
      .select()
      .from(sessionsTable)
      .orderBy(sessionsTable.createdAt);
    res.json(
      sessions.map((s) => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list sessions");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create a new session
router.post("/sessions", async (req, res) => {
  const parsed = CreateSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { contractType, employeeName, ...rest } = parsed.data;
  try {
    const id = randomUUID();
    const shareToken = randomUUID().replace(/-/g, "").substring(0, 16);
    const [session] = await db
      .insert(sessionsTable)
      .values({
        id,
        shareToken,
        contractType,
        employeeName: employeeName ?? null,
        status: "draft",
        ...Object.fromEntries(
          Object.entries(rest).map(([k, v]) => [k, v ?? null])
        ),
      })
      .returning();
    res.status(201).json({
      ...session,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create session");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get a session by shareToken (used as the id in URLs)
router.get("/sessions/:id", async (req, res) => {
  try {
    const [session] = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.shareToken, req.params.id));
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    res.json({
      ...session,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get session");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update a session by shareToken
router.patch("/sessions/:id", async (req, res) => {
  const parsed = UpdateSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  try {
    const [existing] = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.shareToken, req.params.id));
    if (!existing) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    const [session] = await db
      .update(sessionsTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(sessionsTable.shareToken, req.params.id))
      .returning();
    res.json({
      ...session,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to update session");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete a session by shareToken
router.delete("/sessions/:id", async (req, res) => {
  try {
    const [existing] = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.shareToken, req.params.id));
    if (!existing) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    await db.delete(sessionsTable).where(eq(sessionsTable.shareToken, req.params.id));
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Failed to delete session");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Save a signature for a session
router.post("/sessions/:id/signatures", async (req, res) => {
  const parsed = SaveSignatureBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  try {
    const [existing] = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.shareToken, req.params.id));
    if (!existing) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    const { role, signatureData, signerName, signedAt } = parsed.data;
    const updates: Record<string, string> = {};
    if (role === "employee") {
      updates.employeeSignature = signatureData;
      updates.employeeSignedAt = signedAt;
    } else if (role === "witness") {
      updates.witnessSignature = signatureData;
      updates.witnessSignedAt = signedAt;
      if (signerName) updates.witnessName = signerName;
    } else if (role === "project_manager") {
      updates.projectManagerSignature = signatureData;
      updates.projectManagerSignedAt = signedAt;
      if (signerName) updates.projectManagerName = signerName;
    } else if (role === "director") {
      updates.directorSignature = signatureData;
      updates.directorSignedAt = signedAt;
    } else if (role === "company") {
      updates.companySignature = signatureData;
      updates.companySignedAt = signedAt;
    }
    // Check if all required signatures are present and update status
    const updatedFields = { ...existing, ...updates };
    const allSigned =
      updatedFields.employeeSignature &&
      updatedFields.witnessSignature &&
      updatedFields.projectManagerSignature &&
      updatedFields.directorSignature;
    if (allSigned) {
      updates.status = "signed";
    }
    const [session] = await db
      .update(sessionsTable)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(sessionsTable.shareToken, req.params.id))
      .returning();
    res.json({
      ...session,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to save signature");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
