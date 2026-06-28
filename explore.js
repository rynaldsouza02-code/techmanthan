import { db } from "./firebase-config.js";
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// Session elements
const navUserArea = document.getElementById("navUserArea");
const eventGrid = document.getElementById("eventGrid");
const searchInput = document.getElementById("searchInput");

// Modal 1: Details
const detailModal = document.getElementById("detailModal");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");
const modalCloseBtn = document.getElementById("modalCloseBtn");

// Modal 2: Gallery Slideshow
const galleryModal = document.getElementById("galleryModal");
const galleryTitle = document.getElementById("galleryTitle");
const carouselViewport = document.getElementById("carouselViewport");
const carouselDots = document.getElementById("carouselDots");
const galleryCloseBtn = document.getElementById("galleryCloseBtn");

// Modal 3: Media Upload Panel
const uploadModal = document.getElementById("uploadModal");
const uploadTitle = document.getElementById("uploadTitle");
const uploadEventIdText = document.getElementById("uploadEventIdText");
const posterUploadZone = document.getElementById("posterUploadZone");
const posterFileInput = document.getElementById("posterFileInput");
const posterPreviewImg = document.getElementById("posterPreviewImg");
const noPosterText = document.getElementById("noPosterText");
const photosUploadZone = document.getElementById("photosUploadZone");
const photosFileInput = document.getElementById("photosFileInput");
const photosPreviewGrid = document.getElementById("photosPreviewGrid");
const photoCountText = document.getElementById("photoCountText");
const btnSaveMedia = document.getElementById("btnSaveMedia");
const uploadCloseBtn = document.getElementById("uploadCloseBtn");

// State
let eventsList = [];
let registeredEventsIds = [];
let currentFilter = "all"; // "all" or "registered"
let searchQuery = "";
let currentGallerySlides = [];
let activeSlideIndex = 0;
let hasAutoOpened = false;

// Media Upload Temp State
let currentUploadingEventId = "";
let tempPoster = "";
let tempPhotos = [];
const MAX_GALLERY_PHOTOS = 8;

// Session auth variables
const adminUser = localStorage.getItem("adminUser"); // "admin"
const organizerUsername = localStorage.getItem("organizerUsername"); // Faculty ID (e.g. bbhcf040)
const organizerName = localStorage.getItem("organizerName");
const username = localStorage.getItem("username"); // Student Reg No (e.g. BCA24079)
const name = localStorage.getItem("name"); // Student name

// Initialize Page
function initializeExplore() {
  setupSessionUI();
  setupRealtimeListeners();
  setupEventListeners();
}

// Setup User navigation badge
function setupSessionUI() {
  if (adminUser === "admin") {
    // Admin
    navUserArea.innerHTML = `
      <span class="user-badge" style="border-color: var(--neon-purple); color: var(--neon-purple); box-shadow: 0 0 10px rgba(188, 19, 254, 0.2);">Admin System</span>
      <button class="btn-logout" id="btnLogout">Logout</button>
    `;
  } else if (organizerUsername && organizerName) {
    // Organizer
    navUserArea.innerHTML = `
      <span class="user-badge" style="border-color: var(--neon-green); color: var(--neon-green); box-shadow: 0 0 10px rgba(57, 255, 20, 0.2);">Coord: ${organizerName}</span>
      <button class="btn-logout" id="btnLogout">Logout</button>
    `;
  } else if (username && name) {
    // Student
    navUserArea.innerHTML = `
      <span class="user-badge">${name} (${username})</span>
      <button class="btn-logout" id="btnLogout">Logout</button>
    `;
    loadStudentRegisteredEvents();

    // Add "My Registrations" tab dynamically
    const filterToggles = document.getElementById("filterToggles");
    if (filterToggles && !document.getElementById("btnMyEvents")) {
      filterToggles.innerHTML += `
        <button class="tab-btn" id="btnMyEvents">My Registrations</button>
      `;
    }
  } else {
    // Guest
    navUserArea.innerHTML = `
      <a href="login.html" class="cyber-btn" style="padding: 6px 20px; font-size: 0.85rem;">Login</a>
    `;
  }

  // Logout listener
  const btnLogout = document.getElementById("btnLogout");
  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      localStorage.clear();
      window.location.href = "login.html";
    });
  }
}

