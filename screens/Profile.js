import React, { useState, useEffect, useCallback } from 'react';
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
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { ArrowLeft, Settings, Target, Flame, Calendar, Plus, X, Trash2 } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { createGoal, deleteGoal } from '../services/goals';

export default function Profile({ navigation }) {
  const { user, profile, loading: authLoading } = useAuth();
  const { profileData, fetchProfileData, addGoal, removeGoal } = useData();

  // Goal creation modal state
  const [showCreateGoal, setShowCreateGoal] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDescription, setNewGoalDescription] = useState('');
  const [streakInterval, setStreakInterval] = useState(1);
  const [goalPrivacy, setGoalPrivacy] = useState('friends');
  const [creatingGoal, setCreatingGoal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch data on first mount
  useEffect(() => {
    if (user) {
      fetchProfileData();
    }
  }, [user]);

  // Auto-refresh when screen gains focus (if data is stale)
  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchProfileData(); // Uses cache if fresh, fetches if stale
      }
    }, [user])
  );

  // Manual refresh (pull to refresh)
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchProfileData(true); // Force fresh data
    setRefreshing(false);
  };

  const getStreakText = (days) => {
    if (days === 1) return 'Every day';
    if (days === 7) return 'Once a week';
    return `Every ${days} days`;
  };

  const handleCreateGoal = async () => {
    if (!newGoalTitle.trim()) {
      Alert.alert('Missing Title', 'Please enter a goal title');
      return;
    }

    setCreatingGoal(true);

    try {
      const { goal, error } = await createGoal(user.id, {
        title: newGoalTitle,
        description: newGoalDescription,
        privacy: goalPrivacy,
        streakInterval: streakInterval,
      });

      if (error) throw error;

      // Immediately update cache (UI updates instantly!)
      addGoal(goal);

      // Reset form and close modal
      setNewGoalTitle('');
      setNewGoalDescription('');
      setStreakInterval(1);
      setGoalPrivacy('friends');
      setShowCreateGoal(false);

      Alert.alert('Success!', 'Goal created');
    } catch (error) {
      console.error('Error creating goal:', error);
      Alert.alert('Error', 'Failed to create goal');
    } finally {
      setCreatingGoal(false);
    }
  };

  const handleGoalPress = (goal) => {
    navigation.navigate('GoalFeed', {
      goalId: goal.id,
      goalName: goal.title,
      goalDescription: goal.description
    });
  };

  const handleDeleteGoal = (goal) => {
    const postCount = profileData.posts.filter(p => p.goal_id === goal.id).length;

    Alert.alert(
      'Delete Goal',
      postCount > 0
        ? `This will delete "${goal.title}" and all ${postCount} associated post${postCount > 1 ? 's' : ''}. This action cannot be undone.`
        : `Are you sure you want to delete "${goal.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await deleteGoal(goal.id, user.id);
              if (error) throw error;

              // Update cache
              removeGoal(goal.id);

              Alert.alert('Success', 'Goal deleted');
            } catch (error) {
              console.error('Error deleting goal:', error);
              Alert.alert('Error', 'Failed to delete goal');
            }
          },
        },
      ]
    );
  };

  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  if (!user || !profile) {
    return null;
  }

  // Show loading spinner only on first load
  if (profileData.loading && !profileData.lastFetch) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ArrowLeft color="rgba(255,255,255,0.7)" size={20} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity 
          onPress={() => navigation.navigate('Settings')}
          style={styles.settingsButton}
        >
          <Settings color="rgba(255,255,255,0.7)" size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#fff"
          />
        }
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <Image
            source={{ 
              uri: profile.profile_picture_url || 
                   `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`
            }}
            style={styles.avatar}
          />
          <Text style={styles.name}>{profile.username}</Text>
          <Text style={styles.username}>@{profile.username}</Text>
          <Text style={styles.email}>{profile.email}</Text>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Target color="rgba(255,255,255,0.5)" size={12} style={styles.statIcon} />
              <Text style={styles.statValue}>{profileData.stats.totalGoals}</Text>
              <Text style={styles.statLabel}>Goals</Text>
            </View>
            <View style={styles.statItem}>
              <Flame color="rgba(255,255,255,0.5)" size={12} style={styles.statIcon} />
              <Text style={styles.statValue}>{profileData.stats.currentStreak}</Text>
              <Text style={styles.statLabel}>Streak</Text>
            </View>
            <View style={styles.statItem}>
              <Calendar color="rgba(255,255,255,0.5)" size={12} style={styles.statIcon} />
              <Text style={styles.statValue}>{profileData.stats.totalDays}</Text>
              <Text style={styles.statLabel}>Total Days</Text>
            </View>
          </View>
        </View>

        {/* Active Goals Header with Add Button */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Goals</Text>
          <TouchableOpacity 
            style={styles.addGoalButton}
            onPress={() => setShowCreateGoal(true)}
          >
            <Plus color="#fff" size={16} />
          </TouchableOpacity>
        </View>

        {profileData.goals.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No active goals</Text>
            <Text style={styles.emptySubtext}>Create your first goal to get started!</Text>
          </View>
        ) : (
          <View style={styles.goalsContainer}>
            {profileData.goals.filter(g => !g.completed).map((goal) => {
              const goalPosts = profileData.posts.filter(p => p.goal_id === goal.id).length;

              return (
                <View key={goal.id} style={styles.goalCard}>
                  <TouchableOpacity
                    onPress={() => handleGoalPress(goal)}
                    style={styles.goalContent}
                  >
                    <View style={styles.goalHeader}>
                      <Text style={styles.goalName}>{goal.title}</Text>
                      <Text style={styles.goalProgress}>
                        {goalPosts} {goalPosts === 1 ? 'post' : 'posts'}
                      </Text>
                    </View>
                    {goal.description && (
                      <Text style={styles.goalDescription} numberOfLines={1}>
                        {goal.description}
                      </Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteGoal(goal)}
                    style={styles.goalDeleteButton}
                  >
                    <Trash2 color="rgba(255,255,255,0.4)" size={16} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {/* Total Posts */}
        <Text style={styles.sectionTitle}>Activity</Text>
        <View style={styles.activityCard}>
          <Text style={styles.activityValue}>{profileData.posts.length}</Text>
          <Text style={styles.activityLabel}>Total Posts</Text>
        </View>
      </ScrollView>

      {/* Create Goal Modal */}
      <Modal
        visible={showCreateGoal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateGoal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity 
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowCreateGoal(false)}
          />
          
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Goal</Text>
              <TouchableOpacity onPress={() => setShowCreateGoal(false)}>
                <X color="#fff" size={24} />
              </TouchableOpacity>
            </View>

            {/* Form */}
            <ScrollView style={styles.modalScroll}>
              <View style={styles.modalForm}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Goal Title</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 100 Days of Code"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={newGoalTitle}
                    onChangeText={setNewGoalTitle}
                    maxLength={50}
                    editable={!creatingGoal}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Description (Optional)</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="What are you working towards?"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={newGoalDescription}
                    onChangeText={setNewGoalDescription}
                    multiline
                    numberOfLines={3}
                    maxLength={200}
                    editable={!creatingGoal}
                  />
                </View>

                {/* Streak Interval Slider */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Post Frequency</Text>
                  <Text style={styles.streakValue}>{getStreakText(streakInterval)}</Text>
                  <Slider
                    style={styles.slider}
                    minimumValue={1}
                    maximumValue={7}
                    step={1}
                    value={streakInterval}
                    onValueChange={setStreakInterval}
                    minimumTrackTintColor="rgba(255,255,255,0.8)"
                    maximumTrackTintColor="rgba(255,255,255,0.2)"
                    thumbTintColor="#fff"
                    disabled={creatingGoal}
                  />
                  <View style={styles.sliderLabels}>
                    <Text style={styles.sliderLabel}>1 day</Text>
                    <Text style={styles.sliderLabel}>7 days</Text>
                  </View>
                </View>

                {/* Privacy Options */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Privacy</Text>
                  
                  <TouchableOpacity
                    style={[
                      styles.privacyOption,
                      goalPrivacy === 'friends' && styles.privacyOptionActive
                    ]}
                    onPress={() => setGoalPrivacy('friends')}
                    disabled={creatingGoal}
                  >
                    <View style={styles.privacyRadio}>
                      {goalPrivacy === 'friends' && <View style={styles.privacyRadioInner} />}
                    </View>
                    <View style={styles.privacyTextContainer}>
                      <Text style={styles.privacyTitle}>Friends</Text>
                      <Text style={styles.privacyDescription}>
                        Your friends can see this goal and its posts
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.privacyOption,
                      goalPrivacy === 'private' && styles.privacyOptionActive
                    ]}
                    onPress={() => setGoalPrivacy('private')}
                    disabled={creatingGoal}
                  >
                    <View style={styles.privacyRadio}>
                      {goalPrivacy === 'private' && <View style={styles.privacyRadioInner} />}
                    </View>
                    <View style={styles.privacyTextContainer}>
                      <Text style={styles.privacyTitle}>Private</Text>
                      <Text style={styles.privacyDescription}>
                        Only you can see this goal
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Create Button */}
                <TouchableOpacity
                  style={[styles.createButton, creatingGoal && styles.createButtonDisabled]}
                  onPress={handleCreateGoal}
                  disabled={creatingGoal}
                >
                  {creatingGoal ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <Text style={styles.createButtonText}>Create Goal</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  settingsButton: {
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
  username: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    marginBottom: 4,
  },
  email: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 32,
  },
  statItem: {
    alignItems: 'center',
  },
  statIcon: {
    marginBottom: 4,
  },
  statValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
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
  addGoalButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalContent: {
    flex: 1,
    padding: 16,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalDeleteButton: {
    padding: 16,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.05)',
  },
  goalName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  goalProgress: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
  goalDescription: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginTop: 8,
  },
  emptyState: {
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 32,
    alignItems: 'center',
    marginBottom: 32,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  emptySubtext: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    textAlign: 'center',
  },
  activityCard: {
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 24,
    alignItems: 'center',
  },
  activityValue: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '600',
    marginBottom: 4,
  },
  activityLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  modalContent: {
    backgroundColor: '#0A0A0A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  modalScroll: {
    maxHeight: 600,
  },
  modalForm: {
    padding: 20,
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  inputLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  streakValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sliderLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
  },
  privacyOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  privacyOptionActive: {
    borderColor: 'rgba(255,255,255,0.4)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  privacyRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  privacyRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  privacyTextContainer: {
    flex: 1,
  },
  privacyTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  privacyDescription: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    lineHeight: 18,
  },
  createButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
});