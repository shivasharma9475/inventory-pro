// client/src/components/scanner/CameraScannerModal.jsx
//
// Single shared camera-barcode-scanner modal, used by both:
//   - Products page (components/products/ScanToAddButton.jsx)
//   - Billing page  (components/billing/BarcodeScannerPanel.jsx)
//
// This replaces two near-duplicate implementations that had drifted apart
// (different DOM ids, only one had a double-fire guard, neither called
// `.clear()` on cleanup). Consolidating means a fix here benefits both
// screens instead of needing to be applied twice.
//
// Hardening applied vs. the original implementations:
//   1. Unique DOM id per mounted instance (via useId) — so two modals
//      mounted concurrently (e.g. fast page-switch during React's
//      double-invoke in StrictMode, or a future screen reusing this
//      component) never collide on the same element id.
//   2. Double-fire guard — html5-qrcode can call the success callback more
//      than once for the same barcode before `.stop()` actually halts
//      scanning. Without a guard, `onDetected` could fire twice.
//   3. `.stop()` is awaited before `onDetected` runs, instead of being
//      fire-and-forget — closes the race window where an in-flight frame
//      could still resolve after the caller already reacted to the scan.
//   4. `.clear()` is called after `.stop()` in cleanup (and after a
//      detected scan) to fully tear down the injected video/canvas DOM,
//      not just halt scanning — prevents DOM/video-track leaks across
//      remounts.
//   5. Container is pre-sized to the camera's real aspect ratio BEFORE
//      html5-qrcode is started (see "Why pre-probe" below) — this is what
//      fixes barcodes being decoded from the wrong region of the frame.
//
// Why pre-probe the camera's aspect ratio:
// html5-qrcode's internal scan loop (foreverScan) computes which pixels to
// decode using `videoElement.videoWidth / videoElement.clientWidth` (and
// the height equivalent). That math silently assumes the video fills its
// container edge-to-edge with no letterboxing — i.e. it assumes CSS
// `object-fit: cover`, which crops to fill but never letterboxes.
//
// If the container's aspect ratio doesn't match the camera's native aspect
// ratio, `cover` crops the picture to fit — and the visible crop doesn't
// line up with where the on-screen guide box says the decode region is.
// That mismatch is exactly what caused a barcode to look correctly framed
// in the guide box while actually being decoded from a different, cropped
// region (the bug confirmed via the test screenshot+logs in this file's
// history).
//
// The fix is NOT to switch the video to `object-fit: contain` — that keeps
// the visible picture honest, but then `clientWidth/clientHeight` (the
// full element box) no longer matches the visible picture's actual size
// (since `contain` letterboxes), which breaks the library's scan-region
// math in a different way: it decodes from a region that includes the
// black letterbox bars, and the loop runs forever without ever throwing
// (so no console errors either — confirmed when testing `contain`).
//
// The actual fix: keep `object-fit: cover`, but size the *container* to
// exactly match the camera's real aspect ratio before `cover` ever has to
// crop anything. We learn that aspect ratio with a quick throwaway
// `getUserMedia` probe, resize the container via React state, wait one
// frame for the new layout to commit, and only then start html5-qrcode —
// so by the time it measures the container, there's no mismatch to begin
// with.

import { useEffect, useId, useRef, useState } from "react";

const STYLE_TAG_ID = "shared-camera-scanner-style";