// Fetch user registrations if student
async function loadStudentRegisteredEvents() {
  if (!username) return;
  try {
    const studentRef = doc(db, "students", username);
    const studentSnap = await getDoc(studentRef);
    if (studentSnap.exists()) {
      const data = studentSnap.data();
      registeredEventsIds = data.registeredEvents || [];
      renderEvents();
    }
  } catch (error) {
    console.error("Error loading student database:", error);
  }
}

// Setup Firestore real-time listener to get database updates instantly
function setupRealtimeListeners() {
  onSnapshot(collection(db, "events"), (snapshot) => {
    eventsList = [];
    snapshot.forEach((docSnap) => {
      eventsList.push(docSnap.data());
    });
    renderEvents();

    // Auto-open modal based on URL query parameter on first load
    if (!hasAutoOpened) {
      const urlParams = new URLSearchParams(window.location.search);
      const eventId = urlParams.get('event');
      if (eventId) {
        hasAutoOpened = true;
        const ev = eventsList.find(e => e.id === eventId);
        if (ev) {
          // Check if user is organizer/admin for this event
          let isAuthorized = false;
          if (adminUser === "admin") {
            isAuthorized = true;
          } else if (organizerUsername && localStorage.getItem("assignedEventId") === eventId) {
            isAuthorized = true;
          }

          setTimeout(() => {
            if (isAuthorized) {
              openMediaManager(eventId);
            } else {
              openPhotos(eventId);
            }
          }, 300);
        }
      }
    }
  }, (error) => {
    console.error("Firestore loading error:", error);
    eventGrid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--neon-red); font-family: monospace;">
        [CONNECTION_ERROR] Failed to stream events. Please check database configuration.
      </div>
    `;
  });
}

// Render dynamic event cards
function renderEvents() {
  let filtered = eventsList.filter(ev => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = ev.title.toLowerCase().includes(query) || 
                          ev.description.toLowerCase().includes(query) ||
                          (ev.rules && ev.rules.toLowerCase().includes(query)) ||
                          (ev.venue && ev.venue.toLowerCase().includes(query));
    if (!matchesSearch) return false;

    if (currentFilter === "registered") {
      return registeredEventsIds.includes(ev.id);
    }
    return true;
  });

  if (filtered.length === 0) {
    eventGrid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 60px; color: var(--text-sub); font-family: monospace;">
        [SEARCH_RESULT_EMPTY] No active channels match search query.
      </div>
    `;
    return;
  }

  eventGrid.innerHTML = filtered.map(ev => {
    const isRegistered = registeredEventsIds.includes(ev.id);
    const hasResults = ev.results && (ev.results.first || ev.results.second || ev.results.third);
    
    // Check if the current user is authorized to upload media for this card
    let showMediaControl = false;
    if (adminUser === "admin") {
      showMediaControl = true;
    } else if (organizerUsername && organizerName) {
      // Find organizer assignedEventId
      const savedAssignedEventId = localStorage.getItem("assignedEventId");
      if (savedAssignedEventId === ev.id) {
        showMediaControl = true;
      }
    }

    // Poster element
    let posterHTML = `<div class="event-card-poster-fallback"><span>No Poster</span></div>`;
    if (ev.poster) {
      posterHTML = `<img src="${ev.poster}" class="event-card-poster" alt="${ev.title} poster">`;
    }

    let resultHTML = "";
    if (hasResults) {
      resultHTML = `
        <div class="winner-card-banner">
          <div style="font-weight: 700; color: var(--neon-purple); border-bottom: 1px solid rgba(188, 19, 254, 0.2); padding-bottom: 2px; margin-bottom: 6px; font-size: 0.75rem;">WINNERS</div>
          ${ev.results.first ? `<div><span>🥇 1st:</span> <strong>${ev.results.first}</strong></div>` : ""}
          ${ev.results.second ? `<div><span>🥈 2nd:</span> <strong>${ev.results.second}</strong></div>` : ""}
          ${ev.results.third ? `<div><span>🥉 3rd:</span> <strong>${ev.results.third}</strong></div>` : ""}
        </div>
      `;
    }

    return `
      <div class="event-card cyber-card-scan cyber-corners" id="card-${ev.id}">
        <div>
          ${posterHTML}
          <div class="event-header">
            <h3>${ev.title}</h3>
            ${isRegistered ? `<span class="reg-badge">Registered</span>` : ""}
          </div>
          <p class="event-desc">${ev.description}</p>
        </div>
        
        <div>
          <div class="event-details">
            <div class="detail-item">📅 <strong>Date:</strong> ${ev.date || "N/A"}</div>
            <div class="detail-item">🕒 <strong>Time:</strong> ${ev.time || "N/A"}</div>
            <div class="detail-item" style="grid-column: 1/-1;">📍 <strong>Venue:</strong> ${ev.venue || "N/A"}</div>
            ${
              ev.registrationCloseDate 
                ? (() => {
                    const d = new Date();
                    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    const isClosed = todayStr > ev.registrationCloseDate;
                    return `<div class="detail-item" style="grid-column: 1/-1; color: ${isClosed ? 'var(--neon-red)' : 'var(--text-sub)'};">⏳ <strong>Reg Closes:</strong> ${ev.registrationCloseDate} ${isClosed ? '(Closed)' : ''}</div>`;
                  })()
                : ""
            }
          </div>
          
          ${resultHTML}

          <div class="event-actions" style="margin-top: 15px; display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; gap: 10px; width: 100%;">
              <button class="btn-action" style="flex: 1;" onclick="openDetails('${ev.id}')">Rules & Details</button>
              <button class="btn-action btn-success" style="flex: 1;" onclick="openPhotos('${ev.id}')">View Photos</button>
            </div>
            
            ${
              showMediaControl 
                ? `<button class="cyber-btn cyber-btn-purple" style="width: 100%; font-size: 0.8rem; padding: 8px 0;" onclick="openMediaManager('${ev.id}')">[MANAGE MEDIA]</button>`
                : ""
            }

            ${
              (() => {
                const d = new Date();
                const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                const isClosed = ev.registrationCloseDate && todayStr > ev.registrationCloseDate;
                
                if (isClosed) {
                  return `<button class="btn-action" style="width: 100%; opacity: 0.5; cursor: not-allowed; background: #374151; border-color: #374151; color: #9ca3af;" disabled>Registration Closed</button>`;
                }
                
                return username 
                  ? (isRegistered 
                      ? `<button class="btn-action btn-danger" style="width: 100%;" onclick="unregisterEvent('${ev.id}')">Leave Event</button>`
                      : `<button class="btn-action btn-success" style="width: 100%;" onclick="registerEvent('${ev.id}')">Register for Event</button>`)
                  : "";
              })()
            }
          </div>
        </div>
      </div>
    `;
  }).join("");
}

