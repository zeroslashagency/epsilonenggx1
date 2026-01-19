# PRD: iOS Flutter App Cloning

## Project Overview

Convert the existing Android Flutter application to an iOS/iPad version using Ralphy autonomous AI coding framework, resulting in a distributable `.ipa` file.

## Tasks

### Phase 1: Project Setup

- [x] Verify Flutter project structure is intact in epsilon_ios directory
- [x] Clean build artifacts from previous Android builds
- [ ] Rename project file from epsilon_android.iml to epsilon_ios.iml
- [ ] Update project name in pubspec.yaml to epsilon_ios

### Phase 2: iOS Platform Generation

- [ ] Generate iOS platform files using `flutter create . --platforms=ios`
- [ ] Verify `ios/` directory structure is created
- [ ] Verify Podfile is present in ios/ directory
- [ ] Install CocoaPods dependencies using `pod install`
- [ ] Verify all pods installed successfully

### Phase 3: iOS Configuration

- [ ] Update `pubspec.yaml` to enable iOS icons (change ios: false to ios: true)
- [ ] Generate iOS app icons using `flutter_launcher_icons`
- [ ] Configure `ios/Runner/Info.plist` with necessary permissions
- [ ] Add network permissions if needed for video streaming
- [ ] Add photo library usage description if file uploads are needed
- [ ] Configure deep linking schemes for Supabase Auth (io.supabase.epsilon://)
- [ ] Update bundle identifier to com.yourcompany.epsilon in Xcode
- [ ] Configure minimum iOS deployment target to iOS 12.0

### Phase 4: iPad Adaptation

- [ ] Open Xcode project and verify configuration
- [ ] Enable iPad device family in Deployment Info
- [ ] Enable all orientations (Portrait, Landscape Left, Landscape Right, Upside Down)
- [ ] Review main.dart and other core files for hardcoded dimensions
- [ ] Update responsive layouts in main.dart using MediaQuery and LayoutBuilder
- [ ] Update calendar strip widget to be responsive
- [ ] Update chart widgets to be responsive
- [ ] Ensure all feature screens are responsive

### Phase 5: Build & Validation

- [ ] Run `flutter analyze` to check for issues
- [ ] Run `flutter test` to verify tests pass
- [ ] Fix any lint issues found
- [ ] Fix any test failures found
- [ ] Run `flutter build ipa --release` to create archive
- [ ] Verify IPA file is generated in build/ios/archive/
- [ ] Document build success and IPA location

### Phase 6: Documentation

- [ ] Create iOS-specific README.md with build instructions
- [ ] Document required Apple Developer account setup
- [ ] Document signing configuration process
- [ ] Create troubleshooting guide for common iOS issues
- [ ] Document how to install and test IPA on iPad

## Success Criteria

- ✅ `flutter build ipa --release` completes successfully
- ✅ `.ipa` file is generated and ready for distribution
- ✅ All Android features work on iOS
- ✅ UI adapts to iPad orientations and screen sizes
- ✅ No build warnings or errors
