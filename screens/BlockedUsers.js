import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { ArrowLeftIcon, ProhibitIcon } from 'phosphor-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { apiGet } from '../services/api';
import { unblockUser } from '../services/users';

export default function BlockedUsers({ navigation }) {
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadBlockedUsers();
    }, [])
  );

  const loadBlockedUsers = async () => {
    setLoading(true);
    try {
      const data = await apiGet('/blocks/');
      setBlockedUsers(data || []);
    } catch (error) {
      console.error('Error loading blocked users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = (userId, username) => {
    Alert.alert(
      'Unblock User',
      `Unblock ${username}? They will be able to see your profile and posts again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: async () => {
            try {
              const { error } = await unblockUser(userId);
              if (error) throw error;
              setBlockedUsers(prev => prev.filter(u => u.id !== userId));
            } catch (error) {
              console.error('Error unblocking user:', error);
              Alert.alert('Error', 'Failed to unblock user');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeftIcon color="rgba(255,255,255,0.7)" size={20} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Blocked Users</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#fff" />
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {blockedUsers.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <ProhibitIcon color="rgba(255,255,255,0.3)" size={24} />
              </View>
              <Text style={styles.emptyText}>No blocked users</Text>
              <Text style={styles.emptySubtext}>Users you block will appear here</Text>
            </View>
          ) : (
            <>
              <Text style={styles.hint}>Tap Unblock to remove a user from your block list</Text>
              {blockedUsers.map((u) => (
                <View key={u.id} style={styles.userCard}>
                  <Image
                    source={{
                      uri: u.profile_picture_url ||
                           `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`,
                    }}
                    style={styles.avatar}
                  />
                  <Text style={styles.username}>@{u.username}</Text>
                  <TouchableOpacity
                    style={styles.unblockButton}
                    onPress={() => handleUnblock(u.id, u.username)}
                  >
                    <Text style={styles.unblockText}>Unblock</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 24,
  },
  hint: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 12,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  username: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  unblockButton: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  unblockText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
    gap: 12,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    fontWeight: '500',
  },
  emptySubtext: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 14,
  },
});
