
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 5000;
const STARTER_CREDITS = 10;
const SESSION_COST = 10;
const COMPLETION_REWARD = 10;

app.use(cors());
app.use(express.json());

if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
    console.error('MONGODB_URI and JWT_SECRET must be set in server/.env');
    process.exit(1);
}

const client = new MongoClient(process.env.MONGODB_URI);

let usersCollection;
let tutorsCollection;
let sessionsCollection;

function createToken(user) {
    return jwt.sign(
        {
            userId: user._id.toString(),
            role: user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: '2h' }
    );
}

function safeUser(user) {
    return {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        credits: user.credits ?? 0
    };
}

function authenticateToken(req, res, next) {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({
            message: 'Please log in first.'
        });
    }

    try {
        req.user = jwt.verify(
            header.split(' ')[1],
            process.env.JWT_SECRET
        );

        next();
    } catch {
        return res.status(401).json({
            message: 'Your session has expired. Please log in again.'
        });
    }
}

function requireRole(role) {
    return (req, res, next) => {
        if (req.user.role !== role) {
            return res.status(403).json({
                message: `Only ${role} accounts can perform this action.`
            });
        }

        next();
    };
}

function normalizeStatus(status) {
    if (typeof status !== 'string') return '';

    const value = status.toLowerCase();

    if (value === 'accepted') return 'Accepted';
    if (value === 'rejected') return 'Rejected';
    if (value === 'pending') return 'Pending';
    if (value === 'completed') return 'Completed';
    if (value === 'cancelled' || value === 'canceled') {
        return 'Cancelled';
    }

    return '';
}

function validMeetUrl(value) {
    if (typeof value !== 'string') return false;

    try {
        const url = new URL(value);

        return url.protocol === 'https:' &&
            url.hostname === 'meet.google.com' &&
            /^\/[a-z0-9-]+\/?$/i.test(url.pathname);
    } catch {
        return false;
    }
}

app.get('/', (req, res) => {
    res.json({ message: 'PeerLearn API is running' });
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'success',
        message: 'PeerLearn API is working!'
    });
});

// CREATE TUTOR PROFILE
// Both student and tutor accounts can publish a profile.


/* CREATE OR UPDATE TUTOR PROFILE */
app.post('/api/tutors', authenticateToken, async (req, res) => {
    try {
        const { subject, description, year, mode } = req.body || {};

        if (typeof subject !== 'string' || !subject.trim()) {
            return res.status(400).json({
                message: 'Please enter the subject you can teach.'
            });
        }

        const userId = req.user.userId;

        if (!ObjectId.isValid(userId)) {
            return res.status(401).json({
                message: 'Invalid user account. Please log in again.'
            });
        }

        // Get the real logged-in user's details from MongoDB.
        const account = await usersCollection.findOne({
            _id: new ObjectId(userId)
        });

        if (!account) {
            return res.status(404).json({
                message: 'User account not found. Please log in again.'
            });
        }

        const existingTutor = await tutorsCollection.findOne({
            ownerUserId: userId
        });

        const profileData = {
            name: account.name || 'Student',
            subject: subject.trim(),
            description: typeof description === 'string'
                ? description.trim()
                : '',
            year: typeof year === 'string' && year.trim()
                ? year.trim()
                : '2nd Year',
            mode: typeof mode === 'string' && mode.trim()
                ? mode.trim()
                : 'Online',
            updatedAt: new Date()
        };

        if (existingTutor) {
            await tutorsCollection.updateOne(
                { _id: existingTutor._id },
                { $set: profileData }
            );

            const updatedTutor = await tutorsCollection.findOne({
                _id: existingTutor._id
            });

            return res.status(200).json({
                message: 'Your tutor profile was updated successfully!',
                tutor: updatedTutor
            });
        }

        const newTutor = {
            ownerUserId: userId,
            ...profileData,
            rating: 5,
            createdAt: new Date()
        };

        const result = await tutorsCollection.insertOne(newTutor);

        return res.status(201).json({
            message: 'Tutor profile created successfully!',
            tutor: {
                ...newTutor,
                _id: result.insertedId
            }
        });
    } catch (error) {
        console.error('Create/update tutor profile error:', error);

        return res.status(500).json({
            message: 'Could not save tutor profile.'
        });
    }
});

 // REGISTER
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body || {};

        if (
            typeof name !== 'string' ||
            !name.trim() ||
            typeof email !== 'string' ||
            !email.trim() ||
            typeof password !== 'string' ||
            password.length < 6
        ) {
            return res.status(400).json({
                message: 'Enter your name, a valid email, and a password with at least 6 characters.'
            });
        }

        const accountRole = role || 'student';

        if (!['student', 'tutor'].includes(accountRole)) {
            return res.status(400).json({
                message: 'Role must be student or tutor.'
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await usersCollection.findOne({
            email: normalizedEmail
        });

        if (existingUser) {
            return res.status(409).json({
                message: 'An account with this email already exists. Please log in.'
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const newUser = {
            name: name.trim(),
            email: normalizedEmail,
            passwordHash,
            role: accountRole,
            credits: STARTER_CREDITS,
            createdAt: new Date()
        };

        const result = await usersCollection.insertOne(newUser);

        const savedUser = {
            ...newUser,
            _id: result.insertedId
        };

        return res.status(201).json({
            message: 'Account created successfully! You received 10 welcome credits.',
            token: createToken(savedUser),
            user: safeUser(savedUser)
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: 'An account with this email already exists. Please log in.'
            });
        }

        console.error('Registration error:', error.message);

        return res.status(500).json({
            message: 'Could not create your account. Please try again.'
        });
    }
});


// LOGIN
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body || {};

        if (
            typeof email !== 'string' ||
            typeof password !== 'string' ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                message: 'Email and password are required.'
            });
        }

        const user = await usersCollection.findOne({
            email: email.trim().toLowerCase()
        });

        if (!user) {
            return res.status(401).json({
                message: 'Incorrect email or password.'
            });
        }

        const passwordHash =
            user.passwordHash || user.password || user.hash;

        if (
            typeof passwordHash !== 'string' ||
            !await bcrypt.compare(password, passwordHash)
        ) {
            return res.status(401).json({
                message: 'Incorrect email or password.'
            });
        }

        if (!user.name || !['student', 'tutor'].includes(user.role)) {
            return res.status(401).json({
                message: 'This account has incomplete details.'
            });
        }

        if (typeof user.credits !== 'number') {
            await usersCollection.updateOne(
                { _id: user._id, credits: { $exists: false } },
                { $set: { credits: 10 } }
            );

            user.credits = 0;
        }

        return res.json({
            message: 'Login successful!',
            token: createToken(user),
            user: safeUser(user)
        });
    } catch (error) {
        console.error('Login error:', error.message);

        return res.status(500).json({
            message: 'Could not log in. Please try again.'
        });
    }
});

// GET LOGGED-IN USER
app.get('/api/me', authenticateToken, async (req, res) => {
    try {
        const user = await usersCollection.findOne({
            _id: new ObjectId(req.user.userId)
        });

        if (!user) {
            return res.status(404).json({
                message: 'User account not found.'
            });
        }

        return res.json({ user: safeUser(user) });
    } catch (error) {
        console.error('Fetch user error:', error.message);

        return res.status(500).json({
            message: 'Could not fetch user details.'
        });
    }
});

// GET CREDITS
app.get('/api/credits', authenticateToken, async (req, res) => {
    try {
        const user = await usersCollection.findOne(
            { _id: new ObjectId(req.user.userId) },
            { projection: { credits: 1 } }
        );

        if (!user) {
            return res.status(404).json({
                message: 'User account not found.'
            });
        }

        return res.json({ credits: user.credits ?? 0 });
    } catch (error) {
        console.error('Fetch credits error:', error.message);

        return res.status(500).json({
            message: 'Could not fetch learning credits.'
        });
    }
});

// GET ALL TUTOR PROFILES
app.get('/api/tutors', async (req, res) => {
    try {
        const list = await tutorsCollection
            .find({})
            .sort({ createdAt: -1 })
            .toArray();

        return res.json(list);
    } catch (error) {
        console.error('Fetch tutors error:', error.message);

        return res.status(500).json({
            message: 'Could not fetch tutors.'
        });
    }
});

// CREATE SESSION REQUEST
app.post(
    '/api/sessions',
    authenticateToken,
    requireRole('student'),
    async (req, res) => {
        const dbSession = client.startSession();

        try {
            const { tutorId, subject, message } = req.body || {};

            if (
                typeof tutorId !== 'string' ||
                !ObjectId.isValid(tutorId) ||
                typeof subject !== 'string' ||
                !subject.trim()
            ) {
                return res.status(400).json({
                    message: 'A valid tutor and subject are required.'
                });
            }

            let createdSession;

            await dbSession.withTransaction(async () => {
                const tutor = await tutorsCollection.findOne(
                    { _id: new ObjectId(tutorId) },
                    { session: dbSession }
                );

                if (!tutor || !tutor.ownerUserId) {
                    throw new Error('TUTOR_NOT_FOUND');
                }

                if (tutor.ownerUserId === req.user.userId) {
                    throw new Error('OWN_PROFILE');
                }

                const duplicate = await sessionsCollection.findOne(
                    {
                        studentUserId: req.user.userId,
                        tutorId,
                        status: 'Pending'
                    },
                    { session: dbSession }
                );

                if (duplicate) {
                    throw new Error('PENDING_EXISTS');
                }

                const student = await usersCollection.findOne(
                    { _id: new ObjectId(req.user.userId) },
                    { session: dbSession }
                );

                if (!student) {
                    throw new Error('STUDENT_NOT_FOUND');
                }

                const deduction = await usersCollection.updateOne(
                    {
                        _id: new ObjectId(req.user.userId),
                        credits: { $gte: SESSION_COST }
                    },
                    { $inc: { credits: -SESSION_COST } },
                    { session: dbSession }
                );

                if (deduction.modifiedCount !== 1) {
                    throw new Error('INSUFFICIENT_CREDITS');
                }

                const sessionData = {
                    studentUserId: req.user.userId,
                    tutorUserId: tutor.ownerUserId,
                    studentName: student.name,
                    tutorId,
                    tutorName: tutor.name,
                    subject: subject.trim(),
                    message: typeof message === 'string'
                        ? message.trim()
                        : '',
                    status: 'Pending',
                    creditsCost: SESSION_COST,
                    creditsRefunded: false,
                    scheduledAt: null,
                    meetUrl: null,
                    createdAt: new Date()
                };

                const result = await sessionsCollection.insertOne(
                    sessionData,
                    { session: dbSession }
                );

                sessionData._id = result.insertedId;
                createdSession = sessionData;
            });

            return res.status(201).json({
                message: 'Session request submitted. 10 credits deducted.',
                session: createdSession,
                creditsDeducted: SESSION_COST
            });
        } catch (error) {
            if (error.message === 'TUTOR_NOT_FOUND') {
                return res.status(404).json({
                    message: 'Tutor profile not found or not linked to an account.'
                });
            }

            if (error.message === 'OWN_PROFILE') {
                return res.status(400).json({
                    message: 'You cannot request a session from your own profile.'
                });
            }

            if (error.message === 'PENDING_EXISTS') {
                return res.status(409).json({
                    message: 'You already have a pending request for this tutor.'
                });
            }

            if (error.message === 'STUDENT_NOT_FOUND') {
                return res.status(404).json({
                    message: 'Student account not found.'
                });
            }

            if (error.message === 'INSUFFICIENT_CREDITS') {
                return res.status(400).json({
                    message: 'Not enough credits. You need 10 credits to request a session.'
                });
            }

            console.error('Create session error:', error.message);

            return res.status(500).json({
                message: 'Could not submit session request.'
            });
        } finally {
            await dbSession.endSession();
        }
    }
);

// GET SESSION REQUESTS
app.get('/api/sessions', authenticateToken, async (req, res) => {
    try {
        const filter = req.user.role === 'tutor'
            ? { tutorUserId: req.user.userId }
            : { studentUserId: req.user.userId };

        const list = await sessionsCollection
            .find(filter)
            .sort({ createdAt: -1 })
            .toArray();

        return res.json(list);
    } catch (error) {
        console.error('Fetch sessions error:', error.message);

        return res.status(500).json({
            message: 'Could not fetch session requests.'
        });
    }
});

// ACCEPT OR REJECT SESSION REQUEST
app.patch(
    '/api/sessions/:id/status',
    authenticateToken,
    requireRole('tutor'),
    async (req, res) => {
        const dbSession = client.startSession();

        try {
            const { id } = req.params;
            const status = normalizeStatus(req.body?.status);
            const { scheduledAt, meetUrl } = req.body || {};

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    message: 'Invalid session request ID.'
                });
            }

            if (!['Accepted', 'Rejected'].includes(status)) {
                return res.status(400).json({
                    message: 'Status must be Accepted or Rejected.'
                });
            }

            const updates = {
                status,
                updatedAt: new Date()
            };

            if (status === 'Accepted') {
                if (!scheduledAt || !validMeetUrl(meetUrl)) {
                    return res.status(400).json({
                        message: 'A future schedule and valid Google Meet link are required.'
                    });
                }

                const date = new Date(scheduledAt);

                if (Number.isNaN(date.getTime()) || date <= new Date()) {
                    return res.status(400).json({
                        message: 'Choose a valid future date and time.'
                    });
                }

                updates.scheduledAt = date;
                updates.meetUrl = meetUrl.trim();
            } else {
                updates.scheduledAt = null;
                updates.meetUrl = null;
            }

            let refundGiven = 0;

            await dbSession.withTransaction(async () => {
                const existing = await sessionsCollection.findOne(
                    {
                        _id: new ObjectId(id),
                        tutorUserId: req.user.userId,
                        status: 'Pending'
                    },
                    { session: dbSession }
                );

                if (!existing) {
                    throw new Error('PENDING_NOT_FOUND');
                }

                const result = await sessionsCollection.updateOne(
                    {
                        _id: existing._id,
                        tutorUserId: req.user.userId,
                        status: 'Pending'
                    },
                    { $set: updates },
                    { session: dbSession }
                );

                if (result.modifiedCount !== 1) {
                    throw new Error('PENDING_NOT_FOUND');
                }

                if (
                    status === 'Rejected' &&
                    existing.creditsCost === SESSION_COST &&
                    existing.creditsRefunded !== true
                ) {
                    const refund = await usersCollection.updateOne(
                        { _id: new ObjectId(existing.studentUserId) },
                        { $inc: { credits: SESSION_COST } },
                        { session: dbSession }
                    );

                    if (refund.matchedCount !== 1) {
                        throw new Error('STUDENT_NOT_FOUND');
                    }

                    await sessionsCollection.updateOne(
                        { _id: existing._id },
                        {
                            $set: {
                                creditsRefunded: true,
                                refundedAt: new Date()
                            }
                        },
                        { session: dbSession }
                    );

                    refundGiven = SESSION_COST;
                }
            });

            return res.json({
                message: status === 'Accepted'
                    ? 'Session accepted successfully!'
                    : 'Session rejected successfully!',
                status,
                creditsRefunded: refundGiven
            });
        } catch (error) {
            if (error.message === 'PENDING_NOT_FOUND') {
                return res.status(404).json({
                    message: 'Pending request not found or it has already been updated.'
                });
            }

            if (error.message === 'STUDENT_NOT_FOUND') {
                return res.status(404).json({
                    message: 'Student account not found for refund.'
                });
            }

            console.error('Update session error:', error.message);

            return res.status(500).json({
                message: 'Could not update session request.'
            });
        } finally {
            await dbSession.endSession();
        }
    }
);

// CANCEL SESSION REQUEST
app.patch(
    '/api/sessions/:id/cancel',
    authenticateToken,
    requireRole('student'),
    async (req, res) => {
        const dbSession = client.startSession();

        try {
            if (!ObjectId.isValid(req.params.id)) {
                return res.status(400).json({
                    message: 'Invalid session request ID.'
                });
            }

            let refundGiven = 0;

            await dbSession.withTransaction(async () => {
                const existing = await sessionsCollection.findOne(
                    {
                        _id: new ObjectId(req.params.id),
                        studentUserId: req.user.userId,
                        status: 'Pending'
                    },
                    { session: dbSession }
                );

                if (!existing) {
                    throw new Error('PENDING_NOT_FOUND');
                }

                const result = await sessionsCollection.updateOne(
                    {
                        _id: existing._id,
                        studentUserId: req.user.userId,
                        status: 'Pending'
                    },
                    {
                        $set: {
                            status: 'Cancelled',
                            cancelledAt: new Date(),
                            updatedAt: new Date()
                        }
                    },
                    { session: dbSession }
                );

                if (result.modifiedCount !== 1) {
                    throw new Error('PENDING_NOT_FOUND');
                }

                if (
                    existing.creditsCost === SESSION_COST &&
                    existing.creditsRefunded !== true
                ) {
                    const refund = await usersCollection.updateOne(
                        { _id: new ObjectId(existing.studentUserId) },
                        { $inc: { credits: SESSION_COST } },
                        { session: dbSession }
                    );

                    if (refund.matchedCount !== 1) {
                        throw new Error('STUDENT_NOT_FOUND');
                    }

                    await sessionsCollection.updateOne(
                        { _id: existing._id },
                        {
                            $set: {
                                creditsRefunded: true,
                                refundedAt: new Date()
                            }
                        },
                        { session: dbSession }
                    );

                    refundGiven = SESSION_COST;
                }
            });

            return res.json({
                message: 'Session cancelled successfully.',
                creditsRefunded: refundGiven
            });
        } catch (error) {
            if (error.message === 'PENDING_NOT_FOUND') {
                return res.status(404).json({
                    message: 'Pending request not found or it has already been updated.'
                });
            }

            if (error.message === 'STUDENT_NOT_FOUND') {
                return res.status(404).json({
                    message: 'Student account not found for refund.'
                });
            }

            console.error('Cancel session error:', error.message);

            return res.status(500).json({
                message: 'Could not cancel session.'
            });
        } finally {
            await dbSession.endSession();
        }
    }
);

// COMPLETE SESSION AND REWARD CREDITS
app.patch(
    '/api/sessions/:id/complete',
    authenticateToken,
    requireRole('tutor'),
    async (req, res) => {
        const dbSession = client.startSession();

        try {
            if (!ObjectId.isValid(req.params.id)) {
                return res.status(400).json({
                    message: 'Invalid session request ID.'
                });
            }

            let credits = 0;

            await dbSession.withTransaction(async () => {
                const result = await sessionsCollection.updateOne(
                    {
                        _id: new ObjectId(req.params.id),
                        tutorUserId: req.user.userId,
                        status: 'Accepted'
                    },
                    {
                        $set: {
                            status: 'Completed',
                            completedAt: new Date(),
                            updatedAt: new Date()
                        }
                    },
                    { session: dbSession }
                );

                if (result.modifiedCount !== 1) {
                    throw new Error('SESSION_NOT_ACCEPTED');
                }

                const reward = await usersCollection.updateOne(
                    { _id: new ObjectId(req.user.userId) },
                    { $inc: { credits: COMPLETION_REWARD } },
                    { session: dbSession }
                );

                if (reward.matchedCount !== 1) {
                    throw new Error('TUTOR_NOT_FOUND');
                }

                const tutor = await usersCollection.findOne(
                    { _id: new ObjectId(req.user.userId) },
                    {
                        projection: { credits: 1 },
                        session: dbSession
                    }
                );

                credits = tutor.credits ?? 0;
            });

            return res.json({
                message: 'Session completed successfully!',
                status: 'Completed',
                creditsEarned: COMPLETION_REWARD,
                credits
            });
        } catch (error) {
            if (error.message === 'SESSION_NOT_ACCEPTED') {
                return res.status(409).json({
                    message: 'Only an accepted session can be completed. A completed session cannot earn credits again.'
                });
            }

            if (error.message === 'TUTOR_NOT_FOUND') {
                return res.status(404).json({
                    message: 'Tutor account not found.'
                });
            }

            console.error('Complete session error:', error.message);

            return res.status(500).json({
                message: 'Could not complete session.'
            });
        } finally {
            await dbSession.endSession();
        }
    }
);

// START SERVER
async function startServer() {
    try {
        await client.connect();

        const db = client.db('PeerLearn');

        await db.command({ ping: 1 });

        usersCollection = db.collection('users');
        tutorsCollection = db.collection('tutors');
        sessionsCollection = db.collection('sessions');

        await usersCollection.createIndex(
            { email: 1 },
            { unique: true }
        );

        console.log('MongoDB connected successfully!');

        app.listen(PORT, () => {
            console.log(`PeerLearn server running at http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Server startup failed:', error.message);
        process.exit(1);
    }
}

startServer();
