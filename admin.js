import { db } from "./firebase-config.js?v=3.1";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// Session check
if (!localStorage.getItem("adminUser")) {
  window.location.href = "login.html";
}

// Navigation & Tabs
const tabBtnOverview = document.getElementById("tabBtnOverview");
const tabBtnEvents = document.getElementById("tabBtnEvents");
const tabBtnStudents = document.getElementById("tabBtnStudents");
const tabBtnOrganizers = document.getElementById("tabBtnOrganizers");
const tabBtnRegistrations = document.getElementById("tabBtnRegistrations");
const tabBtnJudges = document.getElementById("tabBtnJudges");
const tabBtnResultsApproval = document.getElementById("tabBtnResultsApproval");
const tabBtnChampionship = document.getElementById("tabBtnChampionship");
const tabBtnPromos = document.getElementById("tabBtnPromos");

const panelOverview = document.getElementById("panelOverview");
const panelEvents = document.getElementById("panelEvents");
const panelStudents = document.getElementById("panelStudents");
const panelOrganizers = document.getElementById("panelOrganizers");
const panelRegistrations = document.getElementById("panelRegistrations");
const panelJudges = document.getElementById("panelJudges");
const panelResultsApproval = document.getElementById("panelResultsApproval");
const panelChampionship = document.getElementById("panelChampionship");
const panelPromos = document.getElementById("panelPromos");

const panels = [panelOverview, panelEvents, panelStudents, panelOrganizers, panelRegistrations, panelJudges, panelResultsApproval, panelChampionship, panelPromos];
const tabButtons = [tabBtnOverview, tabBtnEvents, tabBtnStudents, tabBtnOrganizers, tabBtnRegistrations, tabBtnJudges, tabBtnResultsApproval, tabBtnChampionship, tabBtnPromos];

// Overview Stats Elements
const statTotalEvents = document.getElementById("statTotalEvents");
const statTotalStudents = document.getElementById("statTotalStudents");
const statTotalRegistrations = document.getElementById("statTotalRegistrations");
const overviewEventsTable = document.getElementById("overviewEventsTable");

// Events Form & Table Elements
const eventForm = document.getElementById("eventForm");
const eventFormMode = document.getElementById("eventFormMode");
const eventFormTitle = document.getElementById("eventFormTitle");
const eventIdInput = document.getElementById("eventId");
const eventTitleInput = document.getElementById("eventTitle");
const eventDescriptionInput = document.getElementById("eventDescription");
const eventDateInput = document.getElementById("eventDate");
const eventTimeInput = document.getElementById("eventTime");
const eventVenueInput = document.getElementById("eventVenue");
const eventCoordinatorInput = document.getElementById("eventCoordinator");
const eventRulesInput = document.getElementById("eventRules");
const btnSubmitEvent = document.getElementById("btnSubmitEvent");
const btnCancelEditEvent = document.getElementById("btnCancelEditEvent");
const eventsListTable = document.getElementById("eventsListTable");

// Students Form & Table Elements
const studentForm = document.getElementById("studentForm");
const studentRegNoInput = document.getElementById("studentRegNo");
const studentNameInput = document.getElementById("studentName");
const studentDOBInput = document.getElementById("studentDOB");
const studentsListTable = document.getElementById("studentsListTable");
const studentSearchInput = document.getElementById("studentSearchInput");

// Organizers Form & Table Elements
const organizerForm = document.getElementById("organizerForm");
const orgUsernameInput = document.getElementById("orgUsername");
const orgNameInput = document.getElementById("orgName");
const orgPasswordInput = document.getElementById("orgPassword");
const orgEventSelect = document.getElementById("orgEvent");
const organizersListTable = document.getElementById("organizersListTable");

// Registrations Filter & Table Elements
const regEventFilter = document.getElementById("regEventFilter");
const registrationsListTable = document.getElementById("registrationsListTable");
const btnPrintRegistrations = document.getElementById("btnPrintRegistrations");
const printEventTitle = document.getElementById("printEventTitle");

// Judges Elements
const judgesEventsTableBody = document.getElementById("judgesEventsTableBody");
const judgingModal = document.getElementById("judgingModal");
const judgingModalCloseBtn = document.getElementById("judgingModalCloseBtn");
const judgingForm = document.getElementById("judgingForm");
const judgingEventIdInput = document.getElementById("judgingEventId");
const judgingEventTitleInput = document.getElementById("judgingEventTitle");
const judgingAllottedJudgesInput = document.getElementById("judgingAllottedJudges");
const judgingCriteriaInput = document.getElementById("judgingCriteria");

// Championship Elements
const championshipTableBody = document.getElementById("championshipTableBody");
const btnPublishChampionship = document.getElementById("btnPublishChampionship");
const btnUnpublishChampionship = document.getElementById("btnUnpublishChampionship");
const champStatusLabel = document.getElementById("champStatusLabel");
const champPublishedDetails = document.getElementById("champPublishedDetails");
const pubChampionClass = document.getElementById("pubChampionClass");
const pubRunnerClass = document.getElementById("pubRunnerClass");
const pubTimestamp = document.getElementById("pubTimestamp");

// Results Approval Elements
const resultsApprovalTableBody = document.getElementById("resultsApprovalTableBody");
const chkIncludePending = document.getElementById("chkIncludePending");

// Global states
let allEvents = [];
let allStudents = [];
let allOrganizers = [];
let currentEventRegistrants = [];
let calculatedChampionship = {
  championClass: "",
  runnerClass: "",
  scoreboard: []
};

// Initialize Page
async function init() {
  setupTabs();
  setupAdminProfileProtocol();
  setupAdminCredentialsModal();
  await loadAllData();
  setupEventForm();
  setupStudentForm();
  setupOrganizerForm();
  setupRegistrationsTab();
  setupJudgingForm();
  setupChampionshipTab();
  setupPromoStudio();
  loadPromosData();
}

// Switch between panels
function switchTab(targetBtn, targetPanel) {
  tabButtons.forEach(btn => btn.classList.remove("active"));
  panels.forEach(p => p.classList.remove("active"));
  
  targetBtn.classList.add("active");
  targetPanel.classList.add("active");
}

function setupTabs() {
  tabBtnOverview.addEventListener("click", () => {
    switchTab(tabBtnOverview, panelOverview);
    renderOverview();
  });
  tabBtnEvents.addEventListener("click", () => {
    switchTab(tabBtnEvents, panelEvents);
    renderEvents();
  });
  tabBtnStudents.addEventListener("click", () => {
    switchTab(tabBtnStudents, panelStudents);
    renderStudents();
  });
  tabBtnOrganizers.addEventListener("click", () => {
    switchTab(tabBtnOrganizers, panelOrganizers);
    renderOrganizers();
  });
  tabBtnRegistrations.addEventListener("click", () => {
    switchTab(tabBtnRegistrations, panelRegistrations);
    populateDropdowns();
  });
  tabBtnJudges.addEventListener("click", () => {
    switchTab(tabBtnJudges, panelJudges);
    renderJudges();
  });
  tabBtnResultsApproval.addEventListener("click", () => {
    switchTab(tabBtnResultsApproval, panelResultsApproval);
    renderResultsApproval();
  });
  tabBtnChampionship.addEventListener("click", () => {
    switchTab(tabBtnChampionship, panelChampionship);
    loadChampionshipLeaderboard();
  });
  if (tabBtnPromos && panelPromos) {
    tabBtnPromos.addEventListener("click", () => {
      switchTab(tabBtnPromos, panelPromos);
      loadPromosData();
    });
  }
}



