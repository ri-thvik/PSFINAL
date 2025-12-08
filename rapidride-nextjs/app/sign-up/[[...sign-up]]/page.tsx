"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export default function SignUpPage() {
    const router = useRouter();
    const [step, setStep] = useState<"form" | "otp">("form");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [otp, setOtp] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState(600);
    const [canResend, setCanResend] = useState(false);

    useEffect(() => {
        if (step === "otp") {
            setTimeLeft(600);
            setCanResend(false);
            const timer = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        return 0;
                    }
                    if (prev <= 540) setCanResend(true);
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [step]);

    const handleSignup = async () => {
        if (!name || !email || !phone || !password) {
            setError("All fields are required");
            return;
        }
        setLoading(true);
        setError(null);
        setMessage(null);
        try {
            const res = await fetch(`${API_URL}/auth/signup/initiate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, phone, password }),
            });
            const data = await res.json();
            if (!data.success) {
                setError(data.message || "Signup failed");
                return;
            }
            setStep("otp");
            setMessage("OTP sent to your email. Check your inbox.");
        } catch (err) {
            setError("Server error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async () => {
        if (otp.length !== 6) {
            setError("Enter a valid 6-digit OTP");
            return;
        }
        setLoading(true);
        setError(null);
        setMessage(null);
        try {
            const res = await fetch(`${API_URL}/auth/signup/complete`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, otp }),
            });
            const data = await res.json();
            if (!data.success) {
                setError(data.message || "Invalid or expired OTP");
                return;
            }
            if (data.token) {
                localStorage.setItem("token", data.token);
            }
            router.push("/booking");
        } catch (err) {
            setError("Verification failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (!canResend) return;
        setLoading(true);
        setError(null);
        setMessage(null);
        try {
            const res = await fetch(`${API_URL}/auth/otp/resend`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, verificationType: "signup" }),
            });
            const data = await res.json();
            if (!data.success) {
                setError(data.message || "Could not resend OTP");
                return;
            }
            setTimeLeft(600);
            setCanResend(false);
            setMessage("New OTP sent. Check your email.");
        } catch (err) {
            setError("Could not resend OTP");
        } finally {
            setLoading(false);
        }
    };

    const renderTimer = () => {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6">
            <div className="w-full max-w-md space-y-6">
                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-black rounded-2xl mb-4">
                        <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M13 2L3 14h8l-2 8 10-12h-8l2-8z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Join RapidRide</h1>
                    <p className="text-gray-600">Create your account with secure email verification</p>
                </div>

                {message && <div className="rounded-md bg-green-50 p-3 text-green-700 text-sm">{message}</div>}
                {error && <div className="rounded-md bg-red-50 p-3 text-red-700 text-sm">{error}</div>}

                {step === "form" && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                            <input
                                type="text"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input
                                type="email"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                            <input
                                type="tel"
                                maxLength={10}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <input
                                type="password"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={handleSignup}
                            disabled={loading}
                            className="w-full bg-black text-white rounded-lg py-3 font-semibold hover:bg-gray-900 disabled:opacity-50"
                        >
                            {loading ? "Sending OTP..." : "Sign Up & Send OTP"}
                        </button>
                        <p className="text-center text-sm text-gray-600">
                            Already have an account?{" "}
                            <a href="/" className="text-black font-semibold">
                                Login
                            </a>
                        </p>
                    </div>
                )}

                {step === "otp" && (
                    <div className="space-y-4">
                        <div className="text-center">
                            <p className="text-sm text-gray-600">OTP sent to</p>
                            <p className="font-semibold text-gray-900">{email}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Enter OTP</label>
                            <input
                                type="text"
                                maxLength={6}
                                className="w-full text-center tracking-[0.8rem] border border-gray-300 rounded-lg px-3 py-3 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-black"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                            />
                            <p className="text-xs text-gray-500 mt-2">Expires in {renderTimer()}</p>
                        </div>
                        <button
                            onClick={handleVerify}
                            disabled={loading}
                            className="w-full bg-black text-white rounded-lg py-3 font-semibold hover:bg-gray-900 disabled:opacity-50"
                        >
                            {loading ? "Verifying..." : "Verify & Create Account"}
                        </button>
                        <button
                            onClick={handleResend}
                            disabled={!canResend || loading}
                            className="w-full border border-gray-300 rounded-lg py-3 font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                        >
                            Resend OTP
                        </button>
                        <button
                            onClick={() => setStep("form")}
                            className="w-full text-sm text-gray-600 underline"
                        >
                            Back to form
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
