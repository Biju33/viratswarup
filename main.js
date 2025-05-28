// main.js (Firebase Modular SDK v9+)

// Import Firebase services
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
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
    serverTimestamp,
    deleteDoc // Import for delete functionality if you add it
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import {
    getStorage,
    ref,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject // Import for deleting images from storage
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCg4rPKO6h4VjZsGlaIm8gZbL0J4vJHTrw", // Replace with your actual API key
  authDomain: "viratsawarup.firebaseapp.com",
  projectId: "viratsawarup",
  storageBucket: "viratsawarup.appspot.com", // CRITICAL: Ensure this matches your Firebase project
  messagingSenderId: "264071748020",
  appId: "1:264071748020:web:c939e9a9cdc14e80f77ae1",
  measurementId: "G-7GJQPJCR1L"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

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
    hamburger: document.querySelector('.hamburger'),
    postImageFile: document.getElementById('postImageFile'),
    imagePreview: document.getElementById('imagePreview'),
    uploadProgressContainer: document.getElementById('uploadProgressContainer'),
    uploadProgress: document.getElementById('uploadProgress'),
    uploadProgressText: document.getElementById('uploadProgressText')
};

// --- Image Preview Handler ---
if (elements.postImageFile) {
    elements.postImageFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if(elements.imagePreview) {
                    elements.imagePreview.src = event.target.result;
                    elements.imagePreview.style.display = 'block';
                }
            }
            reader.readAsDataURL(file);
        } else {
            if(elements.imagePreview) {
                elements.imagePreview.src = '#';
                elements.imagePreview.style.display = 'none';
            }
        }
    });
}

// --- Auth State Listener ---
onAuthStateChanged(auth, user => {
    if (user) {
        if(elements.loginSection) elements.loginSection.style.display = 'none';
        if(elements.appSection) elements.appSection.style.display = 'block';
        if(elements.userPhoto) elements.userPhoto.src = user.photoURL || 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
        if(elements.userName) elements.userName.textContent = user.displayName || 'User';
        loadPosts();
    } else {
        if(elements.loginSection) elements.loginSection.style.display = 'block';
        if(elements.appSection) elements.appSection.style.display = 'none';
        if(elements.postsContainer) elements.postsContainer.innerHTML = '<h3>Feed</h3><p>Please log in to see the feed.</p>';
        if (postsUnsubscribe) {
            postsUnsubscribe(); // Unsubscribe when user logs out
            postsUnsubscribe = null;
        }
    }
});

// --- Auth Functions ---
async function handleAuth(provider) {
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error("Login Error:", error);
        if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') return;
        if (error.code === 'auth/account-exists-with-different-credential') {
            alert("An account already exists with the same email address but different sign-in credentials. Try signing in with the original method.");
        } else {
            alert(`Login Error: ${error.message}`);
        }
    }
}

if (elements.googleLoginBtn) elements.googleLoginBtn.addEventListener('click', () => handleAuth(new GoogleAuthProvider()));
if (elements.facebookLoginBtn) elements.facebookLoginBtn.addEventListener('click', () => {
    alert("Facebook login requires developer setup. Please use Google Sign-In for now.");
});
if (elements.logoutBtn) elements.logoutBtn.addEventListener('click', () => signOut(auth));


