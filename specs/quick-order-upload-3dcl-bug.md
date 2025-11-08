# Bug: Quick Order upload rejects 3D CL models

## Bug Description
Uploading a 3D CL model via the Quick Order flow results in a `POST /api/quick-order/upload` returning HTTP 500, which surfaces as an "Upload failed" message on the storefront despite the file being valid. Logs show the route compiles but fails while processing the FormData payload; no additional helpful message currently reaches the client.

## Problem Statement
The upload endpoint currently rejects certain MIME types (and potentially saves files into `tmp_files` using a schema that expects the new `orientation_data` column). When a 3D CL file is submitted, we do not surface a validation error either because the validator runs into an unexpected MIME or because downstream storage/database throws, so the call collapses into an `INTERNAL_ERROR` and the user cannot proceed. We need to capture the true exception, allow the file into tmp storage (or explain why it’s invalid), and keep the upload UX functional for all supported 3D formats.

## Solution Statement
Inspect the upload flow to identify whether the failure comes from the validator or from `saveTmpFile` after our recent schema changes. Expand the validator to accept the 3D CL MIME/extension (avoid silent server 500s), safeguard the tmp storage insertion, log the real error (ideally bubbling failAuth with a contextual message), and re-run the request path to prove the fix.

## Steps to Reproduce
1. Open the Quick Order page in the storefront.
2. Drag & drop or select a "3D CL" model file (the same sample you have in the log context).
3. Observe the client finishing the upload and immediately showing "Upload failed" while the server log shows `POST /api/quick-order/upload 500` and no specific validation message.
4. Confirm no temporary resource appears in the UI (no file added to the queue).

## Root Cause Analysis
Likely causes:
- The validator rejects the file (new MIME not whitelisted) and throws, but the exception does not result in a clean 4xx response (maybe the validator message is not captured/caught, or 3D CL returns `application/octet-stream` but zipped extension not recognized as `.stl|.3mf`).
- Alternatively `saveTmpFile` fails because the newly added `orientation_data` column isn’t populated, so inserting without that field raises a database error, turning into `INTERNAL_ERROR` and 500.
Need to inspect the exact stack trace logged from `logger.error({ scope: 'quick-order.upload'...})` to know which chunk fails.

## Relevant Files
Use these files to fix the bug:
- `src/app/api/quick-order/upload/route.ts` – uploads models, validates them, writes to tmp_files, and is where we return the 500.
- `src/lib/utils/validators.ts` – `validateOrderFile` defines the permitted MIME/extensions; the 3D CL file may need to be whitelisted here.
- `src/server/services/tmp-files.ts` – `saveTmpFile` performs the storage/database insert; schema changes or missing orientation defaults could surface here.
- `src/lib/logger.ts` or the logging helpers – widen log context so uploads log the caught error.

### New Files
(None.)

## Step by Step Tasks
### 1. Reproduce & capture the precise failure
- Reproduce the upload while tailing server logs to capture the stack trace from `logger.error` in `quick-order/upload`.
- Confirm whether the exception is our validator throwing `Error('File must be a 3D model file...')`, a Supabase `insert` failure, or something else.
- Record the MIME/type/extension of the 3D CL file to use when updating validator logic and tests.

### 2. Adjust the validator to accept 3D CL builds (if the failure is validation)
- Update `validateOrderFile` (and possibly `validateFileType`) to treat the 3D CL MIME and extension as a supported 3D model.
- Add a unit test or manual quick check to prove a `File` with that MIME and name passes validation.
- Ensure we still reject unsupported MIME/extension combinations to avoid regressions.

### 3. Safeguard tmp-files insertion (if failure occurs there)
- Make `saveTmpFile` log the error details before throwing `AppError` so we know when future uploads hit DB problems.
- If orientation_data is now required, ensure the insert defaults it to `null` or converts from metadata before calling `insert`.
- Optionally, wrap the insert in a try/catch that translates known Supabase errors into `failAuth` with clearer messages, preventing the generic 500.

### 4. Improve error visibility
- Update `quick-order/upload` to include the caught `AppError` message (if any) in the `failAuth` response so the front-end can show an actionable reason (validation vs internal).
- Ensure any new validation path returns a 400 with a descriptive error code instead of firing the 500 pathway.

### 5. Validate the fix
- Retest uploading the same 3D CL file to verify the request now returns 200 with file data in `results`.
- Confirm the file appears in the Quick Order UI without throwing "Upload failed."
- Check logs to ensure no more `POST /api/quick-order/upload 500` entries and that any errors are now reported with context.

## Validation Commands
- `curl -s -o /dev/null -w "%{http_code} %{time_total}s" -F 'files=@/path/to/3dcl-file.3dcl' http://localhost:3000/api/quick-order/upload` (before fix this returns 500, after fix should return 200)
- `npm test -- --testPathPattern=quick-order-upload` (if tests exist/added for validator)
- `npm test -- --testPathPattern=tmp-files` (if tests exist/added for saveTmpFile) or `npm test` if we add new tests covering validator behavior)

## Notes
- The required ai_docs files (`ai_docs/documentation/CONTEXT.md` and `PRD.md`) referenced in the instructions are not present in the repo, so I focused directly on the Quick Order upload flow and validator logic.
- If the file fails before reaching `validateOrderFile`, we may need to inspect multipart parsing for boundary issues — mention this in the bug fix notes when reviewing logs.
