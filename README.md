# bloop 🎉

Never miss a midnight. Bloop keeps your circle's birthdays (and anniversaries, and any "day" you care about) and pings you **right before 12:00 AM** so your wish lands first. Bare React Native (no Expo), Android and iOS.

Palette: forest `#1E4D2B`, lime `#E3F988`, butter `#E4D96F`, on warm cream. Headings and wordmark in Fraunces (soft), UI text in Manrope. Logo: the monoline popper in `src/components/Logo.tsx`; regenerate app icons with `node scripts/make-icons.js`.

## What it does

- **Midnight pings**: by default an 11:55 PM heads-up the night before and a 12:00 AM-sharp ping on the day. Change the defaults in Settings, or set custom times per person (days before + exact time).
- **Any occasion**: birthdays, anniversaries, or your own ("Graduation").
- **Bring your circle in**: phone contacts (anything synced into the contact book), `.vcf` / `.ics` files, or paste a list (`Aman 12 Oct`).
- **Wishes**: five tones (sweet, funny, short, hype, formal), tuned to the relationship. Copy, WhatsApp (opens their chat if you saved a number), SMS, or share anywhere.
- **Memories**: pin photos from your gallery to a person, and Bloop surfaces photos taken on that date in past years.
- **Ads**: adaptive banner above the tab bar, an inline sponsored card in the list, a frequency-capped video interstitial after adding people, and a rewarded video that unlocks the premium wish pack for 24h.

### About Facebook / Instagram / Snapchat

Those platforms do not expose friends' birthdays to third-party apps (Facebook removed it in 2018, the others never had it), so Bloop cannot pull from them. The Import screen says so plainly and points to what works: contacts, calendar files and paste-a-list.

## Run it

```sh
npm install
npm start                      # Metro
npm run android                # with an emulator/device attached
```

iOS: `cd ios && bundle install && bundle exec pod install`, then `npm run ios`.

### Android on a machine like this one

The build needs Android SDK platform 36, build-tools 36.0.0 and NDK 27.1.12297006 (install with `sdkmanager`), JDK 17+, and `android/local.properties` with `sdk.dir=...`.
Faster local builds: `./gradlew assembleDebug -PreactNativeArchitectures=x86_64`.

## Before you ship

1. **Ads**: every id in `src/services/ads.ts`, `AndroidManifest.xml`, `app.json` and (iOS) `Info.plist` is a Google **test** id. Replace them with your AdMob ids. Set up a UMP consent message in AdMob for EU/UK users.
2. **Exact alarms**: Android 12+ needs the user to allow "Alarms & reminders" for 12:00 AM sharp. Settings shows the status and deep-links to the toggle. If you publish on Play, declare the `SCHEDULE_EXACT_ALARM` use in the console.
3. **iOS**: add `NSContactsUsageDescription` and `NSPhotoLibraryUsageDescription` to `Info.plist`, and enable the Push Notifications capability if you move to remote pushes.

## Tests / QA

```sh
npm run typecheck
npm run lint
npm test            # unit + screen tests (Jest, @testing-library/react-native)
npm run qa:android  # end-to-end on a running emulator (see qa/README.md)
```

## Structure

```
src/lib        pure logic: dates, reminder planning, wishes, importers, filters
src/services   native edges: notifications (notifee), contacts, gallery, share, ads
src/store.ts   zustand + AsyncStorage persistence
src/screens    Splash, Onboarding, Home, Circle, Person, Editor, Import, Settings
src/components UI kit: sheets, wheels, chips, icons, logo
scripts        icon generator
qa             emulator end-to-end suite
```
