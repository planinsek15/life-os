#!/usr/bin/env bash
# Zgradi APK "Life OS" za tablico (Android 4.0, API 14) v Dockerju.
# Zaženi na strežniku doma v mapi s tem projektom:  bash zgradi.sh
# Orodja Android (uradni prenos z dl.google.com) se hranijo v Docker volumnu android-sdk.
set -euo pipefail
cd "$(dirname "$0")"

docker run --rm -v android-sdk:/sdk -v "$PWD":/src -w /src debian:trixie bash -euc '
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq >/dev/null
  apt-get install -y -qq openjdk-21-jdk-headless wget unzip zip >/dev/null
  export ANDROID_HOME=/sdk
  if [ ! -x /sdk/build-tools/36.0.0/aapt ]; then
    wget -q https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -O /tmp/ct.zip
    mkdir -p /sdk/cmdline-tools && unzip -q -o /tmp/ct.zip -d /sdk/cmdline-tools
    rm -rf /sdk/cmdline-tools/latest && mv /sdk/cmdline-tools/cmdline-tools /sdk/cmdline-tools/latest
    yes | /sdk/cmdline-tools/latest/bin/sdkmanager --licenses >/dev/null
    /sdk/cmdline-tools/latest/bin/sdkmanager "build-tools;36.0.0" "platforms;android-15" >/dev/null
  fi
  [ -f /sdk/platforms/android-21/android.jar ] || /sdk/cmdline-tools/latest/bin/sdkmanager "build-tools;36.0.0" "platforms;android-21" >/dev/null
  BT=/sdk/build-tools/36.0.0
  JAR=/sdk/platforms/android-21/android.jar
  rm -rf build && mkdir -p build/gen build/obj build/dex
  $BT/aapt package -f -M AndroidManifest.xml -S res -I $JAR -J build/gen -F build/osnova.apk
  javac -nowarn --release 11 -cp $JAR -d build/obj \
    $(find src build/gen -name "*.java") 2>&1 | grep -v "^warning\|^Note" || true
  $BT/d8 --min-api 14 --lib $JAR --output build/dex $(find build/obj -name "*.class")
  cp build/osnova.apk build/nepodpisan.apk
  (cd build/dex && zip -q ../nepodpisan.apk classes.dex)
  $BT/zipalign -f 4 build/nepodpisan.apk build/poravnan.apk
  if [ ! -f kljuc.jks ]; then
    keytool -genkeypair -keystore kljuc.jks -storepass "$KS_GESLO" -keypass "$KS_GESLO" \
      -alias lifeos -keyalg RSA -keysize 2048 -validity 20000 -dname "CN=Life OS tablica" >/dev/null 2>&1
  fi
  $BT/apksigner sign --ks kljuc.jks --ks-pass env:KS_GESLO --ks-key-alias lifeos \
    --v1-signing-enabled true --v2-signing-enabled false --min-sdk-version 14 \
    --out lifeos-tablica.apk build/poravnan.apk
  $BT/apksigner verify --min-sdk-version 14 lifeos-tablica.apk && ls -la lifeos-tablica.apk
  chown -R '"$(id -u):$(id -g)"' build lifeos-tablica.apk kljuc.jks
'
