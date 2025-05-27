// main.js (Firebase Modular SDK v9+)

// Import the functions you need from the SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js"; // Using CDN for simplicity in a single file setup
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-analytics.js";
import {
    getAuth,
    onAuthStateChanged,
    GoogleAuthProvider,
    FacebookAuthProvider,
    signInWithPopup,
    signOut
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import {
    getFirestore,
    collection,
    addDoc,
    query,
    orderBy,
    onSnapshot,
    doc,
    runTransaction,
    updateDoc,
    arrayUnion,
    arrayRemove,
    serverTimestamp // For server-side timestamps
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCg4rPKO6h4VjZsGlaIm8gZbL0J4vJHTrw",
  authDomain: "viratsawarup.firebaseapp.com",
  // databaseURL: "https://viratsawarup-default-rtdb.asia-southeast1.firebasedatabase.app", // Firestore doesn't use databaseURL in config
  projectId: "viratsawarup",
  storageBucket: "viratsawarup.appspot.com", // Corrected this based on common patterns, if it was .firebasestorage.app ensure it's correct.
  messagingSenderId: "264071748020",
  appId: "1:264071748020:web:c939e9a9cdc14e80f77ae1",
  measurementId: "G-7GJQPJCR1L"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app); // Optional: if you want to use analytics
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements
const elements = {
    loginSection: document.getElementById('loginSection'),
    appSection: document.getElementById('appSection'),
    googleLoginBtn: document.getElementById('googleLoginBtn'),
    facebookLoginBtn: document.getElementById('facebookLoginBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    userPhoto: document.getElementById('userPhoto'),
    userName: document.getElementById('userName'),
    postBtn: document.getElementById('postBtn'),
    postContent: document.getElementById('postContent'),
    postsContainer: document.getElementById('postsContainer'),
    mobileMenu: document.querySelector('.mobile-menu'),
    hamburger: document.querySelector('.hamburger')
};

// --- Auth State Listener ---
onAuthStateChanged(auth, user => {
    if (user) {
        if (elements.loginSection) elements.loginSection.style.display = 'none';
        if (elements.appSection) elements.appSection.style.display = 'block';
        if (elements.userPhoto) elements.userPhoto.src = user.photoURL || 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
        if (elements.userName) elements.userName.textContent = user.displayName || 'User';
        loadPosts();
    } else {
        if (elements.loginSection) elements.loginSection.style.display = 'block';
        if (elements.appSection) elements.appSection.style.display = 'none';
        if (elements.postsContainer) {
            elements.postsContainer.innerHTML = '<h3>Feed</h3><p>Please log in to see the feed.</p>';
        }
    }
});

// --- Auth Functions ---
async function handleAuth(provider) {
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error("Login Error:", error);
        if (error.code === 'auth/popup-closed-by-user') {
            console.log("Login popup closed by user.");
        } else if (error.code === 'auth/account-exists-with-different-credential') {
            alert("An account already exists with the same email address but different sign-in credentials. Try signing in with the original method.");
        } else {
            alert(`Login Error: ${error.message}`);
        }
    }
}

if (elements.googleLoginBtn) {
    elements.googleLoginBtn.addEventListener('click', () => handleAuth(new GoogleAuthProvider()));
}

if (elements.facebookLoginBtn) {
    elements.facebookLoginBtn.addEventListener('click', () => {
        alert("Facebook login requires developer setup. Please use Google Sign-In for now.");
        // handleAuth(new FacebookAuthProvider());
    });
}

if (elements.logoutBtn) {
    elements.logoutBtn.addEventListener('click', () => signOut(auth));
}

// --- Post Functions ---
if (elements.postBtn) {
    elements.postBtn.addEventListener('click', async () => {
        if (!elements.postContent) return;
        const content = elements.postContent.value.trim();
        const currentUser = auth.currentUser;

        if (!content) {
            alert("Post content cannot be empty!");
            return;
        }
        if (!currentUser) {
            alert("You must be logged in to post!");
            return;
        }

        try {
            elements.postBtn.disabled = true;
            elements.postBtn.textContent = "Posting...";

            await addDoc(collection(db, 'posts'), {
                content: content,
                userId: currentUser.uid,
                userName: currentUser.displayName || 'Anonymous User',
                userPhoto: currentUser.photoURL || 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=',
                timestamp: serverTimestamp(), // Use serverTimestamp for consistency
                likes: [],
                comments: []
            });
            elements.postContent.value = '';
        } catch (error) {
            console.error("Post Error:", error);
            alert(`Post Error: ${error.message}`);
        } finally {
            elements.postBtn.disabled = false;
            elements.postBtn.textContent = "Post";
        }
    });
}

// --- Load Posts (Real-time listener) ---
let postsListenerUnsubscribe = null;

function loadPosts() {
    if (!elements.postsContainer) return;
    if (postsListenerUnsubscribe) {
        postsListenerUnsubscribe();
    }

    const q = query(collection(db, 'posts'), orderBy('timestamp', 'desc'));
    postsListenerUnsubscribe = onSnapshot(q, (querySnapshot) => {
        elements.postsContainer.innerHTML = '<h3>Feed</h3>';
        if (querySnapshot.empty) {
            elements.postsContainer.innerHTML += '<p>No posts yet. Be the first to share!</p>';
            return;
        }
        querySnapshot.forEach((doc) => {
            createPostElement(doc.id, doc.data());
        });
    }, (error) => {
        console.error("Error loading posts: ", error);
        alert(`Error loading posts: ${error.message}`);
        elements.postsContainer.innerHTML = '<h3>Feed</h3><p>Error loading posts. Please try again later.</p>';
    });
}

// --- Post Element Creation and Interaction ---
function createPostElement(postId, post) {
    if (!elements.postsContainer) return;

    const currentUser = auth.currentUser;
    const isLiked = currentUser && post.likes && post.likes.includes(currentUser.uid);

    const postDiv = document.createElement('div');
    postDiv.className = 'post';
    postDiv.setAttribute('data-post-id', postId);

    const formattedTimestamp = post.timestamp ? post.timestamp.toDate().toLocaleString() : 'Just now';

    postDiv.innerHTML = `
        <div class="post-header">
            <img src="${post.userPhoto}" alt="${post.userName}" onerror="this.src='data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';">
            <div>
                <strong>${post.userName}</strong>
            </div>
            <span class="timestamp">${formattedTimestamp}</span>
        </div>
        <div class="post-content">
            <p>${escapeHTML(post.content).replace(/\n/g, '<br>')}</p>
        </div>
        <div class="post-actions">
            <button class="like-btn ${isLiked ? 'liked' : ''}" data-post-id="${postId}">
                <i class="fa-${isLiked ? 'solid' : 'regular'} fa-heart" ${isLiked ? 'style="color:red;"' : ''}></i>
                <span>${post.likes ? post.likes.length : 0} Likes</span>
            </button>
            <button class="comment-toggle-btn" data-post-id="${postId}">
                <i class="far fa-comment"></i>
                <span>${post.comments ? post.comments.length : 0} Comments</span>
            </button>
        </div>
        <div class="comments-area" id="comments-area-${postId}" style="display: none;">
            <div class="comments-list" id="comments-list-${postId}"></div>
            <form class="comment-form-actual" data-post-id="${postId}">
                <input type="text" name="commentText" placeholder="Add a comment..." required>
                <button type="submit">Post</button>
            </form>
        </div>
    `;

    elements.postsContainer.appendChild(postDiv);

    const commentsList = postDiv.querySelector(`#comments-list-${postId}`);
    if (post.comments && post.comments.length > 0) {
        post.comments.forEach(comment => {
            renderComment(comment, commentsList);
        });
    } else {
        commentsList.innerHTML = '<p style="font-size:0.9em; color:#777; padding:5px 0;">No comments yet.</p>';
    }

    postDiv.querySelector('.like-btn').addEventListener('click', () => handleLike(postId));
    postDiv.querySelector('.comment-toggle-btn').addEventListener('click', () => toggleComments(postId));
    postDiv.querySelector('.comment-form-actual').addEventListener('submit', (e) => handleCommentSubmit(e, postId));
}

function renderComment(comment, commentsListElement) {
    const commentDiv = document.createElement('div');
    commentDiv.className = 'comment';
    const commentTimestamp = comment.timestamp ? (typeof comment.timestamp.toDate === 'function' ? comment.timestamp.toDate().toLocaleString() : new Date(comment.timestamp).toLocaleString()) : 'Recently';
    
    const noCommentP = commentsListElement.querySelector('p');
    if(noCommentP && noCommentP.textContent.includes('No comments yet')) {
        noCommentP.remove();
    }

    commentDiv.innerHTML = `
        <div class="comment-header">
            <img src="${comment.userPhoto || 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='}" alt="${comment.userName}" onerror="this.src='data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';">
            <strong>${comment.userName || 'User'}</strong>
            <span class="timestamp">${commentTimestamp}</span>
        </div>
        <p>${escapeHTML(comment.text).replace(/\n/g, '<br>')}</p>
    `;
    commentsListElement.appendChild(commentDiv);
}

async function handleLike(postId) {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        alert("Please log in to like posts.");
        return;
    }

    const postRef = doc(db, 'posts', postId); // Use doc() for modular SDK
    try {
        await runTransaction(db, async (transaction) => { // Pass db to runTransaction
            const sfDoc = await transaction.get(postRef);
            if (!sfDoc.exists()) {
                throw "Document does not exist!";
            }
            
            const currentLikes = sfDoc.data().likes || [];
            let newLikes;
            if (currentLikes.includes(currentUser.uid)) {
                newLikes = arrayRemove(currentUser.uid); // Use arrayRemove for unliking
            } else {
                newLikes = arrayUnion(currentUser.uid); // Use arrayUnion for liking
            }
            transaction.update(postRef, { likes: newLikes });
        });
    } catch (error) {
        console.error("Like transaction failed: ", error);
        alert("Failed to update like: " + error.message);
    }
}