// Global functions exposed to window
window.openDetails = function(eventId) {
  const ev = eventsList.find(e => e.id === eventId);
  if (!ev) return;

  const d = new Date();
  const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const isClosed = ev.registrationCloseDate && todayStr > ev.registrationCloseDate;
  const regCloseText = ev.registrationCloseDate 
    ? `${ev.registrationCloseDate} ${isClosed ? '(Closed)' : ''}` 
    : "N/A";

  modalTitle.innerText = ev.title;
  let modalHTML = `
    <p><strong>Description:</strong> ${ev.description}</p>
    <div class="event-details" style="margin: 20px 0; grid-template-columns: 1fr 1fr; display: grid; gap: 10px;">
      <div>📅 <strong>Date:</strong> ${ev.date || "N/A"}</div>
      <div>🕒 <strong>Time:</strong> ${ev.time || "N/A"}</div>
      <div style="grid-column: 1/-1;">📍 <strong>Venue:</strong> ${ev.venue || "N/A"}</div>
      <div style="grid-column: 1/-1;">👤 <strong>Coordinator:</strong> ${ev.coordinator || "N/A"}</div>
      <div style="grid-column: 1/-1; color: ${isClosed ? 'var(--neon-red)' : 'inherit'};">⏳ <strong>Registration Close Date:</strong> ${regCloseText}</div>
    </div>
    <h4>Rules & Guidelines</h4>
    <pre>${ev.rules || "No rules specified for this event."}</pre>
  `;

  if (ev.results && (ev.results.first || ev.results.second || ev.results.third)) {
    modalHTML += `
      <h4>Event Winners</h4>
      <div class="winner-card-banner" style="font-size: 0.9rem; padding: 15px; margin-top: 10px;">
        ${ev.results.first ? `<div style="margin-bottom: 8px;">🥇 <strong>First Place:</strong> ${ev.results.first}</div>` : ""}
        ${ev.results.second ? `<div style="margin-bottom: 8px;">🥈 <strong>Second Place:</strong> ${ev.results.second}</div>` : ""}
        ${ev.results.third ? `<div>🥉 <strong>Third Place:</strong> ${ev.results.third}</div>` : ""}
      </div>
    `;
  }

  modalBody.innerHTML = modalHTML;
  detailModal.classList.add("active");
};

