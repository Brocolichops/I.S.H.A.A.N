import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { supabase } from "@/lib/supabase";

type Mode = "sign-in" | "sign-up";

const MIN_PASSWORD_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const isSignUp = mode === "sign-up";

  const switchMode = () => {
    setMode(isSignUp ? "sign-in" : "sign-up");
    setPassword("");
    setConfirmPassword("");
    setErrorMessage(null);
    setNoticeMessage(null);
  };

  const validate = (): string | null => {
    if (!EMAIL_PATTERN.test(email.trim())) return "Enter a valid email address.";
    if (!password) return "Enter your password.";
    if (isSignUp) {
      if (password.length < MIN_PASSWORD_LENGTH) {
        return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
      }
      if (password !== confirmPassword) return "Passwords do not match.";
    }
    return null;
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    const validationError = validate();
    if (validationError) {
      setErrorMessage(validationError);
      setNoticeMessage(null);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setNoticeMessage(null);

    try {
      const cleanEmail = email.trim().toLowerCase();

      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
        });
        if (error) throw error;

        // With "Confirm email" on, there is no session until the link is clicked.
        if (!data.session) {
          setMode("sign-in");
          setPassword("");
          setConfirmPassword("");
          setNoticeMessage(
            "Account created. Check your email to confirm it, then sign in.",
          );
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (error) throw error;
      }
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Ishaan</Text>
          <Text style={styles.subtitle}>
            {isSignUp ? "Create your account" : "Sign in to continue"}
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              editable={!isSubmitting}
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#6B7280"
              style={styles.input}
              textContentType="emailAddress"
              value={email}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              autoCorrect={false}
              editable={!isSubmitting}
              onChangeText={setPassword}
              onSubmitEditing={isSignUp ? undefined : () => void handleSubmit()}
              placeholder={
                isSignUp ? `At least ${MIN_PASSWORD_LENGTH} characters` : "Password"
              }
              placeholderTextColor="#6B7280"
              secureTextEntry
              style={styles.input}
              textContentType={isSignUp ? "newPassword" : "password"}
              value={password}
            />

            {isSignUp ? (
              <>
                <Text style={styles.label}>Confirm password</Text>
                <TextInput
                  autoCapitalize="none"
                  autoComplete="new-password"
                  autoCorrect={false}
                  editable={!isSubmitting}
                  onChangeText={setConfirmPassword}
                  onSubmitEditing={() => void handleSubmit()}
                  placeholder="Repeat your password"
                  placeholderTextColor="#6B7280"
                  secureTextEntry
                  style={styles.input}
                  textContentType="newPassword"
                  value={confirmPassword}
                />
              </>
            ) : null}

            {errorMessage ? (
              <Text accessibilityLiveRegion="polite" style={styles.errorText}>
                {errorMessage}
              </Text>
            ) : null}
            {noticeMessage ? (
              <Text accessibilityLiveRegion="polite" style={styles.noticeText}>
                {noticeMessage}
              </Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={() => void handleSubmit()}
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
                isSubmitting && styles.buttonDisabled,
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>
                  {isSignUp ? "Create account" : "Sign in"}
                </Text>
              )}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={switchMode}
              style={styles.switchButton}
            >
              <Text style={styles.switchText}>
                {isSignUp
                  ? "Already have an account? Sign in"
                  : "New here? Create an account"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function getAuthErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (/invalid login credentials/i.test(message)) {
    return "Incorrect email or password.";
  }
  if (/email not confirmed/i.test(message)) {
    return "Please confirm your email first. Check your inbox for the link.";
  }
  if (/already registered/i.test(message)) {
    return "An account with this email already exists. Try signing in.";
  }
  if (/network request failed|failed to fetch/i.test(message)) {
    return "Cannot reach the server. Check your internet connection.";
  }
  return message;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: "#000000" },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingVertical: 32,
  },
  title: {
    color: "#27F587",
    fontSize: 40,
    fontWeight: "bold",
    textAlign: "center",
  },
  subtitle: {
    color: "#9CA3AF",
    fontSize: 16,
    marginBottom: 32,
    marginTop: 6,
    textAlign: "center",
  },
  form: { alignSelf: "center", maxWidth: 420, width: "100%" },
  label: {
    color: "#D1D5DB",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    backgroundColor: "#111418",
    borderColor: "#2A2F36",
    borderRadius: 12,
    borderWidth: 1,
    color: "#FFFFFF",
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  errorText: { color: "#FF8A80", marginTop: 16, textAlign: "center" },
  noticeText: { color: "#27F587", marginTop: 16, textAlign: "center" },
  button: {
    alignItems: "center",
    backgroundColor: "#27B4F5",
    borderRadius: 14,
    marginTop: 24,
    paddingVertical: 16,
  },
  buttonPressed: { opacity: 0.8 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  switchButton: { alignItems: "center", marginTop: 18, paddingVertical: 8 },
  switchText: { color: "#27B4F5", fontSize: 14 },
});