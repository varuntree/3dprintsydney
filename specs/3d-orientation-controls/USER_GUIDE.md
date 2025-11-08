# 3D Orientation Controls – User Guide

## Overview
The Orientation workspace in Quick Order lets you preview every uploaded STL/3MF on a fixed build plate, fine-tune its pose, understand how much support material is required, and lock the approved orientation before pricing or checkout. The viewer now highlights overhangs in near real time, surfaces the grams/cost impact of supports, and enforces that every file has a saved quaternion snapshot.

```
Good Orientation (minimal supports)         Bad Orientation (heavy supports)
┌──────────────┐                            ┌──────────────┐
│      ____    │                            │   ____       │
│_____/____\___│  <-- build plate           │__/____\______│  <-- large red zones = costly
```

## Auto-Orient
1. Upload a model – the system immediately runs auto-orient (<=2 s for ~10 MB) to minimize support volume, minimize height, and maximize contact area.
2. A status chip (“Calculating best orientation…”) appears while the algorithm runs. If it times out (>5 s on huge meshes) you’ll see a yellow “Result simplified” chip and the system falls back to a principal-axis heuristic.
3. Auto-orient can be triggered any time via the **Auto Orient** button; it also fires when you hit **Reset** or **Recenter**.
4. Very large files (>50 MB) automatically drop Fibonacci samples from 64 → 32 and display a warning (“Large file… interactions simplified”).

## Manual Controls
- **Rotation buttons**: ±45° on X/Y, 90° on Z for quick adjustments.
- **Numeric inputs**: enter any 0–359° angle per axis and press Enter to commit.
- **Orient to Face**: toggle the Pointer icon, click a face in the viewer, and the system aligns that face to the build plate (status chip confirms).
- **Gizmo**: enable via View Controls to free-rotate with TransformControls.
- **Lock Orientation**: persists the quaternion/position for the active file and gates progression to Configure/Price steps. Locking remains available even if orientation adjustments are disabled for a thin model.
- **Disabled States**: If a file is effectively 2D (<0.2 mm Z) or its STL can’t be rendered, the controls gray out and a warning explains what to do (remove or re-upload).

## Support Preview & Overhang Detection
- Overhang faces (> support angle) render as translucent red overlays. The worker-driven detector updates within 300 ms; status chips show “Detecting overhangs…” during processing.
- Toggling supports off removes both the highlight and the cost impact while keeping the quaternion intact.
- Any worker failures automatically fall back to the main thread and display “Overhang preview unavailable” so you can retry or refresh.

## Pricing Impact
- The support panel displays **Estimated supports (g)** plus **Cost impact** using the active material’s per-gram rate.
- Locking an orientation, then running **Prepare Files** / **Calculate Price**, now surfaces support grams and per-line item model/support cost breakdowns.
- If the slicer cannot generate supports (common for exotic settings), the client automatically retries with supports disabled, flags the file as a fallback, and requires you to accept that estimate before continuing.

## Troubleshooting & Warnings
| Warning | Meaning | Action |
| --- | --- | --- |
| “Model failed to load. Delete and re-upload.” | STL/3MF missing or corrupt | Remove the file from the queue and upload a clean copy. |
| “Large file (>50 MB). Some interactions are simplified.” | Geometry is huge | Expect slower overhang updates; lock orientation once satisfied. |
| “Model appears nearly flat (<0.2 mm). Orientation is disabled.” | Essentially 2D geometry | Verify it really is a flat part; lock default pose to continue. |
| “Auto-orient timed out—used simplified result.” | Optimization hit the 5 s guard | Consider manual tweaks; supports estimate still updates. |

## Best Practices
1. **Run Auto Orient first**, then fine-tune only if you need surface-specific adjustments.
2. **Watch the support grams**—every 10 g trimmed can shave ~$2–$8 off a print depending on material.
3. **Use Orient-to-Face** for logo/surface alignment instead of nudging by hand.
4. **Lock per file immediately after you’re happy** to prevent accidental edits from invalidating the price quote.
5. **Address warnings before pricing** so you don’t get blocked later (e.g., accept fallback estimates or re-upload broken files).

## Admin / Production Views
- Saved orientations now show up on invoice + production screens with original vs oriented previews.
- Download buttons include both the untouched STL and an oriented export baked with the saved quaternion so operators can send the file straight to the slicer.

Need more help? Drop questions in `#3d-orientation` or refer back to the spec at `specs/3d-orientation-controls/3d-orientation-controls.md`.
