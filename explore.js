import { db } from "./firebase-config.js?v=3.1";
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

// Video Teaser Upload DOM Elements
const btnVideoModeUrl = document.getElementById("btnVideoModeUrl");
const btnVideoModeFile = document.getElementById("btnVideoModeFile");
const videoUrlContainer = document.getElementById("videoUrlContainer");
const videoFileContainer = document.getElementById("videoFileContainer");
const eventVideoUrlInput = document.getElementById("eventVideoUrlInput");
const eventVideoFileInput = document.getElementById("eventVideoFileInput");
const videoUploadZone = document.getElementById("videoUploadZone");
const eventVideoPreviewArea = document.getElementById("eventVideoPreviewArea");
const noVideoText = document.getElementById("noVideoText");
const videoPreviewContent = document.getElementById("videoPreviewContent");
const btnRemoveVideo = document.getElementById("btnRemoveVideo");

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
let tempVideoUrl = "";
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
  loadPromosForExplore();
}

// Setup User navigation badge
function setupSessionUI() {
  if (adminUser === "admin") {
    // Admin
    navUserArea.innerHTML = `
      <span class="user-badge" style="border-color: var(--neon-purple); color: var(--neon-purple); box-shadow: 0 0 10px rgba(188, 19, 254, 0.2);">Admin System</span>
      <button class="btn-logout" id="btnLogout">Logout</button>
    `;
    const btnLogout = document.getElementById("btnLogout");
    if (btnLogout) {
      btnLogout.addEventListener("click", () => {
        localStorage.clear();
        window.location.href = "login.html";
      });
    }
  } else if (organizerUsername && organizerName) {
    // Organizer
    navUserArea.innerHTML = `
      <span class="user-badge" style="border-color: var(--neon-green); color: var(--neon-green); box-shadow: 0 0 10px rgba(57, 255, 20, 0.2);">Coord: ${organizerName}</span>
      <button class="btn-logout" id="btnLogout">Logout</button>
    `;
    const btnLogout = document.getElementById("btnLogout");
    if (btnLogout) {
      btnLogout.addEventListener("click", () => {
        localStorage.clear();
        window.location.href = "login.html";
      });
    }
  } else if (username || name) {
    // Student
    const displayName = name || username || "Student";
    const firstInitial = (displayName.charAt(0) || "S").toUpperCase();

    if (navUserArea) {
      navUserArea.innerHTML = `
        <div class="profile-pill-btn" id="btnProfilePill">
          <div class="avatar-circle-sm">${firstInitial}</div>
          <span class="profile-name-text">${displayName}</span>
        </div>
      `;
    }
    loadStudentRegisteredEvents();

    // Add "My Registrations" tab dynamically
    const filterToggles = document.getElementById("filterToggles");
    if (filterToggles && !document.getElementById("btnMyEvents")) {
      filterToggles.innerHTML += `
        <button class="tab-btn" id="btnMyEvents">My Registrations</button>
      `;
    }

    // Render Student Profile Dropdown Panel
    renderProfileDropdown();

    const btnProfilePill = document.getElementById("btnProfilePill");
    if (btnProfilePill) {
      btnProfilePill.addEventListener("click", (e) => {
        e.stopPropagation();
        const dropdown = document.getElementById("studentProfileDropdown");
        if (dropdown) {
          dropdown.classList.toggle("active");
          renderProfileEventsList();
        }
      });
    }

    document.addEventListener("click", (e) => {
      const dropdown = document.getElementById("studentProfileDropdown");
      const btn = document.getElementById("btnProfilePill");
      if (dropdown && dropdown.classList.contains("active")) {
        if (!dropdown.contains(e.target) && (!btn || !btn.contains(e.target))) {
          dropdown.classList.remove("active");
        }
      }
    });

  } else {
    // Guest
    navUserArea.innerHTML = `
      <a href="login.html" class="cyber-btn" style="padding: 6px 20px; font-size: 0.85rem;">Login</a>
    `;
  }
}

function renderProfileDropdown() {
  let existing = document.getElementById("studentProfileDropdown");
  if (!existing) {
    existing = document.createElement("div");
    existing.id = "studentProfileDropdown";
    existing.className = "student-profile-dropdown";
    document.body.appendChild(existing);
  }

  const firstInitial = (name.charAt(0) || "S").toUpperCase();
  const userClass = localStorage.getItem("userClass") || "N/A";
  const userDOB = localStorage.getItem("userDOB") || "N/A";
  const userEmail = localStorage.getItem("email") || "";

  existing.innerHTML = `
    <div class="profile-card-header">
      <span class="profile-title-text">Profile Protocol</span>
      <span class="profile-role-badge">STUDENT</span>
    </div>

    <div class="profile-user-info">
      <div class="profile-avatar-large">${firstInitial}</div>
      <div class="profile-user-name">${name}</div>
    </div>

    <div class="profile-details-grid">
      <div class="profile-field-row">
        <span class="profile-field-label">Roll Number</span>
        <span class="profile-field-val">${username}</span>
      </div>
      <div class="profile-field-row">
        <span class="profile-field-label">Course & Sec</span>
        <span class="profile-field-val">${userClass}</span>
      </div>
      <div class="profile-field-row">
        <span class="profile-field-label">Date of Birth</span>
        <span class="profile-field-val">${userDOB}</span>
      </div>
      <div class="profile-field-row" style="flex-direction: column; align-items: flex-start; gap: 4px;">
        <span class="profile-field-label">Email Address</span>
        <div style="display: flex; gap: 6px; width: 100%;">
          <input type="email" id="profileEmailInput" class="profile-email-input" value="${userEmail}">
          <button type="button" id="btnSaveProfileEmail" class="profile-email-save-btn" title="Save Email">✓</button>
        </div>
      </div>
    </div>

    <div class="profile-events-section" style="margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px;">
      <span class="profile-field-label" style="display: block; margin-bottom: 6px; color: var(--neon-cyan); font-weight: 700;">REGISTERED EVENTS</span>
      <div id="profileRegisteredEventsList" style="display: flex; flex-direction: column; gap: 6px; max-height: 140px; overflow-y: auto;">
        <div style="color: var(--text-sub); font-size: 0.8rem; font-style: italic;">Loading registered events...</div>
      </div>
    </div>

    <button type="button" class="profile-logout-btn" id="btnProfileLogout">Log Out</button>
  `;

  const btnProfileLogout = document.getElementById("btnProfileLogout");
  if (btnProfileLogout) {
    btnProfileLogout.addEventListener("click", () => {
      localStorage.clear();
      window.location.reload();
    });
  }

  const btnSaveProfileEmail = document.getElementById("btnSaveProfileEmail");
  if (btnSaveProfileEmail) {
    btnSaveProfileEmail.addEventListener("click", async () => {
      const emailInput = document.getElementById("profileEmailInput");
      const newEmail = emailInput ? emailInput.value.trim() : "";
      if (!newEmail || !newEmail.includes("@")) {
        alert("Please enter a valid email address.");
        return;
      }
      try {
        const studentRef = doc(db, "students", username);
        await updateDoc(studentRef, { email: newEmail });
        localStorage.setItem("email", newEmail);
        alert("Email address updated successfully!");
      } catch (err) {
        console.error("Error updating email:", err);
        alert("Failed to update email address.");
      }
    });
  }
}

