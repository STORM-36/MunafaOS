import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';

export const logAudit = async (workspaceId, user, action, details = '') => {
  try {
    await addDoc(collection(db, 'audit_logs'), {
      workspaceId,
      userId: user.uid,
      userName: user.firstName || 'User',
      userEmail: user.email,
      action,
      details,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error('Audit Log Failed:', error);
  }
};
