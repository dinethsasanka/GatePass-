# SLT Gate Pass System**Edit a file, create a new file, and clone from Bitbucket in under 2 minutes**



A comprehensive digital gate pass management system for Sri Lanka Telecom (SLT) to streamline the process of requesting, approving, dispatching, and receiving items across locations.When you're done, you can delete the content in this README and update the file with details for others getting started with your repository.



## 📋 Overview*We recommend that you open this README in another tab as you perform the tasks below. You can [watch our video](https://youtu.be/0ocf7u76WSo) for a full demo of all the steps in this tutorial. Open the video in a new tab to avoid leaving Bitbucket.*



The SLT Gate Pass System is a full-stack web application that digitizes and automates the gate pass workflow for item transfers. It includes role-based access control, multi-level approvals, email notifications, and real-time tracking capabilities.---



## ✨ Features## Edit a file



- **User Management**: Role-based access control (Super Admin, Admin, Executive, User)You’ll start by editing this README file to learn how to edit a file in Bitbucket.

- **Request Management**: Create and track gate pass requests with item details

- **Multi-level Approval**: Executive approval workflow with status tracking1. Click **Source** on the left side.

- **Dispatch & Receive**: Dispatch items with image verification and receive confirmation2. Click the README.md link from the list of files.

- **Item Tracking**: Real-time tracking of items throughout the transfer process3. Click the **Edit** button.

- **Email Notifications**: Automated email alerts for status updates4. Delete the following text: *Delete this line to make a change to the README from Bitbucket.*

- **Azure AD Integration**: Single Sign-On (SSO) with Microsoft Azure AD5. After making your change, click **Commit** and then **Commit** again in the dialog. The commit page will open and you’ll see the change you just made.

- **Receipt Management**: View and manage personal receipts6. Go back to the **Source** page.

- **Admin Dashboard**: Comprehensive administrative controls

---

## 🛠️ Tech Stack

## Create a file

### Frontend

- **React** (v19.0.0) - UI frameworkNext, you’ll add a new file to this repository.

- **Vite** - Build tool and dev server

- **React Router** (v7.1.5) - Navigation1. Click the **New file** button at the top of the **Source** page.

- **Axios** - HTTP client2. Give the file a filename of **contributors.txt**.

- **Tailwind CSS** (v4.0.6) - Styling3. Enter your name in the empty file space.

- **Framer Motion** - Animations4. Click **Commit** and then **Commit** again in the dialog.

- **Lucide React** - Icons5. Go back to the **Source** page.

- **React Toastify** - Notifications

- **jsPDF** - PDF generationBefore you move on, go ahead and explore the repository. You've already seen the **Source** page, but check out the **Commits**, **Branches**, and **Settings** pages.

- **MSAL Browser** - Azure AD authentication

---

### Backend

- **Node.js** & **Express** (v4.21.2) - Server framework## Clone a repository

- **MongoDB** with **Mongoose** (v6.13.8) - Database

- **Supabase** - Additional database/storageUse these steps to clone from SourceTree, our client for using the repository command-line free. Cloning allows you to work on your files locally. If you don't yet have SourceTree, [download and install first](https://www.sourcetreeapp.com/). If you prefer to clone from the command line, see [Clone a repository](https://confluence.atlassian.com/x/4whODQ).

- **JWT** - Authentication & authorization

- **Bcrypt.js** - Password hashing1. You’ll see the clone button under the **Source** heading. Click that button.

- **Nodemailer** - Email service2. Now click **Check out in SourceTree**. You may need to create a SourceTree account or log in.

- **Multer** - File upload handling3. When you see the **Clone New** dialog in SourceTree, update the destination path and name if you’d like to and then click **Clone**.

- **MSAL Node** - Azure AD integration4. Open the directory you just created to see your repository’s files.

- **CORS** - Cross-origin resource sharing

Now that you're more familiar with your Bitbucket repository, go ahead and add a new file locally. You can [push your change back to Bitbucket with SourceTree](https://confluence.atlassian.com/x/iqyBMg), or you can [add, commit,](https://confluence.atlassian.com/x/8QhODQ) and [push from the command line](https://confluence.atlassian.com/x/NQ0zDQ).
## 📁 Project Structure

```
├── backend/
│   ├── config/          # Database configuration
│   ├── controllers/     # Business logic
│   ├── middleware/      # Authentication middleware
│   ├── models/          # MongoDB schemas
│   ├── routes/          # API endpoints
│   ├── utils/           # Helper utilities
│   └── server.js        # Entry point
├── frontend/
│   ├── public/          # Static assets
│   └── src/
│       ├── components/  # Reusable components
│       ├── pages/       # Page components
│       ├── services/    # API services
│       └── App.jsx      # Main app component
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repository-url>
   cd "SLT Gate Pass Project"
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   ```

   Create a `.env` file in the backend directory:
   ```env
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_key
   EMAIL_USER=your_email
   EMAIL_PASS=your_email_password
   AZURE_CLIENT_ID=your_azure_client_id
   AZURE_TENANT_ID=your_azure_tenant_id
   AZURE_CLIENT_SECRET=your_azure_client_secret
   ```

3. **Frontend Setup**
   ```bash
   cd ../frontend
   npm install
   ```

   Create a `.env` file in the frontend directory:
   ```env
   VITE_API_URL=http://localhost:5000
   VITE_AZURE_CLIENT_ID=your_azure_client_id
   VITE_AZURE_TENANT_ID=your_azure_tenant_id
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### Running the Application

1. **Start the Backend**
   ```bash
   cd backend
   npm run dev
   ```
   Server runs on `http://localhost:5000`

2. **Start the Frontend**
   ```bash
   cd frontend
   npm run dev
   ```
   Application runs on `http://localhost:5173`

## 🔑 User Roles

- **Super Admin**: Full system access, user management, and system configuration
- **Admin**: Manage requests, approvals, and administrative tasks
- **Executive**: Approve/reject gate pass requests
- **User**: Create gate pass requests and track items

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/azure` - Azure AD authentication

### Requests
- `GET /api/requests` - Get all requests
- `POST /api/requests` - Create new request
- `PUT /api/requests/:id` - Update request

### Approvals
- `GET /api/approvals` - Get pending approvals
- `PUT /api/approvals/:id/approve` - Approve request
- `PUT /api/approvals/:id/reject` - Reject request

### Dispatch & Receive
- `POST /api/dispatch` - Dispatch items
- `POST /api/receive` - Receive items

### Admin
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software for Sri Lanka Telecom (SLT).

## 👥 Support

For support or queries, please contact the development team.

---

## TEST 1. update 12/18


**Built with ❤️ for Sri Lanka Telecom**