function toggleComments(postId) {
    const commentsArea = document.getElementById(`comments-area-${postId}`);
    if (commentsArea) {
        const isHidden = commentsArea.style.display === 'none' || commentsArea.style.display === '';
        commentsArea.style.display = isHidden ? 'block' : 'none';
        if (isHidden) {
           const inputField = commentsArea.querySelector('input[name="commentText"]');
           if (inputField) inputField.focus();
        }
    }
}

async function handleCommentSubmit(event, postId) {
    event.preventDefault();
    const currentUser = auth.currentUser;
    if (!currentUser) {
        alert("Please log in to comment.");
        return;
    }

    const form = event.target;
    const commentTextInput = form.elements.commentText;
    const commentText = commentTextInput.value.trim();
    if (!commentText) {
        alert("Comment cannot be empty.");
        return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = "Posting...";

    const newComment = {
        userId: currentUser.uid,
        userName: currentUser.displayName || 'User',
        userPhoto: currentUser.photoURL || 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=',
        text: commentText,
        timestamp: serverTimestamp() // Use serverTimestamp
    };

    const postRef = doc(db, 'posts', postId); // Use doc()
    try {
        await updateDoc(postRef, { // Use updateDoc()
            comments: arrayUnion(newComment) // Use arrayUnion()
        });
        commentTextInput.value = '';
    } catch (error) {
        console.error("Error adding comment: ", error);
        alert("Failed to add comment: " + error.message);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Post";
    }
}

// --- Hamburger Menu & Navigation ---
function toggleMenu() {
    if (elements.mobileMenu) {
        elements.mobileMenu.classList.toggle('active');
        if (elements.hamburger) {
            elements.hamburger.classList.toggle('active');
        }
    }
}

function closeMenuAndScroll(event) {
    if (elements.mobileMenu && elements.mobileMenu.classList.contains('active')) {
        toggleMenu();
    }
    const href = event.currentTarget.getAttribute('href');
    if (href && href.startsWith('#')) {
        event.preventDefault();
        const targetElement = document.querySelector(href);
        if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth' });
        }
    }
}

