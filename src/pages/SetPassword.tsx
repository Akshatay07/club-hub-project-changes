import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock } from "lucide-react";
import api from "../api/api";

export default function SetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
const [regNo, setRegNo] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async () => {
    setError("");
    setSuccess("");

    if (!token) {
      return setError("Invalid or expired link");
    }

    if (password.length < 6) {
      return setError("Password must be at least 6 characters");
    }

    if (password !== confirm) {
      return setError("Passwords do not match");
    }

    try {
      setLoading(true);

      await api.post("/auth/set-password", {
  token,
  password,
  regNo,
});

      setSuccess("Password updated successfully");

      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const strength =
    password.length > 8
      ? "Strong"
      : password.length > 5
      ? "Medium"
      : "Weak";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">

        {/* HEADER */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg">
            CH
          </div>
          <h2 className="mt-3 text-xl font-semibold">Set Password</h2>
          <p className="text-sm text-gray-500">
            Create a secure password for your account
          </p>
        </div>

        {/* PASSWORD */}
        <div className="relative mb-2">
          <Lock className="absolute left-3 top-3 text-gray-400 w-5 h-5" />

          <input
            type={show ? "text" : "password"}
            placeholder="Enter new password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full pl-10 pr-10 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
          />

          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-3 top-3 text-gray-500"
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {/* STRENGTH */}
        <p className="text-xs text-gray-500 mb-4">
          Strength: <span className="font-medium">{strength}</span>
        </p>

        {/* CONFIRM */}
        <div className="mb-4">
          <input
            type="password"
            placeholder="Confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
          />
        </div>

        {/* ERROR / SUCCESS */}
        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
        {success && <p className="text-green-600 text-sm mb-2">{success}</p>}

        {/* BUTTON */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-3 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition"
        >
          {loading ? "Updating..." : "Set Password"}
        </button>
      </div>
    </div>
  );
}