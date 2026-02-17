import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { ArrowLeft, Plus, Check } from 'lucide-react-native';
import PostCard from '../components/feed/PostCard';
import { getGoalPosts, getUserReactionsForPosts } from '../services/posts';
import { completeGoal } from '../services/goals';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';

export default function GoalFeed({ route, navigation }) {
  const { user } = useAuth();
  const { markGoalCompleted } = useData();
  const goalId = route?.params?.goalId;
  const goalDescription = route?.params?.goalDescription;
  const goalName = route?.params?.goalName;

  const [posts, setPosts] = useState([]);
  const [userReactions, setUserReactions] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    if (goalId && user) {
      loadPosts();
    }
  }, [goalId, user]);

  const loadPosts = async () => {
    try {
      const { posts: goalPosts, error } = await getGoalPosts(goalId);

      if (error) throw error;

      console.log('✅ Loaded goal posts:', goalPosts?.length || 0);

      // Batch fetch user reactions for all posts
      if (goalPosts && goalPosts.length > 0) {
        const postIds = goalPosts.map(p => p.id);
        const { reactions } = await getUserReactionsForPosts(user.id, postIds);
        setUserReactions(reactions);
      }

      setPosts(goalPosts || []);
    } catch (error) {
      console.error('Error loading goal posts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPosts();
  };

  const handleAddPost = () => {
    // Navigate to create post with this goal pre-selected
    navigation.navigate('CreatePost', { goalId });
  };

  const handleCompleteGoal = () => {
    const postCount = posts.length;

    Alert.alert(
      'Complete Goal',
      postCount > 0
        ? `Congratulations on completing "${goalName}"!\n\nThis will permanently delete all ${postCount} post${postCount > 1 ? 's' : ''} for this goal. Save any photos you want to keep to your device before continuing.`
        : `Mark "${goalName}" as completed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete Goal',
          style: 'default',
          onPress: async () => {
            setCompleting(true);
            try {
              const { error } = await completeGoal(goalId, user.id);
              if (error) throw error;

              // Update cache
              markGoalCompleted(goalId);

              Alert.alert(
                'Goal Completed!',
                'Great job! Your goal has been marked as completed.',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
              );
            } catch (error) {
              console.error('Error completing goal:', error);
              Alert.alert('Error', 'Failed to complete goal. Please try again.');
            } finally {
              setCompleting(false);
            }
          },
        },
      ]
    );
  };

  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const posted = new Date(timestamp);
    const diffMs = now - posted;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  if (loading) {
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
        <Text style={styles.headerTitle}>{goalName || 'Goal Feed'}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={handleCompleteGoal}
            style={styles.completeButton}
            disabled={completing}
          >
            {completing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Check color="#fff" size={18} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleAddPost}
            style={styles.addButton}
          >
            <Plus color="rgba(255,255,255,0.7)" size={20} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#fff"
          />
        }
      >
        {/* Feed Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>
            {goalName || 'Goal Posts'}
          </Text>
          <Text style={styles.subtitle}>
            {goalDescription || ''}
          </Text>
          <Text style={styles.goalcount}>
            {posts.length} {posts.length === 1 ? 'post' : 'posts'}
          </Text>
        </View>

        {/* Posts */}
        {posts.length > 0 ? (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={{
                id: post.id,
                user_id: post.user_id,
                username: post.users?.username || 'Unknown',
                profile_picture_url: post.users?.profile_picture_url,
                goal: post.goals?.title || 'Goal',
                streak_count: post.goals?.streak_count || 0,
                image: post.image_url,
                timestamp: formatTimestamp(post.created_at),
                reaction_fire: post.reaction_fire,
                reaction_fist: post.reaction_fist,
                reaction_party: post.reaction_party,
                reaction_heart: post.reaction_heart,
              }}
              initialUserReaction={userReactions[post.id] || null}
              onDelete={(postId) => {
                setPosts(prev => prev.filter(p => p.id !== postId));
              }}
            />
          ))
        ) : (
          /* Empty State */
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <View style={styles.emptyDot} />
            </View>
            <Text style={styles.emptyText}>
              No posts yet for this goal
            </Text>
            <TouchableOpacity 
              style={styles.emptyButton}
              onPress={handleAddPost}
            >
              <Text style={styles.emptyButtonText}>Create First Post</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* End of Feed */}
        {posts.length > 0 && (
          <View style={styles.endOfFeed}>
            <View style={styles.endIcon}>
              <View style={styles.endDot} />
            </View>
            <Text style={styles.endText}>
              You're all caught up
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
    backgroundColor: 'rgba(0,0,0,0.8)',
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  completeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
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
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 48,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    marginBottom: 8,
  },
  goalcount: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
  endOfFeed: {
    alignItems: 'center',
    paddingVertical: 48,
    marginTop: 32,
  },
  endIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  endDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  endText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 14,
  },
});