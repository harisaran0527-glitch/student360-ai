# Student360 AI — Institutional Application Security Architecture

## 1. Authentication & Cookie Safeguards

- Password hashing using bcrypt (`saltRounds = 10`).
- Strong Password Policy: Minimum 8 characters, >= 1 uppercase, >= 1 lowercase, >= 1 digit (`validatePasswordPolicy`).
- Session cookies (`student360_session`) set with `HttpOnly: true`, `SameSite: lax`, and `Secure: true` in production environments.
- In-memory Login Rate Limiting (`src/lib/rateLimit.ts`): Blocks brute-force attempts after 5 consecutive failures with a 15-minute cooldown.

---

## 2. Server-Side Scope Authorization

- Server-side authorization functions in `src/lib/auth.ts`:
  - `isAuthorized(session, allowedRoles)`
  - `isFacultyScoped(session, targetDeptId, facultyDeptId)`
  - `isStudentSelfScoped(session, targetStudentId)`

---

## 3. Data Privacy & Aadhaar Masking

- Sensitive Aadhaar numbers are masked by default (`maskAadhaar` -> `XXXX-XXXX-1098`).
- Sensitive personal fields (Aadhaar, home address, guardian phone, emergency contact) are excluded from AI inputs, server logs, and default report exports.

---

## 4. File Upload & CSV Injection Defenses

- MIME type, file extension, and 10MB size limit validation in `src/lib/uploadSecurity.ts`.
- Path traversal defense: Original filenames sanitized with random storage UUIDs.
- CSV Formula Injection defense (`sanitizeCSVCell`): Neutralizes leading `=`, `+`, `-`, `@` characters.
