import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import PostCard from '../components/feed/PostCard';

const ALL_POSTS = [
  {
    id: 1,
    username: "alex_codes",
    goal: "100 Days of Code",
    goalId: "coding",
    dayNumber: 47,
    image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=600&fit=crop",
    caption: "Finally solved that algorithm problem! Feels good 💪",
    timestamp: "2 hours ago",
    likes: 12,
    comments: 3
  },
  {
    id: 2,
    username: "fitness_maya",
    goal: "Marathon Training",
    goalId: "marathon",
    dayNumber: 23,
    image: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&h=600&fit=crop",
    caption: "Morning run done ✅ 8 miles today, feeling stronger every day",
    timestamp: "4 hours ago",
    likes: 45,
    comments: 8
  },
  {
    id: 3,
    username: "art.by.luna",
    goal: "Daily Sketches",
    goalId: "sketching",
    dayNumber: 156,
    image: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&h=600&fit=crop",
    caption: "Today's piece inspired by the city lights ✨ Experimenting with new color palettes",
    timestamp: "6 hours ago",
    likes: 89,
    comments: 12
  },
  {
    id: 7,
    username: "alex_codes",
    goal: "100 Days of Code",
    goalId: "coding",
    dayNumber: 46,
    image: "https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=800&h=600&fit=crop",
    caption: "Working on a new React project today. Learning so much!",
    timestamp: "1 day ago",
    likes: 23,
    comments: 5
  },
  {
    id: 8,
    username: "alex_codes",
    goal: "100 Days of Code",
    goalId: "coding",
    dayNumber: 45,
    image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&h=600&fit=crop",
    caption: "Late night coding session. Building something cool 🌙",
    timestamp: "2 days ago",
    likes: 34,
    comments: 7
  },
  {
    id: 9,
    username: "dev_sarah",
    goal: "100 Days of Code",
    goalId: "coding",
    dayNumber: 89,
    image: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&h=600&fit=crop",
    caption: "Day 89! Almost at 100 days. This journey has been incredible 🎉",
    timestamp: "3 days ago",
    likes: 67,
    comments: 15
  }
];

export default function GoalFeed({ route, navigation }) {
  // In React Native, route params come from navigation
  // For now using dummy data - later you'll get: route.params.goalId
  const goalId = route?.params?.goalId;
  const goalName = route?.params?.goalName;

  const filteredPosts = goalId 
    ? ALL_POSTS.filter(post => post.goalId === goalId)
    : ALL_POSTS;

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={handleBack}
          style={styles.backButton}
        >
          <ArrowLeft color="rgba(255,255,255,0.7)" size={20} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{goalName || 'Goal Feed'}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Main Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Feed Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>
            {goalName || 'Goal Posts'}
          </Text>
          <Text style={styles.subtitle}>
            {filteredPosts.length} {filteredPosts.length === 1 ? 'post' : 'posts'}
          </Text>
        </View>

        {/* Posts */}
        {filteredPosts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}

        {/* Empty State */}
        {filteredPosts.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <View style={styles.emptyDot} />
            </View>
            <Text style={styles.emptyText}>
              No posts yet for this goal
            </Text>
          </View>
        )}

        {/* End of Feed */}
        {filteredPosts.length > 0 && (
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
  headerSpacer: {
    width: 40,
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
    color: 'rgba(255,255,255,0.3)',
    fontSize: 14,
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