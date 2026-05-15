import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { getFirebaseMessaging } from '@/lib/firebase/client';
import { getToken, onMessage } from 'firebase/messaging';

export function useNotifications(userId: string | undefined) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const saveTokenToDb = async (token: string) => {
    if (!userId) return;
    const { error } = await supabase
      .from('push_tokens')
      .upsert({ user_id: userId, token }, { onConflict: 'token' });
    
    if (error) console.error('Error saving push token:', error);
  };

  const requestPermission = async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    
    try {
      const status = await Notification.requestPermission();
      setPermission(status);
      
      if (status === 'granted') {
        const messaging = await getFirebaseMessaging();
        if (messaging) {
          // Explicitly register the service worker to prevent "no active Service Worker" error
          const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
          
          const token = await getToken(messaging, {
            vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
            serviceWorkerRegistration: registration,
          });
          
          if (token) {
            setFcmToken(token);
            await saveTokenToDb(token);
          }
        }
      }
    } catch (err) {
      console.error('Failed to get notification permission', err);
    }
  };

  useEffect(() => {
    if (userId && permission === 'granted') {
      const setup = async () => {
        const messaging = await getFirebaseMessaging();
        if (messaging) {
          // Listen for foreground messages
          const unsubscribe = onMessage(messaging, (payload) => {
            console.log('Foreground message received:', payload);
            // You can show a custom toast here if you want
          });
          return unsubscribe;
        }
      };
      setup();
    }
  }, [userId, permission]);

  return { permission, requestPermission, fcmToken };
}
