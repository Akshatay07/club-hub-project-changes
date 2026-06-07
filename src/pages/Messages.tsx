import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { io } from "socket.io-client";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const socket = io("http://localhost:5000");

export default function Messages() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!user) return;

    socket.emit("register", {
      userId: user._id,
      role: user.role,
    });

    fetchUsers();

    if (Notification.permission !== "granted") {
      Notification.requestPermission();
    }
  }, [user]);

  useEffect(() => {
    if (!selectedUser || !user) return;
    fetchMessages();
  }, [selectedUser]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    socket.on("newMessage", (message) => {
      if (Notification.permission === "granted") {
        new Notification("New Message", {
          body: message.text,
        });
      }

      if (
        message.senderId === selectedUser?._id ||
        message.receiverId === selectedUser?._id
      ) {
        setMessages((prev) => [...prev, message]);
      }
    });

    return () => {
      socket.off("newMessage");
    };
  }, [selectedUser]);

  const fetchUsers = async () => {
    try {
      const res = await api.get(`/messages/users/${user._id}`);
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await api.get(
        `/messages/${user._id}/${selectedUser._id}`
      );

      setMessages(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const sendMessage = async () => {
    if (!text.trim()) return;

    try {
      const res = await api.post("/messages", {
        senderId: user._id,
        receiverId: selectedUser._id,
        text,
      });

      socket.emit("sendMessage", res.data);

      setMessages((prev) => [...prev, res.data]);

      setText("");
    } catch (err) {
      console.error(err);
    }
  };

  const filteredUsers = users.filter((u) =>
    u.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-100px)] flex overflow-hidden rounded-2xl bg-[#111b21] text-white border border-[#2a3942]">

      {/* LEFT SIDEBAR */}
      <div className="w-[350px] min-w-[350px] bg-[#111b21] border-r border-[#2a3942] flex flex-col">

        <div className="p-5 border-b border-[#2a3942] flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-[#202c33]"
          >
            <ArrowLeft size={20} />
          </button>

          <h1 className="text-2xl font-bold">
            Messages
          </h1>
        </div>

        <div className="p-3 border-b border-[#2a3942]">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="w-full px-4 py-3 rounded-lg bg-[#202c33] text-white outline-none"
          />
        </div>

        <div className="overflow-y-auto flex-1">
          {filteredUsers.map((u) => (
            <div
              key={u._id}
              onClick={() => setSelectedUser(u)}
              className={`p-4 cursor-pointer border-b border-[#202c33]
              ${
                selectedUser?._id === u._id
                  ? "bg-[#2a3942]"
                  : "hover:bg-[#202c33]"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-lg font-bold">
                  {u.name?.charAt(0)}
                </div>

                <div>
                  <p className="font-semibold">
                    {u.name}
                  </p>

                  <p className="text-sm text-[#8696a0] capitalize">
                    {u.role}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT CHAT */}
      <div className="flex-1 flex flex-col bg-[#0b141a]">

        {selectedUser ? (
          <>
            <div className="h-[75px] px-6 border-b border-[#2a3942] flex items-center gap-4 bg-[#202c33]">
              <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-lg font-bold">
                {selectedUser.name?.charAt(0)}
              </div>

              <div>
                <h2 className="font-semibold text-lg">
                  {selectedUser.name}
                </h2>

                <p className="text-sm text-[#8696a0] capitalize">
                  {selectedUser.role}
                </p>
              </div>
            </div>

            <div
              className="flex-1 overflow-y-auto p-6 space-y-4"
              style={{
                backgroundImage:
                  "url('https://www.transparenttextures.com/patterns/dark-mosaic.png')",
              }}
            >
              {messages.map((msg, index) => {
                const isMine = msg.senderId === user._id;

                return (
                  <div
                    key={index}
                    className={`flex ${
                      isMine ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[70%] px-5 py-3 rounded-2xl ${
                        isMine
                          ? "bg-[#005c4b] rounded-br-sm"
                          : "bg-[#202c33] rounded-bl-sm"
                      }`}
                    >
                      {msg.text}

                      <div className="text-[11px] text-gray-300 mt-1 text-right">
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}

              <div ref={bottomRef}></div>
            </div>

            <div className="p-4 border-t border-[#2a3942] bg-[#202c33] flex gap-3">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-[#2a3942] px-5 py-3 rounded-full outline-none"
              />

              <button
                onClick={sendMessage}
                className="bg-[#00a884] px-6 py-3 rounded-full font-semibold"
              >
                Send
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-[#8696a0]">
            <div className="text-7xl mb-5">💬</div>

            <h2 className="text-3xl font-semibold mb-2">
              Start Messaging
            </h2>

            <p>Select a user from the sidebar</p>
          </div>
        )}
      </div>
    </div>
  );
}