// One shared <style> block for every instance, scoped by a `data-scanner`
// attribute rather than a hardcoded id, so it works no matter how many
// instances exist.
function ensureScannerStyles() {
  if (document.getElementById(STYLE_TAG_ID)) return;

  const styleEl = document.createElement("style");
  styleEl.id = STYLE_TAG_ID;
  styleEl.textContent = `
    [data-camera-scanner-view],
    [data-camera-scanner-view] > div,
    [data-camera-scanner-view] > div * {
      margin: 0 !important;
      padding: 0 !important;
      box-sizing: border-box !important;
    }

    [data-camera-scanner-view] {
      width: 100% !important;
      /* No forced height here — it's controlled inline via React, sized to
         the camera's real aspect ratio (see containerAspectRatio state).
         Forcing height here would override that inline sizing. */
      overflow: hidden !important;
      position: relative !important;
      background: #000 !important;
    }

    [data-camera-scanner-view] video {
      position: absolute !important;
      inset: 0 !important;
      width: 100% !important;
      height: 100% !important;
      /* Must stay "cover" — see the top-of-file comment for why "contain"
         silently breaks html5-qrcode's internal scan-region math. Cover is
         safe here specifically because we pre-size the container to the
         camera's real aspect ratio, so cover never actually needs to crop. */
      object-fit: cover !important;
      object-position: center center !important;
    }

    /* Keep the scan-guide border/shaded box visible — it's the user's only
       visual aim assist. */
    [data-camera-scanner-view] #qr-shaded-region {
      z-index: 2 !important;
    }

    /* Hide the library's own UI chrome (camera-select dropdown, dashboard
       buttons/links, status text) — we render our own header/footer instead. */
    [data-camera-scanner-view] #reader__dashboard,
    [data-camera-scanner-view] #reader__dashboard_section,
    [data-camera-scanner-view] #reader__dashboard_section_csr,
    [data-camera-scanner-view] #reader__camera_selection_display,
    [data-camera-scanner-view] #reader__camera_selection,
    [data-camera-scanner-view] .reader__dashboard,
    [data-camera-scanner-view] .reader__dashboard_section,
    [data-camera-scanner-view] .reader__camera_selection,
    [data-camera-scanner-view] .reader__status,
    [data-camera-scanner-view] .reader__formats,
    [data-camera-scanner-view] .reader__description,
    [data-camera-scanner-view] .reader__action_button {
      display: none !important;
      visibility: hidden !important;
    }
  `;
  document.head.appendChild(styleEl);
}

const FALLBACK_ASPECT_RATIO = 4 / 3; // used only if the probe fails

/**
 * @param {(code: string) => void} onDetected - called once per confirmed scan
 * @param {() => void} onClose - called when the user dismisses the modal
 * @param {string} [title] - header text
 * @param {string} [hint] - footer hint text shown once the camera is live
 */
