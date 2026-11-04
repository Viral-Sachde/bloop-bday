<p align="center">
  <img src="landing/icon.svg" width="96" height="96" alt="Bloop logo">
</p>

<h1 align="center">Bloop</h1>

<p align="center"><b>Never miss a midnight.</b><br>Birthday reminders timed for 12:00 AM, with the wish already written.</p>

<p align="center">
  <a href="https://github.com/Viral-Sachde/bloop-bday/releases/latest"><b>Download for Android</b></a> ·
  <a href="https://bloop-bday.vercel.app">Website</a>
</p>

---

## Why Bloop

Calendar reminders go off in the morning, and by then the group chat has already said happy birthday thirty times. Bloop pings you at **11:55 PM** the night before and again at **12:00 AM sharp**, with a message ready to send, so your wish lands first.

## What it does

- **Midnight pings:** a heads-up at 11:55 PM and a ping at 12:00 AM. Change the times for everyone, or per person.
- **Any occasion:** birthdays, anniversaries, or a date you name yourself.
- **Bring your circle in:** import from phone contacts, `.vcf` / `.ics` files, or paste a list like `Aman 12 Oct`.
- **Wishes in your voice:** five tones (sweet, funny, short, hype, formal), tuned to whether they're your partner, family, a friend or a colleague. Send by WhatsApp, SMS, or copy and share.
- **Memories:** pin photos to a person, and see photos you took on that date in past years.
- **Private:** no account, no server. Everything stays on your phone.

## Install (Android)

1. On your phone, open the [latest release](https://github.com/Viral-Sachde/bloop-bday/releases/latest) and tap **bloop.apk** under Assets.
2. Open the downloaded file. If Android asks, allow installs from your browser.
3. If Play Protect says it doesn't recognise the app, tap **More details → Install anyway**. Bloop isn't on the Play Store yet.
4. On first launch, allow **notifications** and **Alarms & reminders**. The second one makes the 12:00 AM ping exact.

Requires Android 7.0 or later. An iPhone version is in the works.

## FAQ

**Can it import birthdays from Facebook or Instagram?**
No. Facebook removed friends' birthdays from its API in 2018, and Instagram and Snapchat never offered them. Use contacts, calendar files, or paste a list.

**My reminder didn't arrive at exactly 12:00.**
On Android 12 and later, exact times need the "Alarms & reminders" permission. Bloop's Settings shows whether it's on and links straight to the toggle.

**Is it free?**
Yes, and there are no ads. Every wish, including the premium pack, is open to everyone.

---

## For developers

Bare React Native 0.87 (no Expo), TypeScript, notifee for exact alarms, zustand + AsyncStorage for storage.

```sh
npm install
npm start                      # Metro
npm run android                # with an emulator/device attached
```

iOS: `cd ios && bundle install && bundle exec pod install`, then `npm run ios`.

Android builds need SDK platform 36, build-tools 36.0.0, NDK 27.1.12297006, JDK 17+, and `android/local.properties` with `sdk.dir=...`. Faster local builds: `./gradlew assembleDebug -PreactNativeArchitectures=x86_64`.

### Checks

```sh
npm run typecheck
npm run lint
npm test            # unit + screen tests (Jest, @testing-library/react-native)
npm run qa:android  # end-to-end on a running emulator (see qa/README.md)
```

### Structure

```
src/lib        pure logic: dates, reminder planning, wishes, importers, filters
src/services   native edges: notifications (notifee), contacts, gallery, share, ads
src/store.ts   zustand + AsyncStorage persistence
src/screens    Splash, Onboarding, Home, Circle, Person, Editor, Import, Settings
src/components UI kit: sheets, wheels, chips, icons, logo
landing        marketing site (static, deployed on Vercel)
scripts        icon generator
qa             emulator end-to-end suite
```

Brand: forest `#1E4D2B`, lime `#E3F988`, butter `#E4D96F`, on warm cream. Headings in Fraunces, UI in Manrope. Logo lives in `src/components/Logo.tsx`; regenerate app icons with `node scripts/make-icons.js`.

### Ads

The app ships ad-free: `ADS_ENABLED` in `src/config.ts` is `false`, which turns off every ad slot and opens the premium wish pack. To bring ads back, set it to `true` and swap in real AdMob ids (below).

### Release signing

`assembleRelease` signs with the release key when `BLOOP_UPLOAD_STORE_FILE`, `BLOOP_UPLOAD_KEY_ALIAS`, `BLOOP_UPLOAD_STORE_PASSWORD` and `BLOOP_UPLOAD_KEY_PASSWORD` are set in `~/.gradle/gradle.properties`, otherwise with the debug key. Never commit the keystore or its passwords.

```sh
cd android && ./gradlew assembleRelease -PreactNativeArchitectures=armeabi-v7a,arm64-v8a
```

### Before publishing to the Play Store

1. **Ads (only if you turn them on):** every id in `src/services/ads.ts`, `AndroidManifest.xml`, `app.json` and `Info.plist` is a Google **test** id. Replace them with your AdMob ids and set up a UMP consent message for EU/UK users.
2. **Exact alarms:** declare the `SCHEDULE_EXACT_ALARM` use in the Play Console.
3. **iOS:** add `NSContactsUsageDescription` and `NSPhotoLibraryUsageDescription` to `Info.plist`.
