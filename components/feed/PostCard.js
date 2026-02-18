import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { apiGet, apiPost } from '../../services/api';
import { deletePost } from '../../services/posts';

// Each reaction has its own color palette for the active state
const REACTIONS = [
  {
    emoji: '🔥',
    key: 'reaction_fire',
    activeBg: 'rgba(255,107,53,0.25)',
    activeBorder: 'rgba(255,107,53,0.6)',
    activeText: '#FF6B35',
  },
  {
    emoji: '👊',
    key: 'reaction_fist',
    activeBg: 'rgba(91,141,239,0.25)',
    activeBorder: 'rgba(91,141,239,0.6)',
    activeText: '#5B8DEF',
  },
  {
    emoji: '🎉',
    key: 'reaction_party',
    activeBg: 'rgba(179,136,255,0.25)',
    activeBorder: 'rgba(179,136,255,0.6)',
    activeText: '#B388FF',
  },
  {
    emoji: '❤️',
    key: 'reaction_heart',
    activeBg: 'rgba(255,71,87,0.25)',
    activeBorder: 'rgba(255,71,87,0.6)',
    activeText: '#FF4757',
  },
];

export default function PostCard({ post, onDelete, initialUserReaction }) {
  const { user } = useAuth();
  const { removePost } = useData();
  const [userReaction, setUserReaction] = useState(initialUserReaction);
  const [localCounts, setLocalCounts] = useState({
    reaction_fire: post.reaction_fire ?? 0,
    reaction_fist: post.reaction_fist ?? 0,
    reaction_party: post.reaction_party ?? 0,
    reaction_heart: post.reaction_heart ?? 0,
  });
  const [deleting, setDeleting] = useState(false);

  const isOwnPost = post.user_id === user?.id;

  useEffect(() => {
    if (initialUserReaction === undefined) {
      loadUserReaction();
    }
  }, [post.id, initialUserReaction]);

  useEffect(() => {
    setLocalCounts({
      reaction_fire: post.reaction_fire ?? 0,
      reaction_fist: post.reaction_fist ?? 0,
      reaction_party: post.reaction_party ?? 0,
      reaction_heart: post.reaction_heart ?? 0,
    });
  }, [post.id, post.reaction_fire, post.reaction_fist, post.reaction_party, post.reaction_heart]);

  useEffect(() => {
    if (initialUserReaction !== undefined) {
      setUserReaction(initialUserReaction);
    }
  }, [initialUserReaction]);

  const loadUserReaction = async () => {
    try {
      const data = await apiGet(`/reactions/post/${post.id}`);
      setUserReaction(data?.[0]?.react_emoji || null);
    } catch (error) {
      console.error('Error loading user reaction:', error);
    }
  };

  const handleReaction = async (emoji, key) => {
    try {
      const data = await apiPost('/reactions/toggle', {
        post_id: post.id,
        react_emoji: emoji,
      });

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

  const handleDelete = () => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const { error } = await deletePost(post.id, user.id);
              if (error) throw error;

              removePost(post.id);

              if (onDelete) {
                onDelete(post.id);
              }
            } catch (error) {
              console.error('Error deleting post:', error);
              Alert.alert('Error', 'Failed to delete post');
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (deleting) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={[styles.card, isOwnPost && styles.cardOwn]}>
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: post.image }}
            style={styles.image}
            resizeMode="cover"
          />

          {/* Top gradient overlay */}
          <View style={styles.gradientTop} />

          {/* Top — Avatar, username, goal, streak, delete */}
          <View style={styles.topSection}>
            <Image
              source={{ uri: post.profile_picture_url }}
              style={[styles.avatar, isOwnPost && styles.avatarOwn]}
            />
            <View style={styles.userInfo}>
              <Text style={styles.username}>{post.username}</Text>
              <Text style={styles.goalText} numberOfLines={1}>{post.goal}</Text>
            </View>

            {/* Streak badge */}
            {post.streak_count > 0 && (
              <View style={styles.streakBadge}>
                <Text style={styles.streakEmoji}>🔥</Text>
                <Text style={styles.streakCount}>{post.streak_count}</Text>
              </View>
            )}

            {isOwnPost && (
              <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
                <Trash2 color="rgba(255,255,255,0.6)" size={15} />
              </TouchableOpacity>
            )}
          </View>

          {/* Bottom gradient overlay */}
          <View style={styles.gradientBottom} />

          {/* Bottom — Caption & Reactions */}
          <View style={styles.bottomSection}>
            {post.caption && (
              <Text style={styles.caption} numberOfLines={2}>
                {post.caption}
              </Text>
            )}

            <View style={styles.reactionsRow}>
              {REACTIONS.map(({ emoji, key, activeBg, activeBorder, activeText }) => {
                const count = localCounts[key];
                const isActive = userReaction === emoji;

                return (
                  <TouchableOpacity
                    key={emoji}
                    onPress={() => handleReaction(emoji, key)}
                    style={[
                      styles.reactionBubble,
                      isActive && {
                        backgroundColor: activeBg,
                        borderColor: activeBorder,
                      },
                    ]}
                  >
                    <Text style={styles.reactionEmoji}>{emoji}</Text>
                    <Text style={[
                      styles.reactionCount,
                      isActive && { color: activeText },
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
    marginBottom: 28,
  },
  card: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardOwn: {
    borderColor: 'rgba(255,107,53,0.25)',
  },
  imageContainer: {
    aspectRatio: 4 / 5,
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
    height: 120,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  gradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 180,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  topSection: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  avatarOwn: {
    borderColor: '#FF6B35',
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  username: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  goalText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,186,8,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,186,8,0.5)',
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  streakEmoji: {
    fontSize: 12,
  },
  streakCount: {
    color: '#FFBA08',
    fontSize: 13,
    fontWeight: '800',
  },
  deleteButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSection: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    right: 14,
    gap: 10,
  },
  caption: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  },
  reactionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  reactionBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  reactionEmoji: {
    fontSize: 13,
  },
  reactionCount: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    fontWeight: '600',
  },
  timestamp: {
    marginLeft: 'auto',
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
  },
});
