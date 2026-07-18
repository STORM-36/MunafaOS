import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../../firebase';

/**
 * Shared token utility — used by all token-gated features.
 * @param {object} currentUser — Firebase Auth user object (must have .uid)
 * @param {number} cost — token cost for this feature
 */
export const checkTokenBalance = async (currentUser, cost) => {
  const userRef  = doc(db, 'users', currentUser.uid);
  const userSnap = await getDoc(userRef);
  const balance  = userSnap.data()?.tokenBalance ?? 0;
  if (balance < cost) throw new Error('insufficient_tokens');
};

export const deductTokens = async (currentUser, cost) => {
  const userRef = doc(db, 'users', currentUser.uid);
  await updateDoc(userRef, { tokenBalance: increment(-cost) });
};
