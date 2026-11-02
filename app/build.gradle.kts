plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.aqlni.game"
    compileSdk = 35

    // BuildConfig is referenced by MainActivity (appVersion bridge) and was
    // disabled by default starting with AGP 8 — re-enable it explicitly.
    buildFeatures {
        buildConfig = true
    }

    defaultConfig {
        applicationId = "com.aqlni.game"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
        resourceConfigurations += listOf("ar", "en")
    }

    // Optional release signing. The keystore and its credentials are provided
    // by GitHub Secrets in CI (see .github/workflows/android-build.yml) and are
    // never stored in the repository. When credentials are absent the release
    // build simply produces an unsigned APK.
    signingConfigs {
        val keystoreFile = System.getenv("KEYSTORE_FILE")
        if (!keystoreFile.isNullOrBlank()) {
            create("release") {
                storeFile = file(keystoreFile)
                storePassword = System.getenv("KEYSTORE_PASSWORD")
                keyAlias = System.getenv("KEY_ALIAS") ?: "aqlni"
                keyPassword = System.getenv("KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false // JS <-> Kotlin bridge uses reflection at runtime
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfig = signingConfigs.findByName("release")
        }
        debug {
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    packaging {
        resources.excludes += "META-INF/{AL2.0,LGPL2.1}"
    }
}

dependencies {
    implementation("androidx.activity:activity-ktx:1.10.1")
    implementation("androidx.webkit:webkit:1.14.0")
    testImplementation("junit:junit:4.13.2")
}
