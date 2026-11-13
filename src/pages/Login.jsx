import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { stagger, fadeUp } from '../motion/variants';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import Logo from '../components/Logo';
import HeroScene from '../components/three/HeroScene';
import { userService } from '../services/userService';
import './Login.css';

export default function Login() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Admin');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoUsers, setDemoUsers] = useState([]);

  useEffect(() => {
    userService.getDemoUsers().then(setDemoUsers).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      showToast('success', 'Welcome to StockFlow!');
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
  };

  const fillDemo = (demoRole) => {
    const user = demoUsers.find((u) => u.role === demoRole);
    if (user) {
      setEmail(user.email);
      setPassword(user.password);
      setRole(user.role);
    }
  };

  return (
    <div className="login-page">
      {/* Left animated panel */}
      <div className="login-left">
        <HeroScene />
        <motion.div className="login-left-content" variants={stagger(0.12, 0.15)} initial="hidden" animate="show">
          <motion.div className="login-logo" variants={fadeUp}>
            <Logo size={46} variant="light" />
          </motion.div>
          <motion.h1 className="login-tagline" variants={fadeUp}>Smart inventory,<br /><em>effortlessly in flow.</em></motion.h1>
          <motion.p className="login-subtitle" variants={fadeUp}>Track stock across warehouses, manage orders, and get real-time alerts — all in one place.</motion.p>
        </motion.div>
      </div>

      {/* Right form panel */}
      <div className="login-right">
        <motion.div className="login-form-wrap" variants={stagger(0.08, 0.25)} initial="hidden" animate="show">
          <motion.h2 className="login-form-title" variants={fadeUp}>Sign in to your account</motion.h2>
          <motion.p className="login-form-sub" variants={fadeUp}>Enter your credentials to access the dashboard</motion.p>

          <form onSubmit={handleSubmit} className="login-form">
            <motion.div className="form-group" variants={fadeUp}>
              <label className="form-label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="you@stockflow.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </motion.div>
            <motion.div className="form-group" variants={fadeUp}>
              <label className="form-label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </motion.div>
            <motion.div className="form-group" variants={fadeUp}>
              <label className="form-label" htmlFor="role">Role (demo selector)</label>
              <select id="role" className="form-select" value={role} onChange={(e) => setRole(e.target.value)}>
                <option>Admin</option>
                <option>Warehouse Manager</option>
                <option>Inventory Staff</option>
                <option>Sales Staff</option>
              </select>
            </motion.div>

            <AnimatePresence>
              {error && (
                <motion.div
                  className="login-error"
                  initial={{ opacity: 0, height: 0, x: 0 }}
                  animate={{ opacity: 1, height: 'auto', x: [0, -8, 8, -5, 5, 0] }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              className="btn btn-primary login-submit"
              disabled={loading}
              variants={fadeUp}
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.97 }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </motion.button>
          </form>

          {import.meta.env.DEV && (
          <div className="demo-hint">
            <p className="demo-hint-title">Demo credentials — click to autofill:</p>
            <div className="demo-chips">
              <button className="demo-chip" onClick={() => fillDemo('Admin')}>Admin</button>
              <button className="demo-chip" onClick={() => fillDemo('Warehouse Manager')}>Warehouse Manager</button>
              <button className="demo-chip" onClick={() => fillDemo('Inventory Staff')}>Inventory Staff</button>
              <button className="demo-chip" onClick={() => fillDemo('Sales Staff')}>Sales Staff</button>
            </div>
          </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
