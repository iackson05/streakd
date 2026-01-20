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
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { ArrowLeft, Settings, Target, Flame, Calendar, Plus, X } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';

export default function Profile({ navigation }) {
  const { user, profile, loading: authLoading } = useAuth();
  const [goals, setGoals] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalGoals: 0,
    currentStreak: 0,
    totalDays: 0,
  });

  // Goal creation modal state
  const [showCreateGoal, setShowCreateGoal] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDescription, setNewGoalDescription] = useState('');
  const [creatingGoal, setCreatingGoal] = useState(false);

  useEffect(() => {
    if (user) {
      loadProfileData();
    }
  }, [user]);

  const loadProfileData = async () => {
    try {
      // Load user's goals
      const { data: goalsData, error: goalsError } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (goalsError) throw goalsError;

      // Load user's posts
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*, goals(title)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      setGoals(goalsData || []);
      setPosts(postsData || []);

      // Calculate stats
      calculateStats(goalsData, postsData);
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (goalsData, postsData) => {
    const activeGoals = goalsData?.filter(g => !g.completed).length || 0;
    const streak = calculateStreak(postsData);
    const uniqueDays = new Set(
      postsData?.map(p => new Date(p.created_at).toDateString())
    ).size;

    setStats({
      totalGoals: activeGoals,
      currentStreak: streak,
      totalDays: uniqueDays,
    });
  };

  const calculateStreak = (postsData) => {
    if (!postsData || postsData.length === 0) return 0;

    const postDates = [...new Set(
      postsData.map(p => new Date(p.created_at).toDateString())
    )].sort((a, b) => new Date(b) - new Date(a));

    let streak = 0;
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    if (postDates[0] !== today && postDates[0] !== yesterday) {
      return 0;
    }

    let currentDate = new Date();
    for (let dateStr of postDates) {
      const postDate = new Date(dateStr);
      const expectedDate = new Date(currentDate);
      expectedDate.setHours(0, 0, 0, 0);
      postDate.setHours(0, 0, 0, 0);

      if (postDate.getTime() === expectedDate.getTime()) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  };

  const handleCreateGoal = async () => {
    if (!newGoalTitle.trim()) {
      Alert.alert('Missing Title', 'Please enter a goal title');
      return;
    }

    setCreatingGoal(true);

    try {
      const { data, error } = await supabase
        .from('goals')
        .insert({
          user_id: user.id,
          title: newGoalTitle.trim(),
          description: newGoalDescription.trim() || null,
          completed: false,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Add new goal to state
      setGoals([data, ...goals]);
      
      // Update stats
      setStats(prev => ({
        ...prev,
        totalGoals: prev.totalGoals + 1,
      }));

      // Reset form and close modal
      setNewGoalTitle('');
      setNewGoalDescription('');
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
      goalName: goal.title
    });
  };

  if (authLoading || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  if (!user || !profile) {
    return null;
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
              <Text style={styles.statValue}>{stats.totalGoals}</Text>
              <Text style={styles.statLabel}>Goals</Text>
            </View>
            <View style={styles.statItem}>
              <Flame color="rgba(255,255,255,0.5)" size={12} style={styles.statIcon} />
              <Text style={styles.statValue}>{stats.currentStreak}</Text>
              <Text style={styles.statLabel}>Streak</Text>
            </View>
            <View style={styles.statItem}>
              <Calendar color="rgba(255,255,255,0.5)" size={12} style={styles.statIcon} />
              <Text style={styles.statValue}>{stats.totalDays}</Text>
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

        {goals.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No active goals</Text>
            <Text style={styles.emptySubtext}>Create your first goal to get started!</Text>
          </View>
        ) : (
          <View style={styles.goalsContainer}>
            {goals.filter(g => !g.completed).map((goal) => {
              const goalPosts = posts.filter(p => p.goal_id === goal.id).length;
              
              return (
                <TouchableOpacity
                  key={goal.id}
                  onPress={() => handleGoalPress(goal)}
                  style={styles.goalCard}
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
              );
            })}
          </View>
        )}

        {/* Total Posts */}
        <Text style={styles.sectionTitle}>Activity</Text>
        <View style={styles.activityCard}>
          <Text style={styles.activityValue}>{posts.length}</Text>
          <Text style={styles.activityLabel}>Total Posts</Text>
        </View>
      </ScrollView>

      {/* Create Goal Modal */}
      <Modal
        visible={showCreateGoal}
        transparent
        animationType="fade"
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
            <View style={styles.modalForm}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Title *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 100 Days of Code"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={newGoalTitle}
                  onChangeText={setNewGoalTitle}
                  autoFocus
                  editable={!creatingGoal}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Description (optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="What do you want to achieve?"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={newGoalDescription}
                  onChangeText={setNewGoalDescription}
                  multiline
                  numberOfLines={3}
                  editable={!creatingGoal}
                />
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
    marginBottom: 16,
    paddingHorizontal: 4,
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
    padding: 16,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    paddingBottom: 40,
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