
import { useState } from 'react'

const API_URL = 'http://localhost:5000/api/auth'

function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('student')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      const endpoint = isLogin ? '/login' : '/register'

      const body = isLogin
        ? { email, password }
        : { name, email, password, role }

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      const contentType = response.headers.get('content-type') || ''
      const responseText = await response.text()

      if (!contentType.includes('application/json')) {
        console.error('Unexpected server response:', responseText)
        throw new Error(
          'The server returned HTML instead of JSON. Check that the backend is running at http://localhost:5000 and try again.'
        )
      }

      const data = JSON.parse(responseText)

      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong.')
      }

      if (!data.token || !data.user) {
        throw new Error('The server response is missing account details. Please check server.js.')
      }

      if (isLogin) {
        sessionStorage.setItem('peerlearnToken', data.token)
        sessionStorage.setItem('peerlearnUser', JSON.stringify(data.user))
        onLogin(data.user, data.token)
      } else {
        setMessage('Registration successful! You received 10 starter credits. Please log in.')
        setIsLogin(true)
        setPassword('')
      }
    } catch (err) {
      console.error('Authentication error:', err)
      setError(
        err instanceof TypeError
          ? 'Could not connect to the backend. Make sure node server.js is running.'
          : err.message || 'Could not complete your request.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: '#f3f5ff',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <form onSubmit={handleSubmit} style={{
        width: '100%',
        maxWidth: '420px',
        background: 'white',
        padding: '32px',
        borderRadius: '16px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.08)'
      }}>
        <h1 style={{ textAlign: 'center', color: '#4338ca' }}>
          PeerLearn
        </h1>

        <p style={{ textAlign: 'center', color: '#666' }}>
          Learn together. Grow together.
        </p>

        <h2>{isLogin ? 'Welcome Back' : 'Create Your Account'}</h2>

        {!isLogin && (
          <>
            <label>Full Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              style={inputStyle}
              placeholder="Enter your full name"
            />

            <label>Register As</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              style={inputStyle}
            >
              <option value="student">Student</option>
              <option value="tutor">Tutor</option>
            </select>
          </>
        )}

        <label>Email Address</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={inputStyle}
          placeholder="Enter your email"
        />

        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          minLength={8}
          style={inputStyle}
          placeholder="At least 8 characters"
        />

        {error && (
          <p role="alert" style={{ color: '#c62828' }}>
            {error}
          </p>
        )}

        {message && (
          <p role="status" style={{ color: '#17683a' }}>
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            marginTop: '16px',
            background: '#4338ca',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: loading ? 'wait' : 'pointer',
            fontSize: '16px'
          }}
        >
          {loading
            ? 'Please wait...'
            : isLogin
              ? 'Log In'
              : 'Create Account'}
        </button>

        <p style={{ textAlign: 'center', marginTop: '20px' }}>
          {isLogin ? "Don't have an account? " : 'Already registered? '}
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin)
              setError('')
              setMessage('')
              setPassword('')
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#4338ca',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            {isLogin ? 'Register' : 'Log In'}
          </button>
        </p>
      </form>
    </div>
  )
}

const inputStyle = {
  display: 'block',
  width: '100%',
  boxSizing: 'border-box',
  padding: '11px',
  marginTop: '7px',
  marginBottom: '18px',
  border: '1px solid #ccc',
  borderRadius: '7px',
  fontSize: '15px'
}

export default Auth
