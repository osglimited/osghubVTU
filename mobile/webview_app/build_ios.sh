#!/bin/bash
echo "Building iOS IPA..."
flutter clean
flutter pub get
cd ios
pod install
cd ..
flutter build ipa --release
echo "Build complete. IPA is located in build/ios/ipa"
