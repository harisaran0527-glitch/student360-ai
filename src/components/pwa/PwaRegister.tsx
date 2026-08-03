"use client";

import React, { useEffect, useState } from "react";
import { PwaStatusBanner } from "./PwaStatusBanner";

export function PwaRegister() {
  const [swRegistration, setSwRegistration] =
    useState<ServiceWorkerRegistration | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const isDev =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname.startsWith("192.168.");

    if (isDev) {
      // In development: unregister ALL existing service workers to prevent
      // stale offline.html from being served over real portal pages
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((reg) => {
          reg.unregister();
          console.log("[PWA] Unregistered stale service worker in dev mode:", reg.scope);
        });
      });

      // Also clear all SW caches in dev
      if ("caches" in window) {
        caches.keys().then((names) => {
          names.forEach((name) => {
            caches.delete(name);
            console.log("[PWA] Cleared cache in dev mode:", name);
          });
        });
      }
      return;
    }

    // Production: register the service worker
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        console.log(
          "[PWA] Service Worker registered successfully:",
          reg.scope
        );
        setSwRegistration(reg);

        // Listen for update
        reg.onupdatefound = () => {
          const installingWorker = reg.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (
                installingWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                console.log(
                  "[PWA] New version of Student360 AI is available."
                );
                setUpdateAvailable(true);
              }
            };
          }
        };
      })
      .catch((err) =>
        console.error("[PWA] Service Worker registration failed:", err)
      );
  }, []);

  const handleUpdate = () => {
    if (swRegistration && swRegistration.waiting) {
      swRegistration.waiting.postMessage({ type: "SKIP_WAITING" });
    }
    window.location.reload();
  };

  return (
    <PwaStatusBanner
      updateAvailable={updateAvailable}
      onUpdate={handleUpdate}
    />
  );
}