function setupAdminProfileProtocol() {
  const btnProfile = document.getElementById("btnAdminProfile");
  const modal = document.getElementById("profileProtocolModal");
  const modalClose = document.getElementById("profileProtocolModalCloseBtn");
  const logoutBtn = document.getElementById("profileModalLogoutBtn");
  const savePhoneBtn = document.getElementById("btnSaveProfilePhone");
  const phoneInput = document.getElementById("profilePhoneInput");

  const avatarEl = document.getElementById("profileAvatarCircle");
  const fullNameEl = document.getElementById("profileFullName");
  const usernameValEl = document.getElementById("profileUsernameVal");
  const roleValEl = document.getElementById("profileRoleVal");
  const roleBadgeEl = document.getElementById("profileRoleBadge");

  const adminName = localStorage.getItem("adminName") || "MR. GIRIRAJ BHAT";

  if (!btnProfile || !modal) return;

  // Load existing phone from settings/admin doc
  async function loadAdminProfileData() {
    try {
      const adminDocSnap = await getDoc(doc(db, "settings", "admin"));
      if (adminDocSnap.exists()) {
        const data = adminDocSnap.data();
        if (data.phone && phoneInput) phoneInput.value = data.phone;
        if (data.name && fullNameEl) fullNameEl.innerText = data.name.toUpperCase();
      }
    } catch (err) {
      console.warn("Could not fetch admin settings doc:", err);
    }
  }

  const closeModal = () => {
    modal.style.display = "none";
  };

  btnProfile.addEventListener("click", () => {
    const isVisible = modal.style.display === "block";
    if (isVisible) {
      closeModal();
      return;
    }
    fullNameEl.innerText = adminName;
    usernameValEl.innerText = adminName;
    roleValEl.innerText = "SYSTEM ADMINISTRATOR";
    roleBadgeEl.innerText = "ADMIN";
    avatarEl.innerText = (adminName.replace(/^mr\.\s*/i, '').trim()[0] || "M").toUpperCase();

    loadAdminProfileData();
    modal.style.display = "block";
  });

  if (modalClose) modalClose.addEventListener("click", (e) => {
    e.stopPropagation();
    closeModal();
  });

  // Close when clicking outside the popover (use contains to handle child spans inside button)
  document.addEventListener("click", (e) => {
    if (modal.style.display === "block"
        && !modal.contains(e.target)
        && !btnProfile.contains(e.target)) {
      closeModal();
    }
  });

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("adminUser");
      window.location.href = "login.html";
    });
  }

  if (savePhoneBtn && phoneInput) {
    savePhoneBtn.addEventListener("click", async () => {
      const phoneVal = phoneInput.value.trim();
      try {
        await setDoc(doc(db, "settings", "admin"), {
          name: adminName,
          phone: phoneVal,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        localStorage.setItem("adminPhone", phoneVal);
        alert("🎉 Admin phone number saved successfully!");
      } catch (err) {
        console.error("Error saving admin phone:", err);
        alert("Failed to save phone number.");
      }
    });
  }
}

// Fetch all database records
async function loadAllData() {
  try {
    // 1. Fetch Events
    const eventsSnap = await getDocs(collection(db, "events"));
    allEvents = [];
    eventsSnap.forEach(s => allEvents.push(s.data()));

    // 2. Fetch Students
    const studentsSnap = await getDocs(collection(db, "students"));
    allStudents = [];
    studentsSnap.forEach(s => {
      const data = s.data();
      allStudents.push({ regNo: s.id, ...data });
    });

    // 3. Fetch Organizers
    const orgsSnap = await getDocs(collection(db, "organizers"));
    allOrganizers = [];
    orgsSnap.forEach(s => {
      const data = s.data();
      allOrganizers.push({ username: s.id, ...data });
    });

    renderOverview();
    populateDropdowns();
  } catch (error) {
    console.error("Error loading admin data:", error);
  }
}

// ----------------- OVERVIEW SECTION -----------------
function renderOverview() {
  statTotalEvents.innerText = allEvents.length;
  statTotalStudents.innerText = allStudents.length;

  let totalRegs = 0;
  allStudents.forEach(st => {
    if (st.registeredEvents) {
      totalRegs += st.registeredEvents.length;
    }
  });
  statTotalRegistrations.innerText = totalRegs;

  if (allEvents.length === 0) {
    overviewEventsTable.innerHTML = `<tr><td colspan="5" style="text-align: center;">No events registered yet.</td></tr>`;
    return;
  }

  overviewEventsTable.innerHTML = allEvents.map(ev => {
    let studentCoordsHTML = "";
    if (ev.studentCoordinators && ev.studentCoordinators.length > 0) {
      studentCoordsHTML = ev.studentCoordinators.map(sc => 
        `<span class="user-badge" style="border-color: var(--neon-cyan); color: var(--neon-cyan); margin-bottom: 4px; display: inline-block;">🎓 ${sc.name} (${sc.studentClass} - 📞 ${sc.phone})</span>`
      ).join("<br>");
    } else {
      studentCoordsHTML = `<span style="font-size: 0.8rem; color: var(--text-sub); font-style: italic;">None Assigned</span>`;
    }

    return `
      <tr>
        <td><strong>${ev.title}</strong></td>
        <td>📅 ${ev.date} at ${ev.time}</td>
        <td>📍 ${ev.venue}</td>
        <td>👤 ${ev.coordinator || "N/A"}</td>
        <td>${studentCoordsHTML}</td>
      </tr>
    `;
  }).join("");
}

// ----------------- EVENTS MANAGEMENT -----------------
function renderEvents() {
  if (allEvents.length === 0) {
    eventsListTable.innerHTML = `<tr><td colspan="5" style="text-align: center;">No events in database.</td></tr>`;
    return;
  }

  eventsListTable.innerHTML = allEvents.map(ev => {
    let studentCoordsText = "None";
    if (ev.studentCoordinators && ev.studentCoordinators.length > 0) {
      studentCoordsText = ev.studentCoordinators.map(sc => `🎓 ${sc.name} (${sc.studentClass})`).join(", ");
    }

    return `
      <tr>
        <td><strong>${ev.title}</strong></td>
        <td>📅 ${ev.date} | 🕒 ${ev.time}</td>
        <td>📍 ${ev.venue}</td>
        <td><span style="font-size: 0.82rem; color: var(--neon-cyan); font-weight: 500;">${studentCoordsText}</span></td>
        <td>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button class="btn-action btn-success" onclick="editEvent('${ev.id}')">Edit</button>
            <button class="btn-action btn-danger" onclick="deleteEvent('${ev.id}')">Delete</button>
            <button class="btn-action" onclick="window.location.href='explore.html?event=${ev.id}'" style="background: var(--neon-purple); border-color: var(--neon-purple); color: #fff;">Media</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function setupEventForm() {
  eventForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const titleVal = eventTitleInput.value.trim();
    let id = eventIdInput.value ? eventIdInput.value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "") : "";
    if (!id && titleVal) {
      id = titleVal.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    }
    if (!id) {
      id = `event_${Date.now()}`;
    }

    const eventData = {
      id: id,
      title: eventTitleInput.value.trim(),
      description: eventDescriptionInput.value.trim(),
      date: eventDateInput.value,
      registrationCloseDate: document.getElementById("eventRegCloseDate").value,
      time: eventTimeInput.value.trim(),
      venue: eventVenueInput.value.trim(),
      coordinator: eventCoordinatorInput.value.trim(),
      rules: eventRulesInput.value.trim(),
      results: {
        first: document.getElementById("winnerFirst").value.trim(),
        second: document.getElementById("winnerSecond").value.trim(),
        third: document.getElementById("winnerThird").value.trim()
      }
    };

    try {
      const mode = eventFormMode.value;
      if (mode === "create") {
        // Check if event already exists
        const docRef = doc(db, "events", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          alert("Event with this ID already exists. Use edit or a different ID.");
          return;
        }
        await setDoc(docRef, eventData);
        alert("Event created successfully!");
      } else {
        const docRef = doc(db, "events", id);
        await setDoc(docRef, eventData, { merge: true });
        alert("Event updated successfully!");
      }

      resetEventForm();
      await loadAllData();
      renderEvents();
    } catch (error) {
      console.error("Error saving event:", error);
      alert("Failed to save event. See console for error.");
    }
  });

  btnCancelEditEvent.addEventListener("click", resetEventForm);
}

window.editEvent = function(id) {
  const ev = allEvents.find(e => e.id === id);
  if (!ev) return;

  eventFormMode.value = "edit";
  eventFormTitle.innerText = "Edit Event: " + ev.title;
  
  eventIdInput.value = ev.id;
  eventIdInput.disabled = true; // Cannot change ID of existing document
  
  eventTitleInput.value = ev.title;
  eventDescriptionInput.value = ev.description;
  eventDateInput.value = ev.date;
  document.getElementById("eventRegCloseDate").value = ev.registrationCloseDate || "";
  eventTimeInput.value = ev.time;
  eventVenueInput.value = ev.venue;
  eventCoordinatorInput.value = ev.coordinator;
  eventRulesInput.value = ev.rules || "";

  const findOptionVal = (savedVal) => {
    if (!savedVal) return "";
    const match = allStudents.find(st => st.regNo === savedVal || `${st.name} (${st.regNo})` === savedVal);
    return match ? `${match.name} (${match.regNo})` : savedVal;
  };

  document.getElementById("winnerFirst").value = findOptionVal(ev.results ? ev.results.first : "");
  document.getElementById("winnerSecond").value = findOptionVal(ev.results ? ev.results.second : "");
  document.getElementById("winnerThird").value = findOptionVal(ev.results ? ev.results.third : "");

  btnCancelEditEvent.style.display = "block";
  btnSubmitEvent.innerText = "Update Event Details";
  
  // Scroll to form
  eventForm.scrollIntoView({ behavior: "smooth" });
};

window.deleteEvent = async function(id) {
  if (!await confirm("Are you sure you want to delete this event? This will remove the event structure. Registrations for this event in student profiles will remain but reference a deleted event ID.")) return;

  try {
    await deleteDoc(doc(db, "events", id));
    alert("Event deleted successfully.");
    await loadAllData();
    renderEvents();
  } catch (error) {
    console.error("Error deleting event:", error);
    alert("Failed to delete event.");
  }
};

function resetEventForm() {
  eventFormMode.value = "create";
  eventFormTitle.innerText = "Add New Event";
  
  eventIdInput.value = "";
  eventIdInput.disabled = false;
  
  eventTitleInput.value = "";
  eventDescriptionInput.value = "";
  eventDateInput.value = "";
  document.getElementById("eventRegCloseDate").value = "";
  eventTimeInput.value = "";
  eventVenueInput.value = "";
  eventCoordinatorInput.value = "";
  eventRulesInput.value = "";

  document.getElementById("winnerFirst").value = "";
  document.getElementById("winnerSecond").value = "";
  document.getElementById("winnerThird").value = "";

  btnCancelEditEvent.style.display = "none";
  btnSubmitEvent.innerText = "Save Event";
}

// ----------------- STUDENTS MANAGEMENT -----------------
function renderStudents() {
  let queryText = studentSearchInput.value.toLowerCase().trim();
  let filtered = allStudents.filter(st => 
    st.regNo.toLowerCase().includes(queryText) || 
    (st.name || "").toLowerCase().includes(queryText)
  );

  if (filtered.length === 0) {
    studentsListTable.innerHTML = `<tr><td colspan="4" style="text-align: center;">No students found.</td></tr>`;
    return;
  }
  studentsListTable.innerHTML = filtered.map(st => `
    <tr>
      <td><strong>${st.regNo}</strong></td>
      <td>${st.name || "N/A"}</td>
      <td>${st.class || "N/A"}</td>
      <td>🔑 ${st.dob || "N/A"}</td>
      <td>
        <button class="btn-action btn-danger" onclick="deleteStudent('${st.regNo}')">Delete Record</button>
      </td>
    </tr>
  `).join("");
}

function setupStudentForm() {
  studentForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const regNo = studentRegNoInput.value.trim().toUpperCase();
    const name = studentNameInput.value.trim();
    const classVal = document.getElementById("studentClass").value.trim();
    const dob = studentDOBInput.value.trim();

    // Verify DOB matches format
    if (!/^\d{2}-\d{2}-\d{4}$/.test(dob)) {
      alert("DOB must be in DD-MM-YYYY format (e.g. 15-08-2004).");
      return;
    }

    try {
      const docRef = doc(db, "students", regNo);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        alert(`Student with registration number ${regNo} already exists!`);
        return;
      }

      await setDoc(docRef, {
        name: name,
        dob: dob,
        class: classVal,
        registeredEvents: []
      });

      alert("Student added successfully!");
      studentRegNoInput.value = "";
      studentNameInput.value = "";
      document.getElementById("studentClass").value = "";
      studentDOBInput.value = "";

      await loadAllData();
      renderStudents();
    } catch (error) {
      console.error("Error creating student:", error);
      alert("Failed to create student record.");
    }
  });

  studentSearchInput.addEventListener("input", renderStudents);
}

window.deleteStudent = async function(regNo) {
  if (!await confirm(`Are you sure you want to delete student ${regNo}? This action is permanent.`)) return;

  try {
    await deleteDoc(doc(db, "students", regNo));
    alert("Student record deleted.");
    await loadAllData();
    renderStudents();
  } catch (error) {
    console.error("Error deleting student:", error);
    alert("Failed to delete student.");
  }
};

// ----------------- ORGANIZERS MANAGEMENT -----------------
function renderOrganizers() {
  if (allOrganizers.length === 0) {
    organizersListTable.innerHTML = `<tr><td colspan="5" style="text-align: center;">No organizers registered.</td></tr>`;
    return;
  }

  organizersListTable.innerHTML = allOrganizers.map(org => {
    const ev = allEvents.find(e => e.id === org.assignedEventId);
    const eventName = ev ? ev.title : `Unmapped (${org.assignedEventId})`;
    const passDisplay = org.password || "12345";
    return `
      <tr>
        <td><strong>${org.username}</strong></td>
        <td>${org.name}</td>
        <td>${eventName}</td>
        <td><code style="color: var(--neon-cyan);">${passDisplay}</code></td>
        <td>
          <button class="btn-action" style="background: rgba(188,19,254,0.2); border-color: var(--neon-purple); color: #fff; margin-right: 6px;" onclick="changeOrganizerPassword('${org.username}')">Edit Password</button>
          <button class="btn-action btn-danger" onclick="deleteOrganizer('${org.username}')">Remove Access</button>
        </td>
      </tr>
    `;
  }).join("");
}

window.changeOrganizerPassword = async function(username) {
  const newPass = prompt(`Enter new access password for organizer '${username}':`);
  if (!newPass) return;
  try {
    const docRef = doc(db, "organizers", username);
    await updateDoc(docRef, { password: newPass.trim() });
    alert(`Password updated for organizer '${username}'!`);
    await loadAllData();
    renderOrganizers();
  } catch (error) {
    console.error("Error updating organizer password:", error);
    alert("Failed to update organizer password.");
  }
};

function setupOrganizerForm() {
  organizerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = orgUsernameInput.value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    const name = orgNameInput.value.trim();
    const password = orgPasswordInput.value.trim() || "12345";
    const assignedEventId = orgEventSelect.value;

    if (!username) {
      alert("Please enter a valid alphanumeric username.");
      return;
    }

    try {
      const docRef = doc(db, "organizers", username);
      await setDoc(docRef, {
        name: name,
        password: password,
        assignedEventId: assignedEventId
      });

      alert("Organizer registered successfully!");
      orgUsernameInput.value = "";
      orgNameInput.value = "";
      orgPasswordInput.value = "";
      orgEventSelect.value = "";

      await loadAllData();
      renderOrganizers();
    } catch (error) {
      console.error("Error registering organizer:", error);
      alert("Failed to register organizer.");
    }
  });
}

window.deleteOrganizer = async function(username) {
  if (!await confirm(`Are you sure you want to remove organizer credentials for ${username}?`)) return;

  try {
    await deleteDoc(doc(db, "organizers", username));
    alert("Organizer removed.");
    await loadAllData();
    renderOrganizers();
  } catch (error) {
    console.error("Error removing organizer:", error);
    alert("Failed to delete organizer.");
  }
};

// Populate Event Dropdowns across forms
function populateDropdowns() {
  // 1. Organizer Registration Form Dropdown
  const prevVal1 = orgEventSelect.value;
  orgEventSelect.innerHTML = `<option value="">-- Select Event --</option>` + 
    allEvents.map(e => `<option value="${e.id}">${e.title}</option>`).join("");
  orgEventSelect.value = prevVal1;

  // 2. Registrations Tab Dropdown
  const prevVal2 = regEventFilter.value;
  regEventFilter.innerHTML = `<option value="">-- Select Event --</option>` + 
    allEvents.map(e => `<option value="${e.id}">${e.title}</option>`).join("");
  regEventFilter.value = prevVal2;
}

// ----------------- REGISTRATIONS LISTING -----------------
function setupRegistrationsTab() {
  regEventFilter.addEventListener("change", async () => {
    const eventId = regEventFilter.value;
    currentEventRegistrants = [];
    if (!eventId) {
      registrationsListTable.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-sub);">Select an event from the filter to view registrations.</td></tr>`;
      return;
    }

    registrationsListTable.innerHTML = `<tr><td colspan="4" style="text-align: center;">Querying database registrations...</td></tr>`;

    try {
      const q = query(collection(db, "students"), where("registeredEvents", "array-contains", eventId));
      const querySnap = await getDocs(q);
      
      const registrants = [];
      querySnap.forEach(s => {
        registrants.push({ regNo: s.id, ...s.data() });
      });

      currentEventRegistrants = registrants;

      if (registrants.length === 0) {
        registrationsListTable.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-sub);">No students registered for this event yet.</td></tr>`;
        return;
      }

      registrationsListTable.innerHTML = registrants.map(st => `
        <tr>
          <td><strong>${st.regNo}</strong></td>
          <td>${st.name || "N/A"}</td>
          <td>${st.class || "N/A"}</td>
          <td>${st.email || '<span style="opacity: 0.5;">No email provided</span>'}</td>
        </tr>
      `).join("");

    } catch (error) {
      console.error("Error loading event registrations:", error);
      registrationsListTable.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--neon-red);">Failed to load registrations.</td></tr>`;
    }
  });
  btnPrintRegistrations.addEventListener("click", async () => {
    const eventId = regEventFilter.value;
    if (!eventId) {
      alert("Please select an event first.");
      return;
    }

    const ev = allEvents.find(e => e.id === eventId);
    if (!ev) return;

    const prevText = btnPrintRegistrations.innerText;
    btnPrintRegistrations.disabled = true;
    btnPrintRegistrations.innerText = "Generating PDF...";

    // Resolve coordinator/organizer name
    const org = allOrganizers.find(o => o.assignedEventId === ev.id);
    const orgName = org ? org.name : (ev.coordinator || "Unassigned");

    const studentsPayload = currentEventRegistrants.map(st => ({
      regNo: st.regNo,
      name: st.name || "N/A",
      class: st.class || "N/A",
      email: st.email || "N/A",
      checkedIn: false
    }));

    const payload = {
      type: "registrations",
      title: ev.title,
      coordinator: orgName,
      date: ev.date || "N/A",
      time: ev.time || "N/A",
      venue: ev.venue || "N/A",
      students: studentsPayload
    };

    try {
      const response = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error("Failed to generate PDF");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `registrations_${ev.title.toLowerCase().replace(/ /g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error generating registrations PDF:", err);
      alert("Failed to generate PDF list.");
    } finally {
      btnPrintRegistrations.disabled = false;
      btnPrintRegistrations.innerText = prevText;
    }
  });
}

function renderJudges() {
  if (allEvents.length === 0) {
    judgesEventsTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-sub);">No active events.</td></tr>`;
    return;
  }

  judgesEventsTableBody.innerHTML = allEvents.map(ev => {
    const judgesStr = ev.judges && ev.judges.length > 0 ? ev.judges.join(", ") : "<em>None</em>";
    const criteriaStr = ev.criteria && ev.criteria.length > 0 ? ev.criteria.join(", ") : "<em>None</em>";
    
    return `
      <tr>
        <td><strong>${ev.id}</strong></td>
        <td>${ev.title}</td>
        <td>${judgesStr}</td>
        <td>${criteriaStr}</td>
        <td style="text-align: center;">
          <button class="cyber-btn cyber-btn-cyan" style="font-size: 0.8rem; padding: 4px 10px;" onclick="openJudgingModal('${ev.id}')">Allot</button>
        </td>
      </tr>
    `;
  }).join("");
}

window.openJudgingModal = function(eventId) {
  const ev = allEvents.find(e => e.id === eventId);
  if (!ev) return;

  judgingEventIdInput.value = ev.id;
  judgingEventTitleInput.value = ev.title;
  judgingAllottedJudgesInput.value = ev.judges ? ev.judges.join(", ") : "";
  judgingCriteriaInput.value = ev.criteria ? ev.criteria.join(", ") : "";

  judgingModal.classList.add("active");
};

function setupJudgingForm() {
  judgingModalCloseBtn.addEventListener("click", () => {
    judgingModal.classList.remove("active");
  });

  judgingModal.addEventListener("click", (e) => {
    if (e.target === judgingModal) {
      judgingModal.classList.remove("active");
    }
  });

  judgingForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const eventId = judgingEventIdInput.value;
    const judgesList = judgingAllottedJudgesInput.value
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);
    const criteriaList = judgingCriteriaInput.value
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);

    try {
      const eventRef = doc(db, "events", eventId);
      await updateDoc(eventRef, {
        judges: judgesList,
        criteria: criteriaList
      });

      alert("Judging parameters updated successfully!");
      judgingModal.classList.remove("active");
      
      await loadAllData();
      renderJudges();
    } catch (error) {
      console.error("Error updating judging info:", error);
      alert("Failed to save judging parameters.");
    }
  });
}

