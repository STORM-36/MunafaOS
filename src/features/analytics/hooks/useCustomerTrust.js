import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../firebase.js';
import { useAuth } from '../../auth/context/AuthContext';

const DEFAULT_STATE = {
  loading: false,
  trustLevel: null,
  ownReturnCount: 0,
  ownTotalCount: 0,
  communityReports: 0,
  checked: false,
};

export default function useCustomerTrust(phoneInput) {
  const { workspaceId, currentUser } = useAuth();
  const effectiveWorkspaceId = workspaceId || currentUser?.uid || null;

  const [state, setState] = useState(DEFAULT_STATE);

  useEffect(() => {
    const phone = (phoneInput || '').trim();

    if (!phone || phone.length < 11 || !effectiveWorkspaceId) {
      setState(DEFAULT_STATE);
      return;
    }

    const timer = setTimeout(async () => {
      setState(prev => ({ ...prev, loading: true, checked: false }));
      try {
        const [ownSnap, communitySnap] = await Promise.all([
          getDocs(
            query(
              collection(db, 'orders'),
              where('workspaceId', '==', effectiveWorkspaceId),
              where('phone', '==', phone)
            )
          ),
          getDoc(doc(db, 'community_blacklist', phone)),
        ]);

        const ownOrders = ownSnap.docs.map(d => d.data());
        const ownTotalCount = ownOrders.length;
        const ownReturnCount = ownOrders.filter(o => o.status === 'Returned').length;
        const communityReports = communitySnap.exists()
          ? Number(communitySnap.data().totalReports || 0)
          : 0;

        let trustLevel;
        if (ownReturnCount >= 3 || (ownReturnCount >= 1 && communityReports >= 1)) {
          trustLevel = 'danger';
        } else if (communityReports >= 1 && ownReturnCount === 0) {
          trustLevel = 'warning';
        } else if (ownReturnCount >= 1 && ownReturnCount <= 2 && communityReports === 0) {
          trustLevel = 'caution';
        } else {
          trustLevel = 'safe';
        }

        setState({
          loading: false,
          trustLevel,
          ownReturnCount,
          ownTotalCount,
          communityReports,
          checked: true,
        });
      } catch (err) {
        console.error('useCustomerTrust lookup error:', err);
        setState({ ...DEFAULT_STATE, loading: false, checked: false });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [phoneInput, effectiveWorkspaceId]);

  return state;
}