// --- Post Functions ---
if (elements.postBtn) {
    elements.postBtn.addEventListener('click', async () => {
        const content = elements.postContent ? elements.postContent.value.trim() : "";
        const imageFile = elements.postImageFile ? elements.postImageFile.files[0] : null;
        const currentUser = auth.currentUser;

        if (!content && !imageFile) {
            alert("Post content or an image is required!");
            return;
        }
        if (!currentUser) {
            alert("You must be logged in to post!");
            return;
        }

        elements.postBtn.disabled = true;
        elements.postBtn.textContent = "Posting...";
        if(elements.uploadProgressContainer) elements.uploadProgressContainer.style.display = 'none';
        if(elements.uploadProgressText) elements.uploadProgressText.textContent = '';

        try {
            let imageUrl = null;

            if (imageFile) {
                if(elements.uploadProgressContainer) elements.uploadProgressContainer.style.display = 'block';
                if(elements.uploadProgress) elements.uploadProgress.value = 0;

                const imageName = `post_images/${currentUser.uid}/${Date.now()}_${imageFile.name}`; // Store under user's UID folder
                const storageFileRef = ref(storage, imageName);
                const uploadTask = uploadBytesResumable(storageFileRef, imageFile);

                await new Promise((resolve, reject) => {
                    uploadTask.on('state_changed',
                        (snapshot) => {
                            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                            if(elements.uploadProgress) elements.uploadProgress.value = progress;
                            if(elements.uploadProgressText) elements.uploadProgressText.textContent = `Uploading: ${Math.round(progress)}%`;
                        },
                        (error) => {
                            console.error("Upload failed:", error);
                            // Provide more specific error feedback
                            let message = "Image upload failed.";
                            switch (error.code) {
                                case 'storage/unauthorized':
                                    message = "Upload failed: You do not have permission. Please check Firebase Storage security rules.";
                                    break;
                                case 'storage/canceled':
                                    message = "Upload canceled by user.";
                                    break;
                                case 'storage/object-not-found':
                                    message = "Upload failed: File path not found. This might be a configuration issue.";
                                    break;
                                default:
                                    message = `Upload error: ${error.message}`;
                            }
                            reject(new Error(message)); // Reject with a new error containing the user-friendly message
                        },
                        async () => {
                            try {
                                imageUrl = await getDownloadURL(uploadTask.snapshot.ref);
                                resolve();
                            } catch (error) {
                                console.error("Failed to get download URL:", error);
                                reject(new Error("Failed to get image URL after upload."));
                            }
                        }
                    );
                });
            }

            const postData = {
                content: content || "",
                userId: currentUser.uid,
                userName: currentUser.displayName || 'Anonymous User',
                userPhoto: currentUser.photoURL || 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=',
                timestamp: serverTimestamp(),
                likes: [],
                comments: []
            };

            if (imageUrl) {
                postData.imageUrl = imageUrl;
            }

            await addDoc(collection(db, 'posts'), postData);

            if(elements.postContent) elements.postContent.value = '';
            if(elements.postImageFile) elements.postImageFile.value = null;
            if(elements.imagePreview) {
                elements.imagePreview.src = '#';
                elements.imagePreview.style.display = 'none';
            }

        } catch (error) {
            console.error("Post Error Full:", error); // Log the full error object
            alert(error.message || "An error occurred while creating the post. Check console for details."); // Display the specific error message from the promise rejection or a generic one
        } finally {
            if(elements.postBtn) {
                elements.postBtn.disabled = false;
                elements.postBtn.textContent = "Post";
            }
             if(elements.uploadProgressContainer) elements.uploadProgressContainer.style.display = 'none';
             if(elements.uploadProgressText) elements.uploadProgressText.textContent = '';
        }
    });
}

// --- Load Posts (Real-time listener) ---
let postsUnsubscribe = null;

function loadPosts() {
    if (!elements.postsContainer) return;

    if (postsUnsubscribe) {
        postsUnsubscribe();
    }

    const q = query(collection(db, 'posts'), orderBy('timestamp', 'desc'));
    postsUnsubscribe = onSnapshot(q, (querySnapshot) => {
        if (elements.postsContainer) {
            elements.postsContainer.innerHTML = '<h3>Feed</h3>';
            if (querySnapshot.empty) {
                elements.postsContainer.innerHTML += '<p>No posts yet. Be the first to share!</p>';
                return;
            }
            querySnapshot.forEach((docSnap) => {
                createPostElement(docSnap.id, docSnap.data());
            });
        }
    }, (error) => {
        console.error("Error loading posts: ", error);
        if (elements.postsContainer) {
            elements.postsContainer.innerHTML = '<h3>Feed</h3><p>Error loading posts. Please try again later.</p>';
        }
    });
}

