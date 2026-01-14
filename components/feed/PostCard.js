import React, { useState } from 'react';
import { 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  StyleSheet 
} from 'react-native';
import { Heart, MessageCircle } from 'lucide-react-native';

export default function PostCard({ post }) {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes);

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
  };

  return (
    <View style={styles.container}>
      {/* Card */}
      <View style={styles.card}>
        {/* Image Container */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: post.image }}
            style={styles.image}
            resizeMode="cover"
          />
          
          {/* Gradient Overlay - simulated with Views */}
          <View style={styles.gradientTop} />
          <View style={styles.gradientBottom} />
          
          {/* Top - Username & Goal */}
          <View style={styles.topSection}>
            <Image
              source={{ uri: `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.username}` }}
              style={styles.avatar}
            />
            <View style={styles.userInfo}>
              <Text style={styles.username}>{post.username}</Text>
              <View style={styles.goalRow}>
                <Text style={styles.goalText}>{post.goal}</Text>
                <View style={styles.dayBadge}>
                  <Text style={styles.dayText}>Day {post.dayNumber}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Bottom - Caption & Actions */}
          <View style={styles.bottomSection}>
            <Text style={styles.caption} numberOfLines={2}>
              {post.caption}
            </Text>
            
            {/* Actions Row */}
            <View style={styles.actionsRow}>
              <TouchableOpacity 
                onPress={handleLike}
                style={styles.actionButton}
              >
                <Heart 
                  color={isLiked ? '#fff' : 'rgba(255,255,255,0.7)'} 
                  fill={isLiked ? '#fff' : 'none'}
                  size={20}
                />
                <Text style={[
                  styles.actionText,
                  isLiked && styles.actionTextActive
                ]}>
                  {likeCount}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton}>
                <MessageCircle color="rgba(255,255,255,0.7)" size={20} />
                <Text style={styles.actionText}>{post.comments}</Text>
              </TouchableOpacity>

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
  dayBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  dayText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '500',
  },
  bottomSection: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    gap: 16,
  },
  caption: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  actionTextActive: {
    color: '#fff',
  },
  timestamp: {
    marginLeft: 'auto',
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
  },
});