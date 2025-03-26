Suggested workflow from ChatGPT. A starting point for building the TypeScript files. Actual functionality will need to be implemented manually.



Creating a simple web app in TypeScript and React with authentication, a secure login system, and an interactive map of the Bortle Scale requires both a front-end and back-end implementation. The app will have three main components:

1. **Frontend (React + TypeScript)**:
    - A login and registration page.
    - A page to display the Bortle Scale interactive map after login.
2. **Backend (Node.js + Express)**:
    - User authentication system with password hashing.
    - A database (we’ll use MongoDB for simplicity) to store user credentials.
    - Secure login and registration routes.
3. **Database (MongoDB)**:
    - A simple user model that stores hashed passwords.

### Frontend (React + TypeScript)

Let's start by setting up the React app.

#### 1. **Setting up the React app with TypeScript**

Run the following command to create a new React app with TypeScript:

```bash
npx create-react-app bortle-scale-app --template typescript
```

Navigate to your project folder:

```bash
cd bortle-scale-app
```

#### 2. **Install Dependencies**

We will use the following dependencies:
- `axios` for HTTP requests.
- `react-router-dom` for navigation.
- `react-hook-form` for form handling.
- `jsonwebtoken` for decoding JWT tokens (after login).
- `@material-ui/core` for UI components (optional).

Install them by running:

```bash
npm install axios react-router-dom react-hook-form jsonwebtoken @material-ui/core
```

#### 3. **Create User Authentication Components**

- **Login and Register Components**
  - We’ll create a login page and a register page where users can sign up and log in.

Create a folder `src/components` and add the following components:

##### `src/components/Register.tsx`

```tsx
import React, { useState } from 'react';
import axios from 'axios';
import { useHistory } from 'react-router-dom';

const Register: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const history = useHistory();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await axios.post('http://localhost:5000/api/register', { username, password });
      history.push('/login');
    } catch (error) {
      console.error('Error during registration:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Register</h2>
      <label>Username</label>
      <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} />
      <label>Password</label>
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button type="submit">Register</button>
    </form>
  );
};

export default Register;
```

##### `src/components/Login.tsx`

```tsx
import React, { useState } from 'react';
import axios from 'axios';
import { useHistory } from 'react-router-dom';
import jwt_decode from 'jsonwebtoken';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const history = useHistory();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await axios.post('http://localhost:5000/api/login', { username, password });
      localStorage.setItem('token', response.data.token);  // Store JWT token
      history.push('/bortle-map');
    } catch (error) {
      console.error('Error during login:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Login</h2>
      <label>Username</label>
      <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} />
      <label>Password</label>
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button type="submit">Login</button>
    </form>
  );
};

export default Login;
```

##### `src/components/BortleMap.tsx`

Here’s where you will display the Bortle Scale map, using a third-party map API like Leaflet (a popular open-source map library) for the interactive map.

First, install `leaflet`:

```bash
npm install leaflet
```

Now, create a simple map component:

```tsx
import React, { useEffect } from 'react';
import L from 'leaflet';

const BortleMap: React.FC = () => {
  useEffect(() => {
    const map = L.map('map').setView([51.505, -0.09], 2); // Initial center and zoom level

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    // Bortle scale can be overlaid or drawn on the map
    L.circle([51.505, -0.09], { radius: 50000, color: 'blue' }).addTo(map);
  }, []);

  return <div id="map" style={{ height: '100vh' }} />;
};

export default BortleMap;
```

#### 4. **Routing**

Use `react-router-dom` to manage navigation between pages.

In `src/App.tsx`, set up routes:

```tsx
import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import Register from './components/Register';
import Login from './components/Login';
import BortleMap from './components/BortleMap';

const App: React.FC = () => {
  return (
    <Router>
      <Switch>
        <Route path="/register" component={Register} />
        <Route path="/login" component={Login} />
        <Route path="/bortle-map" component={BortleMap} />
      </Switch>
    </Router>
  );
};

export default App;
```

### Backend (Node.js + Express)

Now let’s build the backend API to handle user authentication.

#### 1. **Setup Express**

Create a new folder for your backend:

```bash
mkdir server
cd server
npm init -y
npm install express bcryptjs jsonwebtoken mongoose dotenv cors
```

#### 2. **Create the User Model**

In `server/models/User.ts`:

```ts
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

export const User = mongoose.model('User', userSchema);
```

#### 3. **Create Routes for Registration and Login**

In `server/routes/auth.ts`:

```ts
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

const router = express.Router();

// Register Route
router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ username, password: hashedPassword });
  
  try {
    await user.save();
    res.status(201).send('User registered');
  } catch (error) {
    res.status(400).send('Error registering user');
  }
});

// Login Route
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  
  if (!user) return res.status(400).send('User not found');

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).send('Invalid credentials');

  const token = jwt.sign({ userId: user._id }, 'your_secret_key', { expiresIn: '1h' });
  res.json({ token });
});

export default router;
```

#### 4. **Setup Express Server**

Create a simple server in `server/index.ts`:

```ts
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/bortle-scale', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.use('/api', authRoutes);

app.listen(5000, () => {
  console.log('Server running on http://localhost:5000');
});
```

### Running the Application

1. **Backend**: 
   - Start the backend server with `ts-node` or use `npm run build` and `node dist/index.js`.
2. **Frontend**: 
   - Run the frontend with `npm start`.

You’ll now have a full-stack app where users can register, log in, and view the Bortle Scale map once logged in.