// --- Post Element Creation and Interaction ---
function createPostElement(postId, post) {
    const currentUser = auth.currentUser;
    const isOwner = currentUser && post.userId === currentUser.uid;
    const isLiked = currentUser && post.likes && post.likes.includes(currentUser.uid);

    const postDiv = document.createElement('div');
    postDiv.className = 'post';
    postDiv.setAttribute('data-post-id', postId);

    const formattedTimestamp = post.timestamp && typeof post.timestamp.toDate === 'function'
                                ? post.timestamp.toDate().toLocaleString()
                                : (post.timestamp ? new Date(post.timestamp).toLocaleString() : 'Just now');

    let contentHTML = post.content ? `<p>${escapeHTML(post.content).replace(/\n/g, '<br>')}</p>` : '';
    if (post.imageUrl) {
        contentHTML += `<img src="${post.imageUrl}" alt="Post image" class="post-image" onerror="this.style.display='none'; console.error('Error loading image: ${post.imageUrl}')">`;
    }

    postDiv.innerHTML = `
        <div class="post-header">
            <img src="${post.userPhoto || 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='}" alt="${escapeHTML(post.userName)}" onerror="this.src='data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';">
            <div>
                <strong>${escapeHTML(post.userName)}</strong>
            </div>
            <span class="timestamp">${formattedTimestamp}</span>
        </div>
        <div class="post-content">
            ${contentHTML || '<p style="color: #888;"><em>No text content for this post.</em></p>'}
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
            ${isOwner ? `
                <button class="delete-post-btn" data-post-id="${postId}" style="margin-left: auto; color: #cc0000;">
                    <i class="fas fa-trash"></i> Delete
                </button>
            ` : ''}
        </div>
        <div class="comments-area" id="comments-area-${postId}" style="display: none;">
            <div class="comments-list" id="comments-list-${postId}"></div>
            <form class="comment-form-actual" data-post-id="${postId}">
                <input type="text" name="commentText" placeholder="Add a comment..." required>
                <button type="submit">Post</button>
            </form>
        </div>
    `;

    if (elements.postsContainer) elements.postsContainer.appendChild(postDiv);

    const commentsList = postDiv.querySelector(`#comments-list-${postId}`);
    if (commentsList) {
        commentsList.innerHTML = ''; // Clear previous comments before rendering
        if (post.comments && post.comments.length > 0) {
            // Sort comments by timestamp before rendering (oldest first)
            const sortedComments = [...post.comments].sort((a, b) => {
                const timeA = a.timestamp && a.timestamp.toDate ? a.timestamp.toDate().getTime() : 0;
                const timeB = b.timestamp && b.timestamp.toDate ? b.timestamp.toDate().getTime() : 0;
                return timeA - timeB;
            });
            sortedComments.forEach(comment => renderComment(comment, commentsList));
        } else {
            commentsList.innerHTML = '<p style="font-size:0.9em; color:#777; padding:5px 0;">No comments yet.</p>';
        }
    }

    const likeBtn = postDiv.querySelector('.like-btn');
    if (likeBtn) likeBtn.addEventListener('click', () => handleLike(postId));

    const commentToggleBtn = postDiv.querySelector('.comment-toggle-btn');
    if (commentToggleBtn) commentToggleBtn.addEventListener('click', () => toggleComments(postId));

    const commentForm = postDiv.querySelector('.comment-form-actual');
    if (commentForm) commentForm.addEventListener('submit', (e) => handleCommentSubmit(e, postId));

    const deleteBtn = postDiv.querySelector('.delete-post-btn');
    if (deleteBtn) deleteBtn.addEventListener('click', () => handleDeletePost(postId, post.imageUrl));
}

async function handleDeletePost(postId, postImageUrl) {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        alert("Please log in to delete posts.");
        return;
    }

    if (!confirm("Are you sure you want to delete this post? This action cannot be undone.")) {
        return;
    }

    const postRef = doc(db, 'posts', postId);
    try {
        // Optional: First check if the user owns the post (Security rules should enforce this anyway)
        // const postSnap = await getDoc(postRef);
        // if (!postSnap.exists() || postSnap.data().userId !== currentUser.uid) {
        //     alert("You do not have permission to delete this post or it no longer exists.");
        //     return;
        // }

        // Delete the image from Storage if it exists
        if (postImageUrl) {
            try {
                const imageRef = ref(storage, postImageUrl); // refFromURL might be better if full URL stored
                await deleteObject(imageRef);
            } catch (storageError) {
                console.warn("Could not delete image from storage (it might be already deleted or rules changed):", storageError);
                // Don't block post deletion if image deletion fails, but log it.
            }
        }

        // Delete the post document from Firestore
        await deleteDoc(postRef);
        // Post will be removed from UI by onSnapshot listener automatically
        alert("Post deleted successfully.");

    } catch (error) {
        console.error("Error deleting post:", error);
        alert("Failed to delete post: " + error.message);
    }
}


