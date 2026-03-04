# HabitGrid 🟧

A beautiful habit tracking web app with Firebase auth + Firestore, deployable on Netlify.

---

## 🚀 Setup in 5 Steps

### 1. Create a Firebase Project
1. Go to https://console.firebase.google.com
2. Click **"Add Project"** → name it `habitgrid`
3. Disable Google Analytics (optional) → **Create Project**

### 2. Enable Authentication
1. In Firebase Console → **Build → Authentication**
2. Click **"Get Started"**
3. Enable **Email/Password** provider → Save

### 3. Create Firestore Database
1. In Firebase Console → **Build → Firestore Database**
2. Click **"Create Database"**
3. Choose **Production mode** → pick a region → Done
4. Go to **Rules** tab and paste:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```
5. Click **Publish**

### 4. Add Your Firebase Config
1. In Firebase Console → **Project Settings** (gear icon)
2. Scroll to **"Your apps"** → Click **</>** (Web)
3. Register app as `habitgrid` → Copy the `firebaseConfig` object
4. Open `js/app.js` and replace the config at the top:

```js
const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",         // ← replace
  authDomain:        "YOUR_PROJECT...",      // ← replace
  projectId:         "YOUR_PROJECT_ID",      // ← replace
  storageBucket:     "YOUR_PROJECT...",      // ← replace
  messagingSenderId: "YOUR_SENDER_ID",       // ← replace
  appId:             "YOUR_APP_ID"           // ← replace
};
```

### 5. Deploy to Netlify
1. Go to https://app.netlify.com → **"Add new site"**
2. Drag and drop the entire `habitgrid` folder
3. That's it! Your site is live 🎉

---

## 📁 File Structure
```
habitgrid/
├── index.html          # Main HTML
├── css/
│   └── style.css       # All styles
├── js/
│   └── app.js          # Firebase + app logic
└── netlify.toml        # Netlify config
```

## ✨ Features
- Firebase Auth (email/password login)
- Personal accounts — each user has their own data
- Daily habit checklist with one-click check-off
- Monthly tracker grid (like the spreadsheet in the video)
- Stats tab: global progress, streaks, rankings, weekly chart
- Add/remove habits, quick-add popular ones
- Streak tracking (current + longest)
- Fully responsive (mobile friendly)
