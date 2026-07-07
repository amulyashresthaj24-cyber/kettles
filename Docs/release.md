# Releasing Kettles / Flowmate

Two delivery channels, both automated:

```
push to main ──────────────► Vercel ──► https://<your-domain>  (web app, always latest)

push tag v0.2.0 ──► GitHub Actions ──► GitHub Release
                                        ├─ Kettles_0.2.0_x64-setup.exe   (installer for new users)
                                        ├─ *.sig                          (updater signature)
                                        └─ latest.json                    (update manifest)
                                                 ▲
        installed desktop apps poll this on every launch and self-update
```

The desktop app ships with `tauri-plugin-updater`. On launch it fetches
`https://github.com/amulyashresthaj24-cyber/kettles/releases/latest/download/latest.json`,
compares versions, verifies the cryptographic signature against the public key
baked into the app, downloads the new installer, and relaunches. **You never
re-send installers to users — ship once, every install updates itself.**

---

## One-time setup

### 1. GitHub Actions secrets

Repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Value |
|--------|-------|
| `TAURI_SIGNING_PRIVATE_KEY` | Full contents of `C:\Users\amuly\.tauri\kettles-updater.key` |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public key |
| `NEXT_PUBLIC_SITE_URL` | Production web URL (e.g. `https://kettles.app`) |

> ⚠️ **Back up `kettles-updater.key` somewhere safe (password manager).**
> If it is lost, already-installed apps can never verify another update —
> users would have to manually reinstall. Never commit it to the repo.
> The matching public key is already embedded in `src-tauri/tauri.conf.json`.

### 2. Repo visibility

The updater endpoint and release downloads require **public access to
Releases**. If `amulyashresthaj24-cyber/kettles` is private, either make it
public, or create a separate public `kettles-releases` repo and point the
workflow (`tagName` repo) + `plugins.updater.endpoints` there.

### 3. Vercel (hosted web version)

The app is a static Next.js export (`output: "export"`), so hosting is simple:

1. Install CLI once: `npm i -g vercel`, then `vercel login`.
2. In the project root: `vercel link` → create new project.
3. Add env vars (Production):
   ```
   vercel env add NEXT_PUBLIC_SUPABASE_URL production
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
   vercel env add NEXT_PUBLIC_SITE_URL production
   ```
4. Deploy: `vercel --prod`. After the GitHub repo is connected
   (Vercel dashboard → Project → Settings → Git), **every push to `main`
   auto-deploys** — no manual step again.
5. Supabase dashboard → **Auth → URL Configuration**: set Site URL to the
   Vercel domain and add it to Redirect URLs, or OAuth logins will bounce.

---

## Shipping a release (every time)

1. Bump the version — must match in three places
   (`scripts/check-stable-version.mjs` enforces this, CI runs it):
   - `package.json` → `"version": "0.2.0"`
   - `src-tauri/tauri.conf.json` → `"version": "0.2.0"`
   - `package-lock.json` → refresh with `npm install --package-lock-only`
2. Commit and tag:
   ```
   git add -A && git commit -m "release: v0.2.0"
   git tag v0.2.0
   git push origin main --tags
   ```
3. Done. GitHub Actions (`.github/workflows/release.yml`) builds the web
   export, compiles the Tauri app with the **stable config** (Kettles
   branding), signs the updater artifacts, and publishes the GitHub Release.
   The workflow fails fast if the tag doesn't match the package version.

**New users:** send them
`https://github.com/amulyashresthaj24-cyber/kettles/releases/latest` —
they download `Kettles_x.y.z_x64-setup.exe` and run it (per-user install, no
admin rights needed).

**Existing users:** nothing to do. Their app picks up the release on next
launch and updates itself.

Local fallback: `npm run release:stable-desktop` still produces installers in
`releases/stable-desktop/` without CI, but those builds are only signed for
updates if `TAURI_SIGNING_PRIVATE_KEY` is set in the environment.

---

## Known gaps / later

- **Windows SmartScreen:** installers are updater-signed but not
  code-signed with an OS-trusted certificate, so first-time installs show
  "Windows protected your PC" → users click *More info → Run anyway*.
  Fix when distribution grows: Azure Trusted Signing (~$10/month) or an OV
  code-signing certificate, wired into the workflow via
  `bundle.windows.signCommand`.
- **macOS/Linux:** the workflow currently builds Windows only. Add matrix
  entries (`macos-latest`, `ubuntu-22.04`) to `release.yml` when needed;
  macOS additionally requires notarization credentials.
- **Dev vs stable identity:** dev builds (`tauri.conf.json`,
  `com.flowmate.app`) and stable builds (`tauri.stable.conf.json`,
  `com.kettles.app`) install side-by-side on purpose — you can keep a stable
  Kettles installed while hacking on Flowmate dev builds.
