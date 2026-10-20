# Proguard rules for Ganesh Mitra Mandali
-keepattributes *Annotation*
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
