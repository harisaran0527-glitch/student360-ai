# Student360 AI — Web Push Notification Architecture

## 1. VAPID Keys & Configuration

Web Push architecture operates via standard VAPID public/private key pairs:
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`: Exposed to client browser for push subscription generation.
- `VAPID_PRIVATE_KEY`: Kept securely in `.env` for payload signing.

---

## 2. Push Subscription API

- **Endpoint**: [`/api/push/subscribe`](file:///c:/Users/ELCOT/OneDrive/Desktop/AI&ML/src/app/api/push/subscribe/route.ts)
- **Method**: `POST`
- **Payload**: Browser `PushSubscription` object (`endpoint`, `p256dh`, `auth`).
- **Audit Logging**: User subscription actions are recorded in `AuditLog`.

---

## 3. Privacy & Permission Rules

- Notification permissions are **NEVER** requested automatically on initial page load.
- Permission prompts are triggered only after explicit user interaction within settings or alert preferences.