function renderProfileEventsList() {
  const container = document.getElementById("profileRegisteredEventsList");
  if (!container) return;

  if (registeredEventsIds.length === 0) {
    container.innerHTML = `<div style="color: var(--text-sub); font-size: 0.8rem; font-style: italic;">You have not registered for any events yet.</div>`;
    return;
  }

  container.innerHTML = registeredEventsIds.map(evId => {
    const ev = eventsList.find(e => e.id === evId);
    const title = ev ? ev.title : evId;

    let promoText = "";
    if (ev && ev.roundPromotions) {
      Object.keys(ev.roundPromotions).forEach(targetRound => {
        const promo = ev.roundPromotions[targetRound];
        if (promo && promo.promotedStudents && promo.promotedStudents.includes(username)) {
          promoText = `<span style="color: #e9d5ff; font-weight: bold; font-size: 0.75rem;"> (🎉 Qualified: ${targetRound})</span>`;
        }
      });
    }

    return `
      <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,243,255,0.05); border: 1px solid rgba(0,243,255,0.2); padding: 5px 10px; border-radius: 6px; font-size: 0.8rem;">
        <span style="color: #fff; font-weight: 600;">⚡ ${title}${promoText}</span>
        <span style="color: var(--neon-cyan); font-weight: 700; font-size: 0.7rem;">REGISTERED</span>
      </div>
    `;
  }).join("");
}

function normalizeClassName(str) {
  if (!str) return "";
  return str.toString().trim().toUpperCase().replace(/[\.\s\(\)]+/g, " ");
}

function isRestrictedClassStudent(studentClass) {
  if (!studentClass) return false;
  const cls = studentClass.toString().trim().toUpperCase();
  const isBComOrBBA = /B\.?\s*COM|BCOM|BBA/i.test(cls);
  const isBCA = /BCA/i.test(cls);
  return isBComOrBBA && !isBCA;
}

function isVideographyEvent(ev) {
  if (!ev) return false;
  const title = (ev.title || "").toLowerCase();
  const id = (ev.id || "").toLowerCase();
  return title.includes("videography") || id.includes("videography") || title.includes("video") || id.includes("video");
}

function getClassRegistrationLimit(ev, studentClass) {
  if (!ev || !studentClass) return null;
  const normStudentClass = normalizeClassName(studentClass);

  if (ev.classLimits && typeof ev.classLimits === "object") {
    const keys = Object.keys(ev.classLimits);
    const matchedKey = keys.find(k => normalizeClassName(k) === normStudentClass);
    if (matchedKey && ev.classLimits[matchedKey] !== undefined) {
      const limit = parseInt(ev.classLimits[matchedKey]);
      if (!isNaN(limit) && limit >= 0) return limit;
    }
  }

  if (ev.maxPerClass !== undefined && ev.maxPerClass !== null) {
    const globalLimit = parseInt(ev.maxPerClass);
    if (!isNaN(globalLimit) && globalLimit > 0) return globalLimit;
  }

  return null;
}