// Default College Class Sections for Leaderboard (Strictly 6 Classes)
const DEFAULT_COLLEGE_CLASSES = [
  "I BCA - A",
  "I BCA - B",
  "I BCA - C",
  "II BCA - A",
  "II BCA - B",
  "II BCA - C"
];

function formatClassForLeaderboard(clsName) {
  if (!clsName) return "Unassigned";
  let cleaned = clsName.toString().trim();
  cleaned = cleaned.replace(/\s*\(\s*([A-D])\s*\)/i, " - $1");
  cleaned = cleaned.replace(/^(I+ BCA)\s+([A-D])$/i, "$1 - $2");
  cleaned = cleaned.replace(/^(I+ B\.?COM)\s+([A-D])$/i, "$1 - $2");
  return cleaned;
}

// Championship Logic and Event handlers
async function loadChampionshipLeaderboard() {
  const tableBody = document.getElementById("championshipTableBody");
  if (!tableBody) return;

  tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-sub); padding: 30px;">Computing championship standings...</td></tr>`;

  try {
    // Make sure we have the latest data
    await loadAllData();

    // Map student ID to class
    const studentClassMap = {};
    allStudents.forEach(st => {
      if (st.regNo) {
        studentClassMap[st.regNo.trim().toUpperCase()] = st.class ? formatClassForLeaderboard(st.class) : "Unassigned";
      }
    });

    const pointsMap = {};

    // Pre-populate only the 6 allowed BCA classes
    DEFAULT_COLLEGE_CLASSES.forEach(c => {
      pointsMap[c] = { gold: 0, silver: 0, bronze: 0, total: 0, totalWins: 0 };
    });

    const getOrCreateClass = (className) => {
      const formatted = formatClassForLeaderboard(className);
      if (!pointsMap[formatted]) {
        pointsMap[formatted] = { gold: 0, silver: 0, bronze: 0, total: 0, totalWins: 0 };
      }
      return pointsMap[formatted];
    };

    const extractRegNo = (str) => {
      if (!str) return null;
      const match = str.match(/\(([^)]+)\)/);
      if (match && match[1]) {
        return match[1].trim().toUpperCase();
      }
      return str.trim().toUpperCase();
    };

    const includePending = chkIncludePending ? chkIncludePending.checked : true;

    allEvents.forEach(evt => {
      if (evt.results) {
        if (!evt.resultsApproved && !includePending) {
          return;
        }
        const firstReg = extractRegNo(evt.results.first);
        const secondReg = extractRegNo(evt.results.second);
        const thirdReg = extractRegNo(evt.results.third);

        if (firstReg) {
          const cls = studentClassMap[firstReg];
          if (cls && pointsMap[cls]) {
            const entry = pointsMap[cls];
            entry.gold += 1;
            entry.totalWins += 1;
            entry.total += 5;
          }
        }
        if (secondReg) {
          const cls = studentClassMap[secondReg];
          if (cls && pointsMap[cls]) {
            const entry = pointsMap[cls];
            entry.silver += 1;
            entry.totalWins += 1;
            entry.total += 3;
          }
        }
        if (thirdReg) {
          const cls = studentClassMap[thirdReg];
          if (cls && pointsMap[cls]) {
            const entry = pointsMap[cls];
            entry.bronze += 1;
            entry.totalWins += 1;
            entry.total += 1;
          }
        }
      }
    });

    // Convert map to sorted array (strictly the 6 specified classes)
    const standings = DEFAULT_COLLEGE_CLASSES.map(clsName => ({
      className: clsName,
      ...pointsMap[clsName]
    }));

    // Sort descending by total, then gold, then silver, then bronze, then class name
    standings.sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      if (b.gold !== a.gold) return b.gold - a.gold;
      if (b.silver !== a.silver) return b.silver - a.silver;
      if (b.bronze !== a.bronze) return b.bronze - a.bronze;
      return a.className.localeCompare(b.className);
    });

    // Populate global object for publishing
    calculatedChampionship.scoreboard = standings;
    calculatedChampionship.championClass = standings[0] ? standings[0].className : "None";
    calculatedChampionship.runnerClass = standings[1] ? standings[1].className : "None";

    // Render Preview Table (Matching exact design in screenshot)
    tableBody.innerHTML = standings.map((item, idx) => {
      let rankHTML = `${idx + 1}`;
      if (idx === 0) {
        rankHTML = `<span style="color: #fbbf24; font-weight: 700; display: inline-flex; align-items: center; gap: 6px;">🏆 1st</span>`;
      } else if (idx === 1) {
        rankHTML = `<span style="color: #cbd5e1; font-weight: 700; display: inline-flex; align-items: center; gap: 6px;">🥈 2nd</span>`;
      } else if (idx === 2) {
        rankHTML = `<span style="color: #d97706; font-weight: 700; display: inline-flex; align-items: center; gap: 6px;">🥉 3rd</span>`;
      } else {
        rankHTML = `<span style="color: #fff; font-weight: 700; margin-left: 8px;">${idx + 1}</span>`;
      }

      return `
        <tr style="background: rgba(15, 23, 42, 0.4); border-bottom: 1px solid rgba(255, 255, 255, 0.05); transition: background 0.2s ease;">
          <td style="padding: 14px 16px; border: none;">${rankHTML}</td>
          <td style="padding: 14px 16px; border: none;"><strong style="color: #fff; font-size: 0.95rem;">${item.className}</strong></td>
          <td style="padding: 14px 16px; border: none;"><span style="color: var(--neon-cyan); font-weight: 700; font-family: monospace; font-size: 0.95rem;">${item.total} Pts</span></td>
          <td style="padding: 14px 16px; border: none;"><span style="color: var(--text-sub); font-size: 0.9rem;">${item.totalWins} Wins</span></td>
        </tr>
      `;
    }).join("");

    // Populate Full Leaderboard Modal Table
    const fullTableBody = document.getElementById("fullLeaderboardTableBody");
    if (fullTableBody) {
      fullTableBody.innerHTML = standings.map((item, idx) => {
        let rankText = `${idx + 1}`;
        if (idx === 0) rankText = "🥇 1st";
        else if (idx === 1) rankText = "🥈 2nd";
        else if (idx === 2) rankText = "🥉 3rd";

        return `
          <tr>
            <td style="text-align: center; font-weight: 700; color: ${idx === 0 ? '#fbbf24' : (idx === 1 ? '#cbd5e1' : (idx === 2 ? '#d97706' : '#fff'))};">${rankText}</td>
            <td><strong style="color: #fff;">${item.className}</strong></td>
            <td style="text-align: center; font-weight: bold; color: #fbbf24;">${item.gold}</td>
            <td style="text-align: center; font-weight: bold; color: #cbd5e1;">${item.silver}</td>
            <td style="text-align: center; font-weight: bold; color: #d97706;">${item.bronze}</td>
            <td style="text-align: center; font-weight: bold; color: var(--text-sub);">${item.totalWins}</td>
            <td style="text-align: center;"><strong style="color: var(--neon-cyan); font-size: 1.05rem;">${item.total} Pts</strong></td>
          </tr>
        `;
      }).join("");
    }

    // Load published status
    await loadChampionshipPublishedStatus();

  } catch (error) {
    console.error("Error computing standings:", error);
    tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--neon-red); padding: 20px;">Failed to compute championship standings.</td></tr>`;
  }
}

