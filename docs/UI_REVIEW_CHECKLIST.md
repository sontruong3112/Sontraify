# UI Review Checklist

## Authentication Flow

1. Click Log in at top-right on home page.
2. Verify app navigates to `/login` full-page view.
3. Submit valid email/password.
4. Verify app redirects back to previous page (`from` route).
5. Confirm user avatar/menu appears at top-right.

## Guarded Actions

1. While logged out, try like a song.
2. While logged out, try queue add/remove.
3. While logged out, try create/delete/rename playlist.
4. Verify each action redirects to `/login` and shows notice.

## Account Page

1. Open avatar menu -> Account.
2. Update display name -> Save profile.
3. Upload avatar image file (< 5MB).
4. Save profile and verify top-right avatar updates.
5. Verify invalid avatar URL is blocked.

## Upload Security

1. User can request image signature for:
   - `music-app/avatars`
   - `music-app/playlist-covers`
2. User cannot request video signature.
3. User cannot request signature for unauthorized folders.
4. Admin can request video signature.

## Final Visual QA

1. Check responsive layout at mobile/tablet/desktop.
2. Check text contrast in login/account cards.
3. Check hover/active/focus states on auth buttons.
4. Verify no console error during login and profile update.