// Fetch user registrations if student
async function loadStudentRegisteredEvents() {
  if (!studentUsername) return;
  try {
    const studentRef = doc(db, "students", studentUsername);
    const studentSnap = await getDoc(studentRef);
    if (studentSnap.exists()) {
      const data = studentSnap.data();
      registeredEventsIds = data.registeredEvents || [];
      if (data.email) localStorage.setItem("email", data.email);
      if (data.name) localStorage.setItem("name", data.name);
      if (data.class) {
        localStorage.setItem("userClass", data.class);
        localStorage.setItem("studentClass", data.class);
      }
      if (data.dob) localStorage.setItem("userDOB", data.dob);
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

function parseToYYYYMMDD(dStr) {
  if (!dStr) return null;
  let s = dStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
    const parts = s.split('-');
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return null;
}

function isRegistrationClosed(ev) {
  if (!ev || !ev.registrationCloseDate) return false;
  
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  const regCloseNorm = parseToYYYYMMDD(ev.registrationCloseDate);
  if (regCloseNorm && todayStr >= regCloseNorm) {
    return true; // Closed at 12:00 AM Midnight of registrationCloseDate
  }

  return false;
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
    const isStarted = ev.status === "started";
    const hasResults = ev.resultsApproved && ev.results && (ev.results.first || ev.results.second || ev.results.third);
    const isClosed = isRegistrationClosed(ev);
    
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

    let promotionBadgeHTML = "";
    if (studentUsername && ev.roundPromotions) {
      Object.keys(ev.roundPromotions).forEach(targetRound => {
        const promo = ev.roundPromotions[targetRound];
        if (promo && promo.promotedStudents && promo.promotedStudents.includes(studentUsername)) {
          promotionBadgeHTML += `<span class="reg-badge" style="background: rgba(168, 85, 247, 0.25); border: 1px solid var(--neon-purple); color: #e9d5ff; font-weight: bold; box-shadow: 0 0 10px rgba(168, 85, 247, 0.5);">🎉 QUALIFIED: ${targetRound}</span>`;
        }
      });
    }

    return `
      <div class="event-card cyber-card-scan cyber-corners" id="card-${ev.id}">
        <div>
          ${posterHTML}
          <div class="event-header">
            <h3>${ev.title}</h3>
            <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
              ${isRegistered ? `<span class="reg-badge">Registered</span>` : ""}
              ${promotionBadgeHTML}
              ${isStarted ? `<span class="reg-badge" style="background: rgba(34, 197, 94, 0.2); border: 1px solid var(--neon-green); color: var(--neon-green); box-shadow: 0 0 8px var(--neon-green); text-shadow: 0 0 5px var(--neon-green);">LIVE</span>` : ""}
            </div>
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
                ? `<div class="detail-item" style="grid-column: 1/-1; color: ${isClosed ? 'var(--neon-red)' : 'var(--text-sub)'};">⏳ <strong>Reg Closes:</strong> 12 AM Midnight (${ev.registrationCloseDate}) ${isClosed ? '🔴 (Closed)' : '🟢 (OPEN)'}</div>`
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

            ${(() => {
              const currentStudentClass = localStorage.getItem("studentClass") || localStorage.getItem("userClass") || "";
              const isRestrictedStudent = isRestrictedClassStudent(currentStudentClass);
              const isVideoEv = isVideographyEvent(ev);

              if (isClosed) {
                return `<button class="btn-action" style="width: 100%; opacity: 0.5; cursor: not-allowed; background: #374151; border-color: #374151; color: #9ca3af;" disabled>Registration Closed</button>`;
              }
              if (username) {
                if (isRegistered) {
                  return `<button class="btn-action btn-danger" style="width: 100%; opacity: 0.6; cursor: not-allowed;" disabled>Leave Event</button>
                          <p style="color: var(--text-sub); font-size: 0.75rem; margin-top: 4px; text-align: center;">Once registered, you cannot leave this event without organizer permission.</p>`;
                }
                if (isRestrictedStudent && !isVideoEv) {
                  return `<button class="btn-action" style="width: 100%; opacity: 0.65; cursor: not-allowed; background: rgba(239, 68, 68, 0.15); border: 1px solid var(--neon-red); color: #fca5a5;" disabled>Restricted to BCA (View Only)</button>
                          <p style="color: var(--neon-red); font-size: 0.72rem; margin-top: 4px; text-align: center;">B.Com & BBA students are eligible for Videography only.</p>`;
                }
                return `<button class="btn-action btn-success" style="width: 100%;" onclick="registerEvent('${ev.id}')">Register for Event</button>`;
              }
              return "";
            })()}
          </div>
        </div>
      </div>
    `;
  }).join("");
}

// Global functions exposed to window
window.openDetails = function(eventId) {
  try {
    const ev = eventsList.find(e => e.id === eventId);
    if (!ev) return;

    const isClosed = isRegistrationClosed(ev);
    const regCloseText = ev.registrationCloseDate 
      ? `12:00 AM Midnight (${ev.registrationCloseDate}) ${isClosed ? '🔴 (Closed)' : '🟢 (OPEN)'}`
      : "No closing date set (Open)";

    if (modalTitle) modalTitle.innerText = ev.title;
    let studentCoordinatorsHTML = "";
    if (ev.studentCoordinators && ev.studentCoordinators.length > 0) {
      const scList = ev.studentCoordinators.map(sc => `<strong>${sc.name}</strong> (${sc.studentClass} - 📞 ${sc.phone})`).join(", ");
      studentCoordinatorsHTML = `<div style="grid-column: 1/-1;">🎓 <strong>Student Coordinators:</strong> ${scList}</div>`;
    }

    let qualificationNoticeHTML = "";
    if (studentUsername && ev.roundPromotions) {
      Object.keys(ev.roundPromotions).forEach(targetRound => {
        const promo = ev.roundPromotions[targetRound];
        if (promo && promo.promotedStudents && promo.promotedStudents.includes(studentUsername)) {
          qualificationNoticeHTML += `
            <div style="background: rgba(168, 85, 247, 0.15); border: 1px solid var(--neon-purple); border-radius: 8px; padding: 12px 16px; margin-bottom: 15px; color: #e9d5ff;">
              🎉 <strong>CONGRATULATIONS!</strong> You have qualified and been promoted to <strong>${targetRound}</strong> (from ${promo.fromRound})! Please report to ${ev.venue || 'the event venue'} on time.
            </div>
          `;
        }
      });
    }

    let roundsHTML = "";
    const rawRounds = Array.isArray(ev.rounds) 
      ? ev.rounds 
      : (ev.rounds && typeof ev.rounds === "object" ? Object.values(ev.rounds) : []);

    if (rawRounds && rawRounds.length > 0) {
      roundsHTML = `
        <h4 style="color: var(--neon-cyan); margin-top: 20px; font-family: 'Orbitron', sans-serif; display: flex; align-items: center; gap: 8px;">
          🎯 Event Progression & Rounds
        </h4>
        <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px;">
          ${rawRounds.map((rd, idx) => {
            let statusBadgeColor = "var(--neon-cyan)";
            let statusBg = "rgba(0, 243, 255, 0.1)";

            if (rd.status === "In Progress") {
              statusBadgeColor = "#38bdf8";
              statusBg = "rgba(56, 189, 248, 0.2)";
            } else if (rd.status === "Completed") {
              statusBadgeColor = "#4ade80";
              statusBg = "rgba(74, 222, 128, 0.2)";
            } else if (rd.status === "Upcoming") {
              statusBadgeColor = "#fbbf24";
              statusBg = "rgba(251, 191, 36, 0.2)";
            }

            return `
              <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 10px; padding: 12px 14px; display: flex; flex-direction: column; gap: 6px;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="background: var(--neon-cyan); color: #000; font-weight: 800; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px;">R${idx + 1}</span>
                    <strong style="color: #fff; font-size: 0.95rem;">${rd.name || 'Round ' + (idx + 1)}</strong>
                  </div>
                  <span style="font-size: 0.72rem; font-weight: bold; color: ${statusBadgeColor}; background: ${statusBg}; border: 1px solid ${statusBadgeColor}; padding: 2px 8px; border-radius: 12px;">${rd.status || 'Upcoming'}</span>
                </div>
                <div style="font-size: 0.8rem; color: var(--text-sub); display: flex; gap: 15px; flex-wrap: wrap;">
                  ${rd.venue ? `<span>📍 ${rd.venue}</span>` : ''}
                  ${rd.time ? `<span>⏰ ${rd.time}</span>` : ''}
                </div>
                ${rd.desc ? `<div style="font-size: 0.82rem; color: #cbd5e1; background: rgba(0,0,0,0.3); padding: 8px 10px; border-radius: 6px; border-left: 2px solid var(--neon-cyan); margin-top: 4px;">${rd.desc}</div>` : ''}
              </div>
            `;
          }).join("")}
        </div>
      `;
    }

    let modalHTML = `
      ${qualificationNoticeHTML}
      <p><strong>Description:</strong> ${ev.description || 'No description available.'}</p>
      <div class="event-details" style="margin: 20px 0; grid-template-columns: 1fr 1fr; display: grid; gap: 10px;">
        <div>📅 <strong>Date:</strong> ${ev.date || "N/A"}</div>
        <div>🕒 <strong>Time:</strong> ${ev.time || "N/A"}</div>
        <div style="grid-column: 1/-1;">📍 <strong>Venue:</strong> ${ev.venue || "N/A"}</div>
        <div style="grid-column: 1/-1;">👤 <strong>Faculty Coordinator:</strong> ${ev.coordinator || "N/A"}</div>
        ${studentCoordinatorsHTML}
        <div style="grid-column: 1/-1; color: ${isClosed ? 'var(--neon-red)' : 'inherit'};">⏳ <strong>Registration Close Date:</strong> ${regCloseText}</div>
      </div>
      ${roundsHTML}
      <h4 style="margin-top: 20px; color: var(--neon-purple); font-family: 'Orbitron', sans-serif;">📋 Rules & Guidelines</h4>
      <pre style="white-space: pre-wrap; font-family: inherit; line-height: 1.6; color: #e2e8f0; background: rgba(0,0,0,0.4); padding: 14px; border-radius: 8px; border-left: 3px solid var(--neon-cyan); margin-top: 8px; font-size: 0.88rem;">${ev.rules || "No rules specified for this event."}</pre>
    `;

    if (ev.resultsApproved && ev.results && (ev.results.first || ev.results.second || ev.results.third)) {
      modalHTML += `
        <h4 style="margin-top: 20px; color: var(--neon-cyan);">🏆 Event Winners</h4>
        <div class="winner-card-banner" style="font-size: 0.9rem; padding: 15px; margin-top: 10px;">
          ${ev.results.first ? `<div style="margin-bottom: 8px;">🥇 <strong>First Place:</strong> ${ev.results.first}</div>` : ""}
          ${ev.results.second ? `<div style="margin-bottom: 8px;">🥈 <strong>Second Place:</strong> ${ev.results.second}</div>` : ""}
          ${ev.results.third ? `<div>🥉 <strong>Third Place:</strong> ${ev.results.third}</div>` : ""}
        </div>
      `;
    }

    if (modalBody) modalBody.innerHTML = modalHTML;
    if (detailModal) detailModal.classList.add("active");
  } catch (err) {
    console.error("Error opening event details:", err);
  }
};
window.showEventDetails = window.openDetails;

// Student registration action
function isDuoTeamEvent(eventId) {
  if (!eventId) return false;
  const norm = eventId.toLowerCase().trim();
  return (
    norm === "coding" ||
    norm === "ungoogling" ||
    norm === "ungoogle" ||
    norm === "tech-quiz" ||
    norm === "techquiz" ||
    norm === "it-melody" ||
    norm === "itmelody" ||
    norm === "treasure-hunt" ||
    norm === "treasurehunt"
  );
}

window.registerEvent = async function(eventId) {
  if (!username) return;

  const ev = eventsList.find(e => e.id === eventId);
  if (ev && isRegistrationClosed(ev)) {
    alert("Registration for this event closed at 12:00 AM Midnight.");
    return;
  }

  const currentStudentClass = localStorage.getItem("studentClass") || localStorage.getItem("userClass") || "";
  if (isRestrictedClassStudent(currentStudentClass) && !isVideographyEvent(ev)) {
    alert(`Registration Restriction:\n\nStudents from ${currentStudentClass || "B.Com / BBA"} are eligible to register for the Videography event only.\n\nYou may view rules, guidelines, and photos for all other events.`);
    return;
  }

  // Special Handling for Gaming Event
  if (eventId === "gaming") {
    openGamingTeamRegistrationModal(ev);
    return;
  }

  // Special Handling for Duo 2-Member Team Events
  if (isDuoTeamEvent(eventId)) {
    openDuoTeamRegistrationModal(ev);
    return;
  }

  const registerBtn = document.querySelector(`#card-${eventId} .btn-success`);
  if (registerBtn) {
    registerBtn.disabled = true;
    registerBtn.innerText = "Registering...";
  }

  // Check Class Registration Limit
  if (ev && currentStudentClass) {
    const classLimit = getClassRegistrationLimit(ev, currentStudentClass);
    if (classLimit !== null && classLimit > 0) {
      try {
        const q = query(collection(db, "students"), where("registeredEvents", "array-contains", eventId));
        const querySnap = await getDocs(q);
        
        const normClass = normalizeClassName(currentStudentClass);
        let currentClassCount = 0;
        querySnap.forEach(docSnap => {
          const st = docSnap.data();
          if (st.class && normalizeClassName(st.class) === normClass) {
            currentClassCount++;
          }
        });

        if (currentClassCount >= classLimit) {
          alert(`Class Registration Limit Reached!\n\nEvent "${ev.title}" allows a maximum of ${classLimit} student(s) from class "${currentStudentClass}".\n\nCurrently, ${currentClassCount} student(s) from your class section have already registered.`);
          if (registerBtn) {
            registerBtn.disabled = false;
            registerBtn.innerText = "Register for Event";
          }
          return;
        }
      } catch (err) {
        console.error("Error verifying class limits:", err);
      }
    }
  }

  try {
    const studentRef = doc(db, "students", username);
    await updateDoc(studentRef, {
      registeredEvents: arrayUnion(eventId)
    });
    registeredEventsIds.push(eventId);
    renderEvents();
    
    // Dispatch confirmation email
    if (ev) {
      sendRegistrationEmail(ev);
    }
  } catch (error) {
    console.error("Firestore register error:", error);
    alert("Fail to write registration. Please try again.");
    renderEvents();
  }
};

function openGamingTeamRegistrationModal(ev) {
  const modal = document.getElementById("gamingTeamModal");
  const modalClose = document.getElementById("gamingTeamModalCloseBtn");
  const form = document.getElementById("gamingTeamForm");
  const leaderNameDisplay = document.getElementById("gamingLeaderNameDisplay");
  const leaderEmailDisplay = document.getElementById("gamingLeaderEmailDisplay");

  if (!modal || !form) return;

  const studentName = localStorage.getItem("name") || username;
  const studentEmail = localStorage.getItem("email") || "No email stored";
  const currentStudentClass = localStorage.getItem("studentClass") || localStorage.getItem("userClass") || "";

  if (leaderNameDisplay) leaderNameDisplay.innerText = studentName;
  if (leaderEmailDisplay) leaderEmailDisplay.innerText = studentEmail;

  if (modalClose && !modalClose.dataset.bound) {
    modalClose.dataset.bound = "true";
    modalClose.addEventListener("click", () => modal.classList.remove("active"));
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.remove("active");
    });
  }

  form.onsubmit = async (e) => {
    e.preventDefault();

    const selectedRadio = form.querySelector("input[name='gameVariant']:checked");
    if (!selectedRadio) {
      alert("Please select a game: Free Fire or BGMI.");
      return;
    }

    const gameVariant = selectedRadio.value;
    const teamName = document.getElementById("gamingTeamName").value.trim();
    const member2 = document.getElementById("gamingMember2").value.trim();
    const member3 = document.getElementById("gamingMember3").value.trim();
    const member4 = document.getElementById("gamingMember4").value.trim();

    if (!teamName || !member2 || !member3 || !member4) {
      alert("Please provide the Team Name and all 4 Squad Members' full names.");
      return;
    }

    const submitBtn = document.getElementById("btnSubmitGamingTeam");
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerText = "Registering Squad...";
    }

    // Check Class Limit for Gaming Teams
    const classLimit = getClassRegistrationLimit(ev, currentStudentClass);
    if (classLimit !== null && classLimit > 0) {
      try {
        const q = query(collection(db, "students"), where("registeredEvents", "array-contains", "gaming"));
        const querySnap = await getDocs(q);
        
        const normClass = normalizeClassName(currentStudentClass);
        let currentClassTeamCount = 0;
        querySnap.forEach(docSnap => {
          const st = docSnap.data();
          if (st.class && normalizeClassName(st.class) === normClass) {
            currentClassTeamCount++;
          }
        });

        if (currentClassTeamCount >= classLimit) {
          alert(`Class Registration Limit Reached!\n\nYour class (${currentStudentClass}) has already registered ${currentClassTeamCount} team(s) for Gaming.\n\nMaximum allowed teams per class is ${classLimit}.`);
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = "SUBMIT GAMING SQUAD REGISTRATION";
          }
          return;
        }
      } catch (err) {
        console.error("Error checking class team limit:", err);
      }
    }

    const squadMembers = [studentName, member2, member3, member4];

    try {
      // 1. Save team in gamingTeams collection
      const teamRef = doc(db, "gamingTeams", username);
      await setDoc(teamRef, {
        eventId: "gaming",
        gameVariant: gameVariant,
        teamName: teamName,
        leaderUsername: username,
        leaderName: studentName,
        leaderEmail: studentEmail,
        studentClass: currentStudentClass,
        members: squadMembers,
        registeredAt: new Date().toISOString()
      });

      // 2. Update student document registeredEvents & gamingTeam details
      const studentRef = doc(db, "students", username);
      await updateDoc(studentRef, {
        registeredEvents: arrayUnion("gaming"),
        gamingTeam: {
          teamName: teamName,
          gameVariant: gameVariant,
          members: squadMembers
        }
      });

      registeredEventsIds.push("gaming");
      renderEvents();

      // 3. Dispatch confirmation email to Team Leader
      sendGamingTeamEmail(ev, gameVariant, teamName, squadMembers);

      modal.classList.remove("active");
      alert(`🎉 Squad Registered Successfully!\n\nTeam: ${teamName}\nGame: ${gameVariant}\nLeader: ${studentName}\n\nA confirmation email has been dispatched to ${studentEmail}.`);
    } catch (err) {
      console.error("Error registering gaming squad:", err);
      alert("Failed to register squad. Please try again.");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerText = "SUBMIT GAMING SQUAD REGISTRATION";
      }
    }
  };

  modal.classList.add("active");
}

