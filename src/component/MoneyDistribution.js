import React, { useState, useEffect } from 'react';
import '../assets/MoneyDistribution.css';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {jwtDecode} from 'jwt-decode';

function MoneyDistribution({ onLogout }) {
    const [amount, setAmount] = useState('');
    const [friends, setFriends] = useState('');
    const [friendEmails, setFriendEmails] = useState('');
    const [spender, setSpender] = useState('');
    const [description, setDescription] = useState('');
    const [distribution, setDistribution] = useState({});
    const [history, setHistory] = useState([]);
    const [userId, setUserId] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (!token) {
            navigate('/login');
        } else {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            try {
                const decodedToken = jwtDecode(token);
                if (decodedToken && decodedToken.id) {
                    setUserId(decodedToken.id);
                    fetchDistributionData(decodedToken.id);
                } else {
                    console.error('Failed to decode JWT token.');
                }
            } catch (error) {
                console.error('Error decoding JWT token:', error);
            }
        }
    }, [navigate]);

    const fetchDistributionData = async (userId) => {
        try {
            const response = await axios.get(`${process.env.REACT_APP_API_URL}/distributions/${userId}`);
            const { amount, friends, spender, description, distribution } = response.data;

            const parsedDistribution = typeof distribution === 'object' ? distribution : JSON.parse(distribution || '{}');

            setAmount(amount);
            setFriends(friends);
            setSpender(spender);
            setDescription(description);
            setDistribution(parsedDistribution);
        } catch (error) {
            console.error('Failed to fetch distribution data:', error);
        }
    };

    const handleDistribute = (e) => {
        e.preventDefault();
        const friendsArray = friends.split(',').map(name => name.trim());
        distributeMoney(parseFloat(amount), friendsArray, spender, description);
        setHistory([...history, { amount, friends: friendsArray, spender, description, distribution: JSON.parse(JSON.stringify(distribution)) }]);
    };

    const distributeMoney = (amount, friends, spender, description) => {
        const newDistribution = JSON.parse(JSON.stringify(distribution));
        const amountPerFriend = amount / friends.length;

        friends.forEach(friend => {
            if (!newDistribution[friend]) {
                newDistribution[friend] = {};
            }
            if (!newDistribution[friend][spender]) {
                newDistribution[friend][spender] = [];
            }
            newDistribution[friend][spender].push({ amount: amountPerFriend, description, paid: false });
        });

        setDistribution(newDistribution);
    };

    const saveDistributionToDatabase = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const response = await axios.post(`${process.env.REACT_APP_API_URL}/distribution`, {
                user_id: userId,
                amount,
                friends,
                friendEmails,
                spender,
                description,
                distribution: JSON.stringify(distribution)
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            console.log('Distribution saved successfully', response.data);
        } catch (error) {
            console.error('Failed to save distribution:', error);
        }
    };

    const sendDistributionEmail = async () => {
        if (!friends || !friendEmails) {
            console.error('No friends or emails specified.');
            return;
        }

        const friendsArray = friends.split(',').map(name => name.trim());
        const emailArray = friendEmails.split(',').map(email => email.trim());

        if (friendsArray.length === 0 || emailArray.length === 0) {
            console.error('Friends list or emails list is empty.');
            return;
        }

        if (friendsArray.length !== emailArray.length) {
            console.error('Friends and emails count do not match.');
            return;
        }

        try {
            const response = await axios.post(`${process.env.REACT_APP_API_URL}/send-distribution-email`, {
                friends: friendsArray,
                friendEmails: emailArray,
                distribution
            });
            console.log(response.data);
        } catch (error) {
            console.error('Failed to send email:', error);
        }
    };

    const editEntry = (friend, spender, index) => {
        const entry = distribution[friend][spender][index];
        const newAmount = parseFloat(prompt('Enter new amount:', entry.amount));
        const newDescription = prompt('Enter new description:', entry.description);

        if (!isNaN(newAmount) && newDescription !== null) {
            const newDistribution = JSON.parse(JSON.stringify(distribution));
            newDistribution[friend][spender][index] = { amount: newAmount, description: newDescription, paid: entry.paid };
            setDistribution(newDistribution);
        } else {
            alert('Invalid input. Please try again.');
        }
    };

    const togglePaidStatus = (friend, spender, index) => {
        const newDistribution = JSON.parse(JSON.stringify(distribution));
        newDistribution[friend][spender][index].paid = !newDistribution[friend][spender][index].paid;
        setDistribution(newDistribution);
    };

    const undoLastDistribution = () => {
        if (history.length === 0) return;
        const lastDistribution = history[history.length - 1];
        setAmount(lastDistribution.amount);
        setFriends(lastDistribution.friends.join(', '));
        setSpender(lastDistribution.spender);
        setDescription(lastDistribution.description);
        setDistribution(lastDistribution.distribution);
        setHistory(history.slice(0, -1));
    };

    return (
        <div className='Mdistribution'>
            <h1>Friend Money Distribution</h1>
            <button onClick={onLogout} className="logout-button">Logout</button>
            <form onSubmit={handleDistribute}>
                <div className='form-group'>
                    <label>Amount:</label>
                    <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                </div>
                <div className='form-group'>
                    <label>Friends (comma separated):</label>
                    <input type="text" value={friends} onChange={(e) => setFriends(e.target.value)} required />
                </div>
                <div className='form-group'>
                    <label>Friend Emails (comma separated):</label>
                    <input type="text" value={friendEmails} onChange={(e) => setFriendEmails(e.target.value)} required />
                </div>
                <div className='form-group'>
                    <label>Who is spending:</label>
                    <input type="text" value={spender} onChange={(e) => setSpender(e.target.value)} required />
                </div>
                <div className='form-group'>
                    <label>Description:</label>
                    <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} required />
                </div>
                <div className='buttons_dist'>
                    <button type="submit">Distribute</button>
                    <button type="button" onClick={undoLastDistribution} disabled={history.length === 0}>Undo Last Distribution</button>
                    <button type="button" onClick={saveDistributionToDatabase}>Save</button>
                    <button type="button" onClick={sendDistributionEmail}>Send Email</button>
                </div>
            </form>
            <h2>Distribution Details</h2>
            <div>
                {Object.keys(distribution).length === 0 ? (
                    <p>No distribution data available.</p>
                ) : (
                    Object.keys(distribution).map(friend => (
                        <div key={friend} className="friend-details">
                            <h3>{friend}:</h3>
                            <ul>
                                {Object.keys(distribution[friend]).map(spender => {
                                    let total = 0;
                                    return (
                                        <li key={spender}>
                                            {spender}:
                                            <ul>
                                                {distribution[friend][spender].map((entry, index) => {
                                                    if (!entry.paid) total += entry.amount;
                                                    return (
                                                        <li key={index} style={{ textDecoration: entry.paid ? 'line-through' : 'none' }}>
                                                            {spender} paid for {entry.description}: {entry.amount.toFixed(2)}
                                                            <span className="edit-button" onClick={() => editEntry(friend, spender, index)}>Edit</span>
                                                            <span className="edit-button" onClick={() => togglePaidStatus(friend, spender, index)}>
                                                                {entry.paid ? 'Mark as Due' : 'Mark as Paid'}
                                                            </span>
                                                            {entry.paid ? <strong> (Paid)</strong> : <strong> (Due)</strong>}
                                                        </li>
                                                    );
                                                })}
                                                <li><strong>Total amount due by {spender}: {total.toFixed(2)}</strong></li>
                                            </ul>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default MoneyDistribution;
