
import { useState } from 'react'

const API_URL = 'http://localhost:5000/api'

function BecomeTutor({ onProfileCreated }) {
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [year, setYear] = useState('3rd Year')
  const [mode, setMode] = useState('Online')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage('')
    setError('')

    const token =
      sessionStorage.getItem('peerLearnToken') ||
      sessionStorage.getItem('peerlearnToken') ||
      localStorage.getItem('token')

    if (!token) {
      setError('Please log in before creating a tutor profile.')
      return
    }

    if (!subject.trim() || !description.trim()) {
      setError('Please enter your subject and teaching description.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/tutors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject: subject.trim(),
          description: description.trim(),
          year,
          mode,
        }),
      })

      const data = await response.json()

      if (response.status === 409) {
        setError(
          'You already have a tutor profile. Find your existing profile in Find a Tutor.'
        )
        return
      }

      if (!response.ok) {
        throw new Error(data.message || 'Could not create tutor profile.')
      }

      setMessage('Tutor profile created successfully!')
      setSubject('')
      setDescription('')

      if (onProfileCreated) {
        onProfileCreated(data.tutor || data)
      }
    } catch (err) {
      setError(err.message || 'Could not connect to the server.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section
      id="become-tutor"
      style={{
        maxWidth: '650px',
        margin: '40px auto',
        padding: '28px',
        borderRadius: '20px',
        background: '#ffffff',
        color: '#202020',
        boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
      }}
    >
      <h2>Become a Tutor</h2>
      <p>Share what you know. Help another student grow.</p>

      <form onSubmit={handleSubmit}>
        <label htmlFor="tutor-subject">Subject you can teach</label>
        <input
          id="tutor-subject"
          value={subject}
          onChange={e => setSubject(e.target.value)}
          placeholder="Example: Java"
          required
          maxLength={80}
          style={inputStyle}
        />

        <label htmlFor="tutor-description">About your teaching</label>
        <textarea
          id="tutor-description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Example: I can teach Java basics and arrays."
          required
          maxLength={500}
          rows={4}
          style={inputStyle}
        />

        <label htmlFor="tutor-year">Year of study</label>
        <select
          id="tutor-year"
          value={year}
          onChange={e => setYear(e.target.value)}
          style={inputStyle}
        >
          <option>1st Year</option>
          <option>2nd Year</option>
          <option>3rd Year</option>
          <option>4th Year</option>
        </select>

        <label htmlFor="tutor-mode">Teaching mode</label>
        <select
          id="tutor-mode"
          value={mode}
          onChange={e => setMode(e.target.value)}
          style={inputStyle}
        >
          <option>Online</option>
          <option>In-person</option>
          <option>Both</option>
        </select>

        {error && (
          <p role="alert" style={{ color: '#c62828' }}>
            {error}
          </p>
        )}

        {message && (
          <p role="status" style={{ color: '#167344' }}>
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '13px',
            marginTop: '12px',
            border: 0,
            borderRadius: '10px',
            background: '#171717',
            color: 'white',
            cursor: loading ? 'wait' : 'pointer',
          }}
        >
          {loading ? 'Creating profile...' : 'Create Tutor Profile'}
        </button>
      </form>
    </section>
  )
}

const inputStyle = {
  display: 'block',
  width: '100%',
  boxSizing: 'border-box',
  padding: '12px',
  margin: '8px 0 18px',
  border: '1px solid #dddddd',
  borderRadius: '9px',
  font: 'inherit',
  background: '#ffffff',
  color: '#202020',
}

export default BecomeTutor
