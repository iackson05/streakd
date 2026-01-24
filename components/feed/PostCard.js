import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  StyleSheet,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';

const REACTIONS = [
  { emoji: '🔥', key: 'reaction_fire' },
  { emoji: '👊', key: 'reaction_fist' },
  { emoji: '🎉', key: 'reaction_party' },
  { emoji: '❤️', key: 'reaction_heart' },
];

export default function PostCard({ post }) {
  const { user } = useAuth();
  const [userReaction, setUserReaction] = useState(null);
  const [localCounts, setLocalCounts] = useState({
    reaction_fire: post.reaction_fire ?? 0,
    reaction_fist: post.reaction_fist ?? 0,
    reaction_party: post.reaction_party ?? 0,
    reaction_heart: post.reaction_heart ?? 0,
  });

  useEffect(() => {
    loadUserReaction();
  }, [post.id]);

  useEffect(() => {
  setLocalCounts({
    reaction_fire: post.reaction_fire ?? 0,
    reaction_fist: post.reaction_fist ?? 0,
    reaction_party: post.reaction_party ?? 0,
    reaction_heart: post.reaction_heart ?? 0,
  });
  }, [post.id, post.reaction_fire, post.reaction_fist, post.reaction_party, post.reaction_heart]);


  const loadUserReaction = async () => {
    try {
      const { data, error } = await supabase
        .from('reactions')
        .select('react_emoji')
        .eq('post_id', post.id)
        .eq('user_id_who_reacted', user?.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      setUserReaction(data?.react_emoji || null);
    } catch (error) {
      console.error('Error loading user reaction:', error);
    }
  };

  const handleReaction = async (emoji, key) => {
    try {
      // Call the Postgres function (bypasses RLS)
      const { data, error } = await supabase
        .rpc('toggle_reaction', {
          p_post_id: post.id,
          p_user_id: user.id,
          p_emoji: emoji,
        })
        .single();

      if (error) throw error;

      // Update local state with returned counts
      setLocalCounts({
        reaction_fire: data.reaction_fire,
        reaction_fist: data.reaction_fist,
        reaction_party: data.reaction_party,
        reaction_heart: data.reaction_heart,
      });

      setUserReaction(data.user_reaction);
    } catch (error) {
      console.error('Error updating reaction:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: post.image }}
            style={styles.image}
            resizeMode="cover"
          />
                    
          {/* Top - Username & Goal */}
          <View style={styles.topSection}>
            <Image
              source={{ uri: post.profile_picture_url }}
              style={styles.avatar}
            />
            <View style={styles.userInfo}>
              <Text style={styles.username}>{post.username}</Text>
              <View style={styles.goalRow}>
                <Text style={styles.goalText}>{post.goal}</Text>
              </View>
            </View>
          </View>

          {/* Bottom - Caption & Reactions */}
          <View style={styles.bottomSection}>
            {post.caption && (
              <Text style={styles.caption} numberOfLines={2}>
                {post.caption}
              </Text>
            )}
            
            {/* Reactions Row */}
            <View style={styles.reactionsRow}>
              {REACTIONS.map(({ emoji, key }) => {
                const count = localCounts[key];
                const isActive = userReaction === emoji;
                
                return (
                  <TouchableOpacity
                    key={emoji}
                    onPress={() => handleReaction(emoji, key)}
                    style={[
                      styles.reactionBubble,
                      isActive && styles.reactionBubbleActive,
                    ]}
                  >
                    <Text style={styles.reactionEmoji}>{emoji}</Text>
                    <Text style={[
                      styles.reactionCount,
                      isActive && styles.reactionCountActive,
                    ]}>
                      {count > 99 ? '99+' : count}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              
              <Text style={styles.timestamp}>{post.timestamp}</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 32,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  imageContainer: {
    aspectRatio: 4/5,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  gradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  topSection: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  userInfo: {
    gap: 4,
  },
  username: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  goalText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  bottomSection: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    gap: 12,
  },
  caption: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    lineHeight: 20,
  },
  reactionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  reactionBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  reactionBubbleActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderColor: 'rgba(255,255,255,0.4)',
  },
  reactionEmoji: {
    fontSize: 13,
  },
  reactionCount: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
  },
  reactionCountActive: {
    color: 'rgba(255,255,255,0.9)',
  },
  timestamp: {
    marginLeft: 'auto',
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
  },
});