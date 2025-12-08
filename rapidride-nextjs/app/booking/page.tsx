'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function BookingPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/');
            return;
        }
        const fetchUser = async () => {
            try {
                const res = await fetch(`${API_URL}/auth/me`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                if (!res.ok) {
                    router.push('/');
                    return;
                }
                const data = await res.json();
                setUser(data.data);
            } catch (err) {
                router.push('/');
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, [router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M13 2L3 14h8l-2 8 10-12h-8l2-8z" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">RapidRide</h1>
                        <p className="text-sm text-gray-600">Welcome back, {user?.name || user?.email}!</p>
                    </div>
                </div>
                <button
                    className="text-sm text-gray-700 underline"
                    onClick={() => {
                        localStorage.removeItem('token');
                        router.push('/');
                    }}
                >
                    Logout
                </button>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-6 py-12">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
                            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">
                            Authentication Successful!
                        </h2>
                        <p className="text-gray-600 max-w-md mx-auto">
                            You are now logged in. This is your protected booking page.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
                        {/* Feature Cards */}
                        <div className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                            <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center mb-4">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <h3 className="font-semibold text-gray-900 mb-2">Fast Booking</h3>
                            <p className="text-sm text-gray-600">Book your ride in seconds with our streamlined process.</p>
                        </div>

                        <div className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                            <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center mb-4">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </div>
                            <h3 className="font-semibold text-gray-900 mb-2">Safe Rides</h3>
                            <p className="text-sm text-gray-600">Your safety is our top priority with verified drivers.</p>
                        </div>

                        <div className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                            <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center mb-4">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h3 className="font-semibold text-gray-900 mb-2">Best Prices</h3>
                            <p className="text-sm text-gray-600">Competitive rates with transparent pricing.</p>
                        </div>
                    </div>

                    <div className="mt-12 p-6 bg-gray-50 rounded-xl">
                        <h3 className="font-semibold text-gray-900 mb-3">Your Account</h3>
                        <div className="space-y-2 text-sm">
                            <p><span className="text-gray-600">Email:</span> <span className="font-medium">{user?.email}</span></p>
                            {user?.name && <p><span className="text-gray-600">Name:</span> <span className="font-medium">{user.name}</span></p>}
                            <p><span className="text-gray-600">User ID:</span> <span className="font-mono text-xs">{user?._id}</span></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