if (elements.hamburger) {
    elements.hamburger.addEventListener('click', toggleMenu);
}

document.querySelectorAll('.mobile-menu a').forEach(link => {
    if (link.getAttribute('href').startsWith('#')) {
        link.addEventListener('click', closeMenuAndScroll);
    } else {
        link.addEventListener('click', (event) => {
            if (elements.mobileMenu && elements.mobileMenu.classList.contains('active')) {
                toggleMenu();
            }
        });
    }
});

document.addEventListener('click', (e) => {
    if (elements.mobileMenu && elements.mobileMenu.classList.contains('active') &&
        elements.hamburger && !elements.hamburger.contains(e.target) &&
        !elements.mobileMenu.contains(e.target)) {
        toggleMenu();
    }
});

// --- Utility function to escape HTML ---
function escapeHTML(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

// --- Initial load check ---
// The onAuthStateChanged listener is the primary way to handle this.
// This explicit check can sometimes make the UI feel slightly faster on first load if the user is already signed in.
if (auth.currentUser) {
    if (elements.loginSection) elements.loginSection.style.display = 'none';
    if (elements.appSection) elements.appSection.style.display = 'block';
    if (elements.userPhoto) elements.userPhoto.src = auth.currentUser.photoURL || 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
    if (elements.userName) elements.userName.textContent = auth.currentUser.displayName || 'User';
    loadPosts();
} else {
    if (elements.loginSection) elements.loginSection.style.display = 'block';
    if (elements.appSection) elements.appSection.style.display = 'none';
}
