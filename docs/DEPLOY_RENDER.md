# Deploy to Render (Run 24/7 without VS Code)

This project has a `render.yaml` blueprint at repo root so you can deploy backend + frontend together.

## 1. Push code to GitHub

1. Commit current code.
2. Push to your GitHub repository.

## 2. Create services from blueprint

1. Open Render dashboard.
2. Click `New +` -> `Blueprint`.
3. Connect your GitHub repo.
4. Render will detect `render.yaml` and create:
   - `sontraify-backend`
   - `sontraify-frontend`

Note: plan/tier is selected in Render UI. Some accounts no longer support `free` for Web Services.

## 3. Set environment variables on Render

Set these required secrets in Render for backend service:

- `MONGODB_URI`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `GOOGLE_CLIENT_ID` (optional if you skip Google login for now)

Set these for frontend service:

- `VITE_GOOGLE_CLIENT_ID` (optional if you skip Google login for now)

## 4. Update service URLs

After Render creates real URLs, update these values in `render.yaml` (or directly in Render env settings):

- Backend `CLIENT_ORIGIN` = your frontend URL
- Frontend `VITE_API_BASE_URL` = your backend URL + `/api/v1`

Example:

- Frontend URL: `https://sontraify-frontend.onrender.com`
- Backend URL: `https://sontraify-backend.onrender.com`
- `VITE_API_BASE_URL=https://sontraify-backend.onrender.com/api/v1`

## 5. Redeploy

1. Trigger deploy again after env and URL updates.
2. Test:
   - `GET /health` on backend
   - Frontend login and playlist actions

## Notes

- Free plan may sleep after inactivity; first request can be slow.
- If your account does not offer Free Web Service, choose `Starter` for backend.
- Static frontend can stay on free static hosting.
- If your local machine is off, Render services still run.

## Clerk Login Troubleshooting

- Ensure `VITE_CLERK_PUBLISHABLE_KEY` is a real Clerk publishable key and starts with `pk_test_` or `pk_live_`.
- Do not use Clerk URLs (for example `https://...clerk.accounts.dev`) as publishable keys.
- Ensure `CLERK_SECRET_KEY` is configured on backend and starts with `sk_test_` or `sk_live_`.
