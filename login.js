import { db } from "./firebase-config.js?v=3.1";

import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const loginForm = document.getElementById("loginForm");
const usernameInput = document.getElementById("usernameInput");
const passwordInput = document.getElementById("passwordInput");
const emailInput = document.getElementById("emailInput");
const submitBtn = document.getElementById("submitBtn");

function normalizeDOB(dobStr) {
  // Replace slashes, dots, and spaces with hyphens
  let clean = dobStr.replace(/[\/\.\s]/g, '-');
  // If it's 8 digits (DDMMYYYY), convert to DD-MM-YYYY
  if (/^\d{8}$/.test(clean)) {
    clean = `${clean.substring(0, 2)}-${clean.substring(2, 4)}-${clean.substring(4)}`;
  }
  return clean;
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  const email = emailInput.value.trim();

  submitBtn.disabled = true;
  submitBtn.innerHTML = "Authenticating...";

  // Clear previous sessions
  localStorage.clear();

  const activeRoleBtn = document.querySelector('.role-btn.active');
  const roleId = activeRoleBtn ? activeRoleBtn.id : 'userRoleBtn';

  try {
    const normalizedUsername = username.toLowerCase();
    const normalizedPassword = normalizeDOB(password);

    // ADMIN LOGIN
    if (roleId === 'adminRoleBtn') {
      let expectedUser = "admin";
      let expectedPass = "12345";
      try {
        const adminDocRef = doc(db, "settings", "adminCredentials");
        const adminDocSnap = await getDoc(adminDocRef);
        if (adminDocSnap.exists()) {
          const data = adminDocSnap.data();
          if (data.username) expectedUser = data.username.toLowerCase().trim();
          if (data.password) expectedPass = data.password.trim();
        }
      } catch (err) {
        console.warn("Could not fetch custom admin credentials, using default:", err);
      }

      if ((normalizedUsername === expectedUser || normalizedUsername === "admin" || normalizedUsername === "girirajbhat") && password === expectedPass) {
        submitBtn.innerHTML = "ADMIN ACCESS GRANTED ✓";
        localStorage.setItem("adminUser", username.trim());
        setTimeout(() => {
          window.location.href = "admin.html";
        }, 1000);
      } else {
        alert("Invalid Admin Credentials");
        submitBtn.disabled = false;
        submitBtn.innerHTML = "Initialize Admin Protocol";
      }
      return;
    }

    // ORGANIZER LOGIN
    if (roleId === 'organizerRoleBtn') {
      const uInput = username.trim();
      const pInput = password.trim();

      const checkOrganizerMatch = (enteredUsername, enteredPassword, orgId, orgName, orgPassword) => {
        const normUser = enteredUsername.toLowerCase().trim();
        const normPass = enteredPassword.toLowerCase().trim();
        const normOrgId = orgId.toLowerCase().trim();
        const normOrgName = orgName ? orgName.toLowerCase().trim() : "";
        const normOrgPassword = orgPassword ? orgPassword.toLowerCase().trim() : "12345";

        const clean = (s) => s.replace(/^(mr|mrs|ms|dr|prof)\.?\s*/i, "").replace(/[^a-z0-9]/g, "").trim();

        const cleanUser = clean(normUser);
        const cleanPass = clean(normPass);
        const cleanOrgId = clean(normOrgId);
        const cleanOrgName = clean(normOrgName);

        // Password matching rule: Accepts 12345, the document password, or Faculty ID
        const isPasswordCorrect = (
          normPass === "12345" ||
          normPass === normOrgPassword ||
          normPass === normOrgId ||
          (cleanPass && (cleanPass === cleanOrgName || cleanPass === cleanOrgId))
        );

        // Username matching rule: Accepts clean ID, clean Name, substring match, or exact raw match
        const isUsernameMatch = (
          cleanUser === cleanOrgId ||
          cleanUser === cleanOrgName ||
          normUser === normOrgId ||
          normUser === normOrgName ||
          (cleanUser.length >= 3 && cleanOrgName.includes(cleanUser)) ||
          (cleanOrgId.length >= 3 && cleanUser.includes(cleanOrgId))
        );

        return isPasswordCorrect && isUsernameMatch;
      };

      try {
        const orgsColl = collection(db, "organizers");
        const orgsSnap = await getDocs(orgsColl);
        
        let matchedOrg = null;
        let matchedOrgId = "";

        orgsSnap.forEach((docSnap) => {
          const orgId = docSnap.id;
          const orgData = docSnap.data();
          if (checkOrganizerMatch(uInput, pInput, orgId, orgData.name || "", orgData.password)) {
            matchedOrg = orgData;
            matchedOrgId = orgData.username || orgId;
          }
        });

        if (!matchedOrg) {
          alert("Invalid Organizer Credentials. Please enter your Name (e.g. Rashmi, Ms. Rashmi) as Username and 12345 as Password.");
          submitBtn.disabled = false;
          submitBtn.innerHTML = "Initialize Organizer Protocol";
          return;
        }

        localStorage.setItem("organizerUsername", (matchedOrg.username || matchedOrgId).toUpperCase());
        localStorage.setItem("organizerName", matchedOrg.name || "Organizer");
        localStorage.setItem("assignedEventId", matchedOrg.assignedEventId || "");
        
        submitBtn.innerHTML = "ORGANIZER ACCESS GRANTED ✓";
        setTimeout(() => {
          window.location.href = "organizer.html";
        }, 1000);
      } catch (err) {
        console.error("Organizer authentication error:", err);
        alert("Authentication failed due to system error.");
        submitBtn.disabled = false;
        submitBtn.innerHTML = "Initialize Organizer Protocol";
      }
      return;
    }

    // STUDENT LOGIN / REGISTRATION
    const studentDocId = username.toUpperCase();
    const studentRef = doc(db, "students", studentDocId);

    const nameGroup = document.getElementById("nameGroup");
    const isRegisterMode = (nameGroup && nameGroup.style.display !== "none");

    if (isRegisterMode) {
      // REGISTRATION FLOW
      const nameVal = document.getElementById("nameInput") ? document.getElementById("nameInput").value.trim() : "";
      const classVal = document.getElementById("classInput") ? document.getElementById("classInput").value.trim() : "";
      const emailVal = emailInput ? emailInput.value.trim() : "";

      if (!nameVal || !username || !classVal || !emailVal || !password) {
        alert("Please fill in all fields: Name, Roll No, Class, Email, and Date of Birth.");
        submitBtn.disabled = false;
        submitBtn.innerHTML = "Complete Student Registration";
        return;
      }

      // Check if student already exists in Firestore
      const existingSnap = await getDoc(studentRef);
      if (existingSnap.exists()) {
        alert(`Roll No / Reg No "${studentDocId}" is ALREADY REGISTERED!\n\nPlease switch to Login mode to access your account.`);
        
        // Auto-switch to login mode and fill in Roll No
        const authSwitchLink = document.getElementById("authSwitchLink");
        if (authSwitchLink) {
          authSwitchLink.click();
        }
        usernameInput.value = studentDocId;
        submitBtn.disabled = false;
        return;
      }

      // Save new student record to Firestore
      const formattedDOB = normalizeDOB(password);
      await setDoc(studentRef, {
        name: nameVal,
        class: classVal,
        email: emailVal,
        dob: formattedDOB,
        registeredEvents: []
      });

      // Save session locally
      localStorage.setItem("username", studentDocId);
      localStorage.setItem("name", nameVal);
      localStorage.setItem("email", emailVal);
      localStorage.setItem("userClass", classVal);
      localStorage.setItem("studentClass", classVal);

      submitBtn.innerHTML = "REGISTRATION SUCCESSFUL ✓";

      setTimeout(() => {
        window.location.href = "home.html";
      }, 1000);

    } else {
      // LOGIN FLOW
      const studentSnap = await getDoc(studentRef);

      if (!studentSnap.exists()) {
        alert(`Student record for "${studentDocId}" not found.\n\nIf you have not created an account yet, please click "Register Student Account" below.`);
        submitBtn.disabled = false;
        submitBtn.innerHTML = "Initialize Student Protocol";
        return;
      }

      const studentData = studentSnap.data();

      // Verify date of birth password (normalized to DD-MM-YYYY)
      if (normalizeDOB(studentData.dob || "") !== normalizedPassword) {
        alert("Invalid Password (DOB format: DD-MM-YYYY)");
        submitBtn.disabled = false;
        submitBtn.innerHTML = "Initialize Student Protocol";
        return;
      }

      // Store session
      localStorage.setItem("username", studentDocId);
      localStorage.setItem("name", studentData.name || "");
      localStorage.setItem("email", studentData.email || "");
      localStorage.setItem("userClass", studentData.class || "");
      localStorage.setItem("studentClass", studentData.class || "");

      submitBtn.innerHTML = "ACCESS GRANTED";

      setTimeout(() => {
        window.location.href = "home.html";
      }, 1000);
    }

  } catch (error) {
    console.error("Authentication error:", error);
    alert("Authentication failed: " + error.message);
    submitBtn.disabled = false;
    submitBtn.innerHTML = "Submit";
  }
});