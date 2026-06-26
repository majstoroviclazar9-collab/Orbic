# Orbic Admin Dashboard

A responsive TypeScript administration dashboard for managing articles, reviewing performance, and configuring workspace preferences. The project keeps the simple static HTML/CSS design, while the dashboard behavior now lives in typed TypeScript.

## Features

- Responsive desktop, tablet, and mobile layouts
- Persistent light and dark themes
- Login and account registration
- Dashboard statistics and recent-article overview
- Article search, filtering, and detail dialogs
- Performance report with CSV export
- Orbic institution overview
- Editable user profile
- Password-change validation
- Notification panel
- Compact navigation preference
- Accessible labels, focus states, and keyboard-friendly forms

## Demo Account

Use the following credentials to explore the dashboard:

```text
Email: admin@dashboard.com
Password: admin123
```

You can also create another account from the registration screen.

## Getting Started

The dashboard can still run as a static site because `index.html` loads the compiled `script.js` file.

1. Download or clone the project.
2. Open `index.html` in a modern browser.

For the most consistent experience, serve the folder through a local web server:

```bash
npx serve .
```

Then open the local address shown in the terminal.

## TypeScript Workflow

Edit application behavior in `script.ts`, then compile it to `script.js`:

```bash
npm install
npm run typecheck
npm run build
```

`script.js` is kept in the project so the dashboard works even before dependencies are installed.

## Project Structure

```text
Dashboard/
├── index.html       # Application structure and authentication screens
├── style.css        # Theme variables and main component styling
├── responsive.css   # Tablet and mobile layout rules
├── script.ts        # TypeScript source for authentication, navigation, data, and interactions
├── script.js        # Browser-ready JavaScript compiled from script.ts
├── tsconfig.json    # TypeScript compiler settings
├── package.json     # TypeScript build and typecheck scripts
└── README.md        # Project documentation
```

## Dashboard Sections

### Dashboard

Displays headline metrics and a responsive table of recent articles. Metric cards and the “View all” action link to their related sections.

### Articles

Provides searchable and filterable article cards. Each article includes its publication status, date, views, comments, summary, and a detailed reading dialog.

### Report

Shows key performance metrics and a six-month views chart. Report data can be exported as a CSV file.

### Institution

Contains information about the Orbic Knowledge Hub, headquartered in New York City, USA.

### Profile

Allows the signed-in user to update their name and email address. Changes are reflected in the header immediately.

### Settings

Includes light and dark themes, email-notification preferences, compact navigation, and password updates.

## Themes and Styling

The dashboard uses Roboto throughout the interface. Theme colors are defined as CSS custom properties near the top of `style.css`:

```css
:root {
  --page: #e8edff;
  --surface: #ffffff;
  --primary: #4b49ac;
  --primary-strong: #170d91;
}
```

Dark-theme values are stored under `[data-theme="dark"]`. Updating these variables changes the palette consistently across the application.

## Local Data

This is a front-end dashboard demonstration and does not require a database.

- Accounts and preferences are stored in `localStorage`.
- The signed-in session is stored in `sessionStorage`.
- Theme selection persists between visits.
- Article and report data are defined in `script.ts`.

Clearing the browser's site data resets saved accounts and preferences. The default demo account is recreated automatically.

## Security Note

Authentication is implemented for front-end demonstration purposes. Passwords are stored locally and are not encrypted. A production deployment should use a secure backend, hashed passwords, server-managed sessions, authorization checks, and validated API endpoints.

## Browser Support

The dashboard is designed for current versions of Chrome, Edge, Firefox, and Safari. JavaScript and browser storage must be enabled.

## Customization

- Edit dashboard content and article data in `script.ts`.
- Run `npm run build` after TypeScript changes to update `script.js`.
- Change colors, shadows, spacing, and typography in `style.css`.
- Adjust responsive breakpoints in `responsive.css`.
- Update page structure and accessibility labels in `index.html`.