// Student registration action
window.registerEvent = async function(eventId) {
  if (!username) return;

  const ev = eventsList.find(e => e.id === eventId);
  if (ev && ev.registrationCloseDate) {
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (todayStr > ev.registrationCloseDate) {
      alert("Registration is closed for this event.");
      return;
    }
  }

  const registerBtn = document.querySelector(`#card-${eventId} .btn-success`);
  if (registerBtn) {
    registerBtn.disabled = true;
    registerBtn.innerText = "Registering...";
  }

  try {
    const studentRef = doc(db, "students", username);
    await updateDoc(studentRef, {
      registeredEvents: arrayUnion(eventId)
    });
    registeredEventsIds.push(eventId);
    renderEvents();
  } catch (error) {
    console.error("Firestore register error:", error);
    alert("Fail to write registration. Please try again.");
    renderEvents();
  }
};

// Student leave action
window.unregisterEvent = async function(eventId) {
  if (!username) return;
  if (!confirm("Confirm unregistration?")) return;

  const leaveBtn = document.querySelector(`#card-${eventId} .btn-danger`);
  if (leaveBtn) {
    leaveBtn.disabled = true;
    leaveBtn.innerText = "Leaving...";
  }

  try {
    const studentRef = doc(db, "students", username);
    await updateDoc(studentRef, {
      registeredEvents: arrayRemove(eventId)
    });
    registeredEventsIds = registeredEventsIds.filter(id => id !== eventId);
    renderEvents();
  } catch (error) {
    console.error("Firestore unregister error:", error);
    alert("Fail to cancel registration. Please try again.");
    renderEvents();
  }
};

// GALLERY SLIDESHOW CAROUSEL OPEN
window.openPhotos = function(eventId) {
  const ev = eventsList.find(e => e.id === eventId);
  if (!ev) return;

  galleryTitle.innerText = `${ev.title} Gallery`;
  currentGallerySlides = ev.photos || [];
  activeSlideIndex = 0;

  renderSlideshow();
  galleryModal.classList.add("active");
};

function renderSlideshow() {
  if (currentGallerySlides.length === 0) {
    carouselViewport.innerHTML = `<div class="empty-gallery-msg">[NO PHOTO DATA REGISTERED IN FIRESTORE NODES]</div>`;
    carouselDots.innerHTML = "";
    return;
  }

  // Generate slides HTML
  let slidesHTML = currentGallerySlides.map((p, idx) => {
    const activeClass = idx === 0 ? "active" : "";
    return `
      <div class="carousel-slide ${activeClass}" data-slide-index="${idx}">
        <img src="${p}" alt="Event gallery image">
      </div>
    `;
  }).join("");

  // Add arrows
  slidesHTML += `
    <button class="carousel-btn prev" id="carouselPrevBtn">&lt;</button>
    <button class="carousel-btn next" id="carouselNextBtn">&gt;</button>
  `;

  carouselViewport.innerHTML = slidesHTML;

  // Dots
  carouselDots.innerHTML = currentGallerySlides.map((_, idx) => {
    const activeClass = idx === 0 ? "active" : "";
    return `<div class="carousel-dot ${activeClass}" data-dot-index="${idx}"></div>`;
  }).join("");

  // Set listeners
  document.getElementById("carouselPrevBtn").addEventListener("click", () => navigateSlides(-1));
  document.getElementById("carouselNextBtn").addEventListener("click", () => navigateSlides(1));

  const dots = document.querySelectorAll(".carousel-dot");
  dots.forEach(dot => {
    dot.addEventListener("click", (e) => {
      const targetIndex = parseInt(e.target.getAttribute("data-dot-index"));
      jumpToSlide(targetIndex);
    });
  });
}

