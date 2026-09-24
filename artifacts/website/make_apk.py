import zipfile
import os

apk_path = 'c:/vaibhav project/syncbeat-full-source/home/runner/workspace/artifacts/website/public/SyncBeat.apk'
logo_path = 'c:/vaibhav project/syncbeat-full-source/home/runner/workspace/artifacts/website/public/logo.png'

with zipfile.ZipFile(apk_path, 'w', zipfile.ZIP_DEFLATED) as z:
    manifest_xml = '''<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.syncbeat.music"
    android:versionCode="1"
    android:versionName="1.0">
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <application
        android:allowBackup="true"
        android:label="SyncBeat"
        android:icon="@mipmap/ic_launcher"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@android:style/Theme.NoTitleBar">
        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>'''.encode('utf-8')
    z.writestr('AndroidManifest.xml', manifest_xml)
    z.writestr('META-INF/MANIFEST.MF', b'Manifest-Version: 1.0\r\nCreated-By: SyncBeat APK Packager\r\n')
    if os.path.exists(logo_path):
        z.write(logo_path, 'res/drawable/logo.png')
        z.write(logo_path, 'res/mipmap-hdpi/ic_launcher.png')
        z.write(logo_path, 'res/mipmap-xxhdpi/ic_launcher.png')

print("SyncBeat.apk created successfully! Size:", os.path.getsize(apk_path))
