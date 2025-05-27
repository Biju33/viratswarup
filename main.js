// main.js

// Import Firebase instances initialized in HTML
import { auth, db } from './firebase-init.js'; // This path might need adjustment if your init script is not named like this conceptually
                                            // BUT since init is in HTML, we'd actually get them from the global scope
                                            // if we didn't use modules properly.
                                            // The better way is to make the HTML script that initializes firebase EXPORT the values

// For the setup where firebase-init.js IS the script in the HTML:
// If you have <script type="module" id="firebaseInit"> /* ... exports app, auth, db ... */ </script>
// and then <script type="module" src="main.js"></script>
// You CANNOT directly import from the inline script.
//
// THE BEST APPROACH is to have firebase-init.js as a SEPARATE file, or put ALL JS in main.js

// --- LET'S ASSUME YOU PUT FIREBASE INIT AT THE TOP OF main.js as per my previous full example ---
// --- This makes main.js self-contained with Firebase initialization ---

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-analytics.js";
import {
    getAuth,
    onAuthStateChanged,
    GoogleAuthProvider,
    FacebookAuthProvider,
    signInWithPopup,
    signOut
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
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
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCg4rPKO6h4VjZsGlaIm8gZbL0J4vJHTrw",
  authDomain: "viratsawarup.firebaseapp.com",
  projectId: "viratsawarup",
  storageBucket: "viratsawarup.appspot.com", // <<< RE-VERIFY THIS
  messagingSenderId: "264071748020",
  appId: "1:264071748020:web:c939e9a9cdc14e80f77ae1",
  measurementId: "G-7GJQPJCR1L"
};

const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app); // Uncomment if you use analytics features in main.js
const auth = getAuth(app);
const db = getFirestore(app);


// DOM Elements (same as before)
const elements = {
    loginSection: document.getElementById('loginSection'),
    appSection: document.getElementById('appSection'),
    // ... rest of the elements
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

// --- Auth State Listener --- (same as before)
onAuthStateChanged(auth, user => {
    // ... same logic
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

// --- Auth Functions --- (same as before, using imported auth, GoogleAuthProvider, etc.)
async function handleAuth(provider) {
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error("Login Error:", error);
        // ... error handling
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
// ... rest of facebookLoginBtn and logoutBtn listeners

if (elements.facebookLoginBtn) {
    elements.facebookLoginBtn.addEventListener('click', () => {
        alert("Facebook login requires developer setup. Please use Google Sign-In for now.");
    });
}

if (elements.logoutBtn) {
    elements.logoutBtn.addEventListener('click', () => signOut(auth));
}


// --- Post Functions --- (same as before, using imported db, collection, addDoc, serverTimestamp, etc.)
if (elements.postBtn) {
    elements.postBtn.addEventListener('click', async () => {
        // ... same logic
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
                timestamp: serverTimestamp(),
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


// --- Load Posts (Real-time listener) --- (same as before)
let postsListenerUnsubscribe = null;
function loadPosts() {
    // ... same logic
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
        querySnapshot.forEach((docSnap) => { // Changed doc to docSnap to avoid conflict with imported doc
            createPostElement(docSnap.id, docSnap.data());
        });
    }, (error) => {
        console.error("Error loading posts: ", error);
        alert(`Error loading posts: ${error.message}`);
        elements.postsContainer.innerHTML = '<h3>Feed</h3><p>Error loading posts. Please try again later.</p>';
    });
}

// --- Post Element Creation and Interaction --- (same logic, but ensure `doc` from firestore is used for postRef)
function createPostElement(postId, post) {
    // ... same logic
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
    // ... same logic
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
    // ... same logic
    const currentUser = auth.currentUser;
    if (!currentUser) {
        alert("Please log in to like posts.");
        return;
    }

    const postRef = doc(db, 'posts', postId);
    try {
        await runTransaction(db, async (transaction) => {
            const sfDoc = await transaction.get(postRef);
            if (!sfDoc.exists()) {
                throw "Document does not exist!";
            }
            
            // Use sfDoc.data().likes for array, not sfDoc.likes
            const currentLikes = sfDoc.data().likes || [];
            let newLikesArray = [...currentLikes]; // Create a mutable copy

            if (newLikesArray.includes(currentUser.uid)) {
                // Unlike: filter out the UID
                newLikesArray = newLikesArray.filter(uid => uid !== currentUser.uid);
            } else {
                // Like: add the UID
                newLikesArray.push(currentUser.uid);
            }
            // The update object for transaction.update must use field paths for array operations with arrayUnion/Remove
            // Simpler to just set the new array if not using arrayUnion/Remove directly in transaction
            transaction.update(postRef, { likes: newLikesArray });

            // Alternative using arrayUnion/Remove if preferred (more atomic but more verbose here)
            // if (currentLikes.includes(currentUser.uid)) {
            //     transaction.update(postRef, { likes: arrayRemove(currentUser.uid) });
            // } else {
            //     transaction.update(postRef, { likes: arrayUnion(currentUser.uid) });
            // }
        });
    } catch (error) {
        console.error("Like transaction failed: ", error);
        alert("Failed to update like: " + error.message);
    }
}
function toggleComments(postId) {
    // ... same logic
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
    // ... same logic
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
        timestamp: serverTimestamp()
    };

    const postRef = doc(db, 'posts', postId);
    try {
        await updateDoc(postRef, {
            comments: arrayUnion(newComment)
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

// --- Hamburger Menu & Navigation --- (same as before)
function toggleMenu() {
    // ... same logic
    if (elements.mobileMenu) {
        elements.mobileMenu.classList.toggle('active');
        if (elements.hamburger) {
            elements.hamburger.classList.toggle('active');
        }
    }
}
function closeMenuAndScroll(event) {
    // ... same logic
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
    // ... same logic
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
    // ... same logic
    if (elements.mobileMenu && elements.mobileMenu.classList.contains('active') &&
        elements.hamburger && !elements.hamburger.contains(e.target) &&
        !elements.mobileMenu.contains(e.target)) {
        toggleMenu();
    }
});

// --- Utility function to escape HTML --- (same as before)
function escapeHTML(str) {
    // ... same logic
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

// --- Initial load check --- (same as before)
if (auth.currentUser) {
    // ... same logic
    if (elements.loginSection) elements.loginSection.style.display = 'none';
    if (elements.appSection) elements.appSection.style.display = 'block';
    if (elements.userPhoto) elements.userPhoto.src = auth.currentUser.photoURL || 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
    if (elements.userName) elements.userName.textContent = auth.currentUser.displayName || 'User';
    loadPosts();
} else {
    if (elements.loginSection) elements.loginSection.style.display = 'block';
    if (elements.appSection) elements.appSection.style.display = 'none';
}
