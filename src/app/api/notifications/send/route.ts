export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { supabase } from '@/lib/supabase/client'; // Note: Should ideally use service role on server

// Initialize Admin SDK
if (!admin.apps.length && process.env.FIREBASE_PROJECT_ID) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

export async function POST(req: Request) {
  try {
    const { title, body, audience, targetId } = await req.json();

    // 1. Fetch tokens and user IDs based on audience
    let tokens: string[] = [];
    let userIds: string[] = [];

    if (audience === 'everyone') {
      const { data } = await supabase.from('push_tokens').select('token, user_id');
      tokens = data?.map(t => t.token) || [];
      userIds = Array.from(new Set(data?.map(t => t.user_id) || []));
    } else if (['11th', '12th', 'dropper'].includes(audience)) {
      const { data } = await supabase
        .from('push_tokens')
        .select('token, user_id, profiles!inner(class)')
        .eq('profiles.class', audience);
      tokens = data?.map(t => t.token) || [];
      userIds = Array.from(new Set(data?.map(t => t.user_id) || []));
    } else if (audience === 'user' && targetId) {
      const { data } = await supabase
        .from('push_tokens')
        .select('token, user_id')
        .eq('user_id', targetId);
      tokens = data?.map(t => t.token) || [];
      userIds = [targetId];
    }

    if (tokens.length === 0) {
      return NextResponse.json({ success: true, message: 'No tokens found' });
    }

    // 2. Send via FCM
    const message = {
      notification: { title, body },
      data: {
        title,
        body,
        url: '/community' // Optional: where to go when clicked
      },
      tokens: tokens,
    };

    console.log(`Attempting to send push to ${tokens.length} tokens...`);
    const response = await admin.messaging().sendEachForMulticast(message);
    
    console.log(`FCM Response: Success=${response.successCount}, Failure=${response.failureCount}`);

    // 3. Save to In-App Notifications table
    if (userIds.length > 0) {
      const notificationRecords = userIds.map(uid => ({
        user_id: uid,
        title: title,
        message: body,
        created_at: new Date().toISOString()
      }));

      const { error: notifyError } = await supabase
        .from('notifications')
        .insert(notificationRecords);
      
      if (notifyError) console.error('Error saving in-app notifications:', notifyError);
    }

    // 3. Cleanup invalid tokens
    if (response.failureCount > 0) {
      const failedTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx]);
          console.error(`Token ${tokens[idx]} failed:`, resp.error);
        }
      });
      if (failedTokens.length > 0) {
        await supabase.from('push_tokens').delete().in('token', failedTokens);
      }
    }

    return NextResponse.json({ 
      success: true, 
      sentCount: response.successCount, 
      failureCount: response.failureCount 
    });

  } catch (error: any) {
    console.error('FCM Send Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
