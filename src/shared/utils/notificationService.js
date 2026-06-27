import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase.js';

export async function createNotification(workspaceId, type, title, message, relatedId = null) {
  console.log('[NOTIF SERVICE] called:', { workspaceId, type, title });
  if (!workspaceId) {
    console.log('[NOTIF SERVICE] blocked — workspaceId is null/undefined');
    return;
  }
  try {
    await addDoc(collection(db, 'notifications'), {
      workspaceId,
      type,
      title,
      message,
      isRead: false,
      relatedId,
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.error('createNotification error:', err);
  }
}