async function loadChampionshipPublishedStatus() {
  try {
    const docRef = doc(db, "settings", "championship");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists() && docSnap.data().published) {
      const data = docSnap.data();
      champStatusLabel.innerText = "PUBLISHED";
      champStatusLabel.style.color = "var(--neon-green)";
      document.getElementById("champStatusBox").style.borderColor = "var(--neon-green)";
      document.getElementById("champStatusBox").style.boxShadow = "0 0 12px rgba(57, 255, 20, 0.25)";
      
      pubChampionClass.innerText = data.championClass || "-";
      pubRunnerClass.innerText = data.runnerClass || "-";
      pubTimestamp.innerText = data.publishedAt ? new Date(data.publishedAt).toLocaleString() : "-";
      
      champPublishedDetails.style.display = "flex";
      btnUnpublishChampionship.style.display = "inline-block";
      btnPublishChampionship.innerText = "Republish Standing Updates";
    } else {
      champStatusLabel.innerText = "NOT PUBLISHED";
      champStatusLabel.style.color = "var(--neon-red)";
      document.getElementById("champStatusBox").style.borderColor = "var(--neon-red)";
      document.getElementById("champStatusBox").style.boxShadow = "0 0 12px rgba(255, 42, 95, 0.25)";
      champPublishedDetails.style.display = "none";
      btnUnpublishChampionship.style.display = "none";
      btnPublishChampionship.innerText = "Publish Championship Results";
    }
  } catch (error) {
    console.error("Error loading championship published status:", error);
  }
}