async function sendGamingTeamEmail(ev, gameVariant, teamName, members) {
  const email = localStorage.getItem("email");
  const leaderName = localStorage.getItem("name") || username;
  if (!email) return;

  const subject = `🎮 Gaming Squad Registration Confirmed: ${teamName} (${gameVariant}) - Tech Manthan 6.0`;
  const membersListHTML = members.map((m, idx) => `
    <li style="margin-bottom: 4px;">
      <strong>Member ${idx + 1}:</strong> ${m} ${idx === 0 ? '<span style="color: #06b6d4; font-size: 0.8rem; font-weight: bold;">(Team Leader)</span>' : ''}
    </li>
  `).join("");

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #0f172a; padding: 25px; text-align: center; border-bottom: 3px solid #06b6d4;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 0.5px;">TECH MANTHAN 6.0</h1>
        <p style="color: #06b6d4; margin: 5px 0 0 0; font-size: 14px; font-weight: bold; text-transform: uppercase;">Dr. B.B Hegde First Grade College, Kundapura</p>
      </div>
      
      <div style="padding: 30px; color: #334155; line-height: 1.6;">
        <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">🎮 Gaming Squad Registration Confirmed!</h2>
        <p>Dear <strong>${leaderName}</strong>,</p>
        <p>Your squad <strong>"${teamName}"</strong> has been successfully registered for the <strong>Gaming (${gameVariant})</strong> event at Tech Manthan 6.0!</p>
        
        <div style="margin: 25px 0; padding: 20px; background-color: #f8fafc; border-left: 4px solid #06b6d4; border-radius: 4px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; width: 140px; font-weight: bold; color: #475569;">🛡️ Team Name:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: bold;">${teamName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #475569;">🎯 Selected Game:</td>
              <td style="padding: 6px 0; color: #06b6d4; font-weight: bold; font-size: 15px;">${gameVariant}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #475569;">📅 Event Date:</td>
              <td style="padding: 6px 0; color: #0f172a;">${ev.date || "N/A"}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #475569;">🕒 Event Time:</td>
              <td style="padding: 6px 0; color: #0f172a;">${ev.time || "N/A"}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #475569;">📍 Venue:</td>
              <td style="padding: 6px 0; color: #0f172a;">${ev.venue || "N/A"}</td>
            </tr>
          </table>

          <div style="margin-top: 15px; border-top: 1px solid #cbd5e1; padding-top: 12px;">
            <strong style="color: #0f172a; display: block; margin-bottom: 6px;">👥 Squad Members (4 Members):</strong>
            <ul style="margin: 0; padding-left: 20px; color: #334155;">
              ${membersListHTML}
            </ul>
          </div>
        </div>
        
        <p style="margin-top: 25px;">Please ensure all 4 squad members report to the gaming venue on time with their college ID cards.</p>
        
        <p style="margin-bottom: 0;">Best regards,<br><strong>Tech Manthan 6.0 Gaming Committee</strong></p>
      </div>
      
      <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
        This is an automated confirmation notification. Please do not reply directly to this email.
      </div>
    </div>
  `;

  try {
    await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: email, subject, html })
    });
  } catch (err) {
    console.error("Error sending gaming squad confirmation email:", err);
  }
}

function openDuoTeamRegistrationModal(ev) {
  const modal = document.getElementById("duoTeamModal");
  const modalClose = document.getElementById("duoTeamModalCloseBtn");
  const form = document.getElementById("duoTeamForm");
  const titleDisplay = document.getElementById("duoEventTitle");
  const iconDisplay = document.getElementById("duoEventIcon");
  const leaderNameDisplay = document.getElementById("duoLeaderNameDisplay");
  const leaderEmailDisplay = document.getElementById("duoLeaderEmailDisplay");

  if (!modal || !form) return;

  const studentName = localStorage.getItem("name") || username;
  const studentEmail = localStorage.getItem("email") || "No email stored";
  const currentStudentClass = localStorage.getItem("studentClass") || localStorage.getItem("userClass") || "";

  if (titleDisplay) titleDisplay.innerText = `${(ev.title || "DUO EVENT").toUpperCase()} REGISTRATION`;
  if (leaderNameDisplay) leaderNameDisplay.innerText = studentName;
  if (leaderEmailDisplay) leaderEmailDisplay.innerText = studentEmail;

  const iconsMap = {
    coding: "💻",
    ungoogling: "🔍",
    "tech-quiz": "🧠",
    "it-melody": "🎵",
    "treasure-hunt": "🗺️"
  };
  if (iconDisplay) iconDisplay.innerText = iconsMap[ev.id] || "👥";

  if (modalClose && !modalClose.dataset.bound) {
    modalClose.dataset.bound = "true";
    modalClose.addEventListener("click", () => modal.classList.remove("active"));
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.remove("active");
    });
  }

  form.onsubmit = async (e) => {
    e.preventDefault();

    const teamName = document.getElementById("duoTeamName").value.trim();
    const member2 = document.getElementById("duoMember2").value.trim();

    if (!teamName || !member2) {
      alert("Please provide the Team Name and Teammate's Full Name.");
      return;
    }

    const submitBtn = document.getElementById("btnSubmitDuoTeam");
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerText = "Registering Duo Team...";
    }

    // Check Class Registration Limit for this event if configured by organizer
    const classLimit = getClassRegistrationLimit(ev, currentStudentClass);
    if (classLimit !== null && classLimit > 0) {
      try {
        const q = query(collection(db, "students"), where("registeredEvents", "array-contains", ev.id));
        const querySnap = await getDocs(q);
        
        const normClass = normalizeClassName(currentStudentClass);
        let currentClassCount = 0;
        querySnap.forEach(docSnap => {
          const st = docSnap.data();
          if (st.class && normalizeClassName(st.class) === normClass) {
            currentClassCount++;
          }
        });

        if (currentClassCount >= classLimit) {
          alert(`Class Registration Limit Reached!\n\nYour class (${currentStudentClass}) has already registered ${currentClassCount} team(s) for "${ev.title}".\n\nMaximum allowed teams per class is ${classLimit}.`);
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = "SUBMIT DUO TEAM REGISTRATION";
          }
          return;
        }
      } catch (err) {
        console.error("Error checking class duo limit:", err);
      }
    }

    const duoMembers = [studentName, member2];

    try {
      // 1. Save team in duoTeams collection
      const teamDocId = `${username}_${ev.id}`;
      const teamRef = doc(db, "duoTeams", teamDocId);
      await setDoc(teamRef, {
        eventId: ev.id,
        eventTitle: ev.title,
        teamName: teamName,
        leaderUsername: username,
        leaderName: studentName,
        leaderEmail: studentEmail,
        studentClass: currentStudentClass,
        members: duoMembers,
        registeredAt: new Date().toISOString()
      });

      // 2. Update student document registeredEvents & duoTeams data
      const studentRef = doc(db, "students", username);
      await updateDoc(studentRef, {
        registeredEvents: arrayUnion(ev.id),
        [`duoTeam_${ev.id}`]: {
          teamName: teamName,
          members: duoMembers
        }
      });

      registeredEventsIds.push(ev.id);
      renderEvents();

      // 3. Dispatch confirmation email to Team Leader
      sendDuoTeamEmail(ev, teamName, duoMembers);

      modal.classList.remove("active");
      alert(`🎉 Duo Team Registered Successfully!\n\nEvent: ${ev.title}\nTeam Name: ${teamName}\nLeader: ${studentName}\nTeammate: ${member2}\n\nA confirmation email has been sent to ${studentEmail}.`);
    } catch (err) {
      console.error("Error registering duo team:", err);
      alert("Failed to register duo team. Please try again.");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerText = "SUBMIT DUO TEAM REGISTRATION";
      }
    }
  };

  modal.classList.add("active");
}

async function sendDuoTeamEmail(ev, teamName, members) {
  const email = localStorage.getItem("email");
  const leaderName = localStorage.getItem("name") || username;
  if (!email) return;

  const subject = `👥 ${ev.title} Registration Confirmed: ${teamName} - Tech Manthan 6.0`;
  const membersListHTML = members.map((m, idx) => `
    <li style="margin-bottom: 4px;">
      <strong>Member ${idx + 1}:</strong> ${m} ${idx === 0 ? '<span style="color: #06b6d4; font-size: 0.8rem; font-weight: bold;">(Team Leader)</span>' : ''}
    </li>
  `).join("");

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #0f172a; padding: 25px; text-align: center; border-bottom: 3px solid #06b6d4;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 0.5px;">TECH MANTHAN 6.0</h1>
        <p style="color: #06b6d4; margin: 5px 0 0 0; font-size: 14px; font-weight: bold; text-transform: uppercase;">Dr. B.B Hegde First Grade College, Kundapura</p>
      </div>
      
      <div style="padding: 30px; color: #334155; line-height: 1.6;">
        <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">👥 ${ev.title} Registration Confirmed!</h2>
        <p>Dear <strong>${leaderName}</strong>,</p>
        <p>Your team <strong>"${teamName}"</strong> has been successfully registered for <strong>${ev.title}</strong> at Tech Manthan 6.0!</p>
        
        <div style="margin: 25px 0; padding: 20px; background-color: #f8fafc; border-left: 4px solid #06b6d4; border-radius: 4px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; width: 140px; font-weight: bold; color: #475569;">🛡️ Team Name:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: bold; font-size: 15px;">${teamName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #475569;">🎯 Event Title:</td>
              <td style="padding: 6px 0; color: #06b6d4; font-weight: bold;">${ev.title}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #475569;">📅 Event Date:</td>
              <td style="padding: 6px 0; color: #0f172a;">${ev.date || "N/A"}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #475569;">🕒 Event Time:</td>
              <td style="padding: 6px 0; color: #0f172a;">${ev.time || "N/A"}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #475569;">📍 Venue:</td>
              <td style="padding: 6px 0; color: #0f172a;">${ev.venue || "N/A"}</td>
            </tr>
          </table>

          <div style="margin-top: 15px; border-top: 1px solid #cbd5e1; padding-top: 12px;">
            <strong style="color: #0f172a; display: block; margin-bottom: 6px;">👥 Duo Team Roster (2 Members):</strong>
            <ul style="margin: 0; padding-left: 20px; color: #334155;">
              ${membersListHTML}
            </ul>
          </div>
        </div>
        
        <p style="margin-top: 25px;">Please ensure both team members report to the event venue on time with college ID cards.</p>
        
        <p style="margin-bottom: 0;">Best regards,<br><strong>Tech Manthan 6.0 Event Committee</strong></p>
      </div>
      
      <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
        This is an automated confirmation notification. Please do not reply directly to this email.
      </div>
    </div>
  `;

  try {
    await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: email, subject, html })
    });
  } catch (err) {
    console.error("Error sending duo team confirmation email:", err);
  }
}

