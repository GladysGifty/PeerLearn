import BecomeTutor from './BecomeTutor'
import { useState, useEffect, useCallback } from 'react'
import './App.css'
import SessionRequests from './SessionRequests'
import Auth from './Auth'

const API_URL = 'http://localhost:5000/api/tutors'
const SESSION_API_URL = 'http://localhost:5000/api/sessions'
const CREDITS_API_URL = 'http://localhost:5000/api/credits'

const subjects = [
  { name: 'Programming', icon: '💻', count: 'Java, Python, C' },
  { name: 'Database Systems', icon: '🗄️', count: 'SQL, DBMS, MongoDB' },
  { name: 'Artificial Intelligence', icon: '🤖', count: 'AI, ML, Deep Learning' },
  { name: 'Mathematics', icon: '📐', count: 'Statistics, Algebra' },
]

function formatTutor(tutor, index = 0) {
  const name = tutor.name || 'Student'
  const colors = ['#e0e7ff', '#d8f5e7', '#f6ddff']

  return {
    ...tutor,
    id: tutor._id || tutor.id,
    year: tutor.year || '2nd Year',
    mode: tutor.mode || 'Online',
    rating: Number(tutor.rating ?? 5),
    initials: name.split(' ').map(word => word[0]).join('').slice(0, 2).toUpperCase(),
    color: colors[index % colors.length],
  }
}

