import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, deleteDoc } from 'firebase/firestore';
import dotenv from 'dotenv';
dotenv.config();

const DRY_RUN = true;

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const GHOST_IDS = [
  '7jiQyRRNMQHvwHHbtxDe','DVxGirTIBtk52XX0TWHa','QgZ0ClHTiZ9maST4xxzY',
  'KEGFNIzD60l4dWxY5nW1','RtfAF63tZ9mBP6YSs5yz','F4I5Djs9vaTsFRMPV3Ts',
  'p64JZV6xzP1Ung2GCw0M','uVud3V5i5dVIjOf6CUcE','jhGqpF4FwybQsmQwJuTR',
  'N6McKsUPvySOxRQtuhhB','OSKdWmuCYAfzux6Uj5O5','7Ajazg3eh4XqQE3MCfGZ',
  'oLonUeKiUrQsTooyY8Xd','AZsBFGRaXLx6GrA2ruGb','GBMwwSJcdS5pAFu2GN1E',
  'Yon41ybJgsrvYdTpteMo','1WHMG7RMsS9oxYXrynGS','d0442sst9VHj4HqhyDWB',
  'p6BKHsPlf3np3yFDMLMQ','Tr8QUiBPe6SO8gbBgmjY','8sVTgTnvjj0WR2HVTljW',
  'asg9yZhhLR9oNqeVDBPp','PnABWxny2c6S6du3LwWs','NxhV3EmYcv2EkmrXzPYZ',
  '6VTVnyGjd8iUExwAEUVf','o82okAJ2DiK0Jrz4OgVf','QZO05oLxkqHv3dYPQaKV',
  'HYk3mcWzd8osb3Nmu8sc','arTl0AVctweUifpNsdl2','eTEVeyOl5ewwVlSI2NcB',
  'aL2JbKEGNwlDzXZPyL7x','WGy4X9DiXpsAjLrnHWgi','NFSOd8sGmUY5js9V19E4',
  '0o2BTWt9bOWQGi2QnubQ','903RvEwaTPIBsLeefSJE','kHEhBfFPo3sApfeLaH2L',
  '4kOwcfpKtoJouc1ByRku','3908Pu68Ukpg5QbTnuR8','wLkXqlfWjILcc0yFI2CJ',
  'FX50zxXekAdj1lrW2M61','LRM27gauWATZNUwxQwbG','eIT4Ec3YXDczFOeSCORf',
  'kZfOY3WJbrSLHCe7Zqxt','jISiw9j24oNCogakW4NP','aENkGRpuqQqqguZEwp2b',
  'PImnb7STpYKTagzzJn44','bAdNcmStR6oXMuEm0OwK','88qkyVjCMmnsFKxz4ETU',
  'zfrr8cPfZd54MgsM3dJw','FYjrsyptMN1IPPY8BY3e','9gv2xbv57kb6pKpm0DYo',
  'nBvPHiUjXV7eoKHFjPpJ','YCwqF18UKQ4Yao1MHAe1','4EexHmFibsjey0D39GYP',
  'IzeGRMvOp3bGskVL1PDd','Ci3zqXpqpLIyl1EIhsYT','kHwx5ELBUPuoMECTHIsA',
  '6FtmRwm8bkLIABi6jTsD','YM16eBp3APzScRltuBmn'
];

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  console.log('=== MunafaOS Ghost Order Cleanup ===');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN — no deletions' : 'LIVE EXECUTE — deleting now'}`);
  console.log(`Target: ${GHOST_IDS.length} documents in orders collection`);
  console.log('');

  let deleted = 0;
  let notFound = 0;
  let skipped = 0;

  const batches = [];
  for (let i = 0; i < GHOST_IDS.length; i += 10) {
    batches.push(GHOST_IDS.slice(i, i + 10));
  }

  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];
    console.log(`--- Batch ${b + 1} of ${batches.length} ---`);

    for (const id of batch) {
      const ref = doc(db, 'orders', id);
      const snap = await getDoc(ref);

      if (DRY_RUN) {
        console.log(`[DRY RUN] Would delete: ${id} — exists: ${snap.exists()}`);
        skipped++;
      } else {
        if (snap.exists()) {
          await deleteDoc(ref);
          console.log(`✅ Deleted: ${id}`);
          deleted++;
        } else {
          console.log(`❌ Not found: ${id}`);
          notFound++;
        }
      }
    }

    if (b < batches.length - 1) await delay(500);
  }

  console.log('');
  console.log(`=== Done ===`);
  if (DRY_RUN) {
    console.log(`Would delete: ${skipped} documents (dry run — nothing touched)`);
  } else {
    console.log(`Deleted: ${deleted} | Not found: ${notFound}`);
  }
  process.exit(0);
}

main().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