async function publishChampionship() {
  // Recalculate standings using only approved results for the official student publish
  const studentClassMap = {};
  allStudents.forEach(st => {
    if (st.regNo) {
      studentClassMap[st.regNo.trim().toUpperCase()] = st.class ? st.class.trim() : "Unassigned";
    }
  });

  const pointsMap = {};
  const getOrCreateClass = (className) => {
    if (!pointsMap[className]) {
      pointsMap[className] = { gold: 0, silver: 0, bronze: 0, total: 0 };
    }
    return pointsMap[className];
  };

  const extractRegNo = (str) => {
    if (!str) return null;
    const match = str.match(/\(([^)]+)\)/);
    if (match && match[1]) {
      return match[1].trim().toUpperCase();
    }
    return str.trim().toUpperCase();
  };

  allEvents.forEach(evt => {
    if (evt.results && evt.resultsApproved === true) {
      const firstReg = extractRegNo(evt.results.first);
      const secondReg = extractRegNo(evt.results.second);
      const thirdReg = extractRegNo(evt.results.third);

      if (firstReg) {
        const cls = studentClassMap[firstReg];
        if (cls) {
          const entry = getOrCreateClass(cls);
          entry.gold += 1;
          entry.total += 5;
        }
      }
      if (secondReg) {
        const cls = studentClassMap[secondReg];
        if (cls) {
          const entry = getOrCreateClass(cls);
          entry.silver += 1;
          entry.total += 3;
        }
      }
      if (thirdReg) {
        const cls = studentClassMap[thirdReg];
        if (cls) {
          const entry = getOrCreateClass(cls);
          entry.bronze += 1;
          entry.total += 1;
        }
      }
    }
  });

  const standings = Object.keys(pointsMap).map(clsName => ({
    className: clsName,
    ...pointsMap[clsName]
  }));

  standings.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    if (b.gold !== a.gold) return b.gold - a.gold;
    if (b.silver !== a.silver) return b.silver - a.silver;
    return b.bronze - a.bronze;
  });

  const officialChampion = standings[0] ? standings[0].className : "None";
  const officialRunner = standings[1] ? standings[1].className : "None";

  if (standings.length === 0) {
    alert("Cannot publish empty standings. Please ensure some events have approved results first.");
    return;
  }

  if (!await confirm(`Are you sure you want to publish the official overall championship results?\n\nChampion: ${officialChampion}\nRunner-Up: ${officialRunner}\n\nNote: This counts only approved events. This will make it visible to all students on their homepage.`)) {
    return;
  }

  btnPublishChampionship.disabled = true;
  btnPublishChampionship.innerText = "Publishing...";

  try {
    const docRef = doc(db, "settings", "championship");
    await setDoc(docRef, {
      published: true,
      championClass: officialChampion,
      runnerClass: officialRunner,
      scoreboard: standings,
      publishedAt: new Date().toISOString()
    });

    alert("Official championship standings published successfully!");
    await loadChampionshipPublishedStatus();
  } catch (error) {
    console.error("Error publishing standings:", error);
    alert("Failed to publish standings.");
  } finally {
    btnPublishChampionship.disabled = false;
    btnPublishChampionship.innerText = "Publish Championship Results";
  }
}

