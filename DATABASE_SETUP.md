# Database Setup Guide

This guide will help you configure MongoDB for the CollabNote application.

## Prerequisites

- MongoDB installed locally OR a MongoDB Atlas account
- Node.js 18+ installed

## Option 1: Local MongoDB Setup

### 1. Install MongoDB

**Windows:**
- Download MongoDB Community Server from [mongodb.com](https://www.mongodb.com/try/download/community)
- Run the installer and follow the setup wizard
- MongoDB will typically install to `C:\Program Files\MongoDB\Server\<version>\bin`

**macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-community
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install -y mongodb
```

### 2. Start MongoDB Service

**Windows:**
```bash
# Start MongoDB as a service (usually done automatically during installation)
# Or start manually:
"C:\Program Files\MongoDB\Server\<version>\bin\mongod.exe" --dbpath="C:\data\db"
```

**macOS:**
```bash
brew services start mongodb-community
```

**Linux:**
```bash
sudo systemctl start mongodb
```

### 3. Verify MongoDB is Running

```bash
# Connect to MongoDB shell
mongosh

# Or if using older version:
mongo
```

If you see the MongoDB prompt, you're good to go!

### 4. Configure Environment Variable

Create a `.env.local` file in the project root with:

```env
MONGODB_URI=mongodb://localhost:27017/collabnote
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NEXT_PUBLIC_SOCKET_URL=
```

## Option 2: MongoDB Atlas Setup (Cloud)

### 1. Create MongoDB Atlas Account

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for a free account
3. Create a new cluster (choose the FREE tier)

### 2. Configure Database Access

1. Go to **Database Access** in the left sidebar
2. Click **Add New Database User**
3. Choose **Password** authentication
4. Create a username and password (save these!)
5. Set user privileges to **Read and write to any database**
6. Click **Add User**

### 3. Configure Network Access

1. Go to **Network Access** in the left sidebar
2. Click **Add IP Address**
3. For development, click **Allow Access from Anywhere** (0.0.0.0/0)
4. For production, add your specific IP addresses
5. Click **Confirm**

### 4. Get Connection String

1. Go to **Clusters** in the left sidebar
2. Click **Connect** on your cluster
3. Choose **Connect your application**
4. Copy the connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/`)
5. Replace `<password>` with your database user password
6. Add database name at the end: `?retryWrites=true&w=majority`

### 5. Configure Environment Variable

Create a `.env.local` file in the project root with:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/collabnote?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NEXT_PUBLIC_SOCKET_URL=
```

**Important:** Replace `username`, `password`, and `cluster` with your actual Atlas credentials.

## Generate JWT Secret

For production, generate a strong JWT secret:

**Windows (PowerShell):**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

**macOS/Linux:**
```bash
openssl rand -base64 32
```

Or use an online generator: [generate-secret.vercel.app](https://generate-secret.vercel.app/32)

## Verify Database Connection

1. Start your development server:
```bash
npm run dev
```

2. Try to register a new user at `http://localhost:3000/register`

3. If successful, your database is configured correctly!

## Troubleshooting

### Connection Refused Error

- **Local MongoDB**: Make sure MongoDB service is running
- **MongoDB Atlas**: Check your IP address is whitelisted in Network Access

### Authentication Failed

- **MongoDB Atlas**: Verify your username and password are correct
- Check that your database user has the correct permissions

### Database Not Found

- The database will be created automatically when you first use it
- Make sure the connection string includes the database name (e.g., `collabnote`)

## Database Models

The application uses two main models:

1. **User** - Stores user accounts with:
   - name, email, password (hashed)
   - avatar URL
   - timestamps

2. **Note** - Stores notes with:
   - title, content (TipTap JSON)
   - owner (User reference)
   - collaborators array
   - shareLink, isPublic
   - versions array (for history)
   - activeUsers array
   - timestamps

These models are automatically created when you first use the application.

## Next Steps

After configuring the database:

1. ✅ Create `.env.local` with your MongoDB URI
2. ✅ Set a strong JWT_SECRET
3. ✅ Run `npm run dev`
4. ✅ Test registration/login
5. ✅ Start creating notes!


