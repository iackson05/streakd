import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { ArrowLeftIcon, DotsThreeIcon, UserPlusIcon, CheckIcon, ClockIcon, UsersIcon, CameraIcon, ProhibitIcon } from 'phosphor-react-native';
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

export default function UserProfile({ navigation, route }) {
  const { userId, username: initialUsername } = route.params;
  const { user } = useAuth();
  const { invalidateFriends, invalidateFeed } = useData();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [friendshipStatus, setFriendshipStatus] = useState(null); // null, 'pending_sent', 'pending_received', 'accepted'
  const [goals, setGoals] = useState([]);
  const [loadingGoals, setLoadingGoals] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadProfile();
    loadFriendshipStatus();
  }, [userId]);

  useEffect(() => {
    if (friendshipStatus === 'accepted') {
      loadFriendGoals();
    }
  }, [friendshipStatus]);

  const loadProfile = async () => {
    try {
      const data = await apiGet(`/users/profile/${userId}`);
      setProfile(data);
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setLoading(false);
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

  const loadFriendGoals = async () => {
    setLoadingGoals(true);
    try {
      const data = await apiGet(`/goals/user/${userId}`);
      setGoals(data || []);
    } catch (error) {
      console.error('Error loading friend goals:', error);
    } finally {
      setLoadingGoals(false);
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
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${profile?.username || 'this user'} as a friend?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              const { error } = await removeFriend(user.id, userId);
              if (error) throw error;
              setFriendshipStatus(null);
              setGoals([]);
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
      `Block ${profile?.username || 'this user'}? They won't be able to see your profile or posts, and you won't see theirs. Any existing friendship will be removed.`,
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
              Alert.alert('User Blocked', "You won't see their content anymore.", [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (error) {
              Alert.alert('Error', 'Failed to block user');
            }
          },
        },
      ]
    );
  };

  const handleReport = () => {
    const reasons = ['Inappropriate Content', 'Spam', 'Harassment', 'Other'];
    const reasonKeys = ['inappropriate', 'spam', 'harassment', 'other'];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', ...reasons],
          cancelButtonIndex: 0,
          title: 'Report User',
          message: 'Why are you reporting this user?',
        },
        async (buttonIndex) => {
          if (buttonIndex === 0) return;
          const reason = reasonKeys[buttonIndex - 1];
          await submitReport(reason);
        }
      );
    } else {
      Alert.alert('Report User', 'Why are you reporting this user?', [
        { text: 'Cancel', style: 'cancel' },
        ...reasons.map((label, i) => ({
          text: label,
          onPress: () => submitReport(reasonKeys[i]),
        })),
      ]);
    }
  };

  const submitReport = async (reason) => {
    try {
      const { error } = await reportContent({
        reportedUserId: userId,
        reason,
      });
      if (error) throw error;
      Alert.alert('Report Submitted', 'Thank you for your report. We will review it shortly.');
    } catch (error) {
      Alert.alert('Error', 'Failed to submit report');
    }
  };

  const showMoreOptions = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Report User', 'Block User'],
          cancelButtonIndex: 0,
          destructiveButtonIndex: 2,
        },
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
          <View style={styles.pendingButton}>
            <ClockIcon color="rgba(255,255,255,0.7)" size={16} />
            <Text style={styles.pendingButtonText}>Pending</Text>
          </View>
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#fff" />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeftIcon color="rgba(255,255,255,0.7)" size={20} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>User not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeftIcon color="rgba(255,255,255,0.7)" size={20} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>@{profile.username}</Text>
        <TouchableOpacity onPress={showMoreOptions} style={styles.moreButton}>
          <DotsThreeIcon color="rgba(255,255,255,0.7)" size={20} weight="bold" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <Image
            source={{
              uri: profile.profile_picture_url ||
                   `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`
            }}
            style={styles.avatar}
          />
          {profile.name && (
            <Text style={[styles.name, profile.is_subscribed && styles.nameSubscribed]}>
              {profile.name}
            </Text>
          )}
          <Text style={[styles.username, !profile.name && styles.usernameStandalone, profile.is_subscribed && styles.usernameSubscribed]}>
            @{profile.username}
          </Text>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <UsersIcon color="rgba(255,255,255,0.5)" size={12} />
              <Text style={styles.statValue}>{profile.friend_count}</Text>
              <Text style={styles.statLabel}>Friends</Text>
            </View>
          </View>

          {/* Friend Action Button */}
          <View style={styles.actionRow}>
            {renderFriendButton()}
          </View>
        </View>

        {/* Friend Goals Section */}
        {friendshipStatus === 'accepted' && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Goals</Text>
            </View>

            {loadingGoals ? (
              <View style={styles.goalsLoading}>
                <ActivityIndicator color="#fff" size="small" />
              </View>
            ) : goals.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No visible goals</Text>
                <Text style={styles.emptySubtext}>This user hasn't created any goals visible to friends yet.</Text>
              </View>
            ) : (
              <View style={styles.goalsContainer}>
                {goals.map((goal) => (
                  <TouchableOpacity
                    key={goal.id}
                    style={styles.goalCard}
                    onPress={() => navigation.navigate('GoalFeed', {
                      goalId: goal.id,
                      goalName: goal.title,
                      goalDescription: goal.description,
                    })}
                    activeOpacity={0.7}
                  >
                    <View style={styles.goalContent}>
                      <View style={styles.goalTitleRow}>
                        <Text style={styles.goalName}>{goal.title}</Text>
                        {goal.streak_count > 0 && (
                          <Text style={styles.goalStreak}>{goal.streak_count} 🔥</Text>
                        )}
                      </View>
                      {goal.description && (
                        <Text style={styles.goalDescription} numberOfLines={2}>
                          {goal.description}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}

        {/* Not friends message */}
        {friendshipStatus !== 'accepted' && (
          <View style={styles.emptyState}>
            <ProhibitIcon color="rgba(255,255,255,0.3)" size={32} />
            <Text style={styles.emptyText}>Add as friend to see goals</Text>
            <Text style={styles.emptySubtext}>
              Send a friend request to see their goals and posts in your feed.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
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
  moreButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 32,
  },
  profileCard: {
    backgroundColor: '#0A0A0A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 24,
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
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
    gap: 32,
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    gap: 2,
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
    paddingVertical: 12,
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
    paddingVertical: 12,
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
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingVertical: 12,
  },
  pendingButtonText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  friendActionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingVertical: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
  goalsLoading: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  goalsContainer: {
    gap: 12,
    marginBottom: 32,
  },
  goalCard: {
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  goalContent: {
    padding: 16,
    gap: 8,
  },
  goalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  goalName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  goalStreak: {
    color: 'rgba(255,200,100,0.9)',
    fontSize: 12,
    fontWeight: '600',
  },
  goalDescription: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    lineHeight: 18,
  },
  emptyState: {
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 32,
    alignItems: 'center',
    gap: 8,
    marginBottom: 32,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    fontWeight: '500',
  },
  emptySubtext: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    textAlign: 'center',
  },
});
