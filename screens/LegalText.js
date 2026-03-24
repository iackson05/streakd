import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { ArrowLeftIcon } from 'phosphor-react-native';

const PRIVACY_POLICY = `STREAKD PRIVACY POLICY
Last Updated: March 19, 2026

1. INTRODUCTION
Streakd ("we", "us", or "our") operates the Streakd mobile application (the "App"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our App.

2. INFORMATION WE COLLECT

Personal Information You Provide:
- Account information: email address, username, display name, and password
- Profile picture (optional)
- Goal titles and descriptions you create
- Photos you upload as progress posts
- Captions on posts

Information Collected Automatically:
- Device push notification token (with your permission)
- Basic usage data (e.g., when you log in)

3. HOW WE USE YOUR INFORMATION
We use the information we collect to:
- Create and manage your account
- Display your posts to your friends (based on your privacy settings)
- Send push notifications (streak reminders, friend requests, reactions) if enabled
- Process subscription payments through Apple's App Store (via RevenueCat)
- Improve and maintain the App

4. HOW WE SHARE YOUR INFORMATION
We do not sell your personal information. We share information only as follows:
- With your friends: Your posts, username, and profile picture are visible to accepted friends (unless you set a goal to "private").
- Service providers: We use third-party services to operate the App:
  - Cloudflare R2 for image storage
  - RevenueCat for subscription management
  - Expo for push notifications
- Legal requirements: We may disclose information if required by law.

5. DATA STORAGE AND SECURITY
Your data is stored on secured servers. Images are stored via Cloudflare R2. We use industry-standard security measures including encrypted passwords (bcrypt) and JWT-based authentication. However, no method of electronic storage is 100% secure.

6. DATA RETENTION
We retain your data for as long as your account is active. When you delete your account, all your data (profile, goals, posts, images, friendships, and notification settings) is permanently deleted.

7. YOUR RIGHTS
You may:
- Access and update your profile information at any time within the App
- Delete your account and all associated data from within the App (Settings > Delete Account)
- Control who sees your posts via goal privacy settings ("friends" or "private")
- Enable or disable push notifications and specific notification types

8. CHILDREN'S PRIVACY
The App is not intended for children under 13. We do not knowingly collect information from children under 13. If we learn that we have collected information from a child under 13, we will delete it promptly.

9. THIRD-PARTY SERVICES
The App uses Apple's In-App Purchase system (via RevenueCat) for subscriptions. Your payment information is handled entirely by Apple and is not accessible to us.

10. CHANGES TO THIS POLICY
We may update this Privacy Policy from time to time. We will notify you of changes by updating the "Last Updated" date. Continued use of the App after changes constitutes acceptance.

11. CONTACT US
If you have questions about this Privacy Policy, contact us at:
Email: support@streakd.app`;

const TERMS_OF_SERVICE = `STREAKD TERMS OF SERVICE
Last Updated: March 19, 2026

1. ACCEPTANCE OF TERMS
By downloading, installing, or using the Streakd mobile application ("App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree, do not use the App.

2. DESCRIPTION OF SERVICE
Streakd is a goal accountability platform that allows users to create goals, post progress photos on a scheduled basis, and share their progress with friends. The App includes both free and paid subscription tiers.

3. ACCOUNT REGISTRATION
- You must provide a valid email address, username, and password to create an account.
- You are responsible for maintaining the security of your account credentials.
- You must be at least 13 years old to use the App.
- You may not create accounts for others without their permission.

4. USER CONTENT
- You retain ownership of content you post (photos, captions, goal descriptions).
- By posting content, you grant Streakd a non-exclusive, worldwide license to display your content to your friends within the App, as determined by your privacy settings.
- You are solely responsible for the content you post. You agree not to post content that is illegal, harmful, threatening, abusive, harassing, defamatory, or otherwise objectionable.
- We reserve the right to remove content that violates these Terms.

5. ACCEPTABLE USE
You agree not to:
- Use the App for any illegal purpose
- Harass, bully, or intimidate other users
- Post explicit, violent, or otherwise inappropriate content
- Attempt to gain unauthorized access to other users' accounts
- Interfere with or disrupt the App or its servers
- Create multiple accounts to circumvent limitations
- Use automated tools to access the App

6. SUBSCRIPTIONS (STREAKD+)
- Streakd offers a paid subscription ("Streakd+") with additional features including unlimited active goals and goal archiving.
- Subscriptions are billed monthly through Apple's App Store.
- Payment is charged to your Apple ID account at confirmation of purchase.
- Subscriptions automatically renew unless auto-renew is turned off at least 24 hours before the end of the current period.
- You can manage and cancel subscriptions in your Apple ID Account Settings.
- No refunds are provided for partial subscription periods.

7. ACCOUNT DELETION
- You may delete your account at any time from within the App (Settings > Delete Account).
- Account deletion is permanent and irreversible.
- Upon deletion, all your data including your profile, goals, posts, images, friendships, and settings will be permanently removed.

8. PRIVACY
Your use of the App is also governed by our Privacy Policy. Please review it to understand how we collect and use your information.

9. INTELLECTUAL PROPERTY
- The Streakd name, logo, and App design are the property of Streakd.
- You may not copy, modify, distribute, or create derivative works based on the App.

10. DISCLAIMER OF WARRANTIES
THE APP IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. WE DO NOT GUARANTEE THAT THE APP WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.

11. LIMITATION OF LIABILITY
TO THE MAXIMUM EXTENT PERMITTED BY LAW, STREAKD SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE APP.

12. TERMINATION
We reserve the right to suspend or terminate your account at any time for violation of these Terms, without prior notice.

13. CHANGES TO TERMS
We may modify these Terms at any time. Continued use of the App after changes constitutes acceptance. We will make reasonable efforts to notify users of significant changes.

14. GOVERNING LAW
These Terms shall be governed by the laws of the jurisdiction in which Streakd operates.

15. CONTACT
For questions about these Terms, contact us at:
Email: support@streakd.app`;

export default function LegalText({ route, navigation }) {
  const type = route?.params?.type;
  const isPrivacy = type === 'privacy';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ArrowLeftIcon color="rgba(255,255,255,0.7)" size={20} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isPrivacy ? 'Privacy Policy' : 'Terms of Service'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.legalText}>
          {isPrivacy ? PRIVACY_POLICY : TERMS_OF_SERVICE}
        </Text>
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
    padding: 16,
    paddingBottom: 48,
  },
  legalText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    lineHeight: 20,
  },
});