function navigateSlides(direction) {
  if (currentGallerySlides.length <= 1) return;
  
  let nextIndex = activeSlideIndex + direction;
  if (nextIndex >= currentGallerySlides.length) {
    nextIndex = 0;
  } else if (nextIndex < 0) {
    nextIndex = currentGallerySlides.length - 1;
  }
  jumpToSlide(nextIndex);
}

function jumpToSlide(index) {
  activeSlideIndex = index;
  
  const slides = document.querySelectorAll(".carousel-slide");
  const dots = document.querySelectorAll(".carousel-dot");

  slides.forEach((slide, idx) => {
    if (idx === index) {
      slide.classList.add("active");
    } else {
      slide.classList.remove("active");
    }
  });

  dots.forEach((dot, idx) => {
    if (idx === index) {
      dot.classList.add("active");
    } else {
      dot.classList.remove("active");
    }
  });
}

// MEDIA MANAGEMENT & FILE UPLOAD
window.openMediaManager = function(eventId) {
  const ev = eventsList.find(e => e.id === eventId);
  if (!ev) return;

  currentUploadingEventId = eventId;
  uploadTitle.innerText = `Manage Media: ${ev.title}`;
  uploadEventIdText.innerText = eventId;

  // Fill temp state from database
  tempPoster = ev.poster || "";
  tempPhotos = ev.photos ? [...ev.photos] : [];

  updateUploadModalPreviews();
  uploadModal.classList.add("active");
};

