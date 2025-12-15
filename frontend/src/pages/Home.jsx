
import { useEffect, useState } from 'react';

const Home = () => {
    const [user, setUser] = useState(null);

    useEffect(() => {
        const userData = JSON.parse(localStorage.getItem('user'));
        setUser(userData);
    }, []);

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Welcome to Gate Pass Management</h1>
            
            {user && (
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-2xl font-semibold mb-4">User Details</h2>
                    <div className="space-y-2">
                        <p><span className="font-medium">User Type:</span> {user.userType}</p>
                        <p><span className="font-medium">User ID:</span> {user.userId}</p>
                        <p><span className="font-medium">Name:</span> {user.name}</p>
                        <p><span className="font-medium">Service No:</span> {user.serviceNo}</p>
                        <p><span className="font-medium">Designation:</span> {user.designation}</p>
                        <p><span className="font-medium">Section:</span> {user.section}</p>
                        <p><span className="font-medium">Group:</span> {user.group}</p>
                        <p><span className="font-medium">Contact No:</span> {user.contactNo}</p>
                        <p><span className="font-medium">Role:</span> {user.role}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Home;