export default function CameraScannerModal({
  onDetected,
  onClose,
  title = "Scan Barcode",
  hint = "Hold the barcode flat and fully inside the box.",
}) {
  const domId = `camera-scanner-view-${useId().replace(/[:]/g, "")}`;
  const containerRef = useRef(null);
  const scannerRef = useRef(null);
  const detectedRef = useRef(false); // guard against html5-qrcode double-fire
  const lastErrorLogRef = useRef(0); // throttles console.warn for genuine per-frame errors
  const [initError, setInitError] = useState(null);
  const [status, setStatus] = useState("starting");
  // Known only after the pre-probe below resolves. The container isn't
  // sized for the camera, and html5-qrcode isn't started, until this is set.
  const [containerAspectRatio, setContainerAspectRatio] = useState(null);

  // ── Step 1: probe the camera's real aspect ratio ──────────────────────────
  useEffect(() => {
    let isMounted = true;

    const probe = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        const track = stream.getVideoTracks()[0];
        const settings = track?.getSettings?.();
        // Stop the probe stream immediately — html5-qrcode opens its own
        // stream once we start it; we only needed this one for its
        // resolution. A short delay after stopping gives the camera
        // hardware time to actually release before it's re-claimed by
        // html5-qrcode's own getUserMedia call — back-to-back acquire/
        // release on the same device can otherwise be flaky on some
        // browsers/OSes.
        stream.getTracks().forEach((t) => t.stop());
        await new Promise((resolve) => setTimeout(resolve, 150));

        if (!isMounted) return;

        if (settings?.width && settings?.height) {
          // TEMP DIAGNOSTIC — remove once scanning is confirmed working.
          console.log("[scanner-debug] camera probe:", settings.width, "x", settings.height, "ratio:", (settings.width / settings.height).toFixed(3));
          setContainerAspectRatio(settings.width / settings.height);
        } else {
          console.log("[scanner-debug] camera probe returned no width/height, using fallback ratio");
          setContainerAspectRatio(FALLBACK_ASPECT_RATIO);
        }
      } catch (error) {
        // Permission denial, no camera, etc. — let the real start() call
        // below surface the proper error message to the user; here we just
        // fall back to a default ratio so the container has *some* size.
        if (isMounted) setContainerAspectRatio(FALLBACK_ASPECT_RATIO);
      }
    };

    probe();

    return () => {
      isMounted = false;
    };
  }, []);

  // ── Step 2: once the container is correctly sized, start html5-qrcode ─────
  useEffect(() => {
    if (containerAspectRatio === null) return; // wait for the probe (step 1)

    let isMounted = true;

    ensureScannerStyles();

    const startScanner = async () => {
      try {
        // One extra frame so the browser actually commits the new
        // `aspectRatio`-driven layout before html5-qrcode measures the
        // container — this is the step that makes the pre-probe approach
        // work instead of just moving the race condition earlier.
        await new Promise((resolve) => requestAnimationFrame(() => resolve()));
        await new Promise((resolve) => setTimeout(resolve, 80));
        if (!isMounted || !containerRef.current) return;

        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
        if (!isMounted || !containerRef.current) return;

        const formatsToSupport = [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.QR_CODE,
        ];

        setStatus("initializing");
        const scanner = new Html5Qrcode(containerRef.current.id, {
          formatsToSupport,
          verbose: false,
          // The browser's native BarcodeDetector API (used automatically by
          // html5-qrcode when available) has wildly inconsistent 1D-barcode
          // support across Chrome versions/OSes. Forcing the bundled ZXing
          // decoder instead is slower but far more reliable for barcodes.
          useBarCodeDetectorIfSupported: false,
        });

        scannerRef.current = scanner;
        setStatus("requesting-permission");

        // A defined scan region (qrbox) measurably improves 1D-barcode
        // detection rate vs. scanning the full frame, and gives the user a
        // visual target. Generously sized (92% of the smaller viewfinder
        // dimension) so normal handheld variance in distance/angle doesn't
        // clip the barcode outside the box.
        const qrboxFn = (viewfinderWidth, viewfinderHeight) => {
          const width = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.92);
          const height = Math.floor(width * 0.55);
          // TEMP DIAGNOSTIC — remove once scanning is confirmed working.
          console.log(
            "[scanner-debug] aspectRatio used:", containerAspectRatio.toFixed(3),
            "| viewfinder:", viewfinderWidth, "x", viewfinderHeight,
            "→ qrbox:", width, "x", height
          );
          return { width, height };
        };

        await scanner.start(
          { facingMode: "environment" },
          {
            // 10fps is too sparse to reliably catch a handheld 1D barcode —
            // 15-20fps gives the decoder many more attempts per second.
            fps: 18,
            qrbox: qrboxFn,
            // No forced `aspectRatio` here — the container is already sized
            // to the camera's real aspect ratio (step 1 above), so we don't
            // need html5-qrcode to request a specific shape from the camera.
            disableFlip: false,
          },
          (decodedText) => {
            if (!isMounted || detectedRef.current) return;
            detectedRef.current = true;

            // TEMP DIAGNOSTIC — remove once scanning is confirmed working.
            console.log("[scanner-debug] DETECTED:", decodedText);

            // Await the stop before reacting, so a frame already in flight
            // can't resolve after we've moved on (e.g. closed the modal).
            scanner
              .stop()
              .catch(() => {})
              .finally(() => {
                scanner.clear();
                if (isMounted) onDetected(decodedText);
              });
          },
          (errorMessage) => {
            // html5-qrcode calls this on EVERY frame where no code was
            // found — that's expected and noisy, so we only log it once
            // every couple of seconds, and only when it looks like a real
            // failure rather than the standard "no code in this frame"
            // message, so a genuine problem is still visible in the
            // console instead of being silently swallowed.
            const isRoutineNoMatch =
              typeof errorMessage === "string" &&
              /NotFoundException|No barcode or QR code detected|No MultiFormat Readers/i.test(errorMessage);

            if (!isRoutineNoMatch) {
              const now = Date.now();
              if (!lastErrorLogRef.current || now - lastErrorLogRef.current > 2000) {
                lastErrorLogRef.current = now;
                console.warn("CameraScannerModal scan frame error:", errorMessage);
              }
            }
          }
        );

        if (isMounted) setStatus("live");
      } catch (error) {
        if (!isMounted) return;

        console.error("CameraScannerModal init failed:", error);
        setInitError(
          error?.name === "NotAllowedError"
            ? "Camera permission denied. Please allow camera access and try again."
            : error?.name === "NotFoundError"
            ? "No camera found. Please connect a camera and try again."
            : error?.message?.includes("secure") ||
              (location.protocol !== "https:" && location.hostname !== "localhost")
            ? "Camera requires HTTPS or localhost. Open this site via localhost or a secure (https) URL."
            : "Unable to start the camera. Please try again or use a USB scanner instead."
        );
        setStatus("error");
      }
    };

    startScanner();

    return () => {
      isMounted = false;

      const scanner = scannerRef.current;
      if (scanner) {
        // .stop() halts the camera/decode loop; .clear() tears down the
        // video/canvas DOM html5-qrcode injected. Skipping .clear() was the
        // main source of leaked DOM nodes across remounts in the original
        // implementations.
        scanner
          .stop()
          .catch(() => {})
          .finally(() => {
            try {
              scanner.clear();
            } catch {
              // already cleared (e.g. a detected scan already cleared it) — fine
            }
          });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerAspectRatio, onDetected]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.75)",
        display: "flex",
        alignItems: "flex-start", // anchor modal to the top instead of centering
        justifyContent: "center",
        paddingTop: "5vh",
        overflowY: "auto",
        zIndex: 10000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 420,
          maxWidth: "94vw",
          borderRadius: 18,
          overflow: "hidden",
          background: "#090909",
          boxShadow: "0 22px 70px rgba(0,0,0,0.4)",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          style={{
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <span style={{ fontSize: 14, color: "#f8fafc", fontWeight: 600 }}>{title}</span>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              color: "rgba(255,255,255,0.7)",
              fontSize: 18,
              cursor: "pointer",
              lineHeight: 1,
            }}
            aria-label="Close scanner"
          >
            ✕
          </button>
        </div>

        <div
          id={domId}
          data-camera-scanner-view=""
          ref={containerRef}
          style={{
            width: "100%",
            // Before the probe resolves there's nothing to show yet (no
            // camera permission requested), so a small fixed height holds
            // the layout. Once known, `aspectRatio` sizes the box to
            // exactly match the camera — see the top-of-file comment for
            // why this (rather than object-fit: contain) is the fix.
            ...(containerAspectRatio
              ? { aspectRatio: String(containerAspectRatio) }
              : { minHeight: 280 }),
            background: "#000",
            position: "relative",
          }}
        />

        {initError ? (
          <div
            style={{
              padding: "16px",
              color: "#f87171",
              fontSize: 13,
              textAlign: "center",
              background: "rgba(255,255,255,0.04)",
            }}
          >
            {initError}
          </div>
        ) : (
          <div
            style={{
              padding: "12px 14px",
              color: "rgba(255,255,255,0.65)",
              fontSize: 12,
              textAlign: "center",
              borderTop: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {status === "live"
              ? hint
              : containerAspectRatio === null
              ? "Requesting camera access..."
              : status === "requesting-permission"
              ? "Waiting for camera permission..."
              : "Preparing camera..."}
          </div>
        )}
      </div>
    </div>
  );
}