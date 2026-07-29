# TermDeck

**TermDeck** is a fast, collaborative, and beautiful vocabulary-building web application designed to help users capture, organize, and study terms and translations in real-time. Whether used as a personal dictionary with offline storage or as a collaborative workspace for language learners, TermDeck provides a fluid and visually rich user experience.

---

## Key Features

*   **Real-Time Collaborative Boards**: Instantly transition from offline LocalStorage to a shared Firebase-backed session. Generate a unique Board ID, share the URL, and collaborate live on vocabulary lists.
*   **Multi-Tag Support & Color Customization**: Categorize entries with comma-separated tags and assign them visual color themes (blue, red, green, yellow, purple, orange, pink, teal).
*   **Inline Tag Management**: Rename tags and update their colors dynamically. The application automatically migrates all associated entries in real-time.
*   **Smart Auto-Complete & Dropdowns**: Real-time dropdown search suggestions for Term, Translation, and Tag fields, fully navigable via keyboard arrow keys and `Enter`.
*   **Smart Collision & Conflict Resolution**:
    *   *Manual Entry*: Prompt users with side-by-side comparison boxes when duplicate term/translation mappings are detected, offering to *merge tags*, *overwrite*, or *cancel*.
    *   *JSON Import*: Interactive conflict resolve stepper showcasing "Existing Entry" vs. "New Entry" to guide the user through *keeping existing*, *merging tags*, *keeping both*, or *overwriting*.
*   **Data Portability & Reversion**: Export vocabulary sets to timestamped JSON archives. Import files with a **30-second Undo window** to revert accidental overwrites or merges.
*   **Light & Night Mode Toggle**: A responsive UI with a premium dark mode theme that persists across page refreshes.

---

## Technology Stack

*   **Frontend**: Vanilla HTML5, ES6+ JavaScript.
*   **Styling**: Pure CSS3 featuring linear gradients, glassmorphism, responsive media queries, and customized CSS custom properties (variables) for theme management.
*   **Database & Synchronization**: Firebase SDK (App & Realtime Database compat wrapper).
*   **Storage**: Browser LocalStorage API for offline mode.

---

## File Structure

```text
TermDeck/
├── index.html       # Application layout, templates, and UI modals
├── styles.css       # Layout styles, Day/Night variables, animations
├── script.js        # Core application logic, autocomplete, sync, & collision handling
├── CHANGELOG.md     # Version history and feature milestones
└── README.md        # Project documentation
```

---

## How to Run

### Running Locally

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/your-username/TermDeck.git
    cd TermDeck
    ```

2.  **Open index.html**:
    Simply double-click `index.html` (or open it in a local web server) to run the application locally!

3.  **Firebase Database Setup (Optional)**:
    If you wish to configure your own shared database, update the `firebaseConfig` object at the top of [`script.js`](script.js) with your project's configuration:
    ```javascript
    const firebaseConfig = {
      apiKey: "YOUR_API_KEY",
      authDomain: "YOUR_AUTH_DOMAIN",
      databaseURL: "YOUR_DATABASE_URL",
      projectId: "YOUR_PROJECT_ID",
      storageBucket: "YOUR_STORAGE_BUCKET",
      messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
      appId: "YOUR_APP_ID"
    };
    ```

---

## License

This project is open-source and available under the [MIT License](LICENSE).