function App() {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('peerlearnUser') || 'null')
    } catch {
      return null
    }
  })

  const [token, setToken] = useState(
    () => sessionStorage.getItem('peerlearnToken') || ''
  )

  const [search, setSearch] = useState('')
  const [tutors, setTutors] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [credits, setCredits] = useState(0)
  const [creditsLoading, setCreditsLoading] = useState(false)

  const [selectedTutor, setSelectedTutor] = useState(null)
  const [showSessionForm, setShowSessionForm] = useState(false)
  const [submittingSession, setSubmittingSession] = useState(false)
  const [sessionForm, setSessionForm] = useState({ message: '' })
  const [showRequestsPage, setShowRequestsPage] = useState(false)

  const [form, setForm] = useState({
    subject: '',
    year: '2nd Year',
    mode: 'Online',
    description: '',
  })

  const isStudent = user?.role === 'student'
  const isTutor = user?.role === 'tutor'

  const loadCredits = useCallback(async () => {
    if (!token) {
      setCredits(0)
      return
    }

    setCreditsLoading(true)

    try {
      const response = await fetch(CREDITS_API_URL, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Could not load credits.')
      }

      setCredits(Number(data.credits ?? 0))
    } catch (error) {
      console.error('Could not load Learning Credits:', error)
    } finally {
      setCreditsLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadCredits()
  }, [loadCredits])

  function handleLogin(loggedInUser, loggedInToken) {
    setUser(loggedInUser)
    setToken(loggedInToken)
    setMessage('')
    setShowRequestsPage(false)
  }

  function handleLogout() {
    sessionStorage.removeItem('peerlearnToken')
    sessionStorage.removeItem('peerlearnUser')
    setUser(null)
    setToken('')
    setCredits(0)
    setShowRequestsPage(false)
    setShowForm(false)
    setShowSessionForm(false)
    setSelectedTutor(null)
    setMessage('')
  }

  async function loadTutors() {
   try {
  const response = await fetch(API_URL)

  if (!response.ok) {
    throw new Error('Could not load tutors.')
  }

      const savedTutors = await response.json()
      setTutors(savedTutors.map((tutor, index) => formatTutor(tutor, index)))
    } catch {
      setMessage('Could not load tutors. Please check that the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTutors()
  }, [])

  const filteredTutors = tutors.filter(tutor =>
    `${tutor.name} ${tutor.subject} ${tutor.mode}`
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  async function handleSubmit(event) {
    event.preventDefault()

    if (!isTutor || !token) {
      setMessage('Please log in with a tutor account to publish a tutoring offer.')
      return
    }

    if (!form.subject.trim()) {
      setMessage('Please enter the subject you can teach.')
      return
    }

    setSaving(true)
    setMessage('')

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject: form.subject.trim(),
          year: form.year,
          mode: form.mode,
          description: form.description.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Could not publish tutoring offer.')
      }

      setForm({
        subject: '',
        year: '2nd Year',
        mode: 'Online',
        description: '',
      })

      setShowForm(false)
      setMessage('Your tutoring offer was published successfully!')
      await loadTutors()
    } catch (error) {
      setMessage(error.message || 'Could not publish tutoring offer.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSessionSubmit(event) {
    event.preventDefault()

    if (!isStudent || !token) {
      setMessage('Please log in with a student account to request a session.')
      return
    }

    if (!selectedTutor?._id && !selectedTutor?.id) {
      setMessage('This tutor does not have a valid database profile.')
      return
    }

    setSubmittingSession(true)
    setMessage('')

    try {
      const response = await fetch(SESSION_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tutorId: String(selectedTutor._id || selectedTutor.id),
          subject: selectedTutor.subject,
          message: sessionForm.message.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Could not submit session request.')
      }

      const tutorName = selectedTutor.name

      setShowSessionForm(false)
      setSelectedTutor(null)
      setSessionForm({ message: '' })
      setMessage(`Your session request to ${tutorName} was sent! Status: Pending.`)
      window.alert('Session request sent successfully! Status: Pending.')
    } catch (error) {
      setMessage(error.message || 'Could not submit session request.')
    } finally {
      setSubmittingSession(false)
    }
  }

  function openTutorForm() {
  if (!user || !token) {
    setMessage('Please log in to create a tutor profile.')
    return
  }

  setMessage('')
  document.getElementById('become-tutor')?.scrollIntoView({
    behavior: 'smooth',
  })
}

  function openSessionForm(tutor) {
    if (!user) {
      setMessage('Please log in or register as a student to request a session.')
      return
    }

    if (!isStudent) {
      setMessage('Tutor accounts cannot request sessions. Log in as a student to do that.')
      return
    }

    setSelectedTutor(tutor)
    setSessionForm({ message: '' })
    setShowSessionForm(true)
    setMessage('')
  }

  if (!user || !token) {
    return <Auth onLogin={handleLogin} />
  }

  return (
    <>
      {showRequestsPage ? (
        <div>
          <div style={{
            padding: '20px 5%',
            background: '#f7f8fc',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}>
            <button
              className="secondary-button"
              onClick={() => setShowRequestsPage(false)}
            >
              ← Back to PeerLearn
            </button>
            <span>Logged in as: <strong>{user.name}</strong> ({user.role})</span>
          </div>

          <SessionRequests
            token={token}
            user={user}
            onCreditsChanged={loadCredits}
          />
        </div>
      ) : (
        <>
          <nav className="navbar">
            <a
              href="#home"
              className="brand"
              onClick={() => setShowRequestsPage(false)}
            >
              <span className="brand-icon">P</span> PeerLearn
              <span className="brand-dot">.</span>
            </a>

            <div className="nav-links">
              <a href="#home">Home</a>
              <a href="#subjects">Subjects</a>
              <a href="#tutors">Find a Tutor</a>
              <a href="#how">How it works</a>
              <a href="#become-tutor">Become a Tutor</a>

              <button
                type="button"
                onClick={() => setShowRequestsPage(true)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  font: 'inherit',
                  color: 'inherit',
                }}
              >
                Session Requests
              </button>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              flexWrap: 'wrap',
            }}>
              <span style={{ fontSize: '13px' }}>
                {user.name} · {user.role}
              </span>

              <span
                title="Your saved Learning Credits"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '8px 12px',
                  borderRadius: '20px',
                  background: '#fff4d6',
                  color: '#8a5700',
                  fontWeight: 700,
                  fontSize: '13px',
                  whiteSpace: 'nowrap',
                }}
              >
                🪙 {creditsLoading ? 'Loading...' : `${credits} credits`}
              </span>

              {isTutor && (
                <button className="nav-button" onClick={openTutorForm}>
                  Become a Tutor ↗
                </button>
              )}

              <button className="secondary-button" onClick={handleLogout}>
                Log Out
              </button>
            </div>
          </nav>

          <main>
            <section className="hero" id="home">
              <div className="hero-content">
                <div className="eyebrow">
                  <span className="live-dot"></span> THE FUTURE OF PEER LEARNING
                </div>

                <h1>
                  Learn together.<br />
                  <span>Grow together.</span>
                </h1>

                <p className="hero-text">
                  Your next breakthrough might be one conversation away. Learn
                  from students who understand your journey — because they're on it
                  too.
                </p>

                <div className="hero-actions">
                  <a href="#tutors" className="primary-button">
                    Find your learning partner <span>→</span>
                  </a>

                  {isTutor && (
                    <button className="secondary-button" onClick={openTutorForm}>
                      Share your skills +
                    </button>
                  )}
                </div>

                <div className="hero-proof">
                  <div className="avatar-stack">
                    <span>A</span><span>P</span><span>R</span><span>+</span>
                  </div>
                  <div>
                    <strong>Knowledge grows when shared.</strong>
                    <small>Learn a skill. Teach a skill. Repeat.</small>
                  </div>
                </div>
              </div>

              <div className="hero-visual">
                <div className="visual-orbit orbit-one"></div>
                <div className="visual-orbit orbit-two"></div>

                <div className="visual-card main-visual-card">
                  <div className="visual-top">
                    <span className="visual-badge">✦ YOUR LEARNING COMMUNITY</span>
                    <span>•••</span>
                  </div>

                  <div className="visual-title">
                    Your potential,<br />
                    multiplied.
                  </div>

                  <div className="mini-person">
                    <div className="person-avatar blue">A</div>
                    <div>
                      <strong>Learn Java</strong>
                      <small>With a fellow student</small>
                    </div>
                    <span className="online-pill">● Online</span>
                  </div>

                  <div className="mini-person">
                    <div className="person-avatar pink">P</div>
                    <div>
                      <strong>Teach DBMS</strong>
                      <small>Share what you know</small>
                    </div>
                    <span className="credit-pill">
                      🪙 {credits} credits
                    </span>
                  </div>

                  <div className="visual-footer">
                    <span>✦</span> Everyone has something to teach.
                  </div>
                </div>

                <div className="floating-note note-top">
                  <span>✦</span>
                  <div>
                    <strong>Learn & earn</strong>
                    <small>Knowledge has value</small>
                  </div>
                </div>

                <div className="floating-note note-bottom">
                  <span className="match-icon">✓</span>
                  <div>
                    <strong>Find your match</strong>
                    <small>Skills meet curiosity</small>
                  </div>
                </div>
              </div>
            </section>

            <section className="stats-row">
              <div><strong>01</strong><span>Find your people</span></div>
              <div><strong>02</strong><span>Exchange knowledge</span></div>
              <div><strong>03</strong><span>Grow together</span></div>
              <div className="stats-note">Built by students, for students.</div>
            </section>

            <section className="section subjects-section" id="subjects">
              <div className="section-heading">
                <div>
                  <div className="eyebrow">EXPLORE YOUR CURIOSITY</div>
                  <h2>What do you want to <span>master?</span></h2>
                </div>
                <p>Every expert was once a beginner.<br />Start with one subject.</p>
              </div>

              <div className="subject-grid">
                {subjects.map((subject, index) => (
                  <button
                    className="subject-card"
                    key={subject.name}
                    onClick={() => {
                      setSearch(
                        subject.name === 'Programming'
                          ? 'Java'
                          : subject.name === 'Database Systems'
                            ? 'Database'
                            : subject.name === 'Artificial Intelligence'
                              ? 'Artificial Intelligence'
                              : 'Math'
                      )
                      document.getElementById('tutors')?.scrollIntoView({
                        behavior: 'smooth',
                      })
                    }}
                  >
                    <span className={`subject-icon subject-icon-${index}`}>
                      {subject.icon}
                    </span>
                    <strong>{subject.name}</strong>
                    <small>{subject.count}</small>
                    <span className="subject-arrow">↗</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="section tutors-section" id="tutors">
              <div className="section-heading">
                <div>
                  <div className="eyebrow">YOUR NEXT STUDY PARTNER</div>
                  <h2>Meet your <span>peer mentors.</span></h2>
                </div>
                <p>Students helping students, one<br />breakthrough at a time.</p>
              </div>

              <div className="search-bar">
                <span>⌕</span>
                <input
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="Search by tutor, subject or learning mode..."
                />
                <span className="search-shortcut">LIVE SEARCH</span>
              </div>

              {message && (
                <div className="notice" role="status">{message}</div>
              )}

              {loading && <p>Loading saved tutors...</p>}

              <div className="tutor-grid">
                {filteredTutors.map(tutor => (
                  <article className="tutor-card" key={tutor.id}>
                    <div className="tutor-card-top">
                      <div
                        className="tutor-avatar"
                        style={{ background: tutor.color }}
                      >
                        {tutor.initials}
                      </div>
                      <span className="rating">★ {tutor.rating.toFixed(1)}</span>
                    </div>

                   
<div className="tutor-year">
  {tutor.year} · TUTOR
</div>
<h3>{tutor.name}</h3>
<p className="tutor-subject">{tutor.subject}</p>

{tutor.description && (
  <p className="tutor-description">{tutor.description}</p>
)}


                    <div className="tutor-card-footer">
                      <span className="mode-pill">● {tutor.mode}</span>
                      {isStudent && (
                        <button onClick={() => openSessionForm(tutor)}>
                          Request session ↗
                        </button>
                      )}
                    </div>
                  </article>
                ))}

                {!loading && filteredTutors.length === 0 && (
                  <div className="empty-state">
                    No tutors found. Try another subject or check back after a
                    tutor publishes a profile.
                  </div>
                )}
              </div>
            </section>

            <section className="feature-band" id="how">
              <div>
                <div className="eyebrow light-eyebrow">MORE THAN TUTORING</div>
                <h2>Give knowledge.<br /><span>Get opportunity.</span></h2>
                <p>
                  Teach something you love. Learn something you need. Build a
                  campus community where asking for help is a strength.
                </p>
                {isTutor && (
                  <button className="light-button" onClick={openTutorForm}>
                    Become a peer mentor ↗
                  </button>
                )}
              </div>

              <div className="feature-list">
                <div>
                  <span>01</span>
                  <div>
                    <strong>Learn-and-earn credits</strong>
                    <p>Earn 10 credits for each completed tutoring session.</p>
                  </div>
                  <b>↗</b>
                </div>
                <div>
                  <span>02</span>
                  <div>
                    <strong>Topic-focused doubt rescue</strong>
                    <p>Find help for the exact concept you are stuck on.</p>
                  </div>
                  <b>↗</b>
                </div>
                <div>
                  <span>03</span>
                  <div>
                    <strong>Learning confidence tracker</strong>
                    <p>Reflect on your confidence before and after learning.</p>
                  </div>
                  <b>↗</b>
                </div>
                <div>
                  <span>04</span>
                  <div>
                    <strong>Small study circles</strong>
                    <p>Learn with peers who share your goals.</p>
                  </div>
                  <b>↗</b>
                </div>
              </div>
            </section>

            <section className="cta-section">
              <div className="eyebrow">YOUR KNOWLEDGE MATTERS</div>
              <h2>
                Someone out there needs<br />
                what <span>you already know.</span>
              </h2>
              {isTutor && (
                <button className="primary-button" onClick={openTutorForm}>
                  Offer your first lesson <span>→</span>
                </button>
              )}
            </section>

            <section className="section" id="become-tutor">
              <BecomeTutor
                onProfileCreated={() => {
                  window.location.reload()
                }}
              />
            </section>
          </main>

          <footer>
            <a href="#home" className="brand">
              <span className="brand-icon">P</span> PeerLearn
              <span className="brand-dot">.</span>
            </a>
            <p>Learn together. Grow together.</p>
            <span>Peer-powered learning · Student prototype</span>
          </footer>
        </>
      )}

      {showSessionForm && selectedTutor && (
        <div
          className="modal-backdrop"
          onClick={event => {
            if (event.target === event.currentTarget && !submittingSession) {
              setShowSessionForm(false)
            }
          }}
        >
          <form className="offer-modal" onSubmit={handleSessionSubmit}>
            <button
              type="button"
              className="modal-close"
              onClick={() => setShowSessionForm(false)}
              disabled={submittingSession}
            >
              ×
            </button>

            <div className="eyebrow">START LEARNING TOGETHER</div>
            <h2>Request a <span>session.</span></h2>
            <p>
              Your request will be sent to {selectedTutor.name} for{' '}
              {selectedTutor.subject}.
            </p>

            <label>
              Your name
              <input value={user.name} readOnly />
            </label>

            <label>
              Message (optional)
              <textarea
                value={sessionForm.message}
                onChange={event =>
                  setSessionForm({
                    ...sessionForm,
                    message: event.target.value,
                  })
                }
                placeholder="What would you like help with?"
                rows="3"
              />
            </label>

            <button
              type="submit"
              className="primary-button full-button"
              disabled={submittingSession}
            >
              {submittingSession ? 'Sending request...' : 'Send session request →'}
            </button>

            <small className="form-footnote">
              Your request will be saved with Pending status.
            </small>
          </form>
        </div>
      )}

      {showForm && isTutor && (
        <div
          className="modal-backdrop"
          onClick={event => {
            if (event.target === event.currentTarget && !saving) {
              setShowForm(false)
            }
          }}
        >
          <form className="offer-modal" onSubmit={handleSubmit}>
            <button
              type="button"
              className="modal-close"
              onClick={() => setShowForm(false)}
              disabled={saving}
            >
              ×
            </button>

            <div className="eyebrow">SHARE WHAT YOU KNOW</div>
            <h2>Become a <span>peer mentor.</span></h2>
            <p>Publishing as {user.name}.</p>

            <label>
              Subject you can teach
              <input
                required
                value={form.subject}
                onChange={event =>
                  setForm({ ...form, subject: event.target.value })
                }
                placeholder="e.g. Java, DBMS, Statistics"
              />
            </label>

            <div className="form-row">
              <label>
                Year of study
                <select
                  value={form.year}
                  onChange={event =>
                    setForm({ ...form, year: event.target.value })
                  }
                >
                  <option>1st Year</option>
                  <option>2nd Year</option>
                  <option>3rd Year</option>
                  <option>4th Year</option>
                </select>
              </label>

              <label>
                Teaching mode
                <select
                  value={form.mode}
                  onChange={event =>
                    setForm({ ...form, mode: event.target.value })
                  }
                >
                  <option>Online</option>
                  <option>In-person</option>
                </select>
              </label>
            </div>

            <label>
              What can you help with?
              <textarea
                value={form.description}
                onChange={event =>
                  setForm({ ...form, description: event.target.value })
                }
                placeholder="Describe the topics you can teach..."
                rows="3"
              />
            </label>

            <button
              type="submit"
              className="primary-button full-button"
              disabled={saving}
            >
              {saving ? 'Publishing...' : 'Publish tutoring offer →'}
            </button>

            <small className="form-footnote">
              Your tutoring offer is saved to the PeerLearn database.
            </small>
          </form>
        </div>
      )}
    </>
  )
}

export default App