// src/App.js

import React, { useState, useEffect } from 'react';
import MoneyDistribution from './component/MoneyDistribution';
import Auth from './Auth';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleAuth = (token) => {
    if (token) {
      setIsAuthenticated(true);
      localStorage.setItem('token', token);
    } else {
      setIsAuthenticated(false);
      localStorage.removeItem('token');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('token');
  };

  return (
    <div>
      {isAuthenticated ? (
        <MoneyDistribution onLogout={handleLogout} />
      ) : (
        <Auth onAuth={handleAuth} />
      )}
    </div>
  );
}

export default App;