function updateUploadModalPreviews() {
  // Update poster preview
  if (tempPoster) {
    posterPreviewImg.src = tempPoster;
    posterPreviewImg.style.display = "inline-block";
    noPosterText.style.display = "none";
  } else {
    posterPreviewImg.src = "";
    posterPreviewImg.style.display = "none";
    noPosterText.style.display = "block";
  }

  // Update photo gallery previews
  photoCountText.innerText = tempPhotos.length;
  
  if (tempPhotos.length === 0) {
    photosPreviewGrid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; color: var(--text-sub); font-size: 0.8rem; font-family: monospace; padding: 15px;">
        [No photos queued]
      </div>
    `;
  } else {
    photosPreviewGrid.innerHTML = tempPhotos.map((p, idx) => {
      return `
        <div class="media-preview-item">
          <img src="${p}" alt="Queued photo">
          <button class="media-preview-delete" onclick="deleteQueuedPhoto(${idx})">&times;</button>
        </div>
      `;
    }).join("");
  }
}

// Delete queued photo in temp state
window.deleteQueuedPhoto = function(index) {
  tempPhotos.splice(index, 1);
  updateUploadModalPreviews();
};

// Client-side image compressor using HTML5 canvas
function compressImage(file, callback) {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = function(event) {
    const img = new Image();
    img.src = event.target.result;
    img.onload = function() {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      // Restrict maximum resolution size to 800px (standard cover/card sizing)
      const MAX_SIZE = 800;
      if (width > height) {
        if (width > MAX_SIZE) {
          height = Math.round((height * MAX_SIZE) / width);
          width = MAX_SIZE;
        }
      } else {
        if (height > MAX_SIZE) {
          width = Math.round((width * MAX_SIZE) / height);
          height = MAX_SIZE;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      // Export as compressed JPEG format string
      const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.7);
      callback(compressedDataUrl);
    };
  };
}

// Trigger file inputs
function setupEventListeners() {
  // Search
  searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value;
    renderEvents();
  });

  // Filter Toggles
  const btnAllEvents = document.getElementById("btnAllEvents");
  btnAllEvents.addEventListener("click", () => {
    btnAllEvents.classList.add("active");
    const btnMyEvents = document.getElementById("btnMyEvents");
    if (btnMyEvents) btnMyEvents.classList.remove("active");
    currentFilter = "all";
    renderEvents();
  });

  // Dynamic filter clicks delegated to document
  document.addEventListener("click", (e) => {
    if (e.target && e.target.id === "btnMyEvents") {
      const btnMyEvents = document.getElementById("btnMyEvents");
      btnMyEvents.classList.add("active");
      btnAllEvents.classList.remove("active");
      currentFilter = "registered";
      renderEvents();
    }
  });

  // Modal closures
  modalCloseBtn.addEventListener("click", () => detailModal.classList.remove("active"));
  galleryCloseBtn.addEventListener("click", () => galleryModal.classList.remove("active"));
  uploadCloseBtn.addEventListener("click", () => uploadModal.classList.remove("active"));

  // Click closures on background overlay
  window.addEventListener("click", (e) => {
    if (e.target === detailModal) detailModal.classList.remove("active");
    if (e.target === galleryModal) galleryModal.classList.remove("active");
    if (e.target === uploadModal) uploadModal.classList.remove("active");
  });

  // Upload zones click routing
  posterUploadZone.addEventListener("click", () => posterFileInput.click());
  photosUploadZone.addEventListener("click", () => photosFileInput.click());

  // Input changes
  posterFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      compressImage(file, (dataUrl) => {
        tempPoster = dataUrl;
        updateUploadModalPreviews();
      });
    }
  });

  photosFileInput.addEventListener("change", (e) => {
    const files = Array.from(e.target.files);
    handlePhotosUpload(files);
  });

  // Drag over animations
  setupDragAndDrop(posterUploadZone, (files) => {
    const file = files[0];
    if (file) {
      compressImage(file, (dataUrl) => {
        tempPoster = dataUrl;
        updateUploadModalPreviews();
      });
    }
  });

  setupDragAndDrop(photosUploadZone, (files) => {
    handlePhotosUpload(files);
  });

  // Save to database
  btnSaveMedia.addEventListener("click", saveMediaToFirestore);
}

function handlePhotosUpload(files) {
  let spaceLeft = MAX_GALLERY_PHOTOS - tempPhotos.length;
  if (spaceLeft <= 0) {
    alert("Maximum limit of 8 event gallery photos reached.");
    return;
  }

  const filesToProcess = files.slice(0, spaceLeft);
  let processedCount = 0;

  filesToProcess.forEach(file => {
    compressImage(file, (dataUrl) => {
      tempPhotos.push(dataUrl);
      processedCount++;
      if (processedCount === filesToProcess.length) {
        updateUploadModalPreviews();
      }
    });
  });
}

function setupDragAndDrop(zone, onFilesDropped) {
  ['dragenter', 'dragover'].forEach(eventName => {
    zone.addEventListener(eventName, (e) => {
      e.preventDefault();
      zone.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    zone.addEventListener(eventName, (e) => {
      e.preventDefault();
      zone.classList.remove('dragover');
    }, false);
  });

  zone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
      onFilesDropped(Array.from(files));
    }
  }, false);
}

// Push compressed files to Firestore database
async function saveMediaToFirestore() {
  if (!currentUploadingEventId) return;

  btnSaveMedia.disabled = true;
  btnSaveMedia.innerText = "[WRITING TO FIRESTORE NODES...]";

  try {
    const eventRef = doc(db, "events", currentUploadingEventId);
    await updateDoc(eventRef, {
      poster: tempPoster,
      photos: tempPhotos
    });

    alert("Media synchronized successfully!");
    uploadModal.classList.remove("active");
  } catch (error) {
    console.error("Firestore media write error:", error);
    alert("Fail to write media to Firestore. Verify database rules.");
  } finally {
    btnSaveMedia.disabled = false;
    btnSaveMedia.innerText = "Sync Media To Database";
  }
}

// Start Explore portal
document.addEventListener("DOMContentLoaded", initializeExplore);
