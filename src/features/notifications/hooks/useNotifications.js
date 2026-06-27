import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../../../firebase.js';
import { useAuth } from '../../auth/context/AuthContext';

export function useNotifications() {
  const { workspaceId, currentUser } = useAuth();
  const effectiveWorkspaceId = workspaceId || currentUser?.uid || null;

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!effectiveWorkspaceId) { setLoading(false); return; }

    const q = query(
      collection(db, 'notifications'),
      where('workspaceId', '==', effectiveWorkspaceId),
      orderBy('timestamp', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error('useNotifications error:', err);
      setLoading(false);
    });

    return () => unsub();
  }, [effectiveWorkspaceId]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = async (id) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { isRead: true });
    } catch (err) {
      console.error('markAsRead error:', err);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.isRead);
    if (unread.length === 0) return;
    try {
      const batch = writeBatch(db);
      unread.forEach(n => batch.update(doc(db, 'notifications', n.id), { isRead: true }));
      await batch.commit();
    } catch (err) {
      console.error('markAllAsRead error:', err);
    }
  };

  return { loading, notifications, unreadCount, markAsRead, markAllAsRead };
}
