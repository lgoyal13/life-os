# Life OS Phone Capture - Deployment Guide

## Overview

This Cloud Function receives voice/text captures from your phone and adds them to the Life OS Google Sheets inbox.

---

## Part 1: Google Cloud Functions Deployment

dd### Prerequisites

1. Google Cloud SDK installed (`brew install google-cloud-sdk`)
2. A Google Cloud project (you already have: `enduring-badge-484222-s9`)
3. Your service account credentials JSON

### Step 1: Generate an API Key

Generate a secure random API key for authentication:

```bash
# Generate a 32-character random key
openssl rand -base64 32
```

**Save this key securely** - you'll need it for both the Cloud Function and Apple Shortcut.

### Step 2: Prepare Credentials

Your service account credentials need to be passed as an environment variable. Get the JSON content:

```bash
# From the life-os directory
cat enduring-badge-484222-s9-bc835fe6f144.json | tr -d '\n'
```

Copy this single-line JSON output - you'll need it for deployment.

### Step 3: Deploy the Cloud Function

Navigate to the cloud function directory and deploy:

```bash
cd cloud_functions/capture

# Deploy to Google Cloud Functions (2nd gen)
gcloud functions deploy life-os-capture \
  --gen2 \
  --runtime=python312 \
  --region=us-west1 \
  --source=. \
  --entry-point=capture \
  --trigger-http \
  --allow-unauthenticated \
  --memory=256MB \
  --timeout=30s \
  --set-env-vars="GOOGLE_SHEET_ID=YOUR_SHEET_ID_HERE,CAPTURE_API_KEY=YOUR_API_KEY_HERE" \
  --set-secrets="GOOGLE_CREDENTIALS_JSON=life-os-credentials:latest"
```

**Important:** Replace:
- `YOUR_SHEET_ID_HERE` with your Google Sheet ID (from the sheet URL)
- `YOUR_API_KEY_HERE` with the API key you generated in Step 1

### Step 4: Set Up Secret Manager (for credentials)

Instead of hardcoding credentials, use Google Secret Manager:

```bash
# Create the secret (first time only)
gcloud secrets create life-os-credentials \
  --data-file=../../enduring-badge-484222-s9-bc835fe6f144.json

# Grant the Cloud Function access to the secret
gcloud secrets add-iam-policy-binding life-os-credentials \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

To find your project number:
```bash
gcloud projects describe enduring-badge-484222-s9 --format="value(projectNumber)"
```

### Step 5: Get Your Function URL

After deployment, get the function URL:

```bash
gcloud functions describe life-os-capture --gen2 --region=us-west1 --format="value(serviceConfig.uri)"
```

The URL will look like: `https://life-os-capture-XXXXX-uw.a.run.app`

### Step 6: Test the Deployment

```bash
# Test with curl
curl -X POST "YOUR_FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"text": "Test capture from command line"}'
```

Expected response:
```json
{
  "success": true,
  "id": "abc123-uuid",
  "message": "Capture saved successfully"
}
```

---

## Part 2: Apple Shortcut Setup

### Create the Shortcut

1. **Open the Shortcuts app** on your iPhone

2. **Create a new Shortcut** (tap + in top right)

3. **Add actions in this order:**

#### Action 1: Dictate Text
- Search for "Dictate Text"
- Add it as the first action
- Set "Stop Listening" to "After Pause"
- Set language to English (or your preferred language)

#### Action 2: Set Variable (store dictation result)
- Search for "Set Variable"
- Name the variable: `CapturedText`
- Input: `Dictated Text` (from previous action)

#### Action 3: If (check if dictation was cancelled)
- Search for "If"
- Condition: `CapturedText` `has any value`

#### Action 4: Get Contents of URL (inside the If block)
- Search for "Get Contents of URL"
- URL: `YOUR_FUNCTION_URL` (paste your Cloud Function URL)
- Method: `POST`
- Headers:
  - `Authorization`: `Bearer YOUR_API_KEY`
  - `Content-Type`: `application/json`
- Request Body: `JSON`
  - Add key: `text`
  - Value: `CapturedText` (select the variable)

#### Action 5: Get Dictionary Value
- Search for "Get Dictionary Value"
- Get: `success`
- From: `Contents of URL`

#### Action 6: If (check success)
- Condition: `Dictionary Value` `is` `1`
- If true: Show Notification "Captured to Life OS"
- Otherwise: Show Notification "Capture failed - check connection"

#### Action 7: Otherwise (from the first If - dictation cancelled)
- Add "Ask for Input"
- Prompt: "Enter your capture:"
- Input Type: Text
- Then repeat the URL request and notification steps for this path

### Simplified Alternative (Single Path)

If the above is too complex, here's a simpler version:

1. **Ask for Input**
   - Prompt: "What do you want to capture?"
   - Input Type: Text (with Dictation enabled)

2. **Get Contents of URL**
   - URL: `YOUR_FUNCTION_URL`
   - Method: `POST`
   - Headers:
     - `Authorization`: `Bearer YOUR_API_KEY`
     - `Content-Type`: `application/json`
   - Request Body: JSON
     - Key: `text`
     - Value: `Provided Input`

3. **Show Notification**
   - Title: "Life OS"
   - Body: "Captured!"

### Add to Home Screen

1. Tap the shortcut name at the top
2. Tap "Add to Home Screen"
3. Choose an icon (try the clipboard or brain emoji)
4. Tap "Add"

### Add to Lock Screen / Action Button

- **iOS 17+**: Add the shortcut to your Lock Screen widgets
- **iPhone 15 Pro/Pro Max**: Assign to Action Button in Settings > Action Button

---

## Part 3: Testing End-to-End

1. Run the shortcut from your phone
2. Speak or type a capture
3. Check your Google Sheet - a new row should appear in the Inbox tab
4. Run `python -m src.processor` to process the capture

---

## Troubleshooting

### "Unauthorized" Error
- Verify your API key matches in both Cloud Function and Shortcut
- Check the Authorization header format: `Bearer YOUR_KEY` (with space after Bearer)

### "Failed to save capture" Error
- Verify GOOGLE_SHEET_ID is correct
- Check that the service account has Editor access to the sheet
- View Cloud Function logs: `gcloud functions logs read life-os-capture --gen2 --region=us-west1`

### Shortcut Doesn't Work
- Test the URL manually with curl first
- Make sure "Allow Untrusted Shortcuts" is enabled in Settings > Shortcuts
- Check that the phone has internet connectivity

### Rate Limits
- Google Sheets API: 100 requests per 100 seconds per user
- Cloud Functions free tier: 2 million invocations/month
- For personal use, you won't hit these limits

---

## Costs (Free Tier)

Google Cloud Functions free tier includes:
- 2 million invocations/month
- 400,000 GB-seconds compute time/month
- 200,000 GHz-seconds compute time/month

For personal captures (even 50/day = 1,500/month), you'll stay well within free tier.

---

## Security Notes

1. **API Key**: Keep your API key secret. Don't share shortcuts that contain it.
2. **HTTPS**: All traffic is encrypted (Cloud Functions enforce HTTPS)
3. **Service Account**: Has minimal permissions (Sheets only)
4. **No PII Logging**: The function doesn't log capture contents

---

## Local Development

To test locally before deploying:

```bash
cd cloud_functions/capture

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export GOOGLE_CREDENTIALS_PATH="../../enduring-badge-484222-s9-bc835fe6f144.json"
export GOOGLE_SHEET_ID="your-sheet-id"
export CAPTURE_API_KEY="test-key-123"

# Run locally
functions-framework --target=capture --debug --port=8080

# Test with curl (in another terminal)
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-key-123" \
  -d '{"text": "Local test capture"}'
```
