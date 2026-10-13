# Google Play Store

The Play Store app is the website in a thin Android shell (a "Trusted Web Activity"). It opens the live
site full-screen with no browser bar. There is no second codebase: every change to the website reaches
the app as soon as the site is deployed, with no new store release.

## Before you start

1. The website must be live on its own HTTPS domain (see `docs/deployment.md`). The app is tied to that
   address, so do not publish to Play before the final domain is settled.
2. The public pages must show real contact details. Check `/contact`, the footer, `/privacy`, `/terms`
   and the WhatsApp buttons on `/pricing`. Google reviews the privacy policy and checks that the contact
   details work.

## 1. Google Play developer account

- Register at play.google.com/console. One-time fee of **$25**.
- Choose **Organization** if the academy is a registered business (it needs a D-U-N-S number, free from
  Dun & Bradstreet, and takes a few days). Choose **Personal** otherwise.
- **Personal accounts created after November 2023 must run a closed test with at least 12 testers for
  14 days in a row before they can publish.** Organization accounts do not. Plan for this if you go
  personal: ask 12 parents, students or teachers to join the test with their Gmail addresses.
- Identity verification (ID document, and a phone and email) can take a few days.

## 2. Build the Android app (no coding or Android Studio needed)

1. Go to **pwabuilder.com** and enter the live address.
2. It checks the site (manifest, icons, offline page). All three are already in place.
3. Choose **Package for stores → Android**. Set:
   - Package ID: `com.headmarkcoaching.app` (permanent once published; choose carefully)
   - App name: Head Mark Coaching. Short name: Head Mark.
   - Let PWABuilder generate a new signing key, and **download and keep the key file and its password
     safe**. Losing it means being unable to update the app. Better still, choose Play App Signing so
     Google holds the key.
4. Download the package. It contains the `.aab` file to upload.

## 3. Link the app to the website (removes the browser bar)

1. In Play Console, after the first upload: **Setup → App signing**, and copy the **SHA-256
   certificate fingerprint** of the **app signing key**.
2. In Vercel, add two environment variables and redeploy:
   - `ANDROID_PACKAGE_NAME` = `com.headmarkcoaching.app`
   - `ANDROID_SHA256_FINGERPRINTS` = the fingerprint(s), comma-separated if more than one
3. Open `https://yourdomain.com/.well-known/assetlinks.json` and check it lists the package and
   fingerprint. Until this is right the app opens with a visible address bar.

## 4. Store listing

You need:
- **App icon** 512 x 512 PNG (`public/icons/icon-512.png` works).
- **Feature graphic** 1024 x 500 PNG.
- **Screenshots**: at least 2 phone screenshots (16:9 or 9:16, min 320 px, max 3840 px). Take them from
  the live site on a phone: student home, practice paper, timetable, parent home.
- **Short description** (80 characters max) and **full description** (4000 characters max).
- **Privacy policy URL**: `https://yourdomain.com/privacy`.
- **Category**: Education.

## 5. Questions Google will ask

- **App access**: the app needs a login. Give Google a **test student account and a test parent account**
  (Admin → Settings → Users) so the reviewer can sign in. Use throwaway accounts with demo data.
- **Data safety form**: the app collects names, phone numbers, emails, attendance, homework, test scores,
  payment receipts (images) and messages. It is not shared with advertisers. Data is encrypted in transit
  (HTTPS). Users can ask for deletion via the contact details on the privacy page.
- **Account deletion**: Google asks for a web page where a user can request deletion. Point it at
  `/contact` (or `/privacy`) once real contact details are on it.
- **Target audience and content**: students are mostly 13 to 18, so choose an age range of 13+ (13 to 17
  and adults). Do not choose "children under 13": that triggers the stricter Families policy.
- **Content rating**: complete the questionnaire. No violence, no user-generated public content.
- **Ads**: none.
- **Payments**: fees are paid by bank transfer or JazzCash/Easypaisa outside the app. The app does not
  sell digital goods, so Google Play Billing is not needed.

## 6. Release

1. Upload the `.aab` to **Internal testing** first, install it on a real phone and check login, the
   practice screen, file upload and the bottom tab bar.
2. Move to **Closed testing** (required for personal accounts, see above), then **Production**.
3. First review usually takes a few days.

## Later

- **Push notifications** (homework, fee and class reminders) are the main thing a store app can do that
  the website cannot. They would need a notification service and a small amount of new code, and are a
  separate piece of work.
- iOS / App Store is possible the same way, but needs Apple's $99 a year account and has stricter review.