async function sendRegistrationEmail(ev) {
  const email = localStorage.getItem("email");
  const name = localStorage.getItem("name") || "Student";
  if (!email) {
    console.log("No student email address in localStorage, skipping confirmation email.");
    return;
  }

  const subject = `Registration Confirmed: ${ev.title} - Tech Manthan 6.0`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #0f172a; padding: 25px; text-align: center; border-bottom: 3px solid #06b6d4;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 0.5px;">TECH MANTHAN 6.0</h1>
        <p style="color: #06b6d4; margin: 5px 0 0 0; font-size: 14px; font-weight: bold; text-transform: uppercase;">Dr. B.B Hegde First Grade College, Kundapura</p>
      </div>
      
      <div style="padding: 30px; color: #334155; line-height: 1.6;">
        <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">Registration Confirmed!</h2>
        <p>Dear <strong>${name}</strong>,</p>
        <p>Congratulations! You have successfully registered for the following event at Tech Manthan 6.0. Below is your event ticket detail:</p>
        
        <div style="margin: 25px 0; padding: 20px; background-color: #f8fafc; border-left: 4px solid #06b6d4; border-radius: 4px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; width: 120px; font-weight: bold; color: #475569;">🏆 Event Name:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: bold;">${ev.title}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #475569;">📅 Event Date:</td>
              <td style="padding: 6px 0; color: #0f172a;">${ev.date || "N/A"}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #475569;">🕒 Event Time:</td>
              <td style="padding: 6px 0; color: #0f172a;">${ev.time || "N/A"}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #475569;">📍 Venue:</td>
              <td style="padding: 6px 0; color: #0f172a;">${ev.venue || "N/A"}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #475569;">👤 Coordinator:</td>
              <td style="padding: 6px 0; color: #0f172a;">${ev.coordinator || "N/A"}</td>
            </tr>
          </table>
        </div>
        
        ${ev.description ? `<p><strong>Description:</strong> ${ev.description}</p>` : ""}
        
        <p style="margin-top: 25px;">Please report at the venue at least 15 minutes before the start timing. Make sure to bring your student ID and registration number: <strong>${username}</strong>.</p>
        
        <p style="margin-bottom: 0;">Best regards,<br><strong>Tech Manthan 6.0 Organizing Committee</strong></p>
      </div>
      
      <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
        This is an automated confirmation notification. Please do not reply directly to this email.
      </div>
    </div>
  `;

  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: email, subject, html })
    });
    const resData = await res.json();
    console.log("Email dispatch status:", resData);
  } catch (error) {
    console.error("Failed to dispatch registration confirmation email:", error);
  }
}

// Student leave action
window.unregisterEvent = async function(eventId) {
  alert("Self-deregistration is disabled. Only the organizers can remove you from an event.");
  return;
};

// GALLERY SLIDESHOW CAROUSEL OPEN
window.openPhotos = function(eventId) {
  const ev = eventsList.find(e => e.id === eventId);
  if (!ev) return;

  galleryTitle.innerText = `${ev.title} Media Gallery`;
  currentGallerySlides = [];

  const videoLink = ev.videoUrl || ev.video || "";
  if (videoLink) {
    currentGallerySlides.push({ type: "video", url: videoLink });
  }

  if (ev.photos && ev.photos.length > 0) {
    ev.photos.forEach(p => currentGallerySlides.push({ type: "image", url: p }));
  }

  activeSlideIndex = 0;

  renderSlideshow();
  galleryModal.classList.add("active");
};

function renderSlideshow() {
  if (currentGallerySlides.length === 0) {
    carouselViewport.innerHTML = `<div class="empty-gallery-msg">[NO PHOTO OR VIDEO DATA REGISTERED FOR THIS EVENT]</div>`;
    carouselDots.innerHTML = "";
    return;
  }

  // Generate slides HTML
  let slidesHTML = currentGallerySlides.map((item, idx) => {
    const activeClass = idx === activeSlideIndex ? "active" : "";
    let contentHTML = "";

    if (item.type === "video" || (typeof item === "string" && (item.includes("youtube.com") || item.includes("youtu.be") || item.includes("drive.google.com") || item.endsWith(".mp4") || item.startsWith("data:video")))) {
      const vUrl = item.url || item;
      const processedUrl = getEmbedMediaUrl(vUrl);
      const lowerUrl = processedUrl.toLowerCase();
      const isDirectVideoFile = lowerUrl.endsWith(".mp4") || lowerUrl.endsWith(".webm") || lowerUrl.endsWith(".mov") || vUrl.startsWith("data:video") || (lowerUrl.includes("firebasestorage.googleapis.com") && !lowerUrl.includes("drive.google.com"));

      if (isDirectVideoFile) {
        contentHTML = `<video src="${vUrl}" controls playsinline style="max-width: 100%; max-height: 75vh; border-radius: 12px; background: #000; box-shadow: 0 0 25px rgba(168, 85, 247, 0.4);"></video>`;
      } else {
        contentHTML = `<div style="width: 90%; max-width: 700px; aspect-ratio: 16 / 9; border-radius: 12px; overflow: hidden; background: #000; box-shadow: 0 0 25px rgba(168, 85, 247, 0.4);"><iframe src="${processedUrl}" style="width: 100%; height: 100%; border: none;" allowfullscreen></iframe></div>`;
      }
    } else {
      const imgUrl = item.url || item;
      contentHTML = `<img src="${imgUrl}" alt="Event gallery image">`;
    }

    return `
      <div class="carousel-slide ${activeClass}" data-slide-index="${idx}">
        ${contentHTML}
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
  const carouselPrevBtn = document.getElementById("carouselPrevBtn");
  if (carouselPrevBtn) carouselPrevBtn.addEventListener("click", () => navigateSlides(-1));

  const carouselNextBtn = document.getElementById("carouselNextBtn");
  if (carouselNextBtn) carouselNextBtn.addEventListener("click", () => navigateSlides(1));

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
  tempVideoUrl = ev.videoUrl || ev.video || "";

  if (eventVideoUrlInput) eventVideoUrlInput.value = (tempVideoUrl.startsWith("data:video") ? "" : tempVideoUrl);

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

  // Update Video Teaser Preview
  if (tempVideoUrl) {
    if (noVideoText) noVideoText.style.display = "none";
    if (videoPreviewContent) {
      videoPreviewContent.style.display = "block";
      const processedUrl = getEmbedMediaUrl(tempVideoUrl);
      const lowerUrl = processedUrl.toLowerCase();
      const isDirectVideoFile = lowerUrl.endsWith(".mp4") || lowerUrl.endsWith(".webm") || lowerUrl.endsWith(".mov") || tempVideoUrl.startsWith("data:video") || (lowerUrl.includes("firebasestorage.googleapis.com") && !lowerUrl.includes("drive.google.com"));

      if (isDirectVideoFile) {
        videoPreviewContent.innerHTML = `<video src="${tempVideoUrl}" controls style="width: 100%; max-height: 140px; border-radius: 8px; background: #000;"></video>`;
      } else {
        videoPreviewContent.innerHTML = `<iframe src="${processedUrl}" style="width: 100%; height: 140px; border-radius: 8px; border: none;" allowfullscreen></iframe>`;
      }
    }
    if (btnRemoveVideo) btnRemoveVideo.style.display = "inline-block";
  } else {
    if (noVideoText) noVideoText.style.display = "block";
    if (videoPreviewContent) {
      videoPreviewContent.style.display = "none";
      videoPreviewContent.innerHTML = "";
    }
    if (btnRemoveVideo) btnRemoveVideo.style.display = "none";
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

// Trigger file inputs & Media Manager setup
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

  // Video Mode Toggles (URL vs File Upload)
  if (btnVideoModeUrl) {
    btnVideoModeUrl.addEventListener("click", () => {
      btnVideoModeUrl.style.background = "rgba(168, 85, 247, 0.25)";
      btnVideoModeUrl.style.borderColor = "var(--neon-purple)";
      btnVideoModeUrl.style.color = "#fff";

      btnVideoModeFile.style.background = "rgba(255, 255, 255, 0.05)";
      btnVideoModeFile.style.borderColor = "#555";
      btnVideoModeFile.style.color = "#ccc";

      videoUrlContainer.style.display = "block";
      videoFileContainer.style.display = "none";
    });
  }

  if (btnVideoModeFile) {
    btnVideoModeFile.addEventListener("click", () => {
      btnVideoModeFile.style.background = "rgba(168, 85, 247, 0.25)";
      btnVideoModeFile.style.borderColor = "var(--neon-purple)";
      btnVideoModeFile.style.color = "#fff";

      btnVideoModeUrl.style.background = "rgba(255, 255, 255, 0.05)";
      btnVideoModeUrl.style.borderColor = "#555";
      btnVideoModeUrl.style.color = "#ccc";

      videoFileContainer.style.display = "block";
      videoUrlContainer.style.display = "none";
    });
  }

  if (eventVideoUrlInput) {
    eventVideoUrlInput.addEventListener("input", (e) => {
      tempVideoUrl = e.target.value.trim();
      updateUploadModalPreviews();
    });
  }

  if (videoUploadZone) {
    videoUploadZone.addEventListener("click", () => eventVideoFileInput.click());
    setupDragAndDrop(videoUploadZone, (files) => {
      const file = files[0];
      if (file && file.type.startsWith("video/")) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = function(evt) {
          tempVideoUrl = evt.target.result;
          updateUploadModalPreviews();
        };
      }
    });
  }

  if (eventVideoFileInput) {
    eventVideoFileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = function(evt) {
          tempVideoUrl = evt.target.result;
          updateUploadModalPreviews();
        };
      }
    });
  }

  if (btnRemoveVideo) {
    btnRemoveVideo.addEventListener("click", () => {
      tempVideoUrl = "";
      if (eventVideoUrlInput) eventVideoUrlInput.value = "";
      if (eventVideoFileInput) eventVideoFileInput.value = "";
      updateUploadModalPreviews();
    });
  }

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
  if (!zone) return;
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
      photos: tempPhotos,
      videoUrl: tempVideoUrl,
      video: tempVideoUrl
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