function renderComment(comment, commentsListElement) {
    const commentDiv = document.createElement('div');
    commentDiv.className = 'comment';
    const commentTimestamp = comment.timestamp && typeof comment.timestamp.toDate === 'function'
                                ? comment.timestamp.toDate().toLocaleString()
                                : (comment.timestamp ? new Date(comment.timestamp).toLocaleString() : 'Recently');

    const noCommentP = commentsListElement.querySelector('p[style*="No comments yet"]');
    if(noCommentP) noCommentP.remove();

    commentDiv.innerHTML = `
        <div class="comment-header">
            <img src="${comment.userPhoto || 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='}" alt="${escapeHTML(comment.userName)}" onerror="this.src='data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';">
            <strong>${escapeHTML(comment.userName) || 'User'}</strong>
            <span class="timestamp">${commentTimestamp}</span>
        </div>
        <p>${escapeHTML(comment.text).replace(/\n/g, '<br>')}</p>
    `;
    commentsListElement.appendChild(commentDiv);
}

async function handleLike(postId) {
    const currentUser = auth.currentUser;
    if (!currentUser) { alert("Please log in to like posts."); return; }

    const postRef = doc(db, 'posts', postId);
    try {
        await runTransaction(db, async (transaction) => {
            const sfDoc = await transaction.get(postRef);
            if (!sfDoc.exists()) {
                throw "Document does not exist!";
            }

            const currentLikes = sfDoc.data().likes || [];
            let newLikesArray;

            if (currentLikes.includes(currentUser.uid)) {
                newLikesArray = currentLikes.filter(uid => uid !== currentUser.uid);
            } else {
                newLikesArray = [...currentLikes, currentUser.uid];
            }
            transaction.update(postRef, { likes: newLikesArray });
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
    if (!currentUser) { alert("Please log in to comment."); return; }

    const form = event.target;
    const commentTextInput = form.elements.commentText;
    const commentText = commentTextInput.value.trim();
    if (!commentText) { alert("Comment cannot be empty."); return; }

    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) {
         submitButton.disabled = true;
         submitButton.textContent = "Posting...";
    }

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
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = "Post";
        }
    }
}

// --- Hamburger Menu & Navigation ---
function toggleMenu() {
    if (elements.mobileMenu && elements.hamburger) {
        elements.mobileMenu.classList.toggle('active');
        elements.hamburger.classList.toggle('active'); // For CSS-driven 'X' transform
    }
}

function closeMenuAndScroll(event) {
    if (elements.mobileMenu && elements.mobileMenu.classList.contains('active')) {
        toggleMenu();
    }
    const targetId = event.currentTarget.getAttribute('href');
    if (targetId && targetId.startsWith('#')) {
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            event.preventDefault();
            targetElement.scrollIntoView({ behavior: "smooth" });
        }
    }
}

if (elements.hamburger) elements.hamburger.addEventListener('click', toggleMenu);

document.querySelectorAll('.mobile-menu a').forEach(link => {
    link.addEventListener('click', (event) => {
        if (link.getAttribute('href').startsWith('#')) {
            closeMenuAndScroll(event);
        } else {
            if (elements.mobileMenu && elements.mobileMenu.classList.contains('active')) {
                toggleMenu();
            }
        }
    });
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
    if (typeof str !== 'string') return '';
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

// --- Initial load check ---
if (auth.currentUser) {
    if(elements.loginSection) elements.loginSection.style.display = 'none';
    if(elements.appSection) elements.appSection.style.display = 'block';
    if(elements.userPhoto) elements.userPhoto.src = auth.currentUser.photoURL || 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
    if(elements.userName) elements.userName.textContent = auth.currentUser.displayName || 'User';
    loadPosts();
} else {
    if(elements.loginSection) elements.loginSection.style.display = 'block';
    if(elements.appSection) elements.appSection.style.display = 'none';
}
