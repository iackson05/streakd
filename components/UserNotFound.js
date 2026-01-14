import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { AlertTriangle } from 'lucide-react-native';

export default function UserNotFound() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <AlertTriangle color="#EA580C" size={32} />
          </View>
          
          <Text style={styles.title}>Access Restricted</Text>
          
          <Text style={styles.description}>
            You are not registered to use this application. Please contact 
            the app administrator to request access.
          </Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>
              If you believe this is an error, you can:
            </Text>
            <Text style={styles.infoItem}>
              • Verify you are logged in with the correct account
            </Text>
            <Text style={styles.infoItem}>
              • Contact the app administrator for access
            </Text>
            <Text style={styles.infoItem}>
              • Try logging out and back in again
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  infoBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 16,
  },
  infoTitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
  },
  infoItem: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 20,
  },
});