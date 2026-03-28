# GitHub Actions — Secrets & Environments Setup Guide
# PreSense AI Build Pipeline

## Overview

The CI/CD pipeline uses three workflow files:
  .github/workflows/ci.yml       → Every push/PR  (lint, test, bundle check)
  .github/workflows/android.yml  → Android builds (debug APK + signed AAB)
  .github/workflows/ios.yml      → iOS builds     (simulator + signed IPA → TestFlight)

---

## 1. Repository Secrets

Go to: Repository → Settings → Secrets and variables → Actions → New repository secret

### Required for all builds
┌──────────────────────────────┬──────────────────────────────────────────────────────────────┐
│ Secret name                  │ How to create                                                │
├──────────────────────────────┼──────────────────────────────────────────────────────────────┤
│ MODEL_TFLITE_BASE64          │ base64 -w 0 presense_model.tflite > /tmp/model.b64          │
│                              │ Then paste the contents of /tmp/model.b64                    │
└──────────────────────────────┴──────────────────────────────────────────────────────────────┘

### Android signing secrets
┌──────────────────────────────┬──────────────────────────────────────────────────────────────┐
│ KEYSTORE_BASE64              │ base64 -w 0 presense-release.jks > /tmp/ks.b64              │
│                              │ Paste contents of /tmp/ks.b64                                │
├──────────────────────────────┼──────────────────────────────────────────────────────────────┤
│ KEYSTORE_PASSWORD            │ Your keystore password (plain text)                          │
├──────────────────────────────┼──────────────────────────────────────────────────────────────┤
│ KEY_ALIAS                    │ Your key alias (e.g. presense-key)                           │
├──────────────────────────────┼──────────────────────────────────────────────────────────────┤
│ KEY_PASSWORD                 │ Your key password (plain text)                               │
├──────────────────────────────┼──────────────────────────────────────────────────────────────┤
│ GOOGLE_PLAY_JSON_KEY         │ Contents of service account .json from Google Play Console   │
└──────────────────────────────┴──────────────────────────────────────────────────────────────┘

How to create an Android keystore:
  keytool -genkey -v \
    -keystore presense-release.jks \
    -alias presense-key \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000

### iOS signing secrets
┌──────────────────────────────────────┬───────────────────────────────────────────────────────┐
│ BUILD_CERTIFICATE_BASE64             │ Export .p12 from Keychain Access → base64 -w 0 ...   │
├──────────────────────────────────────┼───────────────────────────────────────────────────────┤
│ P12_PASSWORD                         │ Password you set when exporting the .p12              │
├──────────────────────────────────────┼───────────────────────────────────────────────────────┤
│ BUILD_PROVISION_PROFILE_BASE64       │ base64 -w 0 PreSenseAI_Distribution.mobileprovision  │
├──────────────────────────────────────┼───────────────────────────────────────────────────────┤
│ KEYCHAIN_PASSWORD                    │ Any string (temporary keychain password, e.g. "ci123")│
├──────────────────────────────────────┼───────────────────────────────────────────────────────┤
│ APPLE_TEAM_ID                        │ 10-char team ID from developer.apple.com              │
├──────────────────────────────────────┼───────────────────────────────────────────────────────┤
│ APP_STORE_CONNECT_API_KEY_ID         │ Key ID from App Store Connect → Users → Keys          │
├──────────────────────────────────────┼───────────────────────────────────────────────────────┤
│ APP_STORE_CONNECT_ISSUER_ID          │ Issuer ID from same page                              │
├──────────────────────────────────────┼───────────────────────────────────────────────────────┤
│ APP_STORE_CONNECT_KEY_BASE64         │ base64 -w 0 AuthKey_KEYID.p8                         │
└──────────────────────────────────────┴───────────────────────────────────────────────────────┘

### Optional
┌──────────────────────────────┬──────────────────────────────────────────────────────────────┐
│ CODECOV_TOKEN                │ From codecov.io → your repo settings                         │
│ SLACK_URL                    │ Slack Incoming Webhook URL for build notifications            │
└──────────────────────────────┴──────────────────────────────────────────────────────────────┘

---

## 2. GitHub Environments

Go to: Repository → Settings → Environments → New environment

Create an environment called: production

Configure:
  ✅ Required reviewers: add yourself or your team
  ✅ Deployment branches: Selected branches → main, release, v*.*.*

This ensures release builds require manual approval before signing.

---

## 3. Branch Protection Rules

Go to: Repository → Settings → Branches → Add rule

Branch name pattern: main

✅ Require a pull request before merging
✅ Require status checks to pass before merging
   Required checks:
     - CI Success            (from ci.yml)
     - Android Debug APK     (from android.yml, on PRs)
     - iOS Simulator Build   (from ios.yml, on PRs)
✅ Require branches to be up to date before merging
✅ Restrict who can push to matching branches

---

## 4. Build Trigger Summary

┌─────────────────────────────┬───────────────┬─────────────────────┬────────────────────────┐
│ Event                       │ CI checks     │ Android build       │ iOS build              │
├─────────────────────────────┼───────────────┼─────────────────────┼────────────────────────┤
│ Push to any branch          │ ✅ lint+test  │ —                   │ —                      │
│ Pull request → main/develop │ ✅ lint+test  │ ✅ debug APK        │ ✅ simulator build     │
│ Push to main/develop        │ ✅ lint+test  │ ✅ debug APK        │ ✅ simulator build     │
│ Push tag v*.*.*             │ ✅ lint+test  │ 🚀 signed AAB+APK   │ 🚀 signed IPA+TF      │
│ Push to release branch      │ ✅ lint+test  │ 🚀 signed AAB+APK   │ 🚀 signed IPA+TF      │
│ Manual dispatch (debug)     │ —             │ ✅ debug APK        │ —                      │
│ Manual dispatch (release)   │ —             │ 🚀 signed AAB+APK   │ 🚀 signed IPA+TF      │
└─────────────────────────────┴───────────────┴─────────────────────┴────────────────────────┘

---

## 5. Release Process (Tag-Based)

# 1. Ensure main is clean and tests pass
git checkout main && git pull

# 2. Bump version in package.json
npm version patch   # or minor / major

# 3. Push commit + tag (triggers release builds automatically)
git push && git push --tags

# 4. GitHub Actions runs:
#    - android.yml:android-release  → uploads AAB to Google Play Internal
#    - ios.yml:ios-release          → uploads IPA to TestFlight
#    - Creates GitHub Release with artifacts

# 5. Approve in the 'production' environment (if protection rules set)

---

## 6. Artifacts

Debug builds: retained 7 days
Release builds: retained 30 days
Location: Repository → Actions → (workflow run) → Artifacts section

---

## 7. Local Development

To run Fastlane locally:
  gem install bundler
  bundle install

  # iOS beta
  bundle exec fastlane ios beta

  # Android beta
  bundle exec fastlane android beta

Required env vars for local Fastlane:
  export APPLE_ID="your@email.com"
  export APPLE_TEAM_ID="XXXXXXXXXX"
  export APP_STORE_CONNECT_API_KEY_ID="XXXXXXXXXX"
  export APP_STORE_CONNECT_ISSUER_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  export APP_STORE_CONNECT_KEY_BASE64="$(base64 -w 0 AuthKey_KEYID.p8)"
  export GOOGLE_PLAY_JSON_KEY="$(cat google-play-service-account.json)"
  export PRESENSE_KEYSTORE_PATH="presense-release.jks"
  export PRESENSE_KEYSTORE_PASSWORD="your-password"
  export PRESENSE_KEY_ALIAS="presense-key"
  export PRESENSE_KEY_PASSWORD="your-key-password"
