import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
  ActionSheetIOS,
  Platform,
  Pressable,
} from 'react-native';
import { XIcon, DotsThreeIcon, UserPlusIcon, CheckIcon, ClockIcon, CameraIcon, TrophyIcon, UsersIcon } from 'phosphor-react-native';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { apiGet } from '../services/api';
import {
  getUserFriendships,
  sendFriendRequest,
  removeFriend,
  blockUser,
  reportContent,
} from '../services/users';

export default function UserProfileModal({ userId, username: initialUsername, visible, onClose }) {
  const { user } = useAuth();
  const { invalidateFriends, invalidateFeed } = useData();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [friendshipStatus, setFriendshipStatus] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (visible && userId) {
      setProfile(null);
      setFriendshipStatus(null);
      setLoading(true);
      Promise.all([loadProfile(), loadFriendshipStatus()]).finally(() =>
        setLoading(false)
      );
    }
  }, [visible, userId]);

  const loadProfile = async () => {
    try {
      const data = await apiGet(`/users/profile/${userId}`);
      setProfile(data);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadFriendshipStatus = async () => {
    try {
      const { friendships } = await getUserFriendships(user.id);
      if (!friendships) return;
      const friendship = friendships.get(userId);
      if (!friendship) {
        setFriendshipStatus(null);
      } else if (friendship.status === 'accepted') {
        setFriendshipStatus('accepted');
      } else if (friendship.status === 'pending') {
        setFriendshipStatus(friendship.sentByMe ? 'pending_sent' : 'pending_received');
      }
    } catch (error) {
      console.error('Error loading friendship status:', error);
    }
  };

  const handleAddFriend = async () => {
    setActionLoading(true);
    try {
      const { error } = await sendFriendRequest(user.id, userId);
      if (error) throw error;
      setFriendshipStatus('pending_sent');
      invalidateFriends();
    } catch (error) {
      Alert.alert('Error', 'Failed to send friend request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveFriend = async () => {
    const isPending = friendshipStatus === 'pending_sent';
    Alert.alert(
      isPending ? 'Cancel Request' : 'Remove Friend',
      isPending
        ? `Cancel your friend request to ${profile?.username || 'this user'}?`
        : `Remove ${profile?.username || 'this user'} as a friend?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isPending ? 'Cancel Request' : 'Remove',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              const { error } = await removeFriend(user.id, userId);
              if (error) throw error;
              setFriendshipStatus(null);
              invalidateFriends();
              invalidateFeed();
            } catch (error) {
              Alert.alert('Error', 'Failed to remove friend');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleBlock = () => {
    Alert.alert(
      'Block User',
      `Block ${profile?.username || 'this user'}? They won't be able to see your profile or posts, and you won't see theirs.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await blockUser(userId);
              if (error) throw error;
              invalidateFriends();
              invalidateFeed();
              onClose();
              Alert.alert('User Blocked', "You won't see their content anymore.");
            } catch (error) {
              Alert.alert('Error', 'Failed to block user');
            }
          },
        },
      ]
    );
  };

  const submitReport = async (reason) => {
    try {
      const { error } = await reportContent({ reportedUserId: userId, reason });
      if (error) throw error;
      Alert.alert('Report Submitted', 'Thank you for your report. We will review it shortly.');
    } catch (error) {
      Alert.alert('Error', 'Failed to submit report');
    }
  };

  const handleReport = () => {
    const reasons = ['Inappropriate Content', 'Spam', 'Harassment', 'Other'];
    const reasonKeys = ['inappropriate', 'spam', 'harassment', 'other'];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancel', ...reasons], cancelButtonIndex: 0, title: 'Report User' },
        (buttonIndex) => {
          if (buttonIndex === 0) return;
          submitReport(reasonKeys[buttonIndex - 1]);
        }
      );
    } else {
      Alert.alert('Report User', 'Why are you reporting this user?', [
        { text: 'Cancel', style: 'cancel' },
        ...reasons.map((label, i) => ({ text: label, onPress: () => submitReport(reasonKeys[i]) })),
      ]);
    }
  };

  const showMoreOptions = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancel', 'Report User', 'Block User'], cancelButtonIndex: 0, destructiveButtonIndex: 2 },
        (buttonIndex) => {
          if (buttonIndex === 1) handleReport();
          if (buttonIndex === 2) handleBlock();
        }
      );
    } else {
      Alert.alert('Options', null, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Report User', onPress: handleReport },
        { text: 'Block User', style: 'destructive', onPress: handleBlock },
      ]);
    }
  };

  const renderFriendButton = () => {
    if (actionLoading) {
      return (
        <View style={styles.friendActionButton}>
          <ActivityIndicator color="#fff" size="small" />
        </View>
      );
    }
    switch (friendshipStatus) {
      case 'accepted':
        return (
          <TouchableOpacity style={styles.friendsButton} onPress={handleRemoveFriend}>
            <CheckIcon color="#000" size={16} />
            <Text style={styles.friendsButtonText}>Friends</Text>
          </TouchableOpacity>
        );
      case 'pending_sent':
        return (
          <TouchableOpacity style={styles.pendingButton} onPress={handleRemoveFriend}>
            <ClockIcon color="rgba(255,255,255,0.7)" size={16} />
            <Text style={styles.pendingButtonText}>Pending · Tap to Cancel</Text>
          </TouchableOpacity>
        );
      case 'pending_received':
        return (
          <TouchableOpacity style={styles.addFriendButton} onPress={handleAddFriend}>
            <CheckIcon color="#000" size={16} />
            <Text style={styles.addFriendButtonText}>Accept</Text>
          </TouchableOpacity>
        );
      default:
        return (
          <TouchableOpacity style={styles.addFriendButton} onPress={handleAddFriend}>
            <UserPlusIcon color="#000" size={16} />
            <Text style={styles.addFriendButtonText}>Add Friend</Text>
          </TouchableOpacity>
        );
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* Backdrop — tap to dismiss */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View style={styles.sheet}>
        {/* Handle bar */}
        <View style={styles.handle} />

        {/* Header row */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <XIcon color="rgba(255,255,255,0.7)" size={18} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {profile ? `@${profile.username}` : (initialUsername ? `@${initialUsername}` : '')}
          </Text>
          <TouchableOpacity onPress={showMoreOptions} style={styles.moreButton}>
            <DotsThreeIcon color="rgba(255,255,255,0.7)" size={20} weight="bold" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#fff" />
          </View>
        ) : profile ? (
          <View style={styles.content}>
            {/* Avatar */}
            <Image
              source={{
                uri: profile.profile_picture_url ||
                     `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`,
              }}
              style={styles.avatar}
            />

            {/* Name / username */}
            {profile.name ? (
              <Text style={[styles.name, profile.is_subscribed && styles.nameSubscribed]}>
                {profile.name}
              </Text>
            ) : null}
            <Text style={[
              styles.username,
              !profile.name && styles.usernameStandalone,
              profile.is_subscribed && styles.usernameSubscribed,
            ]}>
              @{profile.username}
            </Text>

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <TrophyIcon color="rgba(255,255,255,0.5)" size={13} />
                <Text style={styles.statValue}>{profile.completed_goals_count}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <UsersIcon color="rgba(255,255,255,0.5)" size={13} />
                <Text style={styles.statValue}>{profile.friend_count}</Text>
                <Text style={styles.statLabel}>Friends</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <CameraIcon color="rgba(255,255,255,0.5)" size={13} />
                <Text style={styles.statValue}>{profile.post_count}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </View>
            </View>

            {/* Friend action */}
            <View style={styles.actionRow}>
              {renderFriendButton()}
            </View>
          </View>
        ) : (
          <View style={styles.loadingContainer}>
            <Text style={styles.errorText}>Could not load profile</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: '#0A0A0A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingBottom: 40,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
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
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  moreButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  errorText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 8,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    marginBottom: 16,
  },
  name: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  nameSubscribed: {
    color: '#FF6B35',
  },
  username: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    marginBottom: 24,
  },
  usernameStandalone: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  usernameSubscribed: {
    color: '#FF6B35',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
    marginBottom: 20,
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  statValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
  },
  actionRow: {
    width: '100%',
  },
  addFriendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 13,
  },
  addFriendButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
  friendsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 13,
  },
  friendsButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
  pendingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingVertical: 13,
  },
  pendingButtonText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  friendActionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingVertical: 13,
  },
});
