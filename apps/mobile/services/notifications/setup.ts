/**
 * Push notification setup for Expo.
 * - Requests permissions
 * - Registers FCM/APNs token with backend
 * - Sets up notification categories with action buttons
 * - Handles notification responses
 */
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api } from '../api';
import { logger } from '../logger';

// Notification categories define action buttons on rich notifications
const NOTIFICATION_CATEGORIES: Notifications.NotificationCategory[] = [
  {
    identifier: 'CALL_REMINDER',
    actions: [
      { identifier: 'CALL_NOW',  buttonTitle: 'Call Now',  options: { opensAppToForeground: true }  },
      { identifier: 'SNOOZE_15', buttonTitle: 'Snooze 15m', options: { opensAppToForeground: false } },
      { identifier: 'DISMISS',   buttonTitle: 'Dismiss',    isDestructive: true, options: { opensAppToForeground: false } },
    ],
  },
  {
    identifier: 'TASK_REMINDER',
    actions: [
      { identifier: 'MARK_DONE', buttonTitle: 'Done ✓',    options: { opensAppToForeground: false } },
      { identifier: 'SNOOZE_15', buttonTitle: 'Snooze 15m', options: { opensAppToForeground: false } },
      { identifier: 'DISMISS',   buttonTitle: 'Dismiss',    isDestructive: true, options: { opensAppToForeground: false } },
    ],
  },
  {
    identifier: 'EMAIL_REMINDER',
    actions: [
      { identifier: 'OPEN_EMAIL', buttonTitle: 'Open Mail', options: { opensAppToForeground: true }  },
      { identifier: 'SNOOZE_15',  buttonTitle: 'Snooze 15m', options: { opensAppToForeground: false } },
      { identifier: 'DISMISS',    buttonTitle: 'Dismiss',    isDestructive: true, options: { opensAppToForeground: false } },
    ],
  },
  {
    identifier: 'DEFAULT_REMINDER',
    actions: [
      { identifier: 'SNOOZE_15', buttonTitle: 'Snooze 15m', options: { opensAppToForeground: false } },
      { identifier: 'DISMISS',   buttonTitle: 'Dismiss',    isDestructive: true, options: { opensAppToForeground: false } },
    ],
  },
];

// Foreground notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

export async function setupNotifications(): Promise<void> {
  if (!Device.isDevice) {
    logger.warn('Push notifications only work on physical devices');
    return;
  }

  // Register categories (action buttons)
  await Notifications.setNotificationCategoryAsync('CALL_REMINDER',    NOTIFICATION_CATEGORIES[0]!.actions);
  await Notifications.setNotificationCategoryAsync('TASK_REMINDER',    NOTIFICATION_CATEGORIES[1]!.actions);
  await Notifications.setNotificationCategoryAsync('EMAIL_REMINDER',   NOTIFICATION_CATEGORIES[2]!.actions);
  await Notifications.setNotificationCategoryAsync('DEFAULT_REMINDER', NOTIFICATION_CATEGORIES[3]!.actions);

  // Request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert:   true,
        allowBadge:   true,
        allowSound:   true,
        allowProvisional: false,
      },
    });
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    logger.warn('Push notification permission not granted');
    return;
  }

  // Configure Android channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name:          'Reminders',
      importance:    Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor:    '#F0A202',
      sound:         'notification.wav',
      enableVibrate: true,
      showBadge:     true,
    });

    await Notifications.setNotificationChannelAsync('urgent', {
      name:          'Urgent Reminders',
      importance:    Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      lightColor:    '#EF4444',
      bypassDnd:     true,
      enableVibrate: true,
      showBadge:     true,
    });
  }

  // Get device push token
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig?.extra?.eas?.projectId,
  });

  // Get native FCM/APNs token for server-side dispatch
  const nativeToken = await Notifications.getDevicePushTokenAsync();

  try {
    await api.devices.register({
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      token:    nativeToken.data,
      app_version: Constants.expoConfig?.version ?? '1.0.0',
    });
    logger.info('Push token registered with backend');
  } catch (err) {
    logger.error('Failed to register push token:', err);
  }

  // Handle notification responses (tapped action buttons)
  Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);
}

async function handleNotificationResponse(
  response: Notifications.NotificationResponse,
): Promise<void> {
  const { reminderId, type } = response.notification.request.content.data as any;
  const actionId = response.actionIdentifier;

  logger.info(`Notification action: ${actionId} for reminder ${reminderId}`);

  switch (actionId) {
    case 'MARK_DONE':
    case Notifications.DEFAULT_ACTION_IDENTIFIER:
      // Navigate to reminder detail — handled by Expo Router deep link
      break;

    case 'SNOOZE_15':
      try {
        await api.reminders.snooze(reminderId, 15);
      } catch (err) {
        logger.error('Snooze failed:', err);
      }
      break;

    case 'DISMISS':
      // No action needed — notification dismissed
      break;

    case 'CALL_NOW':
      // Handled in the app — open phone dialler
      break;

    case 'OPEN_EMAIL':
      // Handled in the app — open mail client
      break;
  }
}
