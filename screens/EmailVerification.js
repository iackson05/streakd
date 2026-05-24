import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { apiPost } from '../services/api';

const BRAND = '#FF6B35';
const CODE_LENGTH = 6;

export default function EmailVerification() {
  const { refreshProfile, signOut } = useAuth();
  const [code, setCode] = useState(Array(CODE_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputs = useRef([]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleChange = (text, index) => {
    if (text.length > 1) {
      const digits = text.replace(/\D/g, '').split('').slice(0, CODE_LENGTH);
      const newCode = [...code];
      digits.forEach((d, i) => {
        if (index + i < CODE_LENGTH) newCode[index + i] = d;
      });
      setCode(newCode);
      const nextIndex = Math.min(index + digits.length, CODE_LENGTH - 1);
      inputs.current[nextIndex]?.focus();
      if (newCode.every(d => d !== '')) {
        submitCode(newCode.join(''));
      }
      return;
    }

    const newCode = [...code];
    newCode[index] = text.replace(/\D/g, '');
    setCode(newCode);

    if (text && index < CODE_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }

    if (newCode.every(d => d !== '')) {
      submitCode(newCode.join(''));
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
      const newCode = [...code];
      newCode[index - 1] = '';
      setCode(newCode);
    }
  };

  const submitCode = async (codeStr) => {
    setLoading(true);
    try {
      await apiPost('/auth/verify-email', { code: codeStr });
      await refreshProfile();
    } catch (error) {
      const message = error?.detail || error?.message || 'Invalid or expired code. Please try again.';
      Alert.alert('Verification Failed', message);
      setCode(Array(CODE_LENGTH).fill(''));
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      await apiPost('/auth/resend-verification', {});
      setResendCooldown(60);
      Alert.alert('Code Sent', 'A new verification code has been sent to your email.');
    } catch (error) {
      Alert.alert('Error', 'Failed to resend code. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Verify your email</Text>
            <Text style={styles.subtitle}>
              We sent a 6-digit code to your email address. Enter it below to verify your account.
            </Text>
          </View>

          <View style={styles.codeContainer}>
            {code.map((digit, index) => (
              <TextInput
                key={index}
                ref={ref => inputs.current[index] = ref}
                style={[styles.codeInput, digit && styles.codeInputFilled]}
                value={digit}
                onChangeText={text => handleChange(text, index)}
                onKeyPress={e => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={CODE_LENGTH}
                editable={!loading}
                autoFocus={index === 0}
              />
            ))}
          </View>

          {loading && (
            <ActivityIndicator color={BRAND} size="large" style={{ marginTop: 24 }} />
          )}

          <TouchableOpacity
            style={styles.resendButton}
            onPress={handleResend}
            disabled={resendCooldown > 0}
          >
            <Text style={[styles.resendText, resendCooldown > 0 && styles.resendTextDisabled]}>
              {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
            <Text style={styles.signOutText}>Use a different account</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  codeContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  codeInput: {
    width: 48,
    height: 56,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  codeInputFilled: {
    borderColor: BRAND,
    backgroundColor: 'rgba(255,107,53,0.08)',
  },
  resendButton: {
    marginTop: 32,
    padding: 12,
  },
  resendText: {
    color: BRAND,
    fontSize: 15,
    fontWeight: '600',
  },
  resendTextDisabled: {
    color: 'rgba(255,255,255,0.3)',
  },
  signOutButton: {
    marginTop: 16,
    padding: 12,
  },
  signOutText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
  },
});
