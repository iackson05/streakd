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
} from 'react-native';
import { UserPlus, Settings, Menu } from 'lucide-react-native';
import PostCard from '../components/feed/PostCard';
import { supabase } from '../services/supabase';

const SAMPLE_POSTS = [
  {
    id: 1,
    username: "alex_codes",
    goal: "100 Days of Code",
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
    dayNumber: 156,
    image: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&h=600&fit=crop",
    caption: "Today's piece inspired by the city lights ✨ Experimenting with new color palettes",
    timestamp: "6 hours ago",
    likes: 89,
    comments: 12
  },
  {
    id: 4,
    username: "mindful_dan",
    goal: "Meditation Journey",
    dayNumber: 90,
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=600&fit=crop",
    caption: "90 days of meditation complete. The clarity is real 🧘‍♂️",
    timestamp: "8 hours ago",
    likes: 67,
    comments: 15
  },
  {
    id: 5,
    username: "chef_marcus",
    goal: "Master Cuisine",
    dayNumber: 34,
    image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop",
    caption: "Attempted beef wellington for the first time. Not perfect but I'm proud! 🍴",
    timestamp: "12 hours ago",
    likes: 124,
    comments: 22
  },
  {
    id: 6,
    username: "read.with.em",
    goal: "52 Books a Year",
    dayNumber: 18,
    image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&h=600&fit=crop",
    caption: "Book #18 done! This one was a page-turner 📚",
    timestamp: "1 day ago",
    likes: 33,
    comments: 7
  }
];

export default function Feed({ navigation }) {

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

// Fetch user profile on mount
  useEffect(() => {
    const loadUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if(error || !user) { 
        navigation.replace('Login');
        return;
      }
      const { data: profileData } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      setUser(user);
      setProfile(profileData);
      setLoading(false);
    }

    loadUser();
  }, []);
  console.log('User profile:', profile);
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.logoButton}>
          <View style={styles.logoDot} />
          <Text style={styles.logoText}>streakd</Text>
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity 
            onPress={() => navigation.navigate('AddFriends')}
            style={styles.headerButton}
          >
            <UserPlus color="rgba(255,255,255,0.7)" size={20} />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => navigation.navigate('Settings')}
            style={styles.headerButton}
          >
            <Menu color="rgba(255,255,255,0.7)" size={20} />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => navigation.navigate('Profile')}
          >
            <Image 
              source={{ 
                uri: profile?.profile_picture_url || 
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.username || 'default'}`
              }}
              style={styles.profileImage}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Feed Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Your Feed</Text>
          <Text style={styles.subtitle}>
            See what your friends are working on
          </Text>
        </View>

        {/* Posts */}
        {SAMPLE_POSTS.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}

        {/* End of Feed */}
        <View style={styles.endOfFeed}>
          <View style={styles.endIcon}>
            <View style={styles.endDot} />
          </View>
          <Text style={styles.endText}>You're all caught up</Text>
        </View>
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
  logoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  logoText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
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