<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1e4aeUEsRziwm-9BDpOVdUFZ5DyouO9j5

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`

## Image Generation

By default, this app uses **Pollinations.ai** - a completely free image generation API that requires no API key or signup. The app will work out of the box with no configuration needed!

### Optional: Use a Custom Image Generation API

If you want to use a different API (like ModelsLab, Stability AI, etc.), you can configure it by creating a `.env.local` file with the following variables:

```
VITE_SD_API_BASE_URL=https://your-api-base-url.com
VITE_SD_API_KEY=your-api-key
VITE_SD_API_KEY_HEADER=Authorization
VITE_SD_MODEL=your-model-id
```

The free Pollinations.ai API will be used if these environment variables are not set.
