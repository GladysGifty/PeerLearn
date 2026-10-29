
require('dotenv').config()

const express = require('express')
const cors = require('cors')
const { MongoClient, ObjectId } = require('mongodb')

const app = express()
const PORT = 5000

app.use(cors())
app.use(express.json())

const client = new MongoClient(process.env.MONGODB_URI)

let tutorsCollection
let sessionsCollection

app.get('/', (req, res) => {
  res.send('PeerLearn backend is running successfully!')
})

app.get('/api/health', (req, res) => {
  res.json({
    status: 'success',
    message: 'PeerLearn API is working!'
  })
})

app.get('/api/tutors', async (req, res) => {
  try {
    const tutors = await tutorsCollection
      .find()
      .sort({ _id: -1 })
      .toArray()

    res.json(tutors)
  } catch (error) {
    console.error(error.message)
    res.status(500).json({ message: 'Could not fetch tutors' })
  }
})

app.post('/api/tutors', async (req, res) => {
  try {
    const { name, subject, description, year, mode } = req.body

    if (
      typeof name !== 'string' || !name.trim() ||
      typeof subject !== 'string' || !subject.trim()
    ) {
      return res.status(400).json({
        message: 'Name and subject are required'
      })
    }

    const tutor = {
      name: name.trim(),
      subject: subject.trim(),
      description: typeof description === 'string'
        ? description.trim()
        : '',
      year: year || '2nd Year',
      mode: mode || 'Online',
      rating: 5.0,
      createdAt: new Date()
    }

    const result = await tutorsCollection.insertOne(tutor)

    res.status(201).json({
      message: 'Tutor offer published successfully!',
      tutor: {
        ...tutor,
        _id: result.insertedId
      }
    })
  } catch (error) {
    console.error(error.message)
    res.status(500).json({
      message: 'Could not publish tutor offer'
    })
  }
})

app.get('/api/sessions', async (req, res) => {
  try {
    const sessions = await sessionsCollection
      .find()
      .sort({ _id: -1 })
      .toArray()

    res.json(sessions)
  } catch (error) {
    console.error(error.message)
    res.status(500).json({
      message: 'Could not fetch session requests'
    })
  }
})

app.post('/api/sessions', async (req, res) => {
  try {
    const {
      studentName,
      tutorId,
      tutorName,
      subject,
      message
    } = req.body

    if (
      typeof studentName !== 'string' || !studentName.trim() ||
      typeof tutorId !== 'string' || !tutorId.trim() ||
      typeof tutorName !== 'string' || !tutorName.trim() ||
      typeof subject !== 'string' || !subject.trim()
    ) {
      return res.status(400).json({
        message: 'Student name, tutor, and subject are required'
      })
    }

    // Prevent the same named student from creating
    // another identical request while one is Pending.
    const duplicate = await sessionsCollection.findOne({
      studentName: {
        $regex: `^${studentName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
        $options: 'i'
      },
      tutorId: tutorId.trim(),
      subject: {
        $regex: `^${subject.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
        $options: 'i'
      },
      status: 'Pending'
    })

    if (duplicate) {
      return res.status(409).json({
        message: 'You already have a pending request for this tutor and subject.'
      })
    }

    const session = {
      studentName: studentName.trim(),
      tutorId: tutorId.trim(),
      tutorName: tutorName.trim(),
      subject: subject.trim(),
      message: typeof message === 'string' ? message.trim() : '',
      status: 'Pending',
      createdAt: new Date()
    }

    const result = await sessionsCollection.insertOne(session)

    res.status(201).json({
      message: 'Session request submitted successfully!',
      session: {
        ...session,
        _id: result.insertedId
      }
    })
  } catch (error) {
    console.error(error.message)
    res.status(500).json({
      message: 'Could not submit session request'
    })
  }
})

// Tutor can accept or reject a session request.
app.patch('/api/sessions/:id/status', async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid session request ID'
      })
    }

    if (!['Accepted', 'Rejected'].includes(status)) {
      return res.status(400).json({
        message: 'Status must be Accepted or Rejected'
      })
    }

    const result = await sessionsCollection.updateOne(
      {
        _id: new ObjectId(id),
        status: 'Pending'
      },
      {
        $set: { status }
      }
    )

    if (result.matchedCount === 0) {
      return res.status(404).json({
        message: 'Pending request not found. It may already be processed.'
      })
    }

    res.json({
      message: `Session request ${status.toLowerCase()} successfully!`,
      status
    })
  } catch (error) {
    console.error(error.message)
    res.status(500).json({
      message: 'Could not update session status'
    })
  }
})

async function startServer() {
  try {
    await client.connect()

    const db = client.db('PeerLearn')

    await db.command({ ping: 1 })

    tutorsCollection = db.collection('tutors')
    sessionsCollection = db.collection('sessions')

    console.log('MongoDB connected successfully!')

    app.listen(PORT, () => {
      console.log(`PeerLearn server running at http://localhost:${PORT}`)
    })
  } catch (error) {
    console.error('Server startup failed:', error.message)
    process.exitCode = 1
  }
}

startServer()
