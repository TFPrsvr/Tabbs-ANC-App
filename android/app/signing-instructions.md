# Android App Signing Instructions

## Required for Google Play Store Submission

### 1. Install Java Development Kit (JDK)

If you don't have Java installed:
- Download and install JDK 11 or later from [Oracle](https://www.oracle.com/java/technologies/downloads/) or [OpenJDK](https://openjdk.org/)
- Ensure `keytool` is available in your PATH

### 2. Generate Release Keystore

Run this command in your terminal:

```bash
keytool -genkey -v -keystore android/app/release-key.keystore -alias anc-audio-key -keyalg RSA -keysize 2048 -validity 10000
```

You'll be prompted for:
- **Keystore password**: Create a strong password (save this securely!)
- **Alias password**: Create another strong password (can be same as keystore)
- **Your details**:
  - First and last name: `ANC Audio Pro`
  - Organizational unit: `Audio Technology`
  - Organization: `Your Company Name`
  - City/Locality: `Your City`
  - State/Province: `Your State`
  - Country code: `US` (or your country)

**⚠️ CRITICAL: Save these passwords securely! You cannot recover them and will need them for all future app updates.**

### 3. Configure Gradle Signing

The `capacitor.config.ts` is already configured to use the keystore:

```typescript
android: {
  buildOptions: {
    keystorePath: 'release-key.keystore',
    keystoreAlias: 'anc-audio-key'
  }
}
```

### 4. Set Environment Variables

Create a `.env.local` file in your project root with:

```env
ANDROID_KEYSTORE_PASSWORD=your_keystore_password
ANDROID_KEY_PASSWORD=your_alias_password
```

Add `.env.local` to your `.gitignore` file to keep passwords secure.

### 5. Build Signed APK/AAB

After generating the keystore:

```bash
# Build for mobile
npm run mobile:build

# Sync with Capacitor
npm run mobile:sync

# Open Android Studio to build signed release
npm run mobile:android
```

In Android Studio:
1. Go to `Build > Generate Signed Bundle / APK`
2. Select `Android App Bundle` (recommended for Play Store)
3. Choose your keystore file and enter passwords
4. Select `release` build variant
5. Build the signed AAB file

### 6. Security Best Practices

- **Backup your keystore file** in multiple secure locations
- **Never commit keystore files** to version control
- **Store passwords** in a secure password manager
- **Use strong, unique passwords** for keystore and alias
- **Keep keystore file secure** - if lost, you cannot update your app

### 7. Upload to Google Play Console

1. Create a Google Play Console account
2. Create a new app listing
3. Upload your signed AAB file
4. Fill in app details, descriptions, and screenshots
5. Submit for review

### Additional Notes

- The keystore must be used for all future app updates
- Google Play requires apps to be signed with the same keystore for updates
- Consider using Play App Signing for additional security
- Test your signed build thoroughly before submission

### Troubleshooting

If you encounter issues:
1. Ensure Java is properly installed and in PATH
2. Check keystore file exists in `android/app/` directory
3. Verify passwords are correct
4. Clean and rebuild project if needed

For more details, see:
- [Android App Signing Documentation](https://developer.android.com/studio/publish/app-signing)
- [Capacitor Android Documentation](https://capacitorjs.com/docs/android)