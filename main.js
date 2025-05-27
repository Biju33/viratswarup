// ---------------------------
// Firebase Initialization
// ---------------------------
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
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const analytics = firebase.analytics();

// ---------------------------
// DOM Elements
// ---------------------------
const elements = {
  // Auth Elements
  loginSection: document.getElementById('loginSection'),
  appSection: document.getElementById('appSection'),
  googleLoginBtn: document.getElementById('googleLogin'),
  facebookLoginBtn: document.getElementById('facebookLogin'),
  logoutBtn: document.getElementById('logoutBtn'),
  
  // User Profile
  userPhoto: document.getElementById('userPhoto'),
  userName: document.getElementById('userName'),
  
  // Post Elements
  postBtn: document.getElementById('postBtn'),
  postContent: document.getElementById('postContent'),
  postsContainer: document.getElementById('postsContainer'),
  
  // Navigation
  hamburger: document.querySelector('.hamburger'),
  mobileMenu: document.querySelector('.mobile-menu')
};

// ---------------------------
// Auth Management
// ---------------------------
auth.onAuthStateChanged(user => {
  if (user) {
    // Show app content
    elements.loginSection.style.display = 'none';
    elements.appSection.style.display = 'block';
    
    // Update user profile
    elements.userPhoto.src = user.photoURL || 'default-user.png';
    elements.userName.textContent = user.displayName;
    
    // Track login event
    firebase.analytics().logEvent('login');
    
    // Load posts
    loadPosts();
  } else {
    // Show login screen
    elements.loginSection.style.display = 'block';
    elements.appSection.style.display = 'none';
  }
});

// Social Login Handlers
elements.googleLoginBtn.addEventListener('click', () => handleAuth(new firebase.auth.GoogleAuthProvider()));
elements.facebookLoginBtn.addEventListener('click', () => handleAuth(new firebase.auth.FacebookAuthProvider()));

// Logout Handler
elements.logoutBtn.addEventListener('click', () => {
  auth.signOut();
  firebase.analytics().logEvent('logout');
});

// Auth Function
async function handleAuth(provider) {
  try {
    await auth.signInWithPopup(provider);
  } catch (error) {
    showError(`Login Failed: ${error.message}`);
  }
}

// ---------------------------
// Post Management
// ---------------------------
// Create Post
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
    firebase.analytics().logEvent('create_post');
  } catch (error) {
    showError(`Post Failed: ${error.message}`);
  }
});

// Load Posts
async function loadPosts() {
  try {
    elements.postsContainer.innerHTML = '<h3>Loading Posts...</h3>';
    
    const snapshot = await db.collection('posts')
      .orderBy('timestamp', 'desc')
      .get();

    elements.postsContainer.innerHTML = '<h3>Feed</h3>';
    snapshot.forEach(doc => createPostElement(doc.id, doc.data()));
  } catch (error) {
    showError(`Failed to Load Posts: ${error.message}`);
  }
}

// Like/Unlike Post
document.addEventListener('click', async (e) => {
  if (e.target.closest('.like-btn')) {
    const postId = e.target.closest('.like-btn').dataset.postId;
    const postRef = db.collection('posts').doc(postId);
    const userId = auth.currentUser.uid;

    const post = await postRef.get();
    const likes = post.data().likes;

    if (likes.includes(userId)) {
      await postRef.update({
        likes: firebase.firestore.FieldValue.arrayRemove(userId)
      });
      firebase.analytics().logEvent('unlike_post');
    } else {
      await postRef.update({
        likes: firebase.firestore.FieldValue.arrayUnion(userId)
      });
      firebase.analytics().logEvent('like_post');
    }
    loadPosts();
  }
});

// Add Comment
document.addEventListener('click', async (e) => {
  if (e.target.closest('.comment-btn')) {
    const postId = e.target.closest('.comment-btn').dataset.postId;
    const comment = prompt('Enter your comment:');
    
    if (comment) {
      await db.collection('posts').doc(postId).update({
        comments: firebase.firestore.FieldValue.arrayUnion({
          text: comment,
          user: auth.currentUser.displayName,
          timestamp: new Date()
        })
      });
      firebase.analytics().logEvent('add_comment');
      loadPosts();
    }
  }
});

// ---------------------------
// UI Components
// ---------------------------
function createPostElement(postId, post) {
  const isLiked = post.likes.includes(auth.currentUser?.uid);
  const commentsHTML = post.comments.map(comment => `
    <div class="comment">
      <strong>${comment.user}</strong>
      <p>${comment.text}</p>
      <small>${comment.timestamp.toDate().toLocaleString()}</small>
    </div>
  `).join('');

  const postHTML = `
    <div class="post" data-post-id="${postId}">
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
          <i class="fas fa-heart ${isLiked ? 'liked' : ''}"></i>
          ${post.likes.length}
        </button>
        <button class="comment-btn" data-post-id="${postId}">
          <i class="fas fa-comment"></i>
          ${post.comments.length}
        </button>
      </div>
      <div class="comments">
        ${commentsHTML}
      </div>
    </div>
  `;
  elements.postsContainer.insertAdjacentHTML('beforeend', postHTML);
}

// ---------------------------
// Helper Functions
// ---------------------------
function showError(message) {
  alert(message);
  console.error(message);
}

// ---------------------------
// Navigation Management
// ---------------------------
// Hamburger Menu
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

// Smooth Scroll for Mobile Menu
document.querySelectorAll('.mobile-menu a').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const section = document.querySelector(e.target.getAttribute('href'));
    section.scrollIntoView({ behavior: 'smooth' });
    toggleMenu();
  });
});

// ---------------------------
// Initialization
// ---------------------------
document.addEventListener('DOMContentLoaded', () => {
  firebase.analytics().logEvent('page_view');
});
