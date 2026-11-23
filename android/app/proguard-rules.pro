# Alpha Phone R8 rules.
# Modelled on vendor/eliza/packages/app/platforms/android/app/proguard-rules.pro.
# Release builds are minified and resource-shrunk; mapping.txt is written to
# android/app/build/outputs/mapping/<variant>Release/mapping.txt and must be
# retained with every distributed release APK to symbolicate crash reports.

# Capacitor: the bridge resolves plugins, @PluginMethod, @PermissionCallback and
# @ActivityCallback members by reflection from the WebView.
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepclassmembers class * {
    @com.getcapacitor.PluginMethod <methods>;
    @com.getcapacitor.annotation.PermissionCallback <methods>;
    @com.getcapacitor.annotation.ActivityCallback <methods>;
}

# Upstream elizaOS native plugins (camera, location, system, calendar, reminders,
# network policy). Their manifest components are instantiated by name.
-keep class ai.eliza.plugins.** { *; }
-keep class ai.elizaos.plugins.** { *; }

# Manifest components Android instantiates by class name.
-keep class ai.alphacompute.alphaphone.MainActivity { *; }
-keep class ai.alphacompute.alphaphone.AlphaAssistActivity { *; }
-keep class ai.alphacompute.alphaphone.AlphaMailPdfActivity { *; }
-keep class ai.alphacompute.alphaphone.ElizaAgentService { *; }
-keep class ai.alphacompute.alphaphone.AlphaNotificationListener { *; }
-keep class ai.alphacompute.alphaphone.ReminderReceiver { *; }
-keep class ai.alphacompute.alphaphone.IsolatedPdfService { *; }
-keep class ai.alphacompute.alphaphone.AlphaMailFileProvider { *; }

# WorkManager instantiates workers reflectively from persisted class names, so
# names must stay stable across app updates.
-keep class ai.alphacompute.alphaphone.HostedDeliveryWorker { *; }
-keep class ai.alphacompute.alphaphone.ElizaTasksWorker { *; }
-keep class * extends androidx.work.ListenableWorker {
    public <init>(android.content.Context, androidx.work.WorkerParameters);
}

# The upstream os agent service and local inference host (packages/os/android agent-service and
# local-inference). libparadeevoicejni registers its natives on ai/eliza/voice/VoiceNative by name,
# and the agent service's socket hosts and inference engine are reached across the process boundary
# by class name; agent-service ships no consumer rules of its own.
-keep class ai.eliza.voice.** { *; }
-keep class ai.eliza.os.agent.** { *; }
-keepclasseswithmembernames,includedescriptorclasses class * {
    native <methods>;
}

# WebView JavaScript interfaces.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# AndroidX (kept wholesale, as upstream does, because Capacitor and WebKit
# resolve several AndroidX entry points reflectively).
-keep class androidx.** { *; }
-keep interface androidx.** { *; }

# Kotlin coroutines (pulled in by upstream Kotlin plugins).
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}
-keepclassmembers class kotlinx.coroutines.** {
    volatile <fields>;
}

# Crash-report symbolication.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes Exceptions
-keepattributes InnerClasses,EnclosingMethod
