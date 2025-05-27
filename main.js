// main.js
// Firebase Configuration and Initialization
const firebaseConfig = {
  apiKey: "AIzaSyCg4rPKO6h4VjZsGlaIm8gZbL0J4vJHTrw",
  authDomain: "viratsawarup.firebaseapp.com",
  databaseURL: "https://viratsawarup-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "viratsawarup",
  storageBucket: "viratsawarup.firebasestorage.app",
  messagingSenderId: "264071748020",
  appId: "1:264071748020:web:c939e9a9cdc14e80f77ae1",
  measurementId: "G-7GJQPJCR1L"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// DOM Elements
const elements = {
  loginSection: document.getElementById('loginSection'),
  appSection: document.getElementById('appSection'),
  googleLoginBtn: document.getElementById('googleLogin'),
  facebookLoginBtn: document.getElementById('facebookLogin'),
  logoutBtn: document.getElementById('logoutBtn'),
  userPhoto: document.getElementById('userPhoto'),
  userName: document.getElementById('userName'),
  postBtn: document.getElementById('postBtn'),
  postContent: document.getElementById('postContent'),
  postsContainer: document.getElementById('postsContainer'),
  hamburger: document.querySelector('.hamburger'),
  mobileMenu: document.querySelector('.mobile-menu')
};

// Auth State Listener
auth.onAuthStateChanged(user => {
  if (user) {
    elements.loginSection.style.display = 'none';
    elements.appSection.style.display = 'block';
    elements.userPhoto.src = user.photoURL;
    elements.userName.textContent = user.displayName;
    loadPosts();
  } else {
    elements.loginSection.style.display = 'block';
    elements.appSection.style.display = 'none';
  }
});

// Auth Functions
elements.googleLoginBtn.addEventListener('click', () => handleAuth(new firebase.auth.GoogleAuthProvider()));
elements.facebookLoginBtn.addEventListener('click', () => handleAuth(new firebase.auth.FacebookAuthProvider()));
elements.logoutBtn.addEventListener('click', () => auth.signOut());

async function handleAuth(provider) {
  try {
    await auth.signInWithPopup(provider);
  } catch (error) {
    alert(`Login Error: ${error.message}`);
  }
}

// Post Functions
elements.postBtn.addEventListener('click', async () => {
  const content = elements.postContent.value.trim();
  if (!content) return;

  try {
    await db.collection('posts').add({
      content: content,
      userId: auth.currentUser.uid,
      userName: auth.currentUser.displayName,
      userPhoto: auth.currentUser.photoURL,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      likes: [],
      comments: []
    });
    elements.postContent.value = '';
    loadPosts();
  } catch (error) {
    alert(`Post Error: ${error.message}`);
  }
});

// Load and Display Posts
async function loadPosts() {
  elements.postsContainer.innerHTML = '<h3>Feed</h3>';
  
  try {
    const snapshot = await db.collection('posts')
      .orderBy('timestamp', 'desc')
      .get();
      
    snapshot.forEach(doc => createPostElement(doc.id, doc.data()));
  } catch (error) {
    alert(`Load Error: ${error.message}`);
  }
}

function createPostElement(postId, post) {
  const isLiked = post.likes.includes(auth.currentUser?.uid);
  const postHTML = `
    <div class="post">
      <div class="post-header">
        <img src="${post.userPhoto}" alt="${post.userName}">
        <div>
          <strong>${post.userName}</strong>
          <p>${post.timestamp?.toDate().toLocaleString()}</p>
        </div>
      </div>
      <div class="post-content">
        <p>${post.content}</p>
      </div>
      <div class="post-actions">
        <button class="like-btn" data-post-id="${postId}">
          <img src="${isLiked ? 'liked.png' : 'unliked.png'}" alt="Like">
          <span>${post.likes.length}</span>
        </button>
        <button class="comment-btn" data-post-id="${postId}">
          <img src="comment.png" alt="Comment">
          <span>${post.comments.length}</span>
        </button>
      </div>
    </div>
  `;
  elements.postsContainer.insertAdjacentHTML('beforeend', postHTML);
}

// Hamburger Menu Functions
elements.hamburger.addEventListener('click', toggleMenu);

function toggleMenu() {
  elements.mobileMenu.classList.toggle('active');
  elements.hamburger.querySelectorAll('.hamburger-line').forEach(line => {
    line.style.transform = line.style.transform ? '' : 'rotate(45deg)';
  });
}

// Close Menu on Outside Click
document.addEventListener('click', (e) => {
  if (!e.target.closest('.hamburger') && !e.target.closest('.mobile-menu')) {
    elements.mobileMenu.classList.remove('active');
    elements.hamburger.querySelectorAll('.hamburger-line').forEach(line => {
      line.style.transform = '';
    });
  }
});

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
  // Any initialization code needed when page loads
});