function getDirectVideoThumbnailUrl(url) {
  if (!url) return "";
  const cleaned = url.trim();

  // 1. YouTube & YouTube Shorts
  const ytMatch = cleaned.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|watch\?.+&v=))([\w-]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
  }

  // 2. Google Drive video or image file
  const gdriveMatch = cleaned.match(/drive\.google\.com\/file\/d\/([^\/]+)/i) || cleaned.match(/drive\.google\.com\/uc\?.*id=([^\&]+)/i);
  if (gdriveMatch && gdriveMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${gdriveMatch[1]}`;
  }

  return cleaned;
}

function getEmbedMediaUrl(url) {
  if (!url) return "";
  const cleaned = url.trim();

  // 1. YouTube Shorts
  const ytShorts = cleaned.match(/youtube\.com\/shorts\/([\w-]{11})/i);
  if (ytShorts && ytShorts[1]) return `https://www.youtube.com/embed/${ytShorts[1]}`;

  // 2. YouTube standard & short links
  const ytStandard = cleaned.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/i);
  if (ytStandard && ytStandard[1]) return `https://www.youtube.com/embed/${ytStandard[1]}`;

  // 3. Google Drive
  const gdrive = cleaned.match(/drive\.google\.com\/file\/d\/([^\/]+)/i);
  if (gdrive && gdrive[1]) return `https://drive.google.com/file/d/${gdrive[1]}/preview`;

  // 4. Vimeo
  const vimeo = cleaned.match(/vimeo\.com\/(\d+)/i);
  if (vimeo && vimeo[1]) return `https://player.vimeo.com/video/${vimeo[1]}`;

  return cleaned;
}

