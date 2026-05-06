# FM Bot — Project Manager Discord Bot

A Discord bot for managing freelance/agency projects directly from your server. Supports creating project channels, assigning dev/design roles, archiving, and deleting projects — all through an interactive panel.

## Features

- 📁 **Create Projects** — Automatically creates a category with `overview`, `dev-discussion`, `design-discussion`, `assets`, and `meeting` channels
- 👥 **Assign Roles** — Assign `DEV` and `DESIGN` roles per project to control channel visibility
- 🗄️ **Archive Projects** — Rename a project to archive status and remove roles
- 🗑️ **Delete Projects** — Fully remove a project's channels, category, and roles
- ➕ **Add Members** — Add dev or design members to an existing project

## Setup

### 1. Clone the repository
```bash
git clone https://github.com/your-username/fm-bot-pm.git
cd fm-bot-pm
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
```bash
cp .env.example .env
```
Then edit `.env` and paste your bot token:
```
TOKEN=your_discord_bot_token_here
```

### 4. Run the bot
```bash
node index.js
```

## Usage

Type `!panel` in any channel to bring up the project management panel.

> ⚠️ Only members with **CEO**, **SALES**, **Project Management**, or **admin** roles can use the panel.

## Requirements

- Node.js v18+
- A Discord bot with the following intents enabled:
  - `Guilds`
  - `Guild Members`
  - `Guild Messages`
  - `Message Content`
More updates coming soon...
