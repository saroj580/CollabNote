# CollabNote - Real-Time Collaborative Notes Application

![CollabNote Banner](/placeholder.svg?height=400&width=800&query=CollabNote%20collaborative%20notes%20app%20banner)

## Overview

CollabNote is a modern, full-stack real-time collaborative note-taking application built with Next.js. It allows users to create, edit, and share notes with team members in real-time, featuring a rich text editor, version history, and seamless collaboration tools.

## Screenshots

### Landing Page
![Landing Page](/placeholder.svg?height=600&width=1200&query=landing%20page%20dark%20theme%20notes%20app)

### Dashboard
![Dashboard](/placeholder.svg?height=600&width=1200&query=notes%20dashboard%20dark%20theme%20cards)

### Note Editor
![Note Editor](/placeholder.svg?height=600&width=1200&query=rich%20text%20editor%20dark%20theme%20collaborative)

## Features

- **User Authentication**
  - Secure registration and login with JWT
  - Protected routes using middleware
  - Persistent sessions with localStorage and cookies

- **Note Management**
  - Create, update, and delete notes
  - Rich-text formatting with TipTap editor
  - Bold, italic, underline, headings, lists, quotes, code blocks
  - Image and link embedding

- **Real-Time Collaboration**
  - Live typing sync with Socket.IO
  - Multiple users editing the same document
  - Active users indicator
  - Connection status display

- **Sharing & Collaboration**
  - Share notes via unique links
  - Add collaborators with view or edit permissions
  - Public/private note toggle

- **Version History**
  - Automatic version saving
  - View and restore previous versions
  - Track who made changes

- **Auto-Save**
  - Automatic saving every 5 seconds
  - Last saved timestamp display

- **Responsive UI**
  - Dark mode design
  - Mobile-friendly interface
  - Clean, modern aesthetics with Tailwind CSS

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT, bcrypt.js
- **Rich Text Editor**: TipTap
- **Real-Time**: Socket.IO
- **UI Components**: shadcn/ui

## Project Structure

\`\`\`
collabnote/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── dashboard/page.tsx
│   ├── notes/
│   │    ├── create/page.tsx
│   │    └── [id]/page.tsx
│   └── api/
│        ├── auth/
│        │    ├── login/route.js
│        │    ├── register/route.js
│        │    └── me/route.js
│        └── notes/
│             ├── route.js
│             └── [id]/
│                  ├── route.js
│                  ├── share/route.js
│                  └── versions/route.js
│
├── components/
│    ├── editor.tsx
│    ├── navbar.tsx
│    ├── note-card.tsx
│    ├── protected-route.tsx
│    ├── share-dialog.tsx
│    ├── version-history.tsx
│    └── auth-provider.tsx
│
├── lib/
│    ├── db.js
│    ├── auth.js
│    └── socket.js
│
├── models/
│    ├── User.js
│    └── Note.js
│
├── middleware.js
└── README.md
\`\`\`

## Installation & Setup

### Prerequisites

- Node.js 18+ 
- MongoDB database (local or Atlas)
- npm or yarn

### 1. Clone the Repository

\`\`\`bash
git clone https://github.com/yourusername/collabnote.git
cd collabnote
\`\`\`

### 2. Install Dependencies

\`\`\`bash
npm install
\`\`\`

### 3. Environment Variables

Create a \`.env.local\` file in the root directory:

\`\`\`env
# MongoDB Connection
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/collabnote

# JWT Secret (use a strong random string)
JWT_SECRET=your-super-secret-jwt-key-change-this

# Socket.IO URL (for production)
NEXT_PUBLIC_SOCKET_URL=https://your-domain.com
\`\`\`

### 4. Run Development Server

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Deployment (Vercel)

### 1. Push to GitHub

\`\`\`bash
git add .
git commit -m "Initial commit"
git push origin main
\`\`\`

### 2. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Add environment variables:
   - \`MONGODB_URI\`
   - \`JWT_SECRET\`
   - \`NEXT_PUBLIC_SOCKET_URL\`
5. Click "Deploy"

### 3. Socket.IO Setup for Production

For real-time functionality in production, you'll need to set up a separate Socket.IO server or use a service like:
- [Pusher](https://pusher.com)
- [Ably](https://ably.com)
- [Socket.IO with custom server](https://socket.io/docs/v4/)

## API Endpoints

### Authentication
- \`POST /api/auth/register\` - Create new user
- \`POST /api/auth/login\` - User login
- \`GET /api/auth/me\` - Get current user

### Notes
- \`GET /api/notes\` - Get all user notes
- \`POST /api/notes\` - Create new note
- \`GET /api/notes/:id\` - Get single note
- \`PUT /api/notes/:id\` - Update note
- \`DELETE /api/notes/:id\` - Delete note
- \`POST /api/notes/:id/share\` - Add collaborator
- \`GET /api/notes/:id/versions\` - Get version history
- \`POST /api/notes/:id/versions\` - Restore version

## Usage

1. **Register/Login**: Create an account or sign in
2. **Create Note**: Click "New Note" to create a blank note
3. **Edit Note**: Use the rich text editor to add content
4. **Collaborate**: Share the note link or add collaborators by email
5. **Version History**: Access previous versions from the History panel
6. **Auto-Save**: Your work is automatically saved every 5 seconds

## Contributing

1. Fork the repository
2. Create your feature branch (\`git checkout -b feature/amazing-feature\`)
3. Commit your changes (\`git commit -m 'Add amazing feature'\`)
4. Push to the branch (\`git push origin feature/amazing-feature\`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email support@collabnote.app or open an issue on GitHub.

---

Built with ❤️ using Next.js, MongoDB, and TipTap