async function unpublishChampionship() {
  if (!await confirm("Are you sure you want to reset/unpublish the overall championship standings? This will hide the banner on the student homepage.")) {
    return;
  }

  btnUnpublishChampionship.disabled = true;
  btnUnpublishChampionship.innerText = "Resetting...";

  try {
    const docRef = doc(db, "settings", "championship");
    await setDoc(docRef, {
      published: false
    });

    alert("Championship standings unpublished successfully.");
    await loadChampionshipPublishedStatus();
  } catch (error) {
    console.error("Error unpublishing standings:", error);
    alert("Failed to unpublish standings.");
  } finally {
    btnUnpublishChampionship.disabled = false;
  }
}

async function renderResultsApproval() {
  if (!resultsApprovalTableBody) return;
  resultsApprovalTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-sub);">Loading submitted results...</td></tr>`;

  try {
    await loadAllData();

    if (allEvents.length === 0) {
      resultsApprovalTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-sub);">No events found in database.</td></tr>`;
      return;
    }

    // Filter events that have some results entered
    const eventsWithResults = allEvents.filter(ev => ev.results && (ev.results.first || ev.results.second || ev.results.third));

    if (eventsWithResults.length === 0) {
      resultsApprovalTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-sub);">No results have been submitted by coordinators yet.</td></tr>`;
      return;
    }

    resultsApprovalTableBody.innerHTML = eventsWithResults.map(ev => {
      const isApproved = ev.resultsApproved === true;
      
      const statusBadge = isApproved 
        ? `<span class="user-badge" style="border-color: var(--neon-green); color: var(--neon-green); background: rgba(34, 197, 94, 0.1); padding: 4px 8px; border-radius: 4px;">Approved & Published</span>`
        : `<span class="user-badge" style="border-color: var(--neon-yellow); color: var(--neon-yellow); background: rgba(234, 179, 8, 0.1); padding: 4px 8px; border-radius: 4px;">Pending Approval</span>`;

      const winnersHTML = `
        <div style="font-size: 0.85rem; line-height: 1.4;">
          ${ev.results.first ? `<div>🥇 1st: <strong>${ev.results.first}</strong></div>` : ""}
          ${ev.results.second ? `<div>🥈 2nd: <strong>${ev.results.second}</strong></div>` : ""}
          ${ev.results.third ? `<div>🥉 3rd: <strong>${ev.results.third}</strong></div>` : ""}
        </div>
      `;

      const actionsHTML = isApproved
        ? `<button class="btn-action btn-danger" onclick="rejectEventResults('${ev.id}')">Unpublish / Recall</button>`
        : `
          <div style="display: flex; gap: 8px; justify-content: center;">
            <button class="btn-action btn-success" onclick="approveEventResults('${ev.id}')">Approve & Publish</button>
            <button class="btn-action btn-danger" onclick="rejectEventResults('${ev.id}')">Reject / Reset</button>
          </div>
        `;

      return `
        <tr>
          <td><strong>${ev.id}</strong></td>
          <td>${ev.title}</td>
          <td>${ev.coordinator || "N/A"}</td>
          <td>${winnersHTML}</td>
          <td style="text-align: center;">${statusBadge}</td>
          <td style="text-align: center;">${actionsHTML}</td>
        </tr>
      `;
    }).join("");
  } catch (err) {
    console.error("Error loading results approval table:", err);
    resultsApprovalTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--neon-red);">Error loading results list.</td></tr>`;
  }
}

