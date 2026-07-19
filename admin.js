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
if (localStorage.getItem("adminUser") !== "admin") {
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

const panelOverview = document.getElementById("panelOverview");
const panelEvents = document.getElementById("panelEvents");
const panelStudents = document.getElementById("panelStudents");
const panelOrganizers = document.getElementById("panelOrganizers");
const panelRegistrations = document.getElementById("panelRegistrations");
const panelJudges = document.getElementById("panelJudges");
const panelResultsApproval = document.getElementById("panelResultsApproval");
const panelChampionship = document.getElementById("panelChampionship");

const panels = [panelOverview, panelEvents, panelStudents, panelOrganizers, panelRegistrations, panelJudges, panelResultsApproval, panelChampionship];
const tabButtons = [tabBtnOverview, tabBtnEvents, tabBtnStudents, tabBtnOrganizers, tabBtnRegistrations, tabBtnJudges, tabBtnResultsApproval, tabBtnChampionship];

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
  setupLogout();
  await loadAllData();
  setupEventForm();
  setupStudentForm();
  setupOrganizerForm();
  setupRegistrationsTab();
  setupJudgingForm();
  setupChampionshipTab();
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
}

function setupLogout() {
  document.getElementById("btnLogout").addEventListener("click", () => {
    localStorage.removeItem("adminUser");
    window.location.href = "login.html";
  });
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
    const org = allOrganizers.find(o => o.assignedEventId === ev.id);
    const orgName = org ? org.name : "Unassigned";
    return `
      <tr>
        <td><strong>${ev.title}</strong></td>
        <td>📅 ${ev.date} at ${ev.time}</td>
        <td>📍 ${ev.venue}</td>
        <td>👤 ${ev.coordinator}</td>
        <td><span class="user-badge" style="border-color: var(--neon-purple); color: var(--neon-purple);">${orgName}</span></td>
      </tr>
    `;
  }).join("");
}

// ----------------- EVENTS MANAGEMENT -----------------
function renderEvents() {
  if (allEvents.length === 0) {
    eventsListTable.innerHTML = `<tr><td colspan="4" style="text-align: center;">No events in database.</td></tr>`;
    return;
  }

  eventsListTable.innerHTML = allEvents.map(ev => `
    <tr>
      <td><strong>${ev.title}</strong></td>
      <td>📅 ${ev.date} | 🕒 ${ev.time}</td>
      <td>📍 ${ev.venue}</td>
      <td>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="btn-action btn-success" onclick="editEvent('${ev.id}')">Edit</button>
          <button class="btn-action btn-danger" onclick="deleteEvent('${ev.id}')">Delete</button>
          <button class="btn-action" onclick="window.location.href='explore.html?event=${ev.id}'" style="background: var(--neon-purple); border-color: var(--neon-purple); color: #fff;">Media</button>
        </div>
      </td>
    </tr>
  `).join("");
}

function setupEventForm() {
  eventForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const id = eventIdInput.value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (!id) {
      alert("Please enter a valid alphanumeric Event ID.");
      return;
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
  if (!confirm("Are you sure you want to delete this event? This will remove the event structure. Registrations for this event in student profiles will remain but reference a deleted event ID.")) return;

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
  if (!confirm(`Are you sure you want to delete student ${regNo}? This action is permanent.`)) return;

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
    organizersListTable.innerHTML = `<tr><td colspan="4" style="text-align: center;">No organizers registered.</td></tr>`;
    return;
  }

  organizersListTable.innerHTML = allOrganizers.map(org => {
    const ev = allEvents.find(e => e.id === org.assignedEventId);
    const eventName = ev ? ev.title : `Unmapped (${org.assignedEventId})`;
    return `
      <tr>
        <td><strong>${org.username}</strong></td>
        <td>${org.name}</td>
        <td>${eventName}</td>
        <td>
          <button class="btn-action btn-danger" onclick="deleteOrganizer('${org.username}')">Remove Access</button>
        </td>
      </tr>
    `;
  }).join("");
}

function setupOrganizerForm() {
  organizerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = orgUsernameInput.value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    const name = orgNameInput.value.trim();
    const password = orgPasswordInput.value.trim();
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
  if (!confirm(`Are you sure you want to remove organizer credentials for ${username}?`)) return;

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

// Championship Logic and Event handlers
async function loadChampionshipLeaderboard() {
  const tableBody = document.getElementById("championshipTableBody");
  tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-sub);">Computing championship standings...</td></tr>`;

  try {
    // Make sure we have the latest data
    await loadAllData();

    // Map student ID to class
    const studentClassMap = {};
    allStudents.forEach(st => {
      if (st.regNo) {
        studentClassMap[st.regNo.trim().toUpperCase()] = st.class ? st.class.trim() : "Unassigned";
      }
    });

    // Aggregate points per class
    const pointsMap = {}; // { className: { gold: 0, silver: 0, bronze: 0, total: 0 } }

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

    // Convert map to sorted array
    const standings = Object.keys(pointsMap).map(clsName => ({
      className: clsName,
      ...pointsMap[clsName]
    }));

    // Sort descending by total, then gold, then silver, then bronze
    standings.sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      if (b.gold !== a.gold) return b.gold - a.gold;
      if (b.silver !== a.silver) return b.silver - a.silver;
      return b.bronze - a.bronze;
    });

    // Populate global object for publishing
    calculatedChampionship.scoreboard = standings;
    calculatedChampionship.championClass = standings[0] ? standings[0].className : "None";
    calculatedChampionship.runnerClass = standings[1] ? standings[1].className : "None";

    // Render Table
    if (standings.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-sub);">No events have published results yet. Standings will appear once winners are announced.</td></tr>`;
    } else {
      tableBody.innerHTML = standings.map((item, idx) => {
        let rankEmoji = idx + 1;
        if (idx === 0) rankEmoji = "🥇 1st";
        else if (idx === 1) rankEmoji = "🥈 2nd";
        else if (idx === 2) rankEmoji = "🥉 3rd";
        
        return `
          <tr>
            <td style="text-align: center; font-weight: 600; color: ${idx === 0 ? 'var(--neon-green)' : (idx === 1 ? 'var(--neon-cyan)' : 'var(--text-sub)')};">${rankEmoji}</td>
            <td><strong>${item.className}</strong></td>
            <td style="text-align: center;">${item.gold}</td>
            <td style="text-align: center;">${item.silver}</td>
            <td style="text-align: center;">${item.bronze}</td>
            <td style="text-align: center;"><strong style="color: var(--neon-blue); font-size: 1.05rem;">${item.total} pts</strong></td>
          </tr>
        `;
      }).join("");
    }

    // Load published status
    await loadChampionshipPublishedStatus();

  } catch (error) {
    console.error("Error computing standings:", error);
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--neon-red);">Failed to compute championship standings.</td></tr>`;
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

  if (!confirm(`Are you sure you want to publish the official overall championship results?\n\nChampion: ${officialChampion}\nRunner-Up: ${officialRunner}\n\nNote: This counts only approved events. This will make it visible to all students on their homepage.`)) {
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
  if (!confirm("Are you sure you want to reset/unpublish the overall championship standings? This will hide the banner on the student homepage.")) {
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
  if (!confirm(`Are you sure you want to approve and publish results for event "${eventId}"?\n\nThis will make it visible to students immediately.`)) {
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
  const isReset = confirm(`Click OK to completely clear and reject/reset the results for event "${eventId}" (this allows coordinators to resubmit).\n\nClick Cancel to just unpublish the results (keep results but hide from students).`);
  
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
}

// Run initial configurations
document.addEventListener("DOMContentLoaded", init);