async function loadPromosForExplore() {
  const section = document.getElementById("promoGallerySection");
  const grid = document.getElementById("promoGridExplore");
  if (!section || !grid) return;

  try {
    const promoSnap = await getDocs(collection(db, "promos"));
    const promos = promoSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (promos.length === 0) {
      section.style.display = "none";
      return;
    }

    promos.sort((a, b) => (b.priority || 1) - (a.priority || 1));
    section.style.display = "block";

    grid.innerHTML = promos.map(p => {
      let mediaHTML = "";
      if (p.contentType === "video") {
        const processedUrl = getEmbedMediaUrl(p.mediaUrl);
        const lowerUrl = processedUrl.toLowerCase();
        const isDirectVideoFile = lowerUrl.endsWith(".mp4") || lowerUrl.endsWith(".webm") || lowerUrl.endsWith(".ogg") || (lowerUrl.includes("firebasestorage.googleapis.com") && !lowerUrl.includes("drive.google.com"));
        const isEmbedService = lowerUrl.includes("youtube.com") || lowerUrl.includes("drive.google.com") || lowerUrl.includes("vimeo.com") || !isDirectVideoFile;

        if (isEmbedService) {
          mediaHTML = `<div style="width: 100%; aspect-ratio: 4 / 3; border-radius: 8px; overflow: hidden; background: #000;"><iframe src="${processedUrl}" style="width: 100%; height: 100%; border: none;" allowfullscreen></iframe></div>`;
        } else {
          mediaHTML = `<div style="width: 100%; aspect-ratio: 4 / 3; border-radius: 8px; overflow: hidden; background: #000;"><video src="${p.mediaUrl}" controls playsinline style="width: 100%; height: 100%; object-fit: contain; background: #000;"></video></div>`;
        }
      } else {
        const directImg = getDirectImageUrl(p.mediaUrl);
        mediaHTML = `<div style="width: 100%; aspect-ratio: 4 / 3; border-radius: 8px; overflow: hidden; background: #000;"><img src="${directImg}" style="width: 100%; height: 100%; object-fit: cover;" alt="${p.title}"></div>`;
      }

      return `
        <div class="event-card cyber-card-scan cyber-corners" style="padding: 15px;">
          ${mediaHTML}
          <div style="margin-top: 12px;">
            <h3 style="color: #fff; font-size: 1.1rem; margin-bottom: 6px; font-family: 'Orbitron', sans-serif;">${p.title}</h3>
            <p style="color: var(--text-sub); font-size: 0.85rem; margin-bottom: 0;">${p.description || "Official promo media."}</p>
          </div>
        </div>
      `;
    }).join("");
  } catch (err) {
    console.error("Error loading promos for explore page:", err);
  }
}

// Start Explore portal
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeExplore);
} else {
  initializeExplore();
}