async function approveEventResults(eventId) {
  if (!await confirm(`Are you sure you want to approve and publish results for event "${eventId}"?\n\nThis will make it visible to students immediately.`)) {
    return;
  }

  try {
    const docRef = doc(db, "events", eventId);
    await updateDoc(docRef, {
      resultsApproved: true
    });

    alert("Event results approved and published!");
    await renderResultsApproval();
  } catch (error) {
    console.error("Error approving event results:", error);
    alert("Failed to approve event results.");
  }
}

async function rejectEventResults(eventId) {
  const isReset = await confirm(`Click OK to completely clear and reject/reset the results for event "${eventId}" (this allows coordinators to resubmit).\n\nClick Cancel to just unpublish the results (keep results but hide from students).`);
  
  try {
    const docRef = doc(db, "events", eventId);
    if (!isReset) {
      // Just set resultsApproved = false
      await updateDoc(docRef, {
        resultsApproved: false
      });
      alert("Event results unpublished successfully.");
    } else {
      // Clear results map and set resultsApproved = false
      await updateDoc(docRef, {
        results: { first: "", second: "", third: "" },
        resultsApproved: false
      });
      alert("Event results have been reset. Coordinator can now submit new results.");
    }

    await renderResultsApproval();
  } catch (error) {
    console.error("Error resetting event results:", error);
    alert("Failed to update event results.");
  }
}

window.approveEventResults = approveEventResults;
window.rejectEventResults = rejectEventResults;

function setupChampionshipTab() {
  btnPublishChampionship.addEventListener("click", publishChampionship);
  btnUnpublishChampionship.addEventListener("click", unpublishChampionship);
  
  if (chkIncludePending) {
    chkIncludePending.addEventListener("change", () => {
      loadChampionshipLeaderboard();
    });
  }

  const btnViewFullLeaderboard = document.getElementById("btnViewFullLeaderboard");
  const fullLeaderboardModal = document.getElementById("fullLeaderboardModal");
  const fullLeaderboardCloseBtn = document.getElementById("fullLeaderboardCloseBtn");

  if (btnViewFullLeaderboard && fullLeaderboardModal) {
    btnViewFullLeaderboard.addEventListener("click", () => {
      fullLeaderboardModal.classList.add("active");
    });
  }

  if (fullLeaderboardCloseBtn && fullLeaderboardModal) {
    fullLeaderboardCloseBtn.addEventListener("click", () => {
      fullLeaderboardModal.classList.remove("active");
    });
  }
}

// ==========================================
// PROMO CONTENT STUDIO MANAGEMENT
// ==========================================

let allPromos = [];

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

function setupPromoStudio() {
  const btnTypeVideo = document.getElementById("btnTypeVideo");
  const btnTypeImage = document.getElementById("btnTypeImage");
  const promoContentType = document.getElementById("promoContentType");

  const btnSourceUrl = document.getElementById("btnSourceUrl");
  const btnSourceFile = document.getElementById("btnSourceFile");
  const promoMediaSource = document.getElementById("promoMediaSource");
  const sourceUrlGroup = document.getElementById("sourceUrlGroup");
  const sourceFileGroup = document.getElementById("sourceFileGroup");

  if (btnTypeVideo && btnTypeImage) {
    btnTypeVideo.addEventListener("click", () => {
      promoContentType.value = "video";
      btnTypeVideo.style.background = "rgba(168, 85, 247, 0.2)";
      btnTypeVideo.style.borderColor = "var(--neon-purple)";
      btnTypeVideo.style.opacity = "1";
      btnTypeImage.style.background = "";
      btnTypeImage.style.borderColor = "";
      btnTypeImage.style.opacity = "0.6";
    });

    btnTypeImage.addEventListener("click", () => {
      promoContentType.value = "image";
      btnTypeImage.style.background = "rgba(234, 179, 8, 0.2)";
      btnTypeImage.style.borderColor = "#eab308";
      btnTypeImage.style.opacity = "1";
      btnTypeVideo.style.background = "";
      btnTypeVideo.style.borderColor = "";
      btnTypeVideo.style.opacity = "0.6";
    });
  }

  if (btnSourceUrl && btnSourceFile) {
    btnSourceUrl.addEventListener("click", () => {
      promoMediaSource.value = "url";
      sourceUrlGroup.style.display = "block";
      sourceFileGroup.style.display = "none";
      btnSourceUrl.style.background = "rgba(0, 243, 255, 0.2)";
      btnSourceUrl.style.borderColor = "var(--neon-cyan)";
      btnSourceUrl.style.opacity = "1";
      btnSourceFile.style.background = "";
      btnSourceFile.style.borderColor = "";
      btnSourceFile.style.opacity = "0.6";
    });

    btnSourceFile.addEventListener("click", () => {
      promoMediaSource.value = "file";
      sourceUrlGroup.style.display = "none";
      sourceFileGroup.style.display = "block";
      btnSourceFile.style.background = "rgba(0, 243, 255, 0.2)";
      btnSourceFile.style.borderColor = "var(--neon-cyan)";
      btnSourceFile.style.opacity = "1";
      btnSourceUrl.style.background = "";
      btnSourceUrl.style.borderColor = "";
      btnSourceUrl.style.opacity = "0.6";
    });
  }

  const promoForm = document.getElementById("promoForm");
  if (promoForm) {
    promoForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btnPublish = document.getElementById("btnPublishPromo");
      btnPublish.disabled = true;
      btnPublish.innerText = "PUBLISHING...";

      try {
        const title = document.getElementById("promoTitle").value.trim();
        const description = document.getElementById("promoDescription").value.trim();
        const contentType = document.getElementById("promoContentType").value;
        const mediaSource = document.getElementById("promoMediaSource").value;
        const targetVisibility = document.getElementById("promoTargetVisibility").value;
        const priority = parseInt(document.getElementById("promoPriority").value) || 1;

        let mediaUrl = "";

        if (mediaSource === "url") {
          mediaUrl = document.getElementById("promoMediaUrl").value.trim();
          if (!mediaUrl) {
            alert("Please enter a valid video or image URL link.");
            btnPublish.disabled = false;
            btnPublish.innerText = "PUBLISH PROMO";
            return;
          }
        } else {
          const fileInput = document.getElementById("promoFileInput");
          if (!fileInput.files || fileInput.files.length === 0) {
            alert("Please select a file to upload.");
            btnPublish.disabled = false;
            btnPublish.innerText = "PUBLISH PROMO";
            return;
          }
          const file = fileInput.files[0];
          mediaUrl = await readFileAsDataURL(file);
        }

        const promoId = `promo_${Date.now()}`;
        const newPromo = {
          id: promoId,
          title: title,
          description: description,
          contentType: contentType,
          mediaSource: mediaSource,
          mediaUrl: mediaUrl,
          targetVisibility: targetVisibility,
          priority: priority,
          uploadedBy: "Administrator",
          createdAt: new Date().toISOString()
        };

        const docRef = doc(db, "promos", promoId);
        await setDoc(docRef, newPromo);

        alert(`Promo "${title}" published successfully!`);

        document.getElementById("promoTitle").value = "";
        document.getElementById("promoDescription").value = "";
        document.getElementById("promoMediaUrl").value = "";

        await loadPromosData();
      } catch (err) {
        console.error("Error publishing promo:", err);
        alert("Failed to publish promo content.");
      } finally {
        btnPublish.disabled = false;
        btnPublish.innerText = "PUBLISH PROMO";
      }
    });
  }

  const btnReloadPromos = document.getElementById("btnReloadPromos");
  if (btnReloadPromos) {
    btnReloadPromos.addEventListener("click", loadPromosData);
  }

  const searchPromoInput = document.getElementById("searchPromoInput");
  const filterPromoTypeSelect = document.getElementById("filterPromoTypeSelect");
  if (searchPromoInput) searchPromoInput.addEventListener("input", renderPromoLibrary);
  if (filterPromoTypeSelect) filterPromoTypeSelect.addEventListener("change", renderPromoLibrary);
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

