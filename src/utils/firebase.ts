import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  EmailAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  linkWithCredential,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import config from '../../firebase-applet-config.json';

const app = initializeApp(config);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Ensure Google provider requests email profile
googleProvider.addScope('email');
googleProvider.addScope('profile');

export {
  GoogleAuthProvider,
  EmailAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  linkWithCredential,
  onAuthStateChanged,
  updateProfile
};
