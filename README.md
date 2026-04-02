
<div align="center">
  <img src="https://raw.githubusercontent.com/Smritiii29/regulatory-compliance-monitoring-system-/main/public/logo.png" alt="RCMS Logo" width="120" />
  <h1>Regulatory Compliance Monitoring System (RCMS)</h1>
  <p>
    <b>Empowering Institutions to Stay Compliant, Organized, and Efficient</b>
  </p>
  <br/>
  <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License" />
  <img src="https://img.shields.io/badge/Frontend-React%20%7C%20TypeScript-blue" alt="Frontend" />
  <img src="https://img.shields.io/badge/Backend-Flask%20%7C%20Python-yellow" alt="Backend" />
</div>

---

## 🚀 Overview
RCMS is a robust platform for educational institutions to manage, track, and ensure compliance with regulatory requirements. It streamlines communication, document management, notifications, and reporting for admins, principals, HODs, and faculty.

---

## 🌟 Features
- **💬 Chat & Messaging:** Secure direct and group messaging with file attachments. Real-time notifications for new messages and attachments.
- **📄 Circulars Management:** Upload, categorize, and track compliance circulars. Attach files and set deadlines.
- **🔔 Notifications:** Real-time alerts for new messages, circulars, submissions, and compliance actions.
- **📑 Submissions:** Faculty can submit proofs for circulars. Admins and principals review and track submissions.
- **📊 Dashboard:** Visual stats for compliance, accreditation, activity, and reports.
- **👥 User Management:** Role-based access for admin, principal, HOD, and faculty. Secure authentication and authorization.
- **📝 Reports:** Generate and download compliance and accreditation reports.

---

## 🛠️ Tech Stack
- **Frontend:** React, TypeScript, Vite, TailwindCSS, shadcn/ui
- **Backend:** Flask, SupaBase, Flask-JWT-Extended
- **API:** RESTful endpoints for chat, notifications, circulars, submissions, and reports

---

## 📦 Installation
1. **Clone the repository:**
   ```bash
   git clone https://github.com/Smritiii29/regulatory-compliance-monitoring-system-
   cd regulatory-compliance-monitoring-system-
   ```
2. **Install frontend dependencies:**
   ```bash
   npm install
   ```
3. **Install backend dependencies:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```
4. **Configure environment:**
   - Add your `.env` file for backend secrets (do not commit this file).
   - Set up database (SQLite by default).

---

## 🏃 Usage
- **Frontend:**
  ```bash
  npm run dev
  ```
- **Backend:**
  ```bash
  cd backend
  python app.py
  ```
- Access the app at `http://localhost:3000` (frontend) and `http://localhost:5000` (backend).

---

## 🗂️ Project Structure
```
regulatory-compliance-monitoring-system-
├── backend/
│   ├── app.py
│   ├── models.py
│   ├── routes/
│   ├── utils/
│   └── requirements.txt
├── src/
│   ├── pages/
│   ├── services/
│   ├── components/
│   └── hooks/
├── public/
│   └── logo.png
├── README.md
├── package.json
└── ...
```

---

## 🤝 Contribution
- Fork the repo and create a branch for your feature or bugfix.
- Submit a pull request with a clear description.

---

## 📄 License
This project is licensed under the MIT License.

---

## 📬 Contact
For support or questions, contact the project maintainers or open an issue in the repository.

---

<div align="center">
  <img src="https://raw.githubusercontent.com/Smritiii29/regulatory-compliance-monitoring-system-/main/public/demo.gif" alt="RCMS Demo" width="600" />
  <br/>
  <b>RCMS empowers institutions to stay compliant, organized, and efficient.<br/>Enjoy seamless communication and document management for regulatory success!</b>
</div>
