
import { useCallback, useEffect, useState } from 'react';

const API = 'http://localhost:5000/api';

export default function SessionRequests() {
    const [sessions, setSessions] = useState([]);
    const [credits, setCredits] = useState(0);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const token = localStorage.getItem('token');
    const userRole = (
        localStorage.getItem('role') ||
        JSON.parse(localStorage.getItem('user') || '{}').role ||
        ''
    ).toLowerCase();

    const loadData = useCallback(async () => {
        try {
            setError('');

            const headers = {
                Authorization: `Bearer ${token}`
            };

            const [sessionResponse, creditResponse] = await Promise.all([
                fetch(`${API}/sessions`, { headers }),
                fetch(`${API}/credits`, { headers })
            ]);

            const sessionData = await sessionResponse.json();
            const creditData = await creditResponse.json();

            if (!sessionResponse.ok) {
                throw new Error(sessionData.message || 'Could not load sessions');
            }

            if (!creditResponse.ok) {
                throw new Error(creditData.message || 'Could not load credits');
            }

            setSessions(Array.isArray(sessionData) ? sessionData : []);
            setCredits(creditData.credits ?? 0);
        } catch (err) {
            setError(err.message || 'Could not load data');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    async function updateStatus(session, status) {
        setBusyId(session._id);
        setError('');
        setMessage('');

        try {
            let body = { status };

            if (status === 'accepted') {
                const scheduledAt = window.prompt(
                    'Enter the session date and time in this format: YYYY-MM-DDTHH:mm'
                );

                if (!scheduledAt) return;

                const date = new Date(scheduledAt);

                if (Number.isNaN(date.getTime()) || date <= new Date()) {
                    throw new Error('Enter a valid future date and time.');
                }

                const meetUrl = window.prompt(
                    'Enter the Google Meet link'
                );

                if (!meetUrl) return;

                body = {
                    status: 'Accepted',
                    scheduledAt: date.toISOString(),
                    meetUrl: meetUrl.trim()
                };
            } else {
                body.status = 'Rejected';
            }

            const response = await fetch(
                `${API}/sessions/${session._id}/status`,
                {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify(body)
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Could not update session');
            }

            setMessage(
                status === 'accepted'
                    ? 'Session accepted successfully.'
                    : `Session rejected. ${data.creditsRefunded || 0} credits refunded.`
            );

            await loadData();
        } catch (err) {
            setError(err.message || 'Something went wrong');
        } finally {
            setBusyId('');
        }
    }

    async function cancelSession(session) {
        const confirmed = window.confirm(
            'Cancel this pending session request? Your 10 credits will be refunded if eligible.'
        );

        if (!confirmed) return;

        setBusyId(session._id);
        setError('');
        setMessage('');

        try {
            const response = await fetch(
                `${API}/sessions/${session._id}/cancel`,
                {
                    method: 'PATCH',
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Could not cancel session');
            }

            setMessage(
                `Session cancelled. ${data.creditsRefunded || 0} credits refunded.`
            );

            await loadData();
        } catch (err) {
            setError(err.message || 'Could not cancel session');
        } finally {
            setBusyId('');
        }
    }

    async function completeSession(session) {
        const confirmed = window.confirm(
            'Mark this session as completed? You will receive 10 credits.'
        );

        if (!confirmed) return;

        setBusyId(session._id);
        setError('');
        setMessage('');

        try {
            const response = await fetch(
                `${API}/sessions/${session._id}/complete`,
                {
                    method: 'PATCH',
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Could not complete session');
            }

            setMessage(`Session completed. You earned ${data.creditsEarned || 10} credits.`);
            await loadData();
        } catch (err) {
            setError(err.message || 'Could not complete session');
        } finally {
            setBusyId('');
        }
    }

    const styles = {
        container: {
            maxWidth: '1000px',
            margin: '0 auto',
            padding: '24px',
            fontFamily: 'Arial, sans-serif',
            color: '#1f2937'
        },
        heading: {
            fontSize: '28px',
            marginBottom: '8px'
        },
        balance: {
            background: '#eef2ff',
            padding: '16px 20px',
            borderRadius: '12px',
            margin: '20px 0',
            fontSize: '18px',
            fontWeight: 'bold'
        },
        card: {
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '16px',
            background: '#ffffff'
        },
        row: {
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
            marginTop: '16px'
        },
        button: {
            border: 'none',
            borderRadius: '7px',
            padding: '10px 15px',
            cursor: 'pointer',
            color: '#ffffff',
            fontWeight: 'bold'
        },
        green: {
            background: '#15803d'
        },
        red: {
            background: '#dc2626'
        },
        blue: {
            background: '#2563eb'
        },
        gray: {
            background: '#6b7280'
        },
        error: {
            background: '#fee2e2',
            color: '#991b1b',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '16px'
        },
        success: {
            background: '#dcfce7',
            color: '#166534',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '16px'
        },
        muted: {
            color: '#6b7280'
        },
        link: {
            color: '#2563eb',
            fontWeight: 'bold'
        },
        status: {
            display: 'inline-block',
            padding: '5px 10px',
            borderRadius: '20px',
            background: '#f3f4f6',
            fontSize: '13px',
            fontWeight: 'bold'
        }
    };

    if (loading) {
        return <div style={styles.container}>Loading sessions...</div>;
    }

    return (
        <div style={styles.container}>
            <h1 style={styles.heading}>Session Requests</h1>

            <div style={styles.balance}>
                Learning Credits: {credits}
            </div>

            {error && <div style={styles.error}>{error}</div>}
            {message && <div style={styles.success}>{message}</div>}

            {sessions.length === 0 ? (
                <p style={styles.muted}>No session requests found.</p>
            ) : (
                sessions.map((session) => {
                    const status = String(session.status || '').toLowerCase();
                    const busy = busyId === session._id;
                    const meetUrl = session.meetUrl;

                    return (
                        <div key={session._id} style={styles.card}>
                            <h3>{session.subject || 'Learning Session'}</h3>

                            <p>
                                <strong>Student:</strong>{' '}
                                {session.studentName || 'Student'}
                            </p>

                            <p>
                                <strong>Tutor:</strong>{' '}
                                {session.tutorName || 'Tutor'}
                            </p>

                            {session.message && (
                                <p>
                                    <strong>Message:</strong> {session.message}
                                </p>
                            )}

                            <p>
                                <strong>Status:</strong>{' '}
                                <span style={styles.status}>
                                    {session.status || 'Pending'}
                                </span>
                            </p>

                            <p>
                                <strong>Credits:</strong>{' '}
                                {session.creditsCost ?? 10}
                            </p>

                            {session.scheduledAt && (
                                <p>
                                    <strong>Scheduled:</strong>{' '}
                                    {new Date(session.scheduledAt).toLocaleString()}
                                </p>
                            )}

                            <p>
                                <strong>Google Meet:</strong>{' '}
                                {(status === 'accepted' || status === 'completed') && meetUrl ? (
                                    <a
                                        href={meetUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={styles.link}
                                    >
                                        Join Google Meet
                                    </a>
                                ) : status === 'accepted' || status === 'completed' ? (
                                    <span style={styles.muted}>Link not provided</span>
                                ) : (
                                    <span style={styles.muted}>Not scheduled</span>
                                )}
                            </p>

                            <div style={styles.row}>
                                {userRole === 'tutor' && status === 'pending' && (
                                    <>
                                        <button
                                            style={{ ...styles.button, ...styles.green }}
                                            disabled={busy}
                                            onClick={() => updateStatus(session, 'accepted')}
                                        >
                                            {busy ? 'Please wait...' : 'Accept'}
                                        </button>

                                        <button
                                            style={{ ...styles.button, ...styles.red }}
                                            disabled={busy}
                                            onClick={() => updateStatus(session, 'rejected')}
                                        >
                                            {busy ? 'Please wait...' : 'Reject'}
                                        </button>
                                    </>
                                )}

                                {userRole === 'student' && status === 'pending' && (
                                    <button
                                        style={{ ...styles.button, ...styles.red }}
                                        disabled={busy}
                                        onClick={() => cancelSession(session)}
                                    >
                                        {busy ? 'Please wait...' : 'Cancel Request'}
                                    </button>
                                )}

                                {userRole === 'tutor' && status === 'accepted' && (
                                    <button
                                        style={{ ...styles.button, ...styles.blue }}
                                        disabled={busy}
                                        onClick={() => completeSession(session)}
                                    >
                                        {busy ? 'Please wait...' : 'Mark Completed'}
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
}