async function loadPromosData() {
  try {
    const querySnap = await getDocs(collection(db, "promos"));
    allPromos = [];
    querySnap.forEach(snap => {
      allPromos.push(snap.data());
    });
    allPromos.sort((a, b) => (b.priority || 1) - (a.priority || 1));
    renderPromoStats();
    renderPromoLibrary();
  } catch (err) {
    console.error("Error loading promos:", err);
  }
}

function renderPromoStats() {
  const statTotalMedia = document.getElementById("statTotalMedia");
  const statTotalVideos = document.getElementById("statTotalVideos");
  const statTotalPosters = document.getElementById("statTotalPosters");
  const statActivePromos = document.getElementById("statActivePromos");

  if (!statTotalMedia) return;

  const total = allPromos.length;
  const videos = allPromos.filter(p => p.contentType === "video").length;
  const posters = allPromos.filter(p => p.contentType === "image").length;

  statTotalMedia.innerText = total;
  statTotalVideos.innerText = videos;
  statTotalPosters.innerText = posters;
  statActivePromos.innerText = total;
}

function renderPromoLibrary() {
  const grid = document.getElementById("promoLibraryGrid");
  if (!grid) return;

  const searchVal = (document.getElementById("searchPromoInput")?.value || "").toLowerCase();
  const filterType = document.getElementById("filterPromoTypeSelect")?.value || "all";

  let filtered = allPromos.filter(p => {
    const matchesSearch = (p.title || "").toLowerCase().includes(searchVal) || (p.description || "").toLowerCase().includes(searchVal);
    if (!matchesSearch) return false;
    if (filterType !== "all" && p.contentType !== filterType) return false;
    return true;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-sub); padding: 40px;">No promo media found.</div>`;
    return;
  }

  grid.innerHTML = filtered.map(p => {
    let previewHTML = "";
    if (p.contentType === "video") {
      const embedUrl = getEmbedMediaUrl(p.mediaUrl);
      if (embedUrl.includes("youtube.com/embed")) {
        previewHTML = `<div style="width: 100%; aspect-ratio: 16 / 9; border-radius: 6px; overflow: hidden; background: #000;"><iframe src="${embedUrl}" style="width: 100%; height: 100%; border: none;" allowfullscreen></iframe></div>`;
      } else {
        previewHTML = `<div style="width: 100%; aspect-ratio: 16 / 9; border-radius: 6px; overflow: hidden; background: #000;"><video src="${p.mediaUrl}" controls style="width: 100%; height: 100%; object-fit: contain; background: #000;"></video></div>`;
      }
    } else {
      previewHTML = `<div style="width: 100%; aspect-ratio: 16 / 9; border-radius: 6px; overflow: hidden; background: #000;"><img src="${p.mediaUrl}" style="width: 100%; height: 100%; object-fit: cover;" alt="${p.title}"></div>`;
    }

    const typeBadge = p.contentType === "video" 
      ? `<span style="position: absolute; top: 8px; right: 8px; background: rgba(124, 58, 237, 0.85); color: #fff; font-size: 0.65rem; font-weight: 700; padding: 2px 6px; border-radius: 4px;">VIDEO</span>`
      : `<span style="position: absolute; top: 8px; right: 8px; background: rgba(234, 179, 8, 0.85); color: #000; font-size: 0.65rem; font-weight: 700; padding: 2px 6px; border-radius: 4px;">IMAGE</span>`;

    return `
      <div class="cyber-corners" style="position: relative; background: rgba(10, 15, 30, 0.8); border: 1px solid rgba(0, 243, 255, 0.2); padding: 8px; border-radius: 8px; display: flex; flex-direction: column; justify-content: space-between;">
        ${typeBadge}
        <div style="margin-bottom: 8px;">
          ${previewHTML}
          <h4 style="font-size: 0.85rem; color: #fff; margin: 8px 0 2px 0; font-weight: 600; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${p.title}</h4>
          <p style="font-size: 0.75rem; color: var(--text-sub); margin: 0; line-clamp: 2; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${p.description || "No description"}</p>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 6px; font-size: 0.7rem; color: var(--text-sub);">
          <span>Prio: ${p.priority || 1}</span>
          <button class="cyber-btn cyber-btn-red" style="font-size: 0.65rem; padding: 2px 6px;" onclick="deletePromo('${p.id}')">Delete</button>
        </div>
      </div>
    `;
  }).join("");
}

window.deletePromo = async function(promoId) {
  if (!confirm("Are you sure you want to delete this promo item?")) return;
  try {
    await deleteDoc(doc(db, "promos", promoId));
    alert("Promo item deleted.");
    await loadPromosData();
  } catch (err) {
    console.error("Error deleting promo:", err);
    alert("Failed to delete promo.");
  }
};

function setupAdminCredentialsModal() {
  const btnAdminCredentials = document.getElementById("btnAdminCredentials");
  const modal = document.getElementById("adminCredentialsModal");
  const btnClose = document.getElementById("btnCloseAdminCredentials");
  const btnCancel = document.getElementById("btnCancelAdminCredentials");
  const form = document.getElementById("adminCredentialsForm");

  const inputCurrent = document.getElementById("adminCurrentPassword");
  const inputNewUser = document.getElementById("adminNewUsername");
  const inputNewPass = document.getElementById("adminNewPassword");
  const inputConfirmPass = document.getElementById("adminConfirmPassword");

  if (!btnAdminCredentials || !modal) return;

  const closeModal = () => {
    modal.style.display = "none";
    if (form) form.reset();
  };

  btnAdminCredentials.addEventListener("click", async () => {
    let currentAdminUser = localStorage.getItem("adminUser") || "admin";
    try {
      const docRef = doc(db, "settings", "adminCredentials");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && docSnap.data().username) {
        currentAdminUser = docSnap.data().username;
      }
    } catch (e) {
      console.warn("Could not fetch admin credentials:", e);
    }
    if (inputNewUser) inputNewUser.value = currentAdminUser;
    modal.style.display = "flex";
  });

  if (btnClose) btnClose.addEventListener("click", closeModal);
  if (btnCancel) btnCancel.addEventListener("click", closeModal);

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const currentPassInput = inputCurrent.value.trim();
      const newUserInput = inputNewUser.value.trim().toLowerCase() || "admin";
      const newPassInput = inputNewPass.value.trim();
      const confirmPassInput = inputConfirmPass.value.trim();

      if (newPassInput !== confirmPassInput) {
        alert("New password and confirm password do not match!");
        return;
      }

      let expectedPass = "12345";
      try {
        const docRef = doc(db, "settings", "adminCredentials");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().password) {
          expectedPass = docSnap.data().password;
        }
      } catch (err) {
        console.warn("Error fetching admin credentials for verification:", err);
      }

      if (currentPassInput !== expectedPass) {
        alert("Current password is incorrect!");
        return;
      }

      try {
        const docRef = doc(db, "settings", "adminCredentials");
        await setDoc(docRef, {
          username: newUserInput,
          password: newPassInput,
          updatedAt: new Date().toISOString()
        });

        localStorage.setItem("adminUser", newUserInput);
        alert("Admin credentials updated successfully! Use your new username/password next time you log in.");
        closeModal();
      } catch (err) {
        console.error("Error saving admin credentials:", err);
        alert("Failed to save admin credentials.");
      }
    });
  }
}

// Run initial configurations
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
