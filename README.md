# T-ODRE - LandLoard

**Transparency-Oriented Digital Rental Ecosystem**

A full-stack digital rental management system built with Next.js 14, TypeScript, and Tailwind CSS.

## 🚀 Features

- **Multi-Role Dashboards**: Separate dashboards for Tenants, Landlords, Banks, and Ministry
- **Mock Authentication**: Email + OTP verification system
- **JSON Database**: File-based data storage (easily replaceable with SQL)
- **Transparent Records**: Complete rental and payment history tracking
- **Credit Assessment**: Bank dashboard with tenant credit scoring
- **System Analytics**: Ministry dashboard for compliance monitoring

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn

## 🛠️ Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env.local` file in the root directory:
   ```
   APP_NAME="T-ODRE"
   MOCK_SECRET="anystringhere"
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
/src
  /app
    /auth          # Authentication pages (login, register)
    /dashboard     # Dashboard pages for each role
    /api           # API routes
  /components      # Reusable UI components
  /data            # JSON database files
  /lib             # Client-side utilities
  /types           # TypeScript type definitions
  /utils           # Server-side utilities
```

## 👥 User Roles

### Tenant
- View rented property information
- Check payment history
- Download receipts
- View landlord contact details

### Landlord
- Manage properties
- Approve/decline rental requests
- Track tenant payments
- View rent due list

### Bank
- Access tenant rental history
- View payment behavior
- Credit score assessment

### Ministry
- System-wide analytics
- Compliance tracking
- Rent map by area
- Policy monitoring

## 🔐 Authentication Flow

1. **Registration/Login**: Enter email and role
2. **OTP Verification**: Receive OTP code (stored in `mock_emails.json`)
3. **Dashboard Access**: Redirected to role-specific dashboard

**Note**: In development mode, OTP codes are logged to the console for testing.

## 📊 JSON Database

The system uses JSON files as a mock database:

- `users.json` - User accounts
- `properties.json` - Rental properties
- `rentals.json` - Rental agreements
- `payments.json` - Payment records
- `mock_emails.json` - OTP codes (mock email system)

## 🧪 Testing

### Pre-configured Test Users

The system comes with sample data:

- **Tenant**: rahim@gmail.com
- **Landlord**: karim@gmail.com
- **Bank**: bank@example.com
- **Ministry**: ministry@example.com

**Note**: You'll need to request OTP for these accounts to log in.

## 🔄 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/send-otp` - Send OTP to email
- `POST /api/auth/verify` - Verify OTP and login
- `GET /api/auth/me` - Get current user

### Dashboards
- `GET /api/dashboard/tenant` - Tenant dashboard data
- `GET /api/dashboard/landlord` - Landlord dashboard data
- `GET /api/dashboard/bank` - Bank dashboard data
- `GET /api/dashboard/ministry` - Ministry dashboard data

## 🎨 UI Components

Reusable components available in `/src/components`:

- `Button` - Styled button with variants
- `Card` - Content container
- `Table` - Data table
- `Input` - Form input field
- `OTPInput` - OTP code input
- `Navbar` - Top navigation
- `Sidebar` - Side navigation

## 🔧 Development

### Build for production:
```bash
npm run build
```

### Start production server:
```bash
npm start
```

## 📝 Notes

- This is a **mock system** for demonstration purposes
- Authentication uses localStorage (not secure for production)
- JSON database is suitable for development/testing only
- Replace with proper database (PostgreSQL, MongoDB, etc.) for production
- Use proper JWT libraries and secure session management in production

## 🚧 Future Enhancements

- Real email service integration
- SQL database migration
- PDF receipt generation
- Real-time notifications
- Mobile app support
- Advanced analytics

## 📄 License

This project is for educational/demonstration purposes.

---

**Built with ❤️ using Next.js 14**